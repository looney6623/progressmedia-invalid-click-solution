import { NextResponse } from "next/server";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode, serverMode } from "@/lib/serverSupabase";

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9가-힣]+/g, "-").replace(/^-|-$/g, "").slice(0, 24) || "advertiser";
}

function generateProjectKey(name) {
  return `pk_${slugify(name)}_${crypto.randomUUID().slice(0, 8)}`;
}

function generateInstallScript(clientId, projectKey) {
  const trackerUrl = process.env.NEXT_PUBLIC_TRACKER_URL || "/pm-click-shield.js";
  return `<script src="${trackerUrl}" data-client-id="${clientId}" data-project-key="${projectKey}" async></script>`;
}

export async function POST(request) {
  const body = await request.json();
  const required = ["name", "siteUrl", "contactName", "loginEmail", "temporaryPassword", "marketerId"];
  const missing = required.filter((key) => !body[key]);
  if (missing.length) return NextResponse.json({ ok: false, error: `필수값이 없습니다: ${missing.join(", ")}` }, { status: 400 });

  const clientId = `pm-${slugify(body.name)}-${crypto.randomUUID().slice(0, 6)}`;
  const projectKey = generateProjectKey(body.name);

  if (!hasServerSupabaseConfig()) {
    const status = isServerLocalMode() ? 200 : 503;
    return NextResponse.json({
      ok: isServerLocalMode(),
      mode: serverMode(),
      todo: "Supabase service role 연결 후 pm_advertisers, pm_marketer_advertisers, 광고주 Auth 계정 생성을 수행합니다.",
      advertiser: { id: `mock-${clientId}`, name: body.name, clientId, projectKey, siteUrl: body.siteUrl, status: body.status || "active", createdBy: body.marketerId },
      advertiserUser: { email: body.loginEmail, name: body.contactName, role: "advertiser" },
      advertiserUserLink: { permission: body.permission || "manage", temporaryPassword: body.temporaryPassword },
      installScript: generateInstallScript(clientId, projectKey),
      error: isServerLocalMode() ? undefined : "운영 모드에서는 SUPABASE_SERVICE_ROLE_KEY가 필요합니다."
    }, { status });
  }

  const supabase = createSupabaseServiceClient();
  const { data: advertiser, error: advertiserError } = await supabase
    .from("pm_advertisers")
    .insert({
      name: body.name,
      client_id: clientId,
      site_url: body.siteUrl,
      project_key: projectKey,
      status: body.status || "active",
      created_by: body.marketerId
    })
    .select("id,name,client_id,project_key,site_url,status,created_by")
    .single();

  if (advertiserError) return NextResponse.json({ ok: false, error: advertiserError.message }, { status: 500 });

  await supabase.from("pm_marketer_advertisers").insert({
    marketer_id: body.marketerId,
    advertiser_id: advertiser.id,
    permission: "manage"
  });

  return NextResponse.json({
    ok: true,
    advertiser: {
      id: advertiser.id,
      name: advertiser.name,
      clientId: advertiser.client_id,
      projectKey: advertiser.project_key,
      siteUrl: advertiser.site_url,
      status: advertiser.status,
      createdBy: advertiser.created_by
    },
    advertiserUser: { email: body.loginEmail, name: body.contactName, role: "advertiser" },
    advertiserUserLink: { permission: body.permission || "manage", temporaryPassword: body.temporaryPassword },
    installScript: generateInstallScript(clientId, projectKey),
    todo: "광고주 Auth 계정 생성은 /api/advertiser-users에서 Supabase Admin API로 분리 처리합니다."
  });
}
