function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function downloadClickReportCsv(logs, conversionEvents = []) {
  const conversionKeys = new Set(conversionEvents.map((event) => `${event.visitorId}:${event.sessionId}:${event.advertiserId}`));
  const header = [
    "광고주명",
    "client_id",
    "시간",
    "IP 마스킹",
    "페이지 URL",
    "referrer",
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "click_status",
    "risk_score",
    "recent_count",
    "reason",
    "stay_time",
    "conversion 여부"
  ];
  const rows = logs.map((log) => {
    const hasConversion = conversionKeys.has(`${log.visitorId || ""}:${log.sessionId || ""}:${log.advertiserId || ""}`);
    return [
      log.advertiser,
      log.clientId,
      log.dateTime,
      log.ipMasked || log.ip,
      log.landingPage,
      log.referrer,
      log.utmSource,
      log.utmMedium,
      log.utmCampaign,
      log.statusRaw || log.status,
      log.riskScore,
      log.recentCount || log.clickCountIn10Min,
      log.reason,
      log.dwellSeconds,
      hasConversion ? "Y" : "N"
    ];
  });
  const csv = [header, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "progressmedia-invalid-click-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}
