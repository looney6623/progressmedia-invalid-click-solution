const TEN_MINUTES_MS = 10 * 60 * 1000;

export async function detectInvalidClick({ supabase, advertiserId, ipHash, stayTime = null, pageCount = 1 }) {
  const reasons = [];
  let riskScore = 10;
  let recentCount = 1;
  let matchedBlock = null;

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
        reason: data.reason ? `manual_block: ${data.reason}` : "manual_block",
        recent_count: recentCount,
        recentCount,
        matched_block: matchedBlock,
        matchedBlock
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

  if (recentCount >= 5) {
    riskScore = Math.max(riskScore, 90);
    reasons.push("10분 내 5회 이상 반복 클릭");
  } else if (recentCount >= 3) {
    riskScore = Math.max(riskScore, 64);
    reasons.push("10분 내 3회 이상 반복 클릭");
  }

  if (typeof stayTime === "number" && stayTime <= 3) {
    riskScore += 12;
    reasons.push("체류시간 3초 이하");
  }

  if (Number(pageCount || 0) === 0) {
    riskScore += 10;
    reasons.push("페이지 이동 0회");
  }

  riskScore = Math.min(riskScore, 100);
  const clickStatus = recentCount >= 5
    ? "blocked"
    : recentCount >= 3
      ? "suspicious"
      : "normal";

  return {
    click_status: clickStatus,
    clickStatus,
    risk_score: riskScore,
    riskScore,
    reason: reasons.length ? reasons.join(", ") : "normal",
    recent_count: recentCount,
    recentCount,
    matched_block: matchedBlock,
    matchedBlock
  };
}
