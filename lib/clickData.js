import { classifyClicks } from "@/lib/detectInvalidClick";

const advertisers = [
  { name: "샤브20", avgCpc: 1320 },
  { name: "3분페이", avgCpc: 2180 },
  { name: "대주바이오", avgCpc: 1640 },
  { name: "바른숨병원", avgCpc: 2860 },
  { name: "온리원쇼핑몰", avgCpc: 760 }
];

const media = ["네이버 검색", "구글 검색", "메타", "카카오", "제휴 매체"];
const campaigns = ["브랜드 방어", "상담 전환", "지역 확장", "리타겟팅", "프로모션"];
const keywordGroups = ["브랜드명", "가격 비교", "상담 예약", "근처 매장", "할인 이벤트", "후기 검색", "가맹 문의"];
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

  for (let i = 0; i < 112; i += 1) {
    const advertiser = advertisers[i % advertisers.length];
    const createdAt = minutesAgo(now, i * 7 + (i % 6));
    clicks.push({
      id: `CLK-${id + i}`,
      createdAt,
      advertiser: advertiser.name,
      campaign: campaigns[i % campaigns.length],
      keyword: keywordGroups[(i * 2) % keywordGroups.length],
      media: media[(i * 2) % media.length],
      ip: ipFromSeed(i),
      device: devices[i % devices.length],
      region: regions[(i * 3) % regions.length],
      userAgent: userAgents[(i * 4) % userAgents.length],
      landingPage: ["/landing/brand", "/consult", "/event", "/store", "/product"][i % 5],
      dwellSeconds: 4 + ((i * 7) % 54),
      pageViews: 1 + (i % 5),
      cpc: advertiser.avgCpc + ((i % 6) - 2) * 80
    });
  }

  const burstProfiles = [
    {
      advertiser: "샤브20",
      media: "네이버 검색",
      campaign: "브랜드 방어",
      keyword: "샤브20 가격",
      ip: "211.44.18.91",
      count: 5,
      dwell: 2,
      pages: 0
    },
    {
      advertiser: "바른숨병원",
      media: "구글 검색",
      campaign: "상담 전환",
      keyword: "수면클리닉 예약",
      ip: "118.39.72.14",
      count: 4,
      dwell: 3,
      pages: 0
    },
    {
      advertiser: "3분페이",
      media: "제휴 매체",
      campaign: "가맹 문의",
      keyword: "간편결제 수수료",
      ip: "59.9.104.201",
      count: 6,
      dwell: 1,
      pages: 0
    },
    {
      advertiser: "온리원쇼핑몰",
      media: "메타",
      campaign: "프로모션",
      keyword: "신규회원 쿠폰",
      ip: "175.22.64.33",
      count: 3,
      dwell: 2,
      pages: 1
    },
    {
      advertiser: "대주바이오",
      media: "카카오",
      campaign: "지역 확장",
      keyword: "건강기능식품 OEM",
      ip: "106.240.88.17",
      count: 5,
      dwell: 2,
      pages: 0
    }
  ];

  burstProfiles.forEach((profile, profileIndex) => {
    for (let i = 0; i < profile.count; i += 1) {
      const advertiser = advertisers.find((item) => item.name === profile.advertiser);
      clicks.push({
        id: `CLK-B${profileIndex}${i}`,
        createdAt: minutesAgo(now, profileIndex * 14 + i * 2),
        advertiser: profile.advertiser,
        campaign: profile.campaign,
        keyword: profile.keyword,
        media: profile.media,
        ip: profile.ip,
        device: i % 2 === 0 ? "Mobile" : "PC",
        region: regions[(profileIndex + i) % regions.length],
        userAgent: userAgents[(profileIndex + i) % userAgents.length],
        landingPage: i % 2 === 0 ? "/consult" : "/landing/brand",
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
    { id: "R-01", name: "반복 클릭 의심", condition: "동일 IP 10분 내 3회 클릭", action: "의심 처리", enabled: true, count: 21 },
    { id: "R-02", name: "반복 클릭 차단", condition: "동일 IP 10분 내 5회 클릭", action: "자동 차단", enabled: true, count: 13 },
    { id: "R-03", name: "짧은 체류", condition: "체류시간 3초 이하", action: "위험도 +12", enabled: true, count: 24 },
    { id: "R-04", name: "무이동 세션", condition: "페이지 이동 0회", action: "위험도 +10", enabled: true, count: 19 },
    { id: "R-05", name: "제휴 매체 관찰", condition: "제휴 매체 위험 클릭 집중", action: "모니터링", enabled: false, count: 7 }
  ];
}

export const currency = new Intl.NumberFormat("ko-KR", {
  style: "currency",
  currency: "KRW",
  maximumFractionDigits: 0
});
