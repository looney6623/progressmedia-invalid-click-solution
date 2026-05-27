export function downloadClickReportCsv(logs) {
  const header = ["시간", "광고주", "캠페인", "매체", "IP", "기기", "지역", "체류시간", "페이지 이동", "10분 클릭", "위험도", "상태", "판정 사유", "CPC"];
  const rows = logs.map((log) => [
    log.createdAt.toLocaleString("ko-KR"),
    log.advertiser,
    log.campaign,
    log.media,
    log.ip,
    log.device,
    log.region,
    `${log.dwellSeconds}s`,
    log.pageViews,
    log.clickCountIn10Min,
    log.riskScore,
    log.status,
    log.reason,
    log.cpc
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "progressmedia-invalid-click-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}
