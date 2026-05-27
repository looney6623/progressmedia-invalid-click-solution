import { NextResponse } from "next/server";
import { getRequestIp, hashIp, maskIp } from "@/lib/privacy";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode, serverMode } from "@/lib/serverSupabase";

export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const ip = getRequestIp(request);
  const payload = {
    client_id: body.clientId,
    project_key: body.projectKey,
    visitor_id: body.visitorId,
    session_id: body.sessionId,
    event_type: body.eventType || "engagement",
    duration_ms: body.durationMs || 0,
    page_url: body.url,
    ip_hash: hashIp(ip),
    ip_masked: maskIp(ip),
    received_at: new Date().toISOString()
  };

  if (!hasServerSupabaseConfig()) {
    const localMode = isServerLocalMode();
    return NextResponse.json({
      ok: localMode,
      mode: serverMode(),
      stored: false,
      todo: "Supabase 연결 후 conversion_events 또는 visitor_sessions 이벤트 저장으로 교체합니다.",
      privacy: "IP 원문은 저장하지 않고 ip_hash/ip_masked만 사용합니다.",
      accepted: localMode,
      error: localMode ? undefined : "운영 모드에서는 Supabase service role 설정이 필요합니다.",
      payload
    }, { status: localMode ? 200 : 503 });
  }

  const supabase = createSupabaseServiceClient();
  const { error } = await supabase.from("conversion_events").insert(payload);
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, stored: true });
}
