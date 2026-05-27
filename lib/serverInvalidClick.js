const TEN_MINUTES_MS = 10 * 60 * 1000;

export async function detectInvalidClick({ supabase, advertiserId, ipHash, stayTime = null, pageCount = 1 }) {
  const reasons = [];
  let riskScore = 10;

  try {
    const { data: blockedRows, error: blockedError } = await supabase
      .from("pm_blocked_ips")
      .select("id,reason")
      .eq("advertiser_id", advertiserId)
      .eq("ip_hash", ipHash)
      .is("released_at", null)
      .limit(1);

    if (!blockedError && blockedRows?.length) {
      return {
        clickStatus: "blocked",
        riskScore: 100,
        reason: blockedRows[0].reason ? `blocked_ip: ${blockedRows[0].reason}` : "blocked_ip"
      };
    }
  } catch {
    reasons.push("blocked_ip_check_failed");
  }

  let clickCountIn10Min = 1;
  try {
    const since = new Date(Date.now() - TEN_MINUTES_MS).toISOString();
    const { count, error } = await supabase
      .from("pm_click_logs")
      .select("id", { count: "exact", head: true })
      .eq("advertiser_id", advertiserId)
      .eq("ip_hash", ipHash)
      .gte("created_at", since);

    if (!error) clickCountIn10Min = (count || 0) + 1;
    else reasons.push("recent_click_count_failed");
  } catch {
    reasons.push("recent_click_count_failed");
  }

  if (clickCountIn10Min >= 5) {
    riskScore = Math.max(riskScore, 90);
    reasons.push("10분 내 5회 이상 클릭");
  } else if (clickCountIn10Min >= 3) {
    riskScore = Math.max(riskScore, 64);
    reasons.push("10분 내 3회 이상 클릭");
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
  const clickStatus = clickCountIn10Min >= 5 || riskScore >= 88
    ? "blocked"
    : clickCountIn10Min >= 3 || riskScore >= 58
      ? "suspicious"
      : "normal";

  return {
    clickStatus,
    riskScore,
    reason: reasons.length ? reasons.join(", ") : "normal"
  };
}
