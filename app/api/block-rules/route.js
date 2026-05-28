import { NextResponse } from "next/server";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode, serverMode } from "@/lib/serverSupabase";

const defaultRules = [
  { rule_key: "repeat_click_suspicious", rule_name: "반복 클릭 의심", description: "같은 광고주와 IP 기준 10분 내 3회 이상 클릭 시 의심으로 판정합니다.", action: "suspicious", threshold: 3, risk_delta: 0, is_enabled: true, auto_block_create: false },
  { rule_key: "repeat_click_block", rule_name: "반복 클릭 차단", description: "같은 광고주와 IP 기준 10분 내 5회 이상 클릭 시 차단 로그로 판정합니다.", action: "blocked", threshold: 5, risk_delta: 0, is_enabled: true, auto_block_create: false },
  { rule_key: "short_stay", rule_name: "짧은 체류", description: "체류시간이 3초 이하이면 위험도를 가중합니다.", action: "monitor", threshold: 3, risk_delta: 12, is_enabled: true, auto_block_create: false },
  { rule_key: "no_page_move", rule_name: "무이동 세션", description: "페이지 이동이 0회이면 위험도를 가중합니다.", action: "monitor", threshold: 0, risk_delta: 10, is_enabled: true, auto_block_create: false },
  { rule_key: "partner_media_watch", rule_name: "제휴 매체 관찰", description: "제휴 매체 유입을 모니터링 reason에 추가합니다.", action: "monitor", threshold: null, risk_delta: 0, is_enabled: false, auto_block_create: false }
];

