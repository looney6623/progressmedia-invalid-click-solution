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

  const body = useMemo(() => {
    if (!advertiserKey || !form.accountId.trim()) return "";
    return buildParameterBody({
      advertiserKey,
      accountId: form.accountId.trim(),
      channel: form.channel
    });
  }, [advertiserKey, form.accountId, form.channel]);

  const questionString = body ? `?${body}` : "";
  const ampersandString = body ? `&${body}` : "";

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
    setNotice("추적 파라미터를 복사했습니다.");
  }

  return (
    <AppShell
      title="추적 파라미터"
      description="광고주별 네이버 광고계정 식별값을 저장하고, 채널별 캠페인 추적 파라미터를 생성합니다."
    >
      {(notice || error) && (
        <Card className={`p-4 text-sm ${error ? "border-danger/30 bg-danger/10 text-danger" : "border-brand/30 bg-brand/10 text-brand"}`}>
          {error || notice}
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold text-white">광고주 계정 정보</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              광고 캠페인에 생성된 파라미터 주소를 등록해주세요.
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
              <p className="mt-1 text-xs leading-5 text-slate-500">표시용 값입니다. DB 조회 권한은 실제 advertiser_id 기준으로 유지됩니다.</p>
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
              {saving ? "저장 중" : "광고계정 식별값 저장"}
            </button>

            <label className="block">
              <span className="text-xs font-semibold text-slate-500">채널</span>
              <select value={form.channel} onChange={(event) => update("channel", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand">
                {CHANNELS.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}
              </select>
            </label>
          </div>
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <SlidersHorizontal size={16} className="text-brand" />
              생성된 파라미터
            </h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              스마트스토어, 브랜드스토어, 자사몰 랜딩 URL은 그대로 두고 아래 문자열만 붙여넣습니다.
            </p>
          </div>
          <div className="space-y-5 p-5">
            <ParameterResult
              title="URL에 물음표가 없는 경우"
              help="랜딩 URL에 ?가 없으면 위 값을 사용하세요."
              value={questionString}
              onCopy={() => copy(questionString)}
            />
            <ParameterResult
              title="URL에 이미 물음표가 있는 경우"
              help="랜딩 URL에 이미 ?가 있으면 아래 값을 사용하세요."
              value={ampersandString}
              onCopy={() => copy(ampersandString)}
            />
            <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-xs leading-5 text-warning">
              광고 등록 전 실제 랜딩 URL에 붙여 정상 접속 테스트를 진행하세요. 이 기능은 실시간 차단이 아니라 유입 분석과 의심 클릭 리포트용입니다.
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

function ParameterResult({ title, help, value, onCopy }) {
  return (
    <div className="rounded-lg border border-line bg-panelSoft p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="mt-1 text-xs text-slate-500">{help}</p>
        </div>
        <button
          type="button"
          disabled={!value}
          onClick={onCopy}
          className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-xs font-bold text-ink disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Copy size={14} />
          복사
        </button>
      </div>
      <div className="mt-4 rounded-md border border-line bg-ink p-3 font-mono text-xs leading-5 text-slate-300 break-all">
        {value || "광고주와 네이버 광고계정 식별값을 입력하면 생성됩니다."}
      </div>
      <pre className="mt-3 max-h-64 overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-400">
        {value ? multilinePreview(value) : "줄바꿈 미리보기"}
      </pre>
    </div>
  );
}
