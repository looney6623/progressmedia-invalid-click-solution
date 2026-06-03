const SOURCE_LABELS = {
  naver: "네이버",
  meta: "메타/인스타그램",
  google: "구글",
  direct: "직접 유입",
  other: "기타"
};

function readField(item, ...keys) {
  for (const key of keys) {
    const value = item?.[key];
    if (value !== undefined && value !== null && String(value).trim() !== "") return String(value);
  }
  return "";
}

function normalize(value = "") {
  return String(value).toLowerCase();
}

export function classifyTrafficSource(item = {}) {
  const referrer = normalize(readField(item, "referrer"));
  const pageUrl = normalize(readField(item, "pageUrl", "page_url", "landingPage"));
  const utm = normalize(readField(item, "utm", "utmSource", "utm_source", "media"));
  const haystack = `${referrer} ${pageUrl} ${utm}`;

  if (/naver\.com|search\.naver\.com|m\.search\.naver\.com|utm_source=naver|utm_source=naver_search|\bnaver\b|네이버/.test(haystack)) {
    return { key: "naver", label: SOURCE_LABELS.naver };
  }

  if (/instagram\.com|facebook\.com|fbclid=|utm_source=(facebook|instagram|meta)|\binstagram\b|\bfacebook\b|\big\b|\bpaid_social\b|\bmeta\b|인스타그램|페이스북|메타/.test(haystack)) {
    return { key: "meta", label: SOURCE_LABELS.meta };
  }

  if (/google\.com|google\.[a-z.]+|gclid=|utm_source=google|\bgoogle\b|구글/.test(haystack)) {
    return { key: "google", label: SOURCE_LABELS.google };
  }

  if (/직접 유입|direct/.test(haystack) || (!referrer && !utm && !/[?&](gclid|fbclid)=/.test(pageUrl))) {
    return { key: "direct", label: SOURCE_LABELS.direct };
  }

  return { key: "other", label: SOURCE_LABELS.other };
}

export function trafficSourceLabel(item = {}) {
  return classifyTrafficSource(item).label;
}

export function isAdTraffic(item = {}) {
  const key = classifyTrafficSource(item).key;
  return key === "naver" || key === "meta" || key === "google";
}

export function rawTrafficDetail(item = {}) {
  return readField(item, "utm", "utmSource", "referrer", "media") || "-";
}
