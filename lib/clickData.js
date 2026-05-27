import { classifyClicks } from "@/lib/detectInvalidClick";

const advertisers = [
  { name: "브랜드A", avgCpc: 1240 },
  { name: "병원B", avgCpc: 1860 },
  { name: "쇼핑몰C", avgCpc: 720 },
  { name: "교육D", avgCpc: 980 },
  { name: "금융E", avgCpc: 2420 }
];

const media = ["네이버 검색", "구글 검색", "카카오", "메타", "제휴 매체"];
const campaigns = ["브랜드", "전환", "리타겟팅", "지역 확장", "프로모션"];
const devices = ["PC", "Mobile", "Tablet"];
const regions = ["서울", "경기", "부산", "대구", "인천", "광주", "대전"];
const userAgents = ["Chrome", "Safari", "Edge", "Samsung Internet", "Firefox"];

function minutesAgo(base, minutes) {
  return new Date(base.getTime() - minutes * 60 * 1000);
}

function ipFromSeed(seed, burst = 0) {
  return `121.${44 + (seed % 28)}.${18 + (burst % 72)}.${10 + (seed % 210)}`;
}

function buildBaseClicks() {
  const now = new Date("2026-05-27T14:30:00+09:00");
  const clicks = [];
  let id = 1000;

  for (let i = 0; i < 96; i += 1) {
    const advertiser = advertisers[i % advertisers.length];
    const createdAt = minutesAgo(now, i * 8 + (i % 5));
    clicks.push({
      id: `CLK-${id + i}`,
      createdAt,
      advertiser: advertiser.name,
      campaign: campaigns[i % campaigns.length],
      media: media[(i * 2) % media.length],
      ip: ipFromSeed(i),
      device: devices[i % devices.length],
      region: regions[(i * 3) % regions.length],
      userAgent: userAgents[(i * 4) % userAgents.length],
      dwellSeconds: 4 + ((i * 7) % 54),
      pageViews: 1 + (i % 5),
      cpc: advertiser.avgCpc + ((i % 6) - 2) * 80
    });
  }

  const burstProfiles = [
    { advertiser: "브랜드A", media: "네이버 검색", campaign: "브랜드", ip: "211.44.18.91", count: 5, dwell: 2, pages: 0 },
    { advertiser: "병원B", media: "구글 검색", campaign: "지역 확장", ip: "118.39.72.14", count: 4, dwell: 3, pages: 0 },
    { advertiser: "금융E", media: "제휴 매체", campaign: "전환", ip: "59.9.104.201", count: 6, dwell: 1, pages: 0 },
    { advertiser: "쇼핑몰C", media: "메타", campaign: "프로모션", ip: "175.22.64.33", count: 3, dwell: 2, pages: 1 }
  ];

  burstProfiles.forEach((profile, profileIndex) => {
    for (let i = 0; i < profile.count; i += 1) {
      const advertiser = advertisers.find((item) => item.name === profile.advertiser);
      clicks.push({
        id: `CLK-B${profileIndex}${i}`,
        createdAt: minutesAgo(now, profileIndex * 17 + i * 2),
        advertiser: profile.advertiser,
        campaign: profile.campaign,
        media: profile.media,
        ip: profile.ip,
        device: i % 2 === 0 ? "Mobile" : "PC",
        region: regions[(profileIndex + i) % regions.length],
        userAgent: userAgents[(profileIndex + i) % userAgents.length],
        dwellSeconds: profile.dwell + (i % 2),
        pageViews: profile.pages,
        cpc: advertiser.avgCpc + i * 60
      });
    }
  });

  return clicks.sort((a, b) => b.createdAt - a.createdAt);
}

export const clickLogs = classifyClicks(buildBaseClicks());

export function summarizeClicks(logs = clickLogs) {
  const total = logs.length;
  const normal = logs.filter((item) => item.status === "정상").length;
  const suspicious = logs.filter((item) => item.status === "의심").length;
  const blocked = logs.filter((item) => item.status === "차단").length;
  const suspiciousRate = total ? ((suspicious + blocked) / total) * 100 : 0;
  const savedCost = logs.filter((item) => item.status === "차단").reduce((sum, item) => sum + item.cpc, 0);

  return { total, normal, suspicious, blocked, suspiciousRate, savedCost };
}

function groupBy(logs, key) {
  return logs.reduce((acc, item) => {
    const value = item[key];
    acc[value] ||= { name: value, total: 0, normal: 0, suspicious: 0, blocked: 0, savedCost: 0 };
    acc[value].total += 1;
    if (item.status === "정상") acc[value].normal += 1;
    if (item.status === "의심") acc[value].suspicious += 1;
    if (item.status === "차단") {
      acc[value].blocked += 1;
      acc[value].savedCost += item.cpc;
    }
    return acc;
  }, {});
}

export function getAdvertiserStats(logs = clickLogs) {
  return Object.values(groupBy(logs, "advertiser")).sort((a, b) => b.total - a.total);
}

export function getMediaStats(logs = clickLogs) {
  return Object.values(groupBy(logs, "media")).sort((a, b) => b.total - a.total);
}

export function getHourlyTrend(logs = clickLogs) {
  const grouped = groupBy(logs, "hour");
  return Object.values(grouped).sort((a, b) => a.name.localeCompare(b.name));
}

export function getBlockRules() {
  return [
    { id: "R-01", name: "반복 클릭 의심", condition: "동일 IP 10분 내 3회 클릭", action: "의심 처리", enabled: true, count: 14 },
    { id: "R-02", name: "반복 클릭 차단", condition: "동일 IP 10분 내 5회 클릭", action: "자동 차단", enabled: true, count: 9 },
    { id: "R-03", name: "짧은 체류", condition: "체류시간 3초 이하", action: "위험도 +12", enabled: true, count: 18 },
    { id: "R-04", name: "무이동 세션", condition: "페이지 이동 0회", action: "위험도 +10", enabled: true, count: 16 },
    { id: "R-05", name: "저품질 매체 관찰", condition: "제휴 매체 위험 클릭 집중", action: "모니터링", enabled: false, count: 5 }
  ];
}

export const currency = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0
});
