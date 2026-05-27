import { NextResponse } from "next/server";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode, serverMode } from "@/lib/serverSupabase";

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "advertiser";
}

function generateClientId(name) {
  return `pm-${slugify(name)}-${crypto.randomUUID().slice(0, 6)}`;
}

function generateProjectKey(name) {
  return `pk_${slugify(name)}_${crypto.randomUUID().slice(0, 8)}`;
}

function generateInstallScript(clientId, projectKey) {
  const trackerUrl = process.env.NEXT_PUBLIC_TRACKER_URL || "/pm-click-shield.js";
  return `<script src="${trackerUrl}" data-client-id="${clientId}" data-project-key="${projectKey}" async></script>`;
}

function normalizeEmail(email = "") {
  return email.trim().toLowerCase();
}

function mapAdvertiser(row) {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    projectKey: row.project_key,
    siteUrl: row.site_url,
    status: row.status,
    createdBy: row.created_by
  };
}

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

async function getRequester(supabase, request) {
  const token = bearerToken(request);
  if (!token) return { error: "로그인이 필요합니다.", status: 401 };

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { error: "유효하지 않은 세션입니다.", status: 401 };

  const { data: profile, error: profileError } = await supabase
    .from("pm_profiles")
    .select("id,email,name,role,team,is_active")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) return { error: profileError.message, status: 500 };

  const metadata = userData.user.user_metadata || {};
  const requester = profile || {
    id: userData.user.id,
    email: userData.user.email,
    name: metadata.name || userData.user.email,
    role: metadata.role || "marketer",
    team: metadata.team || "",
    is_active: true
  };

  if (!requester.is_active) return { error: "비활성화된 계정입니다.", status: 403 };
  if (!["admin", "marketer"].includes(requester.role)) return { error: "광고주를 생성할 권한이 없습니다.", status: 403 };
  return { requester };
}

async function findAuthUserByEmail(supabase, email) {
  let page = 1;
  const perPage = 100;
  while (page <= 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(error.message);
    const found = data.users.find((user) => normalizeEmail(user.email) === email);
    if (found) return found;
    if (data.users.length < perPage) return null;
    page += 1;
  }
  return null;
}

