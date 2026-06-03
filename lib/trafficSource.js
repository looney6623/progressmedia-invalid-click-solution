export const TRAFFIC_SOURCE_LABELS = {
  naver: "네이버",
  meta: "메타/인스타그램",
  google: "구글",
  direct: "직접 유입",
  other: "기타"
};

export const TRAFFIC_SOURCE_OPTIONS = [
  { value: "all", label: "전체" },
  { value: "naver", label: TRAFFIC_SOURCE_LABELS.naver },
  { value: "meta", label: TRAFFIC_SOURCE_LABELS.meta },
  { value: "google", label: TRAFFIC_SOURCE_LABELS.google },
  { value: "direct", label: TRAFFIC_SOURCE_LABELS.direct },
  { value: "other", label: TRAFFIC_SOURCE_LABELS.other }
];

function readField(item, ...keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function normalize(value = "") {
  return String(value).trim().toLowerCase();
}

function hasNoSource(referrer, utmSource, media) {
  return !referrer && !utmSource && !media;
}

export function classifyTrafficSource(item = {}) {
  const referrer = normalize(readField(item, "referrer"));
  const utmSource = normalize(readField(item, "utm_source", "utmSource"));
  const utmMedium = normalize(readField(item, "utm_medium", "utmMedium"));
  const utmCampaign = normalize(readField(item, "utm_campaign", "utmCampaign"));
  const utmTerm = normalize(readField(item, "utm_term", "utmTerm"));
  const utmContent = normalize(readField(item, "utm_content", "utmContent"));
  const utm = normalize(readField(item, "utm"));
  const media = normalize(readField(item, "media"));
  const campaign = normalize(readField(item, "campaign"));
  const pageUrl = normalize(readField(item, "page_url", "pageUrl", "landingPage"));
  const combined = [referrer, utmSource, utmMedium, utmCampaign, utmTerm, utmContent, utm, media, campaign, pageUrl].join(" ");

  if (
    referrer.includes("naver.com") ||
    utmSource === "naver" ||
    /naver|네이버/.test(`${media} ${campaign}`)
  ) {
    return { key: "naver", label: TRAFFIC_SOURCE_LABELS.naver };
  }

  if (
    referrer.includes("instagram.com") ||
    referrer.includes("facebook.com") ||
    pageUrl.includes("fbclid=") ||
    referrer.includes("fbclid=") ||
    ["facebook", "instagram", "meta", "fb", "ig"].includes(utmSource) ||
    /paid|meta|instagram|facebook|\big\b|인스타그램|페이스북|메타/.test(`${utmMedium} ${campaign}`)
  ) {
    return { key: "meta", label: TRAFFIC_SOURCE_LABELS.meta };
  }

  if (
    referrer.includes("google.com") ||
    utmSource === "google" ||
    pageUrl.includes("gclid=") ||
    referrer.includes("gclid=") ||
    /\bgoogle\b|구글/.test(combined)
  ) {
    return { key: "google", label: TRAFFIC_SOURCE_LABELS.google };
  }

  if (hasNoSource(referrer, utmSource, media) || /직접 유입|\bdirect\b/.test(combined)) {
    return { key: "direct", label: TRAFFIC_SOURCE_LABELS.direct };
  }

  return { key: "other", label: TRAFFIC_SOURCE_LABELS.other };
}

export function trafficSourceKey(item = {}) {
  return classifyTrafficSource(item).key;
}

export function trafficSourceLabel(item = {}) {
  return classifyTrafficSource(item).label;
}

export function isAdTraffic(item = {}) {
  const key = trafficSourceKey(item);
  return key === "naver" || key === "meta" || key === "google";
}

export function rawTrafficDetail(item = {}) {
  return readField(item, "utm", "utmSource", "utm_source", "referrer", "media", "campaign") || "-";
}
