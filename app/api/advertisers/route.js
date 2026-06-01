import { NextResponse } from "next/server";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode, serverMode } from "@/lib/serverSupabase";

function json(body, init = {}) {
  return NextResponse.json(body, init);
}

function slugify(value = "") {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 24) || "advertiser";
}

function generateClientId(name) {
  return `pm-${slugify(name)}-${crypto.randomUUID().slice(0, 6)}`;
}

function generateProjectKey(name) {
  return `pk_${slugify(name)}_${crypto.randomUUID().slice(0, 8)}`;
}

function generateInstallScript(clientId, projectKey) {
  const trackerUrl = process.env.NEXT_PUBLIC_TRACKER_URL || (process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/pm-click-shield.js` : "/pm-click-shield.js");
  return `<script
  async
  src="${trackerUrl}"
  data-client-id="${clientId}"
  data-project-key="${projectKey}">
</script>`;
}

function mapAdvertiser(row) {
  return {
    id: row.id,
    name: row.name,
    clientId: row.client_id,
    projectKey: row.project_key,
    siteUrl: row.site_url,
    status: row.status,
    blockingEnabled: row.blocking_enabled !== false,
    createdBy: row.created_by
  };
}

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
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
  const role = profile?.role || (["admin", "marketer", "advertiser"].includes(metadata.role) ? metadata.role : "");
  if (!["admin", "marketer", "advertiser"].includes(role)) return { error: "권한 정보를 확인할 수 없습니다.", status: 403 };

  const requester = profile || {
    id: userData.user.id,
    email: userData.user.email,
    name: metadata.name || userData.user.email,
    role,
    team: metadata.team || "",
    is_active: true
  };

  if (!profile) {
    const { error: upsertError } = await supabase.from("pm_profiles").upsert(requester);
    if (upsertError) return { error: upsertError.message, status: 500 };
  }

  if (requester.is_active === false) return { error: "비활성화된 계정입니다.", status: 403 };
  return { requester };
}

async function canManageAdvertiser(supabase, requester, advertiserId) {
  if (requester.role === "admin") return true;

  if (requester.role === "marketer") {
    const { data, error } = await supabase
      .from("pm_marketer_advertisers")
      .select("id")
      .eq("marketer_id", requester.id)
      .eq("advertiser_id", advertiserId)
      .eq("permission", "manage")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  if (requester.role === "advertiser") {
    const { data, error } = await supabase
      .from("pm_advertiser_users")
      .select("id")
      .eq("user_id", requester.id)
      .eq("advertiser_id", advertiserId)
      .eq("permission", "manage")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  }

  return false;
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const advertiserName = (body.advertiserName || body.name || "").trim();
  const siteUrl = (body.siteUrl || "").trim();
  const status = body.status || "active";

  const missing = Object.entries({ advertiserName, siteUrl }).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) return json({ ok: false, error: `필수값이 없습니다: ${missing.join(", ")}` }, { status: 400 });
  if (!isValidUrl(siteUrl)) return json({ ok: false, error: "사이트 URL 형식이 올바르지 않습니다." }, { status: 400 });

  const clientId = generateClientId(advertiserName);
  const projectKey = generateProjectKey(advertiserName);

  if (!hasServerSupabaseConfig()) {
    const localMode = isServerLocalMode();
    return json({
      ok: localMode,
      mode: serverMode(),
      error: localMode ? undefined : "SERVER_CONFIGURATION_ERROR",
      advertiser: { id: `mock-${clientId}`, name: advertiserName, clientId, projectKey, siteUrl, status, blockingEnabled: true, createdBy: "mock-user" },
      installScript: generateInstallScript(clientId, projectKey)
    }, { status: localMode ? 200 : 503 });
  }

  const supabase = createSupabaseServiceClient();
  const auth = await getRequester(supabase, request);
  if (auth.error) return json({ ok: false, error: auth.error }, { status: auth.status });
  if (!["admin", "marketer"].includes(auth.requester.role)) {
    return json({ ok: false, error: "광고주/사이트 등록 권한이 없습니다." }, { status: 403 });
  }

  const { data: advertiserRow, error: advertiserError } = await supabase
    .from("pm_advertisers")
    .insert({
      name: advertiserName,
      client_id: clientId,
      site_url: siteUrl,
      project_key: projectKey,
      status,
      blocking_enabled: true,
      created_by: auth.requester.id
    })
    .select("id,name,client_id,project_key,site_url,status,blocking_enabled,created_by")
    .single();
  if (advertiserError) return json({ ok: false, error: advertiserError.message }, { status: 500 });

  if (auth.requester.role === "marketer") {
    const { error: assignmentError } = await supabase
      .from("pm_marketer_advertisers")
      .upsert({ marketer_id: auth.requester.id, advertiser_id: advertiserRow.id, permission: "manage" }, { onConflict: "marketer_id,advertiser_id" });
    if (assignmentError) return json({ ok: false, error: assignmentError.message }, { status: 500 });
  }

  const advertiser = mapAdvertiser(advertiserRow);
  return json({ ok: true, advertiser, installScript: generateInstallScript(advertiser.clientId, advertiser.projectKey) });
}

export async function PATCH(request) {
  const body = await request.json().catch(() => ({}));
  const advertiserId = body.advertiser_id || body.advertiserId;
  const hasBlockingEnabled = body.blocking_enabled !== undefined || body.blockingEnabled !== undefined;

  if (!advertiserId) return json({ ok: false, error: "advertiser_id가 필요합니다." }, { status: 400 });
  if (!hasBlockingEnabled) return json({ ok: false, error: "변경할 blocking_enabled 값이 필요합니다." }, { status: 400 });

  const blockingEnabled = Boolean(body.blocking_enabled ?? body.blockingEnabled);

  if (!hasServerSupabaseConfig()) {
    const localMode = isServerLocalMode();
    return json({
      ok: localMode,
      mode: serverMode(),
      error: localMode ? undefined : "SERVER_CONFIGURATION_ERROR",
      advertiser: { id: advertiserId, blockingEnabled }
    }, { status: localMode ? 200 : 503 });
  }

  const supabase = createSupabaseServiceClient();
  const auth = await getRequester(supabase, request);
  if (auth.error) return json({ ok: false, error: auth.error }, { status: auth.status });

  let allowed = false;
  try {
    allowed = await canManageAdvertiser(supabase, auth.requester, advertiserId);
  } catch (error) {
    return json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!allowed) return json({ ok: false, error: "광고주 자동 차단 설정을 변경할 권한이 없습니다." }, { status: 403 });

  const { data, error } = await supabase
    .from("pm_advertisers")
    .update({ blocking_enabled: blockingEnabled, updated_at: new Date().toISOString() })
    .eq("id", advertiserId)
    .select("id,name,client_id,project_key,site_url,status,blocking_enabled,created_by")
    .single();

  if (error) return json({ ok: false, error: error.message }, { status: 500 });
  return json({ ok: true, advertiser: mapAdvertiser(data) });
}