function json(body, init = {}) {
  return NextResponse.json(body, init);
}

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function mapRule(row) {
  return {
    id: row.id,
    advertiserId: row.advertiser_id,
    advertiserName: row.advertiser?.name,
    blockingEnabled: row.advertiser?.blocking_enabled !== false,
    ruleKey: row.rule_key,
    ruleName: row.rule_name,
    description: row.description,
    action: row.action,
    threshold: row.threshold,
    riskDelta: row.risk_delta,
    isEnabled: row.is_enabled,
    autoBlockCreate: row.auto_block_create === true,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function getRequester(supabase, request) {
  const token = bearerToken(request);
  if (!token) return { error: "로그인이 필요합니다.", status: 401 };
  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData.user) return { error: "유효하지 않은 세션입니다.", status: 401 };
  const { data: profile, error } = await supabase.from("pm_profiles").select("id,email,role,is_active").eq("id", userData.user.id).maybeSingle();
  if (error) return { error: error.message, status: 500 };
  const role = profile?.role || userData.user.user_metadata?.role;
  if (!role) return { error: "권한 정보를 찾을 수 없습니다.", status: 403 };
  if (profile?.is_active === false) return { error: "비활성화된 계정입니다.", status: 403 };
  return { requester: { id: userData.user.id, role, email: userData.user.email } };
}

async function accessibleAdvertiserIds(supabase, requester) {
  if (requester.role === "admin") {
    const { data, error } = await supabase.from("pm_advertisers").select("id");
    if (error) throw new Error(error.message);
    return (data || []).map((item) => item.id);
  }
  if (requester.role === "marketer") {
    const { data, error } = await supabase.from("pm_marketer_advertisers").select("advertiser_id").eq("marketer_id", requester.id);
    if (error) throw new Error(error.message);
    return (data || []).map((item) => item.advertiser_id);
  }
  const { data, error } = await supabase.from("pm_advertiser_users").select("advertiser_id").eq("user_id", requester.id);
  if (error) throw new Error(error.message);
  return (data || []).map((item) => item.advertiser_id);
}

async function canManageAdvertiser(supabase, requester, advertiserId) {
  if (requester.role === "admin") return true;
  const table = requester.role === "marketer" ? "pm_marketer_advertisers" : "pm_advertiser_users";
  const idColumn = requester.role === "marketer" ? "marketer_id" : "user_id";
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq(idColumn, requester.id)
    .eq("advertiser_id", advertiserId)
    .eq("permission", "manage")
    .maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(data);
}

async function ensureRules(supabase, advertiserIds, userId) {
  if (!advertiserIds.length) return;
  const { data: existing, error } = await supabase.from("pm_block_rules").select("advertiser_id,rule_key").in("advertiser_id", advertiserIds);
  if (error) throw new Error(error.message);
  const existingKeys = new Set((existing || []).map((row) => `${row.advertiser_id}:${row.rule_key}`));
  const rows = advertiserIds.flatMap((advertiserId) => defaultRules
    .filter((rule) => !existingKeys.has(`${advertiserId}:${rule.rule_key}`))
    .map((rule) => ({ ...rule, advertiser_id: advertiserId, created_by: userId })));
  if (!rows.length) return;
  const { error: insertError } = await supabase.from("pm_block_rules").insert(rows);
  if (insertError) throw new Error(insertError.message);
}

async function withAuth(request) {
  if (!hasServerSupabaseConfig()) {
    return { fallback: json({ ok: isServerLocalMode(), mode: serverMode(), rules: [], error: isServerLocalMode() ? undefined : "SERVER_CONFIGURATION_ERROR" }, { status: isServerLocalMode() ? 200 : 503 }) };
  }
  const supabase = createSupabaseServiceClient();
  const auth = await getRequester(supabase, request);
  if (auth.error) return { fallback: json({ ok: false, error: auth.error }, { status: auth.status }) };
  try {
    const advertiserIds = await accessibleAdvertiserIds(supabase, auth.requester);
    return { supabase, requester: auth.requester, advertiserIds };
  } catch (error) {
    return { fallback: json({ ok: false, error: error.message }, { status: 500 }) };
  }
}

export async function GET(request) {
  const ctx = await withAuth(request);
  if (ctx.fallback) return ctx.fallback;
  const { supabase, requester, advertiserIds } = ctx;
  if (!advertiserIds.length) return json({ ok: true, rules: [] });

  await ensureRules(supabase, advertiserIds, requester.id);

  const { data, error } = await supabase
    .from("pm_block_rules")
    .select("id,advertiser_id,rule_key,rule_name,description,action,threshold,risk_delta,is_enabled,auto_block_create,created_by,created_at,updated_at,advertiser:pm_advertisers(name,blocking_enabled)")
    .in("advertiser_id", advertiserIds)
    .order("advertiser_id")
    .order("rule_key");
  if (error) return json({ ok: false, error: error.message }, { status: 500 });
  return json({ ok: true, rules: (data || []).map(mapRule) });
}

export async function PATCH(request) {
  const ctx = await withAuth(request);
  if (ctx.fallback) return ctx.fallback;
  const { supabase, requester } = ctx;
  const body = await request.json().catch(() => ({}));

  if (body.blocking_enabled !== undefined || body.blockingEnabled !== undefined) {
    const advertiserId = body.advertiser_id || body.advertiserId;
    if (!advertiserId) return json({ ok: false, error: "advertiser_id가 필요합니다." }, { status: 400 });
    const allowed = await canManageAdvertiser(supabase, requester, advertiserId);
    if (!allowed) return json({ ok: false, error: "긴급 중지 설정 권한이 없습니다." }, { status: 403 });
    const blockingEnabled = body.blocking_enabled ?? body.blockingEnabled;
    const { data, error } = await supabase
      .from("pm_advertisers")
      .update({ blocking_enabled: Boolean(blockingEnabled), updated_at: new Date().toISOString() })
      .eq("id", advertiserId)
      .select("id,blocking_enabled")
      .single();
    if (error) return json({ ok: false, error: error.message }, { status: 500 });
    return json({ ok: true, advertiser: { id: data.id, blockingEnabled: data.blocking_enabled } });
  }

  const id = body.id;
  const advertiserId = body.advertiser_id || body.advertiserId;
  const ruleKey = body.rule_key || body.ruleKey;
  let query = supabase.from("pm_block_rules").select("id,advertiser_id").limit(1);
  if (id) query = query.eq("id", id);
  else query = query.eq("advertiser_id", advertiserId).eq("rule_key", ruleKey);

  const { data: target, error: targetError } = await query.maybeSingle();
  if (targetError) return json({ ok: false, error: targetError.message }, { status: 500 });
  if (!target) return json({ ok: false, error: "rule not found" }, { status: 404 });

  const allowed = await canManageAdvertiser(supabase, requester, target.advertiser_id);
  if (!allowed) return json({ ok: false, error: "규칙을 변경할 권한이 없습니다." }, { status: 403 });

  const patch = { updated_at: new Date().toISOString() };
  if (typeof body.is_enabled === "boolean") patch.is_enabled = body.is_enabled;
  if (typeof body.isEnabled === "boolean") patch.is_enabled = body.isEnabled;
  if (typeof body.auto_block_create === "boolean") patch.auto_block_create = body.auto_block_create;
  if (typeof body.autoBlockCreate === "boolean") patch.auto_block_create = body.autoBlockCreate;
  if (body.threshold !== undefined) patch.threshold = body.threshold === "" || body.threshold === null ? null : Number(body.threshold);
  if (body.action !== undefined) patch.action = body.action;
  if (body.risk_delta !== undefined) patch.risk_delta = Number(body.risk_delta);
  if (body.riskDelta !== undefined) patch.risk_delta = Number(body.riskDelta);

  const { data, error } = await supabase
    .from("pm_block_rules")
    .update(patch)
    .eq("id", target.id)
    .select("id,advertiser_id,rule_key,rule_name,description,action,threshold,risk_delta,is_enabled,auto_block_create,created_by,created_at,updated_at,advertiser:pm_advertisers(name,blocking_enabled)")
    .single();
  if (error) return json({ ok: false, error: error.message }, { status: 500 });
  return json({ ok: true, rule: mapRule(data) });
}
