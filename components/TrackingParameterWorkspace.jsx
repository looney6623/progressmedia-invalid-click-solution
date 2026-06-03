"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, SlidersHorizontal } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAppState } from "@/components/AppStateProvider";
import { Card } from "@/components/ui";

const CHANNELS = [
  {
    value: "naver_powerlink",
    label: "파워링크",
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
    label: "쇼핑검색광고",
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
    label: "GFA",
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

function buildParameterString({ advertiserId, accountId, channel, prefix }) {
  const selected = CHANNELS.find((item) => item.value === channel) || CHANNELS[0];
  const pairs = [
    ["pm_adv", advertiserId],
    ["pm_account", accountId],
    ...selected.params
  ];
  return `${prefix}${pairs.map(([key, value]) => `${key}=${value}`).join("&")}`;
}

export default function TrackingParameterWorkspace() {
  const { user, myAdvertisers, allAdvertisers } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState({
    advertiserId: advertisers[0]?.id || "",
    accountId: "",
    channel: "naver_powerlink",
    prefix: "?"
  });

  useEffect(() => {
    if (!form.advertiserId && advertisers[0]?.id) {
      setForm((prev) => ({ ...prev, advertiserId: advertisers[0].id }));
    }
  }, [advertisers, form.advertiserId]);

  const selectedAdvertiser = advertisers.find((item) => item.id === form.advertiserId);
  const parameterString = useMemo(() => {
    if (!form.advertiserId || !form.accountId.trim()) return "";
    return buildParameterString({
      advertiserId: form.advertiserId,
      accountId: form.accountId.trim(),
      channel: form.channel,
      prefix: form.prefix
    });
  }, [form]);

  function update(key, value) {
    setNotice("");
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function copy() {
    if (!parameterString) return;
    await navigator.clipboard?.writeText(parameterString);
    setNotice("추적 파라미터를 복사했습니다.");
  }

  return (
    <AppShell
      title="추적 파라미터"
      description="네이버/GFA 광고 랜딩 URL은 그대로 유지하고, 광고 관리자 추적 파라미터 영역에 붙여넣을 문자열만 생성합니다."
    >
      {notice && (
        <Card className="border-brand/30 bg-brand/10 p-4 text-sm text-brand">
          {notice}
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold text-white">파라미터 생성</h2>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              스마트스토어, 브랜드스토어, 자사몰 URL은 광고에 그대로 두고 아래 파라미터 문자열만 추가하세요.
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
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">네이버 광고계정 ID</span>
              <input value={form.accountId} onChange={(event) => update("accountId", event.target.value)} placeholder="예: naver-account-001" className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-brand" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">채널</span>
              <select value={form.channel} onChange={(event) => update("channel", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand">
                {CHANNELS.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}
              </select>
            </label>
            <div>
              <span className="text-xs font-semibold text-slate-500">랜딩 URL 파라미터 시작 문자</span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {["?", "&"].map((prefix) => (
                  <button
                    key={prefix}
                    type="button"
                    onClick={() => update("prefix", prefix)}
                    className={`h-10 rounded-md border text-sm font-bold transition ${form.prefix === prefix ? "border-brand bg-brand text-ink" : "border-line bg-ink text-slate-400 hover:text-white"}`}
                  >
                    {prefix} 로 시작
                  </button>
                ))}
              </div>
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
              선택 광고주: {selectedAdvertiser?.name || "-"} · 이 문자열은 우리 서버 URL로 리다이렉트하지 않습니다.
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="min-h-36 rounded-md border border-line bg-ink p-4 font-mono text-xs leading-6 text-slate-300 break-all">
              {parameterString || "광고주와 네이버 광고계정 ID를 입력하면 파라미터가 생성됩니다."}
            </div>
            <button
              type="button"
              disabled={!parameterString}
              onClick={copy}
              className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Copy size={16} />
              복사
            </button>
            <div className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-xs leading-5 text-warning">
              광고 등록 전 실제 랜딩 URL에 붙여 접속 테스트를 진행하세요. 이 기능은 실시간 차단용이 아니라 유입 분석과 의심 클릭 리포트용입니다.
            </div>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
