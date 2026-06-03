import { NextResponse } from "next/server";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode, serverMode } from "@/lib/serverSupabase";

const CHANNELS = new Set(["naver_search", "naver_shopping", "naver_gfa", "meta", "google"]);

function json(body, init = {}) {
  return NextResponse.json(body, init);
}

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    if (url.username || url.password) return null;
    return url;
  } catch {
    return null;
  }
}

function normalizeHost(value) {
  return String(value || "").trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "");
}

async function getRequester(supabase, request) {
  const token = bearerToken(request);
  if (!token) return { error: "로그인이 필요합니다.", status: 401 };
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { error: "유효하지 않은 세션입니다.", status: 401 };
  const { data: profile, error } = await supabase
    .from("pm_profiles")
    .select("id,email,role,is_active")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 };
  const role = profile?.role || userData.user.user_metadata?.role;
  if (!role) return { error: "권한 정보를 찾을 수 없습니다.", status: 403 };
  if (profile?.is_active === false) return { error: "비활성화된 계정입니다.", status: 403 };
  return { requester: { id: userData.user.id, role } };
}

async function accessibleAdvertiserIds(supabase, requester) {
  if (requester.role === "admin") return null;
  if (requester.role === "marketer") {
    const { data, error } = await supabase.from("pm_marketer_advertisers").select("advertiser_id").eq("marketer_id", requester.id);
    if (error) throw new Error(error.message);
    return (data || []).map((item) => item.advertiser_id);
  }
  const { data, error } = await supabase.from("pm_advertiser_users").select("advertiser_id").eq("user_id", requester.id);
  if (error) throw new Error(error.message);
  return (data || []).map((item) => item.advertiser_id);
}

function canAccess(ids, advertiserId) {
  return ids === null || ids.includes(advertiserId);
}

async function withAuth(request) {
  if (!hasServerSupabaseConfig()) {
    return {
      fallback: json({
        ok: isServerLocalMode(),
        mode: serverMode(),
        items: [],
        error: isServerLocalMode() ? undefined : "SERVER_CONFIGURATION_ERROR"
      }, { status: isServerLocalMode() ? 200 : 503 })
    };
  }
  const supabase = createSupabaseServiceClient();
  const auth = await getRequester(supabase, request);
  if (auth.error) return { fallback: json({ ok: false, error: auth.error }, { status: auth.status }) };
  try {
    const accessibleIds = await accessibleAdvertiserIds(supabase, auth.requester);
    return { supabase, requester: auth.requester, accessibleIds };
  } catch (error) {
    return { fallback: json({ ok: false, error: error.message }, { status: 500 }) };
  }
}

function mapLink(row) {
  return {
    id: row.id,
    advertiserId: row.advertiser_id,
    advertiserName: row.advertiser?.name || "",
    channel: row.channel,
    name: row.name,
    destinationUrl: row.destination_url,
    allowedDomain: row.allowed_domain,
    isActive: row.is_active !== false,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export async function GET(request) {
  const ctx = await withAuth(request);
  if (ctx.fallback) return ctx.fallback;
  const { supabase, accessibleIds } = ctx;
  if (Array.isArray(accessibleIds) && accessibleIds.length === 0) return json({ ok: true, items: [] });

  let query = supabase
    .from("pm_tracking_links")
    .select("id,advertiser_id,channel,name,destination_url,allowed_domain,is_active,created_at,updated_at,advertiser:pm_advertisers(name)")
    .order("created_at", { ascending: false });
  if (accessibleIds) query = query.in("advertiser_id", accessibleIds);
  const { data, error } = await query;
  if (error) return json({ ok: false, items: [], error: error.message }, { status: 500 });
  return json({ ok: true, items: (data || []).map(mapLink) });
}

export async function POST(request) {
  const ctx = await withAuth(request);
  if (ctx.fallback) return ctx.fallback;
  const { supabase, accessibleIds } = ctx;
  const body = await request.json().catch(() => ({}));
  const advertiserId = body.advertiser_id || body.advertiserId;
  const channel = body.channel || "naver_search";
  const name = String(body.name || "").trim() || "네이버 광고 보호 URL";
  const destinationUrl = String(body.destination_url || body.destinationUrl || "").trim();
  const destination = normalizeUrl(destinationUrl);
  if (!advertiserId) return json({ ok: false, error: "광고주를 선택해 주세요." }, { status: 400 });
  if (!canAccess(accessibleIds, advertiserId)) return json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
  if (!CHANNELS.has(channel)) return json({ ok: false, error: "지원하지 않는 채널입니다." }, { status: 400 });
  if (!destination) return json({ ok: false, error: "http 또는 https로 시작하는 정상 랜딩 URL을 입력해 주세요." }, { status: 400 });

  const allowedDomain = normalizeHost(body.allowed_domain || body.allowedDomain) || destination.hostname.toLowerCase();
  const { data, error } = await supabase
    .from("pm_tracking_links")
    .insert({
      advertiser_id: advertiserId,
      channel,
      name,
      destination_url: destination.toString(),
      allowed_domain: allowedDomain,
      is_active: body.is_active ?? body.isActive ?? true
    })
    .select("id,advertiser_id,channel,name,destination_url,allowed_domain,is_active,created_at,updated_at,advertiser:pm_advertisers(name)")
    .single();
  if (error) return json({ ok: false, error: error.message }, { status: 500 });
  return json({ ok: true, link: mapLink(data) });
}
