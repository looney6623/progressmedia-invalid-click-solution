function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function scopedIpKey(item) {
  return `${item.advertiserId || ""}:${item.ipHash || item.ipMasked || item.ip || ""}`;
}

export function enrichWithManualBlocks(logs, manualBlocks) {
  const blockMap = new Map(manualBlocks.map((item) => [scopedIpKey(item), item.reason]));
  return logs.map((log) => {
    const manualReason = blockMap.get(scopedIpKey(log));
    if (!manualReason) return log;
    return {
      ...log,
      status: "차단",
      riskScore: Math.max(log.riskScore, 95),
      reason: `수동 차단 IP: ${manualReason}`
    };
  });
}

export function filterClicks(logs, filters) {
  const latest = logs.reduce((max, log) => (log.createdAt > max ? log.createdAt : max), logs[0]?.createdAt || new Date("2026-05-27T14:30:00+09:00"));
  const latestKey = toDateKey(latest);
  const query = filters.query.trim().toLowerCase();
  const advertiserFilter = filters.advertiser;

  return logs.filter((log) => {
    if (advertiserFilter !== "전체") {
      const matchesAdvertiserId = log.advertiserId && log.advertiserId === advertiserFilter;
      const matchesAdvertiserName = log.advertiser === advertiserFilter;
      if (!matchesAdvertiserId && !matchesAdvertiserName) return false;
    }
    if (filters.media !== "전체" && log.media !== filters.media) return false;
    if (filters.status !== "전체" && log.status !== filters.status) return false;

    if (filters.dateRange === "오늘" && toDateKey(log.createdAt) !== latestKey) return false;
    if (filters.dateRange === "최근 7일" && latest.getTime() - log.createdAt.getTime() > 7 * 24 * 60 * 60 * 1000) return false;
    if (filters.dateRange === "최근 30일" && latest.getTime() - log.createdAt.getTime() > 30 * 24 * 60 * 60 * 1000) return false;

    if (!query) return true;
    return [log.ip, log.advertiser, log.media, log.reason].some((value) => String(value).toLowerCase().includes(query));
  });
}
