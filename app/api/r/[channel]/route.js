import { NextResponse } from "next/server";
import { detectInvalidClick } from "@/lib/serverInvalidClick";
import { getRequestIp, hashIp, maskIp } from "@/lib/privacy";
import { createSupabaseServiceClient, hasServerSupabaseConfig } from "@/lib/serverSupabase";

const ALLOWED_CHANNELS = new Set(["naver_powerlink", "naver_shopping", "naver_gfa"]);

function json(body, status = 200) {
  return NextResponse.json(body, { status });
}

function readyText() {
  return new Response("ProgressMedia Tracking Ready", {
    status: 200,
    headers: { "Content-Type": "text/plain; charset=utf-8" }
  });
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function safeUrl(value = "") {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url;
  } catch {
    return null;
  }
}

function sameAdvertiserDomain(finalUrl, siteUrl) {
  const final = safeUrl(finalUrl);
  const site = safeUrl(siteUrl);
  if (!final || !site) return false;
  return final.hostname.toLowerCase() === site.hostname.toLowerCase();
}

function blockedUrl(request) {
  const current = new URL(request.url);
  return new URL("/blocked-click", current.origin);
}

function readParam(searchParams, key) {
  return (searchParams.get(key) || "").trim();
}

async function findAdvertiser(supabase, advertiserKey) {
  const columns = "id,name,client_id,project_key,site_url,status,blocking_enabled";
  const byClient = await supabase
    .from("pm_advertisers")
    .select(columns)
    .eq("client_id", advertiserKey)
    .maybeSingle();
  if (byClient.error) throw byClient.error;
  if (byClient.data) return byClient.data;

  const byProject = await supabase
    .from("pm_advertisers")
    .select(columns)
    .eq("project_key", advertiserKey)
    .maybeSingle();
  if (byProject.error) throw byProject.error;
  if (byProject.data) return byProject.data;

  if (isUuid(advertiserKey)) {
    const byId = await supabase
      .from("pm_advertisers")
      .select(columns)
      .eq("id", advertiserKey)
      .maybeSingle();
    if (byId.error) throw byId.error;
    if (byId.data) return byId.data;
  }

  if (advertiserKey.length >= 8) {
    const { data, error } = await supabase
      .from("pm_advertisers")
      .select(columns)
      .limit(1000);
    if (error) throw error;
    return data?.find((row) => String(row.id || "").startsWith(advertiserKey)) || null;
  }

  return null;
}

function buildClickPayload({ advertiser, request, channel, params, finalUrl, detection, ipHash, ipMasked }) {
  const nCampaign = readParam(params, "n_campaign");
  const nAdGroup = readParam(params, "n_ad_group");
  const nGroup = readParam(params, "n_group");
  const nMedia = readParam(params, "n_media");
  const nKeyword = readParam(params, "n_keyword");
  const nQuery = readParam(params, "n_query");
  const nAd = readParam(params, "n_ad");
  const nKeywordId = readParam(params, "n_keyword_id");
  const nMallPid = readParam(params, "n_mall_pid");
  const pmAccount = readParam(params, "pm_account");
  const referrer = request.headers.get("referer") || request.headers.get("referrer") || "";

  return {
    advertiser_id: advertiser.id,
    client_id: advertiser.client_id,
    project_key: advertiser.project_key,
    visitor_id: `naver:${ipHash.slice(0, 16)}`,
    session_id: `naver:${crypto.randomUUID()}`,
    ip_hash: ipHash,
    ip_masked: ipMasked,
    user_agent: request.headers.get("user-agent") || "",
    page_url: finalUrl,
    referrer,
    media: nMedia || channel,
    campaign: nCampaign,
    keyword: nKeyword || nQuery,
    utm_source: channel,
    utm_medium: nMedia || pmAccount,
    utm_campaign: nCampaign,
    utm_term: nKeyword || nQuery,
    utm_content: [nAdGroup || nGroup, nAd, nKeywordId, nMallPid].filter(Boolean).join(" / "),
    stay_time: null,
    page_count: 1,
    click_status: detection.click_status,
    risk_score: detection.risk_score,
    reason: detection.reason,
    recent_count: detection.recent_count,
    applied_rules: detection.applied_rules || [],
    cpc: 0,
    created_at: new Date().toISOString()
  };
}

