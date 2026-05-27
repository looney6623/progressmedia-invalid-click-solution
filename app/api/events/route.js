import { NextResponse } from "next/server";
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

function isSchemaMismatch(error) {
  const code = String(error?.code || "");
  const message = String(error?.message || "");
  return ["42703", "42P01", "PGRST204", "PGRST205"].includes(code)
    || message.includes("column")
    || message.includes("schema cache")
    || message.includes("does not exist");
}

function schemaMismatchResponse(error) {
  return json({
    ok: false,
    error: "DB_SCHEMA_MISMATCH",
    message: "pm_conversion_events 스키마가 최신 컬럼 구조와 일치하지 않습니다. docs/AUTH_RLS_SCHEMA.sql의 pm_conversion_events 섹션을 반영해 주세요.",
    detail: error?.message
  }, { status: 500 });
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
  const eventType = readValue(body, "event_type", "eventType") || "stay_time";
  const required = { client_id: clientId, project_key: projectKey, visitor_id: visitorId, session_id: sessionId };
  const missing = Object.entries(required).filter(([, value]) => !value).map(([key]) => key);
  if (missing.length) return json({ ok: false, error: `필수값이 없습니다: ${missing.join(", ")}` }, { status: 400 });

  const ip = getRequestIp(request);
  const ipHash = hashIp(ip);
  const ipMasked = maskIp(ip);

  if (!hasServerSupabaseConfig()) {
    const localMode = isServerLocalMode();
    return json({
      ok: localMode,
      mode: serverMode(),
      stored: false,
      accepted: localMode,
      todo: "Supabase 연결 후 stay_time 업데이트 또는 conversion 이벤트 저장을 수행합니다.",
      privacy: "IP 원문은 저장하지 않고 ip_hash/ip_masked만 사용합니다.",
      error: localMode ? undefined : "SERVER_CONFIGURATION_ERROR",
      message: localMode ? undefined : "운영 모드에서는 Supabase service role 설정이 필요합니다."
    }, { status: localMode ? 200 : 503 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: advertiser, error: advertiserError } = await supabase
    .from("pm_advertisers")
    .select("id,status")
    .eq("client_id", clientId)
    .eq("project_key", projectKey)
    .eq("status", "active")
    .maybeSingle();

  if (advertiserError) return json({ ok: false, error: advertiserError.message }, { status: 500 });
  if (!advertiser) {
    return json({ ok: false, error: "invalid client_id or project_key", message: "client_id 또는 project_key가 일치하지 않습니다." }, { status: 403 });
  }

  const durationMs = Number(readValue(body, "duration_ms", "durationMs") || 0);
  const stayTime = Number(readValue(body, "stay_time", "stayTime") || Math.round(durationMs / 1000) || 0);
  const pageUrl = readValue(body, "page_url", "pageUrl") || body.url || "";
  const conversionData = body.conversion_data || body.data || {};

  if (eventType === "stay_time" || eventType === "pagehide" || eventType === "visibility_hidden") {
    const { data: latestLog, error: latestLogError } = await supabase
      .from("pm_click_logs")
      .select("id")
      .eq("advertiser_id", advertiser.id)
      .eq("visitor_id", visitorId)
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestLogError) return json({ ok: false, error: latestLogError.message }, { status: 500 });

    if (latestLog?.id) {
      const { error: updateError } = await supabase
        .from("pm_click_logs")
        .update({ stay_time: stayTime })
        .eq("id", latestLog.id);
      if (updateError) return json({ ok: false, error: updateError.message }, { status: 500 });
      return json({ ok: true, updated: true, logId: latestLog.id });
    }

    return json({ ok: true, updated: false, message: "매칭되는 클릭 로그가 없어 체류시간을 업데이트하지 않았습니다." });
  }

  if (eventType === "conversion") {
    const payload = {
      advertiser_id: advertiser.id,
      client_id: clientId,
      project_key: projectKey,
      visitor_id: visitorId,
      session_id: sessionId,
      ip_hash: ipHash,
      ip_masked: ipMasked,
      user_agent: readValue(body, "user_agent", "userAgent"),
      page_url: pageUrl,
      referrer: body.referrer || "",
      utm_source: body.utm_source || "",
      utm_medium: body.utm_medium || "",
      utm_campaign: body.utm_campaign || "",
      utm_term: body.utm_term || "",
      utm_content: body.utm_content || "",
      event_name: body.event_name || body.eventName || eventType,
      event_type: eventType,
      value: body.value ?? conversionData.value ?? null,
      currency: body.currency || conversionData.currency || null,
      metadata: body.metadata || {},
      conversion_data: conversionData,
      created_at: new Date().toISOString()
    };
    const { error } = await supabase.from("pm_conversion_events").insert(payload);
    if (error) {
      if (isSchemaMismatch(error)) return schemaMismatchResponse(error);
      return json({ ok: false, error: error.message }, { status: 500 });
    }
    return json({ ok: true, stored: true, message: "conversion 이벤트가 저장되었습니다." });
  }

  return json({ ok: true, ignored: true, eventType });
}
