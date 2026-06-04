"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Save, ShieldCheck } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAppState } from "@/components/AppStateProvider";
import { Card } from "@/components/ui";

const TRACKING_BASE_URL = "https://port-0-progressmedia-invalid-click-solution-mpnqja589cd2fb94.sel3.cloudtype.app";

const CHANNELS = [
  {
    value: "naver_powerlink",
    label: "네이버 파워링크",
    params: [
      ["n_campaign", "{campaign}"],
      ["n_ad_group", "{ad_group}"],
      ["n_media", "{media}"],
      ["n_ad", "{ad}"],
      ["n_ad_extension", "{ad_extension}"],
      ["n_keyword", "{keyword}"],
      ["n_keyword_id", "{keyword_id}"],
      ["n_query", "{query}"],
      ["n_match", "{match}"],
      ["n_network", "{network}"],
      ["n_rank", "{rank}"],
      ["n_campaign_type", "{campaign_type}"],
      ["n_ad_group_type", "{ad_group_type}"]
    ]
  },
  {
    value: "naver_shopping",
    label: "네이버 쇼핑검색광고",
    params: [
      ["n_campaign", "{campaign}"],
      ["n_ad_group", "{ad_group}"],
      ["n_media", "{media}"],
      ["n_ad", "{ad}"],
      ["n_keyword", "{keyword}"],
      ["n_keyword_id", "{keyword_id}"],
      ["n_query", "{query}"],
      ["n_match", "{match}"],
      ["n_network", "{network}"],
      ["n_rank", "{rank}"],
      ["n_campaign_type", "{campaign_type}"],
      ["n_mall_id", "{mall_id}"],
      ["n_mall_pid", "{mall_pid}"],
      ["n_ad_group_type", "{ad_group_type}"]
    ]
  },
  {
    value: "naver_gfa",
    label: "네이버 GFA",
    params: [
      ["n_campaign", "{campaign}"],
      ["n_group", "{group}"],
      ["n_ad", "{ad}"],
      ["n_media", "{media}"],
      ["n_mall_pid", "{mall_pid}"]
    ]
  }
];

const steps = [
  "네이버 광고관리자에서 캠페인 설정으로 이동",
  "추적 URL 설정에서 추적 경유 사이트 선택",
  "생성된 URL을 붙여넣기",
  "저장 후 테스트 클릭으로 정상 랜딩 확인"
];

function visibleAdvertiserId(advertiser) {
  if (!advertiser) return "";
  return advertiser.clientId || advertiser.projectKey || String(advertiser.id || "").slice(0, 8);
}

function encodeTrackingValue(value) {
  const text = String(value || "");
  if (/^\{[^}]+\}$/.test(text)) return text;
  return encodeURIComponent(text);
}

function buildTrackingUrl({ advertiserKey, accountId, channel }) {
  const selected = CHANNELS.find((item) => item.value === channel) || CHANNELS[0];
  const pairs = [
    ["pm_adv", advertiserKey],
    ["pm_account", accountId],
    ["n_final_url", "{final_url}"],
    ...selected.params
  ];
  const query = pairs.map(([key, value]) => `${key}=${encodeTrackingValue(value)}`).join("&");
  return `${TRACKING_BASE_URL}/api/r/${selected.value}?${query}`;
}

function multilinePreview(url) {
  return url ? url.replace(/\?/g, "?\n").replace(/&/g, "\n&") : "";
}