function isColumnMismatch(error) {
  const message = String(error?.message || "");
  return message.includes("column") && (message.includes("media") || message.includes("campaign") || message.includes("keyword"));
}

async function insertClickLog(supabase, payload) {
  const { data, error } = await supabase
    .from("pm_click_logs")
    .insert(payload)
    .select("id,click_status,risk_score,reason,recent_count,applied_rules,created_at")
    .single();

  if (!error) return { data, error: null };
  if (!isColumnMismatch(error)) return { data: null, error };

  const fallbackPayload = { ...payload };
  delete fallbackPayload.media;
  delete fallbackPayload.campaign;
  delete fallbackPayload.keyword;
  return supabase
    .from("pm_click_logs")
    .insert(fallbackPayload)
    .select("id,click_status,risk_score,reason,recent_count,applied_rules,created_at")
    .single();
}

export async function GET(request, context) {
  const channel = context?.params?.channel || "";
  if (!ALLOWED_CHANNELS.has(channel)) {
    return json({ ok: false, error: "unsupported channel" }, 404);
  }

  const url = new URL(request.url);
  const params = url.searchParams;
  const advertiserKey = readParam(params, "pm_adv");
  const finalUrlValue = readParam(params, "n_final_url") || readParam(params, "final_url");

  if (!finalUrlValue) return readyText();
  if (!advertiserKey) return json({ ok: false, error: "pm_adv is required" }, 400);
  if (finalUrlValue === "{final_url}") return json({ ok: false, error: "n_final_url macro was not replaced" }, 400);

  const finalUrl = safeUrl(finalUrlValue);
  if (!finalUrl) return json({ ok: false, error: "invalid final URL" }, 400);

  if (!hasServerSupabaseConfig()) {
    return json({ ok: false, error: "SERVER_CONFIGURATION_ERROR" }, 503);
  }

  const supabase = createSupabaseServiceClient();
  let advertiser = null;
  try {
    advertiser = await findAdvertiser(supabase, advertiserKey);
  } catch (error) {
    return json({ ok: false, error: error.message || "advertiser lookup failed" }, 500);
  }

  if (!advertiser || advertiser.status !== "active") {
    return json({ ok: false, error: "invalid advertiser" }, 403);
  }
  if (!sameAdvertiserDomain(finalUrl.href, advertiser.site_url)) {
    return json({ ok: false, error: "final URL domain is not allowed" }, 403);
  }

  const ip = getRequestIp(request);
  const ipHash = hashIp(ip);
  const ipMasked = maskIp(ip);
  if (!ipHash) return json({ ok: false, error: "IP_HASH_SALT is required" }, 500);

  const referrer = request.headers.get("referer") || request.headers.get("referrer") || "";
  const detection = await detectInvalidClick({
    supabase,
    advertiserId: advertiser.id,
    ipHash,
    pageCount: 1,
    referrer,
    utmSource: channel,
    blockingEnabled: advertiser.blocking_enabled !== false
  });

  const payload = buildClickPayload({
    advertiser,
    request,
    channel,
    params,
    finalUrl: finalUrl.href,
    detection,
    ipHash,
    ipMasked
  });

  const { error: insertError } = await insertClickLog(supabase, payload);
  if (insertError) return json({ ok: false, error: insertError.message }, 500);

  if (detection.click_status === "blocked") {
    return NextResponse.redirect(blockedUrl(request), { status: 302 });
  }

  return NextResponse.redirect(finalUrl, { status: 302 });
}
