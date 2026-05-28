import { NextResponse } from "next/server";
import { hashIp, maskIp } from "@/lib/privacy";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode, serverMode } from "@/lib/serverSupabase";

function json(body, init = {}) {
  return NextResponse.json(body, init);
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
  const { data: profile, error } = await supabase
    .from("pm_profiles")
    .select("id,email,name,role,is_active")
    .eq("id", userData.user.id)
    .maybeSingle();
  if (error) return { error: error.message, status: 500 };
  const role = profile?.role || userData.user.user_metadata?.role;
  if (!role) return { error: "권한 정보를 찾을 수 없습니다.", status: 403 };
  if (profile?.is_active === false) return { error: "비활성화된 계정입니다.", status: 403 };
  return { requester: { id: userData.user.id, role, email: userData.user.email } };
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

async function resolveAdvertiser(supabase, { advertiserId, clientId }) {
  if (advertiserId) {
    const { data, error } = await supabase.from("pm_advertisers").select("id,client_id,name").eq("id", advertiserId).maybeSingle();
    if (error) throw new Error(error.message);
    return data;
  }
  const { data, error } = await supabase.from("pm_advertisers").select("id,client_id,name").eq("client_id", clientId).maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

async function withAuth(request) {
  if (!hasServerSupabaseConfig()) {
    return { fallback: json({ ok: isServerLocalMode(), mode: serverMode(), items: [], error: isServerLocalMode() ? undefined : "SERVER_CONFIGURATION_ERROR" }, { status: isServerLocalMode() ? 200 : 503 }) };
  }
  const supabase = createSupabaseServiceClient();
  const auth = await getRequester(supabase, request);
  if (auth.error) return { fallback: json({ ok: false, error: auth.error }, { status: auth.status }) };
  try {
    const ids = await accessibleAdvertiserIds(supabase, auth.requester);
    return { supabase, requester: auth.requester, accessibleIds: ids };
  } catch (error) {
    return { fallback: json({ ok: false, error: error.message }, { status: 500 }) };
  }
}

export async function GET(request) {
  const ctx = await withAuth(request);
  if (ctx.fallback) return ctx.fallback;
  const { supabase, accessibleIds } = ctx;
  const status = new URL(request.url).searchParams.get("status") || "active";

  if (Array.isArray(accessibleIds) && accessibleIds.length === 0) return json({ ok: true, items: [] });

  let query = supabase
    .from("pm_blocked_ips")
    .select("id,advertiser_id,client_id,ip_hash,ip_masked,reason,block_type,source,is_active,created_by,created_at,released_at,release_reason,advertiser:pm_advertisers(name)")
    .order("created_at", { ascending: false });
  if (status === "released") query = query.or("is_active.eq.false,released_at.not.is.null");
  else if (status !== "all") query = query.eq("is_active", true);
  if (accessibleIds) query = query.in("advertiser_id", accessibleIds);
  const { data, error } = await query;
  if (error) return json({ ok: false, error: error.message }, { status: 500 });
  return json({ ok: true, items: data || [] });
}

export async function POST(request) {
  const ctx = await withAuth(request);
  if (ctx.fallback) return ctx.fallback;
  const { supabase, requester, accessibleIds } = ctx;
  const body = await request.json().catch(() => ({}));

  let log = null;
  if (body.log_id || body.logId) {
    const { data, error } = await supabase
      .from("pm_click_logs")
      .select("id,advertiser_id,client_id,ip_hash,ip_masked")
      .eq("id", body.log_id || body.logId)
      .maybeSingle();
    if (error) return json({ ok: false, error: error.message }, { status: 500 });
    if (!data) return json({ ok: false, error: "log not found" }, { status: 404 });
    log = data;
  }

  const advertiser = await resolveAdvertiser(supabase, {
    advertiserId: log?.advertiser_id || body.advertiser_id || body.advertiserId,
    clientId: log?.client_id || body.client_id || body.clientId
  });
  if (!advertiser) return json({ ok: false, error: "advertiser not found" }, { status: 404 });
  if (!canAccess(accessibleIds, advertiser.id)) return json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });

  const rawIp = body.raw_ip || body.rawIp || "";
  const ipHash = log?.ip_hash || body.ip_hash || body.ipHash || (rawIp ? hashIp(rawIp) : "");
  const ipMasked = log?.ip_masked || body.ip_masked || body.ipMasked || (rawIp ? maskIp(rawIp) : "");
  if (!ipHash) return json({ ok: false, error: rawIp ? "IP_HASH_SALT 설정이 필요합니다." : "log_id, ip_hash 또는 raw_ip가 필요합니다." }, { status: 400 });

  const { data: existing, error: existingError } = await supabase
    .from("pm_blocked_ips")
    .select("id,advertiser_id,client_id,ip_hash,ip_masked,reason,block_type,source,is_active,created_by,created_at,released_at,release_reason")
    .eq("advertiser_id", advertiser.id)
    .eq("ip_hash", ipHash)
    .eq("is_active", true)
    .maybeSingle();
  if (existingError) return json({ ok: false, error: existingError.message }, { status: 500 });
  if (existing) return json({ ok: true, block: existing, duplicated: true });

  const { data, error } = await supabase
    .from("pm_blocked_ips")
    .insert({
      advertiser_id: advertiser.id,
      client_id: advertiser.client_id,
      ip_hash: ipHash,
      ip_masked: ipMasked,
      reason: body.reason || "수동 차단",
      block_type: "manual",
      source: body.source || "dashboard",
      is_active: true,
      created_by: requester.id
    })
    .select("id,advertiser_id,client_id,ip_hash,ip_masked,reason,block_type,source,is_active,created_by,created_at,released_at,release_reason")
    .single();
  if (error) return json({ ok: false, error: error.message }, { status: 500 });
  return json({ ok: true, block: data });
}

export async function PATCH(request) {
  const ctx = await withAuth(request);
  if (ctx.fallback) return ctx.fallback;
  const { supabase, accessibleIds } = ctx;
  const body = await request.json().catch(() => ({}));
  const id = body.id || body.blockId;
  if (!id) return json({ ok: false, error: "block id가 필요합니다." }, { status: 400 });
  const { data: target, error: targetError } = await supabase.from("pm_blocked_ips").select("id,advertiser_id").eq("id", id).maybeSingle();
  if (targetError) return json({ ok: false, error: targetError.message }, { status: 500 });
  if (!target) return json({ ok: false, error: "block not found" }, { status: 404 });
  if (!canAccess(accessibleIds, target.advertiser_id)) return json({ ok: false, error: "접근 권한이 없습니다." }, { status: 403 });
  const { data, error } = await supabase
    .from("pm_blocked_ips")
    .update({ is_active: false, released_at: new Date().toISOString(), release_reason: body.release_reason || body.releaseReason || null })
    .eq("id", id)
    .select("id,released_at,release_reason")
    .single();
  if (error) return json({ ok: false, error: error.message }, { status: 500 });
  return json({ ok: true, releasedBlock: data });
}

export const DELETE = PATCH;
