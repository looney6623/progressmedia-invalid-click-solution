import {
  clickLogs,
  getAdvertiserStats,
  getBlockRules,
  getHourlyTrend,
  getMediaStats,
  summarizeClicks
} from "@/lib/clickData";

export async function fetchClickLogs() {
  return clickLogs;
}

export async function fetchClickDashboard(logs = clickLogs) {
  return {
    summary: summarizeClicks(logs),
    advertiserStats: getAdvertiserStats(logs),
    mediaStats: getMediaStats(logs),
    hourlyTrend: getHourlyTrend(logs)
  };
}

export async function fetchBlockRules() {
  return getBlockRules();
}
