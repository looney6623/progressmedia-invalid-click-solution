function escapeCsv(value) {
  return `"${String(value ?? "").replaceAll('"', '""')}"`;
}

export function downloadClickReportCsv(logs, conversionEvents = []) {
  const conversionKeys = new Set(conversionEvents.map((event) => `${event.visitorId}:${event.sessionId}:${event.advertiserId}`));
  const header = [
    "광고주명",
    "고객 코드",
    "시간",
    "IP 마스킹",
    "방문 페이지",
    "유입 경로",
    "캠페인 출처",
    "캠페인 매체",
    "캠페인명",
    "상태",
    "위험도",
    "최근 클릭",
    "판정 사유",
    "체류시간",
    "전환 여부"
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
