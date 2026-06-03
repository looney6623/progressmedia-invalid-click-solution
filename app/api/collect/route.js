import { NextResponse } from "next/server";
import { detectInvalidClick } from "@/lib/serverInvalidClick";
import { getRequestIp, hashIp, maskIp } from "@/lib/privacy";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode, serverMode } from "@/lib/serverSupabase";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type"
};

function json(body, init = {}) {
  return NextResponse.json(body, { ...init, headers: { ...corsHeaders, ...(init.headers || {}) } });
}

function readValue(body, snakeKey, camelKey) {
  return body[snakeKey] ?? body[camelKey] ?? "";
}

function readNumber(body, snakeKey, camelKey, fallback = null) {
  const value = body[snakeKey] ?? body[camelKey];
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const clientId = readValue(body, "client_id", "clientId");
  const projectKey = readValue(body, "project_key", "projectKey");
  const visitorId = readValue(body, "visitor_id", "visitorId");
  const sessionId = readValue(body, "session_id", "sessionId");
  const pageUrl = readValue(body, "page_url", "pageUrl") || body.url;
  const required = { client_id: clientId, project_key: projectKey, visitor_id: visitorId, session_id: sessionId, page_url: pageUrl };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) return json({ ok: false, error: `필수값이 없습니다: ${missing.join(", ")}` }, { status: 400 });

  const ip = getRequestIp(request);
  const ipHash = hashIp(ip);
  const ipMasked = maskIp(ip);
  const userAgent = readValue(body, "user_agent", "userAgent") || request.headers.get("user-agent") || "";

  if (!hasServerSupabaseConfig()) {
    const localMode = isServerLocalMode();
    return json({
      ok: localMode,
      mode: serverMode(),
      stored: false,
      accepted: localMode,
      todo: "Supabase 연결 후 pm_advertisers 검증과 pm_click_logs 저장을 수행합니다.",
      privacy: "IP 원문은 저장하지 않고 ip_hash/ip_masked만 사용합니다.",
      error: localMode ? undefined : "운영 모드에서는 Supabase service role 설정이 필요합니다.",
      payload: { client_id: clientId, project_key: projectKey, visitor_id: visitorId, session_id: sessionId, page_url: pageUrl, ip_hash: ipHash, ip_masked: ipMasked }
    }, { status: localMode ? 200 : 503 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: advertiser, error: advertiserError } = await supabase
    .from("pm_advertisers")
    .select("id,client_id,project_key,status,blocking_enabled")
    .eq("client_id", clientId)
    .eq("project_key", projectKey)
    .eq("status", "active")
    .maybeSingle();

  if (advertiserError) return json({ ok: false, error: advertiserError.message }, { status: 500 });
  if (!advertiser) return json({ ok: false, error: "invalid client_id or project_key" }, { status: 403 });
  if (!ipHash) return json({ ok: false, error: "IP_HASH_SALT 설정이 필요합니다." }, { status: 500 });

  const stayTime = readNumber(body, "stay_time", "stayTime", null);
  const pageCount = readNumber(body, "page_count", "pageCount", 1);
  const detection = await detectInvalidClick({
    supabase,
    advertiserId: advertiser.id,
    ipHash,
    stayTime,
    pageCount,
    referrer: body.referrer || "",
    utmSource: body.utm_source || "",
    blockingEnabled: advertiser.blocking_enabled !== false
  });
  const createdAt = new Date().toISOString();
  const payload = {
    advertiser_id: advertiser.id,
    client_id: clientId,
    project_key: projectKey,
    visitor_id: visitorId,
    session_id: sessionId,
    ip_hash: ipHash,
    ip_masked: ipMasked,
    user_agent: userAgent,
    page_url: pageUrl,
    referrer: body.referrer || "",
    utm_source: body.utm_source || "",
    utm_medium: body.utm_medium || "",
    utm_campaign: body.utm_campaign || "",
    utm_term: body.utm_term || "",
    utm_content: body.utm_content || "",
    stay_time: stayTime,
    page_count: pageCount,
    click_status: detection.click_status,
    risk_score: detection.risk_score,
    reason: detection.reason,
    recent_count: detection.recent_count,
    applied_rules: detection.applied_rules || [],
    cpc: Number(body.cpc || 0),
    created_at: createdAt
  };

  const { data: inserted, error: insertError } = await supabase.from("pm_click_logs").insert(payload).select("id,click_status,risk_score,reason,recent_count,applied_rules,created_at").single();
  if (insertError) return json({ ok: false, error: insertError.message }, { status: 500 });

  let autoBlock = null;
  if (detection.click_status === "blocked" && detection.auto_block_create && !detection.matched_block) {
    const { data: existingAuto } = await supabase
      .from("pm_blocked_ips")
      .select("id,advertiser_id,client_id,ip_hash,ip_masked,reason,block_type,source,is_active,created_at")
      .eq("advertiser_id", advertiser.id)
      .eq("ip_hash", ipHash)
      .eq("is_active", true)
      .maybeSingle();
    if (existingAuto) {
      autoBlock = existingAuto;
    } else {
      const { data: createdAuto, error: autoBlockError } = await supabase
        .from("pm_blocked_ips")
        .insert({
          advertiser_id: advertiser.id,
          client_id: clientId,
          ip_hash: ipHash,
          ip_masked: ipMasked,
          reason: detection.reason || "자동 반복 클릭 차단",
          block_type: "auto",
          source: "collect",
          is_active: true
        })
        .select("id,advertiser_id,client_id,ip_hash,ip_masked,reason,block_type,source,is_active,created_at")
        .single();
      if (autoBlockError) {
        console.error("[collect] auto block create failed", autoBlockError.message);
      } else {
        autoBlock = createdAuto;
      }
    }
  }

  return json({
    ok: true,
    stored: true,
    log: {
      id: inserted.id,
      click_status: inserted.click_status,
      risk_score: inserted.risk_score,
      reason: inserted.reason,
      recent_count: inserted.recent_count,
      applied_rules: inserted.applied_rules || detection.applied_rules || [],
      matched_block: detection.matched_block,
      auto_block_created: Boolean(autoBlock),
      auto_block: autoBlock ? { id: autoBlock.id, block_type: autoBlock.block_type, source: autoBlock.source } : null,
      created_at: inserted.created_at
    }
  });
}
