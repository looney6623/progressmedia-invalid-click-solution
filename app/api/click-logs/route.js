import { NextResponse } from "next/server";
import { createSupabaseServiceClient, hasServerSupabaseConfig, isServerLocalMode, serverMode } from "@/lib/serverSupabase";

function json(body, init = {}) {
  return NextResponse.json(body, init);
}

function bearerToken(request) {
  const header = request.headers.get("authorization") || "";
  return header.startsWith("Bearer ") ? header.slice(7) : "";
}

function isSchemaColumnError(error) {
  const message = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return message.includes("pgrst204") || message.includes("42703") || message.includes("status_corrected") || message.includes("updated_at");
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

  return { requester: { id: userData.user.id, role, email: userData.user.email } };
}

async function canManageAdvertiser(supabase, requester, advertiserId) {
  if (requester.role === "admin") return true;

  const table = requester.role === "marketer" ? "pm_marketer_advertisers" : "pm_advertiser_users";
  const idColumn = requester.role === "marketer" ? "marketer_id" : "user_id";

  if (!["marketer", "advertiser"].includes(requester.role)) return false;

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

export async function PATCH(request) {
  if (!hasServerSupabaseConfig()) {
    return json({ ok: isServerLocalMode(), mode: serverMode(), error: isServerLocalMode() ? undefined : "SERVER_CONFIGURATION_ERROR" }, { status: isServerLocalMode() ? 200 : 503 });
  }

  const supabase = createSupabaseServiceClient();
  const auth = await getRequester(supabase, request);
  if (auth.error) return json({ ok: false, error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => ({}));
  const logId = body.log_id || body.logId;
  const clickStatus = body.click_status || body.clickStatus;
  const operatorReason = (body.reason || "운영자 로그 상태 정정").trim();

  if (!logId) return json({ ok: false, error: "log_id가 필요합니다." }, { status: 400 });
  if (!["normal", "suspicious", "blocked"].includes(clickStatus)) {
    return json({ ok: false, error: "click_status 값이 올바르지 않습니다." }, { status: 400 });
  }

  const { data: target, error: targetError } = await supabase
    .from("pm_click_logs")
    .select("id,advertiser_id,reason")
    .eq("id", logId)
    .maybeSingle();
  if (targetError) return json({ ok: false, error: targetError.message }, { status: 500 });
  if (!target) return json({ ok: false, error: "log not found" }, { status: 404 });

  let allowed = false;
  try {
    allowed = await canManageAdvertiser(supabase, auth.requester, target.advertiser_id);
  } catch (error) {
    return json({ ok: false, error: error.message }, { status: 500 });
  }
  if (!allowed) return json({ ok: false, error: "로그 상태를 변경할 권한이 없습니다." }, { status: 403 });

  const now = new Date().toISOString();
  const correctedReason = `[상태 정정] ${operatorReason}`;
  const updatePayload = {
    click_status: clickStatus,
    reason: correctedReason,
    applied_rules: body.applied_rules || body.appliedRules || [],
    updated_at: now,
    status_corrected_at: now,
    status_corrected_by: auth.requester.id
  };

  let { data, error } = await supabase
    .from("pm_click_logs")
    .update(updatePayload)
    .eq("id", logId)
    .select("id,advertiser_id,click_status,reason,applied_rules,updated_at,status_corrected_at,status_corrected_by")
    .single();

  if (error && isSchemaColumnError(error)) {
    const fallbackPayload = {
      click_status: clickStatus,
      reason: correctedReason,
      applied_rules: body.applied_rules || body.appliedRules || []
    };
    const fallback = await supabase
      .from("pm_click_logs")
      .update(fallbackPayload)
      .eq("id", logId)
      .select("id,advertiser_id,click_status,reason,applied_rules")
      .single();
    data = fallback.data;
    error = fallback.error;
  }

  if (error) return json({ ok: false, error: error.message }, { status: 500 });
  return json({ ok: true, log: data });
}
