const TEN_MINUTES_MS = 10 * 60 * 1000;

const fallbackRules = [
  { rule_key: "repeat_click_suspicious", rule_name: "반복 클릭 의심", action: "suspicious", threshold: 3, risk_delta: 0, is_enabled: true, auto_block_create: false },
  { rule_key: "repeat_click_block", rule_name: "반복 클릭 차단", action: "blocked", threshold: 5, risk_delta: 0, is_enabled: true, auto_block_create: false },
  { rule_key: "short_stay", rule_name: "짧은 체류", action: "monitor", threshold: 3, risk_delta: 12, is_enabled: true, auto_block_create: false },
  { rule_key: "no_page_move", rule_name: "무이동 세션", action: "monitor", threshold: 0, risk_delta: 10, is_enabled: true, auto_block_create: false },
  { rule_key: "partner_media_watch", rule_name: "제휴 매체 관찰", action: "monitor", threshold: null, risk_delta: 0, is_enabled: false, auto_block_create: false }
];

function normalizeRule(row) {
  return {
    rule_key: row.rule_key,
    rule_name: row.rule_name,
    action: row.action,
    threshold: row.threshold,
    risk_delta: row.risk_delta || 0,
    is_enabled: row.is_enabled !== false,
    auto_block_create: row.auto_block_create === true
  };
}

async function fetchRules(supabase, advertiserId) {
  try {
    const { data, error } = await supabase
      .from("pm_block_rules")
      .select("rule_key,rule_name,action,threshold,risk_delta,is_enabled,auto_block_create")
      .eq("advertiser_id", advertiserId);
    if (error) throw error;
    if (!data?.length) return fallbackRules;
    const byKey = new Map(data.map((rule) => [rule.rule_key, normalizeRule(rule)]));
    return fallbackRules.map((rule) => byKey.get(rule.rule_key) || rule);
  } catch (error) {
    console.error("[invalid-click] block rules lookup failed", error?.message || error);
    return fallbackRules;
  }
}

function getRule(rules, key, blockingEnabled = true) {
  if (!blockingEnabled) return null;
  return rules.find((rule) => rule.rule_key === key && rule.is_enabled !== false);
}

export async function detectInvalidClick({
  supabase,
  advertiserId,
  ipHash,
  stayTime = null,
  pageCount = 1,
  referrer = "",
  utmSource = "",
  blockingEnabled = true
}) {
  const reasons = [];
  const appliedRules = [];
  let riskScore = 10;
  let recentCount = 1;
  let matchedBlock = null;
  const rules = await fetchRules(supabase, advertiserId);

  try {
    const { data, error } = await supabase
      .from("pm_blocked_ips")
      .select("id,reason,block_type,source")
      .eq("advertiser_id", advertiserId)
      .eq("ip_hash", ipHash)
      .eq("is_active", true)
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    if (data) {
      matchedBlock = data;
      return {
        click_status: "blocked",
        clickStatus: "blocked",
        risk_score: 100,
        riskScore: 100,
        reason: data.reason ? `활성 차단 IP: ${data.reason}` : "활성 차단 IP",
        recent_count: recentCount,
        recentCount,
        matched_block: matchedBlock,
        matchedBlock,
        applied_rules: [{ rule_key: "active_blocked_ip", action: "blocked" }],
        appliedRules: [{ rule_key: "active_blocked_ip", action: "blocked" }],
        auto_block_create: false,
        autoBlockCreate: false
      };
    }
  } catch (error) {
    console.error("[invalid-click] blocked ip lookup failed", error?.message || error);
    reasons.push("blocked_ip_check_failed");
  }

  try {
    const since = new Date(Date.now() - TEN_MINUTES_MS).toISOString();
    const { count, error } = await supabase
      .from("pm_click_logs")
      .select("id", { count: "exact", head: true })
      .eq("advertiser_id", advertiserId)
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if (error) throw error;
    recentCount = (count || 0) + 1;
  } catch (error) {
    console.error("[invalid-click] recent click count failed", error?.message || error);
    reasons.push("recent_click_count_failed");
  }

  let clickStatus = "normal";
  let autoBlockCreate = false;

  const blockRule = getRule(rules, "repeat_click_block", blockingEnabled);
  const suspiciousRule = getRule(rules, "repeat_click_suspicious", blockingEnabled);

  if (blockRule && recentCount >= (blockRule.threshold ?? 5)) {
    clickStatus = "blocked";
    riskScore = Math.max(riskScore, 90);
    autoBlockCreate = blockRule.auto_block_create === true;
    reasons.push(`10분 내 ${blockRule.threshold ?? 5}회 이상 반복 클릭`);
    appliedRules.push({ rule_key: blockRule.rule_key, action: "blocked", threshold: blockRule.threshold ?? 5, auto_block_create: autoBlockCreate });
  } else if (suspiciousRule && recentCount >= (suspiciousRule.threshold ?? 3)) {
    clickStatus = "suspicious";
    riskScore = Math.max(riskScore, 64);
    reasons.push(`10분 내 ${suspiciousRule.threshold ?? 3}회 이상 반복 클릭`);
    appliedRules.push({ rule_key: suspiciousRule.rule_key, action: "suspicious", threshold: suspiciousRule.threshold ?? 3 });
  }

  const shortStayRule = getRule(rules, "short_stay", blockingEnabled);
  if (shortStayRule && typeof stayTime === "number" && stayTime <= (shortStayRule.threshold ?? 3)) {
    riskScore += shortStayRule.risk_delta || 0;
    reasons.push(`체류시간 ${shortStayRule.threshold ?? 3}초 이하`);
    appliedRules.push({ rule_key: shortStayRule.rule_key, action: shortStayRule.action, threshold: shortStayRule.threshold, risk_delta: shortStayRule.risk_delta });
  }

  const noMoveRule = getRule(rules, "no_page_move", blockingEnabled);
  if (noMoveRule && Number(pageCount || 0) <= (noMoveRule.threshold ?? 0)) {
    riskScore += noMoveRule.risk_delta || 0;
    reasons.push("페이지 이동 0회");
    appliedRules.push({ rule_key: noMoveRule.rule_key, action: noMoveRule.action, threshold: noMoveRule.threshold, risk_delta: noMoveRule.risk_delta });
  }

  const partnerRule = getRule(rules, "partner_media_watch", blockingEnabled);
  if (partnerRule && /partner|affiliate|제휴/i.test(`${referrer} ${utmSource}`)) {
    reasons.push("제휴 매체 관찰 대상");
    appliedRules.push({ rule_key: partnerRule.rule_key, action: "monitor" });
  }

  if (!blockingEnabled) {
    reasons.push("자동 차단 중지 상태");
  }

  riskScore = Math.min(riskScore, 100);

  return {
    click_status: clickStatus,
    clickStatus,
    risk_score: riskScore,
    riskScore,
    reason: reasons.length ? reasons.join(", ") : "normal",
    recent_count: recentCount,
    recentCount,
    matched_block: matchedBlock,
    matchedBlock,
    applied_rules: appliedRules,
    appliedRules,
    auto_block_create: autoBlockCreate,
    autoBlockCreate
  };
}