async function getOrCreateAdvertiserAuthUser(supabase, { email, password, contactName }) {
  const existingUser = await findAuthUserByEmail(supabase, email);
  if (existingUser) {
    const { data: existingProfile } = await supabase
      .from("pm_profiles")
      .select("id,email,name,role,team,is_active")
      .eq("id", existingUser.id)
      .maybeSingle();

    const existingRole = existingProfile?.role || existingUser.user_metadata?.role;
    if (existingRole && existingRole !== "advertiser") {
      return { error: `이미 ${existingRole} role로 등록된 이메일입니다.`, status: 409 };
    }

    return { user: existingUser, existing: true };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { role: "advertiser", name: contactName }
  });

  if (error) return { error: error.message, status: 500 };
  return { user: data.user, existing: false };
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const advertiserName = body.advertiserName || body.name;
  const siteUrl = body.siteUrl;
  const contactName = body.contactName;
  const advertiserEmail = normalizeEmail(body.advertiserEmail || body.loginEmail);
  const temporaryPassword = body.temporaryPassword;
  const permission = body.permission || "manage";
  const status = body.status || "active";

  const required = { advertiserName, siteUrl, contactName, advertiserEmail, temporaryPassword };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) return NextResponse.json({ ok: false, error: `필수값이 없습니다: ${missing.join(", ")}` }, { status: 400 });

  const clientId = generateClientId(advertiserName);
  const projectKey = generateProjectKey(advertiserName);

  if (!hasServerSupabaseConfig()) {
    const localMode = isServerLocalMode();
    return NextResponse.json({
      ok: localMode,
      mode: serverMode(),
      error: localMode ? undefined : "운영 모드에서는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다.",
      advertiser: { id: `mock-${clientId}`, name: advertiserName, clientId, projectKey, siteUrl, status, createdBy: "mock-user" },
      advertiserUser: { email: advertiserEmail, name: contactName, role: "advertiser" },
      advertiserUserLink: { permission, temporaryPassword },
      installScript: generateInstallScript(clientId, projectKey)
    }, { status: localMode ? 200 : 503 });
  }

  const supabase = createSupabaseServiceClient();
  const auth = await getRequester(supabase, request);
  if (auth.error) return NextResponse.json({ ok: false, error: auth.error }, { status: auth.status });
  const requester = auth.requester;

  let advertiser = null;
  let authUser = null;
  let createdAuthUser = false;

  try {
    const { data: advertiserRow, error: advertiserError } = await supabase
      .from("pm_advertisers")
      .insert({
        name: advertiserName,
        client_id: clientId,
        site_url: siteUrl,
        project_key: projectKey,
        status,
        created_by: requester.id
      })
      .select("id,name,client_id,project_key,site_url,status,created_by")
      .single();

    if (advertiserError) throw new Error(advertiserError.message);
    advertiser = advertiserRow;

    const { error: assignmentError } = await supabase
      .from("pm_marketer_advertisers")
      .upsert({
        marketer_id: requester.id,
        advertiser_id: advertiser.id,
        permission: "manage"
      }, { onConflict: "marketer_id,advertiser_id" });

    if (assignmentError) throw new Error(assignmentError.message);

    const authUserResult = await getOrCreateAdvertiserAuthUser(supabase, {
      email: advertiserEmail,
      password: temporaryPassword,
      contactName
    });
    if (authUserResult.error) throw new Error(authUserResult.error);
    authUser = authUserResult.user;
    createdAuthUser = !authUserResult.existing;

    const { error: profileError } = await supabase
      .from("pm_profiles")
      .upsert({
        id: authUser.id,
        email: advertiserEmail,
        name: contactName,
        role: "advertiser",
        team: advertiserName,
        is_active: true
      });

    if (profileError) throw new Error(profileError.message);

    const { data: existingLink, error: existingLinkError } = await supabase
      .from("pm_advertiser_users")
      .select("id,user_id,advertiser_id,permission,created_by")
      .eq("user_id", authUser.id)
      .eq("advertiser_id", advertiser.id)
      .maybeSingle();

    if (existingLinkError) throw new Error(existingLinkError.message);

    let advertiserUserLink = existingLink;
    if (!advertiserUserLink) {
      const { data: insertedLink, error: linkError } = await supabase
        .from("pm_advertiser_users")
        .insert({
          user_id: authUser.id,
          advertiser_id: advertiser.id,
          permission,
          created_by: requester.id
        })
        .select("id,user_id,advertiser_id,permission,created_by")
        .single();

      if (linkError) throw new Error(linkError.message);
      advertiserUserLink = insertedLink;
    }

    const mappedAdvertiser = mapAdvertiser(advertiser);
    return NextResponse.json({
      ok: true,
      advertiser: mappedAdvertiser,
      advertiserUser: {
        id: authUser.id,
        email: advertiserEmail,
        name: contactName,
        role: "advertiser"
      },
      advertiserUserLink: {
        id: advertiserUserLink.id,
        userId: advertiserUserLink.user_id,
        advertiserId: advertiserUserLink.advertiser_id,
        permission: advertiserUserLink.permission,
        createdBy: advertiserUserLink.created_by,
        temporaryPassword
      },
      installScript: generateInstallScript(mappedAdvertiser.clientId, mappedAdvertiser.projectKey)
    });
  } catch (error) {
    if (createdAuthUser && authUser?.id) {
      await supabase.auth.admin.deleteUser(authUser.id);
    }
    if (advertiser?.id) {
      await supabase.from("pm_advertisers").delete().eq("id", advertiser.id);
    }
    return NextResponse.json({ ok: false, error: error.message || "광고주 생성에 실패했습니다." }, { status: 500 });
  }
}
