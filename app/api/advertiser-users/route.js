import { NextResponse } from "next/server";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode, serverMode } from "@/lib/serverSupabase";

const COMPANY_DOMAIN = "my-progress.co.kr";

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function apiError(message, status = 500) {
  const error = new Error(message);
  error.status = status;
  return error;
}

async function getRequester(supabase, request) {
  const token = bearerToken(request);
  if (!token) return { error: "로그인이 필요합니다.", status: 401 };
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { error: "유효하지 않은 세션입니다.", status: 401 };
  const { data: profile, error } = await supabase.from("pm_profiles").select("id,email,role,is_active").eq("id", userData.user.id).maybeSingle();
  if (error) return { error: error.message, status: 500 };
  const role = profile?.role || userData.user.user_metadata?.role;
  if (!["admin", "marketer"].includes(role)) return { error: "광고주 계정을 발급할 권한이 없습니다.", status: 403 };
  if (profile?.is_active === false) return { error: "비활성화된 계정입니다.", status: 403 };
  return { requester: { id: userData.user.id, role, email: userData.user.email } };
}

async function canManageAdvertiser(supabase, requester, advertiserId) {
  if (requester.role === "admin") return true;
  const { data, error } = await supabase
    .from("pm_marketer_advertisers")
    .select("id")
    .eq("marketer_id", requester.id)
    .eq("advertiser_id", advertiserId)
    .maybeSingle();
  if (error) throw apiError(error.message, 500);
  return Boolean(data);
}

async function findAuthUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 100;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw apiError(error.message, 500);
    const found = data.users.find((user) => normalizeEmail(user.email) === email);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
  return null;
}

async function getOrCreateAdvertiserUser(supabase, { email, password, name }) {
  const existingUser = await findAuthUserByEmail(supabase, email);
  if (existingUser) {
    const { data: profile, error } = await supabase.from("pm_profiles").select("id,email,role,name,is_active").eq("id", existingUser.id).maybeSingle();
    if (error) throw apiError(error.message, 500);
    const role = profile?.role || existingUser.user_metadata?.role;
    if (role && role !== "advertiser") return { error: `이미 ${role} role로 등록된 이메일입니다.`, status: 409 };
    return { user: existingUser, existing: true };
  }
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "advertiser", name }
  });
  if (error) return { error: error.message, status: 500 };
  return { user: data.user, existing: false };
}

function isRoleConstraintMismatch(error) {
  return error?.message?.includes("pm_profiles_role_check") || error?.code === "23514";
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const advertiserId = body.advertiserId || body.advertiser_id;
  const name = (body.name || body.contactName || "").trim();
  const email = normalizeEmail(body.email || body.advertiserEmail || body.loginEmail);
  const temporaryPassword = body.temporaryPassword || "";
  const permission = body.permission || "view";
  const status = body.status || "active";

  const missing = Object.entries({ advertiserId, name, email, temporaryPassword }).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) return NextResponse.json({ ok: false, error: `필수값이 없습니다: ${missing.join(", ")}` }, { status: 400 });
  if (email.endsWith(`@${COMPANY_DOMAIN}`)) return NextResponse.json({ ok: false, error: `광고주 로그인 이메일에는 @${COMPANY_DOMAIN} 회사 메일을 사용할 수 없습니다.` }, { status: 400 });
  if (temporaryPassword.length < 6) return NextResponse.json({ ok: false, error: "임시 비밀번호는 최소 6자 이상이어야 합니다." }, { status: 400 });

  if (!hasServerSupabaseConfig()) {
    const id = `mock-${crypto.randomUUID().slice(0, 8)}`;
    return NextResponse.json({
      ok: isServerLocalMode(),
      mode: serverMode(),
      user: { id: `user-${id}`, email, name, role: "advertiser", isActive: status === "active" },
      advertiserUser: { id, userId: `user-${id}`, advertiserId, advertiserName: body.advertiserName, permission, temporaryPassword, isActive: status === "active" },
      error: isServerLocalMode() ? undefined : "운영 모드에서는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
    }, { status: isServerLocalMode() ? 200 : 503 });
  }

  const supabase = createSupabaseServiceClient();
  const auth = await getRequester(supabase, request);
  if (auth.error) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });

  try {
    const allowed = await canManageAdvertiser(supabase, auth.requester, advertiserId);
    if (!allowed) return NextResponse.json({ ok: false, error: "해당 광고주에 대한 계정 발급 권한이 없습니다." }, { status: 403 });

    const { data: advertiser, error: advertiserError } = await supabase.from("pm_advertisers").select("id,name").eq("id", advertiserId).maybeSingle();
    if (advertiserError) throw apiError(advertiserError.message, 500);
    if (!advertiser) return NextResponse.json({ ok: false, error: "광고주를 찾을 수 없습니다." }, { status: 404 });

    const authUserResult = await getOrCreateAdvertiserUser(supabase, { email, password: temporaryPassword, name });
    if (authUserResult.error) return NextResponse.json({ ok: false, error: authUserResult.error }, { status: authUserResult.status || 500 });
    const authUser = authUserResult.user;

    const { error: profileError } = await supabase.from("pm_profiles").upsert({
      id: authUser.id,
      email,
      name,
      role: "advertiser",
      team: advertiser.name,
      is_active: status === "active"
    });
    if (profileError) {
      if (isRoleConstraintMismatch(profileError)) {
        return NextResponse.json({
          ok: false,
          error: "DB_ROLE_CONSTRAINT_MISMATCH",
          message: "pm_profiles role 제약조건이 advertiser role을 허용하지 않습니다. AUTH_RLS_SCHEMA.sql을 반영해 주세요."
        }, { status: 500 });
      }
      throw apiError(profileError.message, 500);
    }

    const { data: existingLink, error: existingLinkError } = await supabase
      .from("pm_advertiser_users")
      .select("id,user_id,advertiser_id,permission,created_by,created_at")
      .eq("user_id", authUser.id)
      .eq("advertiser_id", advertiserId)
      .maybeSingle();
    if (existingLinkError) throw apiError(existingLinkError.message, 500);

    let link = existingLink;
    if (!link) {
      const { data, error } = await supabase
        .from("pm_advertiser_users")
        .insert({ user_id: authUser.id, advertiser_id: advertiserId, permission, created_by: auth.requester.id })
        .select("id,user_id,advertiser_id,permission,created_by,created_at")
        .single();
      if (error) throw apiError(error.message, 500);
      link = data;
    }

    return NextResponse.json({
      ok: true,
      duplicated: Boolean(existingLink),
      user: { id: authUser.id, email, name, role: "advertiser", isActive: status === "active" },
      advertiserUser: {
        id: link.id,
        userId: link.user_id,
        advertiserId: link.advertiser_id,
        advertiserName: advertiser.name,
        permission: link.permission,
        createdBy: link.created_by,
        temporaryPassword
      }
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: error.message || "광고주 계정 발급에 실패했습니다." }, { status: error.status || 500 });
  }
}
