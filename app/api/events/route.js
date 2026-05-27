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
      error: localMode ? undefined : "운영 모드에서는 Supabase service role 설정이 필요합니다."
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

  const stayTime = Number(readValue(body, "stay_time", "stayTime") || Math.round(Number(readValue(body, "duration_ms", "durationMs") || 0) / 1000) || 0);
  const pageUrl = readValue(body, "page_url", "pageUrl") || body.url || "";

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
      visitor_id: visitorId,
      session_id: sessionId,
      event_type: eventType,
      page_url: pageUrl,
      conversion_data: body.conversion_data || body.data || {},
      ip_hash: ipHash,
      ip_masked: ipMasked,
      created_at: new Date().toISOString()
    };
    const { error } = await supabase.from("pm_conversion_events").insert(payload);
    if (error && !String(error.message).includes("does not exist")) return json({ ok: false, error: error.message }, { status: 500 });
    return json({ ok: true, stored: !error, message: error ? "pm_conversion_events 테이블이 없어 conversion 이벤트 저장은 건너뛰었습니다." : "conversion 이벤트가 저장되었습니다." });
  }

  return json({ ok: true, ignored: true, eventType });
}