export default function TrackingParameterWorkspace() {
  const {
    user,
    myAdvertisers,
    allAdvertisers,
    handleUpdateAdvertiserNaverAccount
  } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    advertiserId: advertisers[0]?.id || "",
    accountId: advertisers[0]?.naverAccountId || "",
    channel: "naver_powerlink"
  });

  const selectedAdvertiser = advertisers.find((item) => item.id === form.advertiserId);
  const advertiserKey = visibleAdvertiserId(selectedAdvertiser);
  const selectedAdvertiserId = selectedAdvertiser?.id || "";
  const selectedNaverAccountId = selectedAdvertiser?.naverAccountId || "";

  useEffect(() => {
    if (!form.advertiserId && advertisers[0]?.id) {
      setForm((prev) => ({
        ...prev,
        advertiserId: advertisers[0].id,
        accountId: advertisers[0].naverAccountId || ""
      }));
    }
  }, [advertisers, form.advertiserId]);

  useEffect(() => {
    if (!selectedAdvertiserId) return;
    setForm((prev) => ({ ...prev, accountId: selectedNaverAccountId }));
  }, [selectedAdvertiserId, selectedNaverAccountId]);

  const trackingUrl = useMemo(() => {
    if (!advertiserKey || !form.accountId.trim()) return "";
    return buildTrackingUrl({
      advertiserKey,
      accountId: form.accountId.trim(),
      channel: form.channel
    });
  }, [advertiserKey, form.accountId, form.channel]);

  function update(key, value) {
    setNotice("");
    setError("");
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveAccountId() {
    setNotice("");
    setError("");
    if (!form.advertiserId) {
      setError("광고주를 선택해 주세요.");
      return;
    }
    setSaving(true);
    const result = await handleUpdateAdvertiserNaverAccount?.(form.advertiserId, form.accountId.trim());
    setSaving(false);
    if (result?.ok === false) {
      setError(result.error || "네이버 광고계정 식별값 저장에 실패했습니다.");
      return;
    }
    setNotice("네이버 광고계정 식별값을 저장했습니다.");
  }

  async function copy(text) {
    if (!text) return;
    await navigator.clipboard?.writeText(text);
    setNotice("네이버 경유 추적 URL을 복사했습니다.");
  }

  return (
    <AppShell
      title="네이버 경유 추적 URL"
      description="네이버 광고관리자의 추적 경유 사이트에 등록할 URL을 생성합니다. 광고 클릭 시 먼저 로그를 기록한 뒤 정상 클릭만 최종 랜딩으로 이동합니다."
    >
      {(notice || error) && (
        <Card className={`p-4 text-sm ${error ? "border-danger/30 bg-danger/10 text-danger" : "border-brand/30 bg-brand/10 text-brand"}`}>
          {error || notice}
        </Card>
      )}

      <Card className="border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-warning">
        <p className="font-semibold">생성된 URL에는 n_final_url={"{"}final_url{"}"}이 포함되어야 합니다.</p>
        <p>광고 등록 전 반드시 테스트 클릭으로 정상 랜딩을 확인하세요.</p>
        <p>최종 랜딩 URL은 광고주 사이트 URL과 같은 도메인만 허용됩니다.</p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold text-white">광고주와 채널 설정</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              광고주별 네이버 광고계정 식별값을 저장하고 채널별 경유 추적 URL을 생성합니다.
            </p>
          </div>
          <div className="space-y-4 p-5">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">광고주</span>
              <select value={form.advertiserId} onChange={(event) => update("advertiserId", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand">
                <option value="">광고주 선택</option>
                {advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}
              </select>
            </label>

            <div className="rounded-md border border-line bg-ink px-4 py-3">
              <p className="text-xs font-semibold text-slate-500">광고주 식별값</p>
              <p className="mt-1 font-mono text-sm text-brand">{advertiserKey || "-"}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                생성 URL의 pm_adv 값입니다. 서버는 client_id, project_key, 광고주 ID 기준으로 광고주를 확인합니다.
              </p>
            </div>

            <label className="block">
              <span className="text-xs font-semibold text-slate-500">네이버 광고계정 식별값</span>
              <input
                value={form.accountId}
                onChange={(event) => update("accountId", event.target.value)}
                placeholder="예: 711579, NAVER_MAIN, 달빛여왕_검색광고"
                className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-brand"
              />
              <span className="mt-2 block text-xs leading-5 text-slate-500">
                네이버 광고계정 번호 또는 내부에서 구분할 계정명을 입력하세요. 예: 711579, NAVER_MAIN, 달빛여왕_검색광고
              </span>
            </label>

            <button
              type="button"
              disabled={saving || !form.advertiserId}
              onClick={saveAccountId}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-brand/30 bg-brand/10 px-4 text-sm font-semibold text-brand transition hover:bg-brand hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save size={16} />
              {saving ? "저장 중" : "저장"}
            </button>

            <label className="block">
              <span className="text-xs font-semibold text-slate-500">채널</span>
              <select value={form.channel} onChange={(event) => update("channel", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand">
                {CHANNELS.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}
              </select>
            </label>

            <div className="rounded-md border border-line bg-ink px-4 py-3">
              <p className="text-xs font-bold text-slate-400">네이버 등록 순서</p>
              <ol className="mt-3 space-y-2 text-xs leading-5 text-slate-500">
                {steps.map((step, index) => (
                  <li key={step} className="flex gap-2">
                    <span className="text-brand">{index + 1}.</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <ShieldCheck size={16} className="text-brand" />
              생성 URL
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              네이버 광고관리자의 추적 경유 사이트 입력란에 아래 URL을 그대로 붙여넣습니다.
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-line bg-panelSoft p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">복사할 경유 추적 URL</h3>
                  <p className="mt-1 text-xs text-slate-500">정상/의심 클릭은 최종 랜딩으로 이동하고, 차단 대상 IP는 이동하지 않습니다.</p>
                </div>
                <button
                  type="button"
                  disabled={!trackingUrl}
                  onClick={() => copy(trackingUrl)}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-xs font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy size={14} />
                  복사
                </button>
              </div>
              <div className="mt-4 rounded-md border border-line bg-ink p-3 font-mono text-xs leading-5 text-slate-300 break-all">
                {trackingUrl || "광고주와 네이버 광고계정 식별값을 입력하면 경유 추적 URL이 생성됩니다."}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-panelSoft p-4">
              <h3 className="text-sm font-bold text-white">줄바꿈 미리보기</h3>
              <pre className="mt-3 max-h-96 overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-400">
                {trackingUrl ? multilinePreview(trackingUrl) : "줄바꿈 미리보기"}
              </pre>
            </div>

            <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-xs leading-5 text-warning">
              네이버가 테스트 클릭에서 {"{"}final_url{"}"} 매크로를 실제 랜딩 URL로 치환해야 정상 이동합니다. 최종 URL 도메인이 광고주 사이트 URL과 다르면 서버가 403으로 차단합니다.
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
