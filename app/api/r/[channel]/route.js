import { NextResponse } from "next/server";
import { detectInvalidClick } from "@/lib/serverInvalidClick";
import { getRequestIp, hashIp, maskIp } from "@/lib/privacy";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode } from "@/lib/serverSupabase";

const CHANNEL_MAP = {
  naver: ["naver_search", "naver_shopping"],
  "naver-gfa": ["naver_gfa"],
  meta: ["meta"],
  google: ["google"]
};

function json(body, init = {}) {
  return NextResponse.json(body, init);
}

function safeUrl(value) {
  if (!value) return null;
  if (String(value).includes("{")) return null;
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function hostAllowed(hostname, allowedDomain) {
  const host = String(hostname || "").toLowerCase();
  const allowed = String(allowedDomain || "").toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
  if (!host || !allowed) return false;
  return host === allowed || host.endsWith(`.${allowed}`);
}

function pickFinalUrl(params, fallback) {
  return safeUrl(params.get("n_final_url")) || safeUrl(params.get("final_url")) || safeUrl(fallback);
}

function trackingParams(params, channel) {
  return [
    { rule_key: "tracking_channel", value: channel },
    { rule_key: "n_campaign", value: params.get("n_campaign") || "" },
    { rule_key: "n_ad_group", value: params.get("n_ad_group") || params.get("n_group") || "" },
    { rule_key: "n_ad", value: params.get("n_ad") || "" },
    { rule_key: "n_media", value: params.get("n_media") || "" },
    { rule_key: "n_keyword_id", value: params.get("n_keyword_id") || "" },
    { rule_key: "n_query", value: params.get("n_query") || "" },
    { rule_key: "n_match", value: params.get("n_match") || "" },
    { rule_key: "n_network", value: params.get("n_network") || "" },
    { rule_key: "n_rank", value: params.get("n_rank") || "" },
    { rule_key: "n_campaign_type", value: params.get("n_campaign_type") || "" },
    { rule_key: "n_mall_id", value: params.get("n_mall_id") || "" },
    { rule_key: "n_mall_pid", value: params.get("n_mall_pid") || "" },
    { rule_key: "n_ad_group_type", value: params.get("n_ad_group_type") || "" }
  ].filter((item) => item.value);
}

function trackingReason(params, channel) {
  const pairs = [
    ["channel", channel],
    ["campaign", params.get("n_campaign")],
    ["ad_group", params.get("n_ad_group") || params.get("n_group")],
    ["ad", params.get("n_ad")],
    ["mall_id", params.get("n_mall_id")],
    ["mall_pid", params.get("n_mall_pid")]
  ].filter(([, value]) => value);
  return `경유 추적 URL: ${pairs.map(([key, value]) => `${key}=${String(value).slice(0, 80)}`).join("; ")}`;
}

function blockedPageUrl(request) {
  return new URL("/blocked-click", request.url);
}

export async function GET(request, { params }) {
  const channelSlug = params.channel;
  const supportedChannels = CHANNEL_MAP[channelSlug];
  if (!supportedChannels) return json({ ok: false, error: "지원하지 않는 경유 채널입니다." }, { status: 404 });

  const url = new URL(request.url);
  const searchParams = url.searchParams;
  const advertiserId = searchParams.get("aid");
  const linkId = searchParams.get("lid");
  if (!advertiserId || !linkId) return json({ ok: false, error: "aid와 lid가 필요합니다." }, { status: 400 });

  if (!hasServerSupabaseConfig()) {
    if (!isServerLocalMode()) return json({ ok: false, error: "SERVER_CONFIGURATION_ERROR" }, { status: 503 });
    const finalUrl = pickFinalUrl(searchParams, "");
    if (!finalUrl) return json({ ok: false, error: "테스트용 final_url이 필요합니다." }, { status: 400 });
    return NextResponse.redirect(finalUrl, { status: 302 });
  }

  const supabase = createSupabaseServiceClient();
  const { data: link, error: linkError } = await supabase
    .from("pm_tracking_links")
    .select("id,advertiser_id,channel,name,destination_url,allowed_domain,is_active,advertiser:pm_advertisers(id,client_id,project_key,status,blocking_enabled)")
    .eq("id", linkId)
    .eq("advertiser_id", advertiserId)
    .in("channel", supportedChannels)
    .maybeSingle();
  if (linkError) return json({ ok: false, error: linkError.message }, { status: 500 });
  if (!link || link.is_active === false || link.advertiser?.status !== "active") return json({ ok: false, error: "비활성 경유 URL입니다." }, { status: 403 });

  const finalUrl = pickFinalUrl(searchParams, link.destination_url);
  if (!finalUrl) return json({ ok: false, error: "허용되지 않는 최종 URL입니다." }, { status: 400 });
  const allowedDomain = link.allowed_domain || safeUrl(link.destination_url)?.hostname;
  if (!hostAllowed(finalUrl.hostname, allowedDomain)) return json({ ok: false, error: "허용되지 않은 랜딩 도메인입니다." }, { status: 403 });

  const ip = getRequestIp(request);
  const ipHash = hashIp(ip);
  const ipMasked = maskIp(ip);
  if (!ipHash) return json({ ok: false, error: "IP_HASH_SALT 설정이 필요합니다." }, { status: 500 });

  const advertiser = link.advertiser;
  const userAgent = request.headers.get("user-agent") || "";
  const detection = await detectInvalidClick({
    supabase,
    advertiserId: advertiser.id,
    ipHash,
    stayTime: null,
    pageCount: 1,
    referrer: request.headers.get("referer") || "",
    utmSource: searchParams.get("n_media") || searchParams.get("n_campaign_type") || channelSlug,
    blockingEnabled: advertiser.blocking_enabled !== false
  });

  const appliedRules = [
    ...(detection.applied_rules || []),
    { rule_key: "tracking_link", action: "redirect", channel: link.channel, link_id: link.id },
    ...trackingParams(searchParams, link.channel)
  ];
  const clickStatus = detection.click_status;
  const reason = [detection.reason, trackingReason(searchParams, link.channel)].filter(Boolean).join("; ");
  const payload = {
    advertiser_id: advertiser.id,
    client_id: advertiser.client_id,
    project_key: advertiser.project_key,
    visitor_id: `redirect:${ipHash.slice(0, 16)}`,
    session_id: `${link.id}:${Date.now()}`,
    ip_hash: ipHash,
    ip_masked: ipMasked,
    user_agent: userAgent,
    page_url: finalUrl.toString(),
    referrer: request.headers.get("referer") || "",
    utm_source: channelSlug,
    utm_medium: searchParams.get("n_media") || link.channel,
    utm_campaign: searchParams.get("n_campaign") || "",
    utm_term: searchParams.get("n_keyword") || searchParams.get("n_query") || "",
    utm_content: searchParams.get("n_ad_group") || searchParams.get("n_group") || searchParams.get("n_ad") || "",
    page_count: 1,
    click_status: clickStatus,
    risk_score: detection.risk_score,
    reason,
    recent_count: detection.recent_count,
    applied_rules: appliedRules,
    cpc: 0,
    created_at: new Date().toISOString()
  };
  const { error: insertError } = await supabase.from("pm_click_logs").insert(payload);
  if (insertError) return json({ ok: false, error: insertError.message }, { status: 500 });

  if (detection.matched_block) {
    return NextResponse.redirect(blockedPageUrl(request), { status: 302 });
  }

  return NextResponse.redirect(finalUrl, { status: 302 });
}
