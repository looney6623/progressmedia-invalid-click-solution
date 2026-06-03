const CHANNEL_PATH = {
  naver_search: "naver",
  naver_shopping: "naver",
  naver_gfa: "naver-gfa",
  meta: "meta",
  google: "google"
};

export const TRACKING_CHANNELS = [
  { value: "naver_search", label: "네이버 검색광고" },
  { value: "naver_shopping", label: "쇼핑검색광고" },
  { value: "naver_gfa", label: "GFA" }
];

export function channelLabel(channel) {
  return TRACKING_CHANNELS.find((item) => item.value === channel)?.label || channel;
}

function appOrigin() {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL || "";
}

export function buildTrackingUrl({ advertiserId, linkId, channel, origin = appOrigin(), testFinalUrl = "" }) {
  const path = CHANNEL_PATH[channel] || "naver";
  const url = new URL(`/api/r/${path}`, origin || "https://example.com");
  url.searchParams.set("aid", advertiserId);
  url.searchParams.set("lid", linkId);
  url.searchParams.set("n_final_url", testFinalUrl || "{final_url}");

  if (channel === "naver_gfa") {
    url.searchParams.set("n_campaign", "{campaign}");
    url.searchParams.set("n_group", "{group}");
    url.searchParams.set("n_ad", "{ad}");
    url.searchParams.set("n_media", "{media}");
    url.searchParams.set("n_mall_pid", "{mall_pid}");
    return withVisiblePlaceholders(url);
  }

  url.searchParams.set("n_campaign", "{campaign}");
  url.searchParams.set("n_ad_group", "{ad_group}");
  url.searchParams.set("n_media", "{media}");
  url.searchParams.set("n_ad", "{ad}");
  url.searchParams.set("n_keyword", "{keyword}");
  url.searchParams.set("n_keyword_id", "{keyword_id}");
  url.searchParams.set("n_query", "{query}");
  url.searchParams.set("n_match", "{match}");
  url.searchParams.set("n_network", "{network}");
  url.searchParams.set("n_rank", "{rank}");
  url.searchParams.set("n_campaign_type", "{campaign_type}");
  url.searchParams.set("n_mall_id", "{mall_id}");
  url.searchParams.set("n_mall_pid", "{mall_pid}");
  url.searchParams.set("n_ad_group_type", "{ad_group_type}");
  return withVisiblePlaceholders(url);
}

function withVisiblePlaceholders(url) {
  return url.toString().replace(/%7B/g, "{").replace(/%7D/g, "}");
}
