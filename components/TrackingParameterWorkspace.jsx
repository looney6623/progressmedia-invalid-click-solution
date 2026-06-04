"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, Save, SlidersHorizontal } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAppState } from "@/components/AppStateProvider";
import { Card } from "@/components/ui";

const CHANNELS = [
  {
    value: "naver_powerlink",
    label: "네이버 파워링크",
    params: [
      ["pm_channel", "naver_powerlink"],
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
      ["pm_channel", "naver_shopping"],
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
      ["pm_channel", "naver_gfa"],
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
  "추적 URL 설정에서 자동 추적URL 파라미터 선택",
  "생성된 파라미터를 붙여넣기",
  "저장 후 테스트 클릭으로 정상 랜딩 확인"
];

function visibleAdvertiserId(advertiser) {
  if (!advertiser) return "";
  return advertiser.clientId || advertiser.projectKey || String(advertiser.id || "").slice(0, 8);
}

function encodeParam(value) {
  const text = String(value || "");
  if (/^\{[^}]+\}$/.test(text)) return text;
  return encodeURIComponent(text);
}

function buildParameterBody({ advertiserKey, accountId, channel }) {
  const selected = CHANNELS.find((item) => item.value === channel) || CHANNELS[0];
  const pairs = [
    ["pm_adv", advertiserKey],
    ["pm_account", accountId],
    ...selected.params
  ];
  return pairs.map(([key, value]) => `${key}=${encodeParam(value)}`).join("&");
}

function multilinePreview(text) {
  return text ? text.replace(/&/g, "\n&") : "";
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

  const parameterString = useMemo(() => {
    if (!advertiserKey || !form.accountId.trim()) return "";
    return buildParameterBody({
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
    setNotice("자동 추적URL 파라미터를 복사했습니다.");
  }

  return (
    <AppShell
      title="추적 파라미터"
      description="네이버 광고관리자의 자동 추적URL 파라미터 영역에 붙여넣을 문자열을 생성합니다."
    >
      {(notice || error) && (
        <Card className={`p-4 text-sm ${error ? "border-danger/30 bg-danger/10 text-danger" : "border-brand/30 bg-brand/10 text-brand"}`}>
          {error || notice}
        </Card>
      )}

      <Card className="border-warning/30 bg-warning/10 p-4 text-sm leading-6 text-warning">
        <p className="font-semibold">추적 경유 사이트가 아니라 자동 추적URL 파라미터에 등록해주세요.</p>
        <p>이 기능은 광고 랜딩 URL을 우리 서버로 바꾸지 않습니다.</p>
        <p>생성된 파라미터를 광고 캠페인의 자동 추적URL 파라미터 영역에 등록해주세요.</p>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold text-white">광고주 계정 정보</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              광고주별 네이버 광고계정 식별값을 저장하면 다음 접속 때 자동으로 불러옵니다.
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
              <p className="mt-1 text-xs leading-5 text-slate-500">파라미터 표시용 값입니다. DB 조회 권한은 실제 advertiser_id 기준으로 유지됩니다.</p>
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
              <SlidersHorizontal size={16} className="text-brand" />
              생성된 파라미터
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              네이버 자동 추적URL 파라미터 입력란에 아래 문자열을 그대로 붙여넣습니다.
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-lg border border-line bg-panelSoft p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">복사용 한 줄 문자열</h3>
                  <p className="mt-1 text-xs text-slate-500">기본 생성값은 시작 문자 없이 key=value&key=value 형태입니다.</p>
                </div>
                <button
                  type="button"
                  disabled={!parameterString}
                  onClick={() => copy(parameterString)}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-xs font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy size={14} />
                  복사
                </button>
              </div>
              <div className="mt-4 rounded-md border border-line bg-ink p-3 font-mono text-xs leading-5 text-slate-300 break-all">
                {parameterString || "광고주와 네이버 광고계정 식별값을 입력하면 생성됩니다."}
              </div>
            </div>

            <div className="rounded-lg border border-line bg-panelSoft p-4">
              <h3 className="text-sm font-bold text-white">줄바꿈 미리보기</h3>
              <pre className="mt-3 max-h-80 overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-400">
                {parameterString ? multilinePreview(parameterString) : "줄바꿈 미리보기"}
              </pre>
            </div>

            <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-xs leading-5 text-warning">
              네이버 입력란이 시작 문자 입력을 요구하는 특수한 경우에만 직접 앞에 ? 또는 &를 붙입니다. 광고 등록 전 테스트 클릭으로 정상 랜딩을 확인하세요.
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
