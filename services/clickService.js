import {
  clickLogs,
  getAdvertiserStats,
  getBlockRules,
  getHourlyTrend,
  getMediaStats,
  summarizeClicks
} from "@/lib/clickData";

const mockAdvertisers = [
  { id: "adv_001", name: "샤브20", clientId: "pm-shabu20", status: "active" },
  { id: "adv_002", name: "3분페이", clientId: "pm-3minpay", status: "active" },
  { id: "adv_003", name: "대주바이오", clientId: "pm-daejoo-bio", status: "active" },
  { id: "adv_004", name: "바른숨병원", clientId: "pm-hospital", status: "active" },
  { id: "adv_005", name: "온리원쇼핑몰", clientId: "pm-onlyone-shop", status: "active" }
];

function buildInstallScript(clientId) {
  return `<script>
(function(w,d,s,u,c){
  w.pmInvalidClick=w.pmInvalidClick||function(){(w.pmInvalidClick.q=w.pmInvalidClick.q||[]).push(arguments)};
  w.pmInvalidClick("init",{clientId:c});
  var js=d.createElement(s); js.async=true; js.src=u;
  d.head.appendChild(js);
})(window,document,"script","https://cdn.progressmedia.co.kr/invalid-click.js","${clientId}");
</script>`;
}

export async function fetchClickLogs(filters = {}) {
  return {
    items: clickLogs,
    total: clickLogs.length,
    filters
  };
}

export async function fetchClickDashboard(logs = clickLogs) {
  return {
    summary: summarizeClicks(logs),
    advertiserStats: getAdvertiserStats(logs),
    mediaStats: getMediaStats(logs),
    hourlyTrend: getHourlyTrend(logs)
  };
}

export async function fetchAdvertiserReports(logs = clickLogs) {
  return {
    summary: summarizeClicks(logs),
    advertisers: getAdvertiserStats(logs),
    media: getMediaStats(logs),
    hourly: getHourlyTrend(logs)
  };
}

export async function fetchBlockRules() {
  return {
    items: getBlockRules()
  };
}

export async function createManualBlock(payload) {
  return {
    ok: true,
    block: {
      id: `mock-block-${Date.now()}`,
      method: "manual",
      createdAt: new Date().toLocaleString("ko-KR"),
      ...payload
    }
  };
}

export async function removeBlock(blockId) {
  return {
    ok: true,
    releasedBlockId: blockId,
    releasedAt: new Date().toLocaleString("ko-KR")
  };
}

export async function fetchAdvertisers() {
  return {
    items: mockAdvertisers
  };
}

export async function createAdvertiser(payload) {
  const id = `adv_mock_${Date.now()}`;
  return {
    ok: true,
    advertiser: {
      id,
      clientId: `pm-${id}`,
      status: "active",
      ...payload
    }
  };
}

export async function fetchInstallScript(advertiserId) {
  const advertiser = mockAdvertisers.find((item) => item.id === advertiserId) || mockAdvertisers[0];
  return {
    advertiserId: advertiser.id,
    clientId: advertiser.clientId,
    installStatus: "mock",
    lastSeenAt: null,
    script: buildInstallScript(advertiser.clientId)
  };
}
