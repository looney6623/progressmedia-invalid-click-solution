"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, Link2, Plus } from "lucide-react";
import AppShell from "@/components/AppShell";
import { useAppState } from "@/components/AppStateProvider";
import { Card } from "@/components/ui";
import { createTrackingLink, fetchTrackingLinks } from "@/services/clickService";
import { buildTrackingUrl, channelLabel, TRACKING_CHANNELS } from "@/lib/trackingUrl";

function domainFromUrl(value) {
  try {
    return new URL(value).hostname;
  } catch {
    return "";
  }
}

export default function TrackingLinkWorkspace() {
  const { user, myAdvertisers, allAdvertisers } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;
  const [links, setLinks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    advertiserId: advertisers[0]?.id || "",
    channel: "naver_search",
    name: "네이버 광고 보호 URL",
    destinationUrl: "",
    allowedDomain: ""
  });

  useEffect(() => {
    if (!form.advertiserId && advertisers[0]?.id) setForm((prev) => ({ ...prev, advertiserId: advertisers[0].id }));
  }, [advertisers, form.advertiserId]);

  useEffect(() => {
    fetchTrackingLinks().then((result) => {
      if (result.error) setError(result.error);
      setLinks(result.items || []);
    });
  }, []);

  const selectedAdvertiser = advertisers.find((item) => item.id === form.advertiserId);
  const previewAllowedDomain = form.allowedDomain || domainFromUrl(form.destinationUrl);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    if (!form.advertiserId || !form.destinationUrl) {
      setError("광고주와 최종 랜딩 URL을 입력해 주세요.");
      return;
    }
    setLoading(true);
    const result = await createTrackingLink({ ...form, allowedDomain: previewAllowedDomain });
    setLoading(false);
    if (!result.ok) {
      setError(result.error || "보호 URL 생성에 실패했습니다.");
      return;
    }
    setLinks((prev) => [result.link, ...prev.filter((item) => item.id !== result.link.id)]);
    setNotice("경유 추적 URL을 생성했습니다. 광고 등록 전 반드시 테스트하세요.");
  }

  async function copy(text) {
    await navigator.clipboard?.writeText(text);
    setNotice("URL을 복사했습니다.");
  }

  const rows = useMemo(() => links.filter((link) => !form.advertiserId || link.advertiserId === form.advertiserId), [form.advertiserId, links]);

  return (
    <AppShell title="광고 보호 URL" description="네이버 검색광고, 쇼핑검색광고, GFA에서 사용할 경유 추적 URL을 생성합니다.">
      {(notice || error) && (
        <Card className={`p-4 text-sm ${error ? "border-danger/30 bg-danger/10 text-danger" : "border-brand/30 bg-brand/10 text-brand"}`}>
          {error || notice}
        </Card>
      )}

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold text-white">경유 추적 URL 생성</h2>
            <p className="mt-1 text-xs text-slate-500">스마트스토어/브랜드스토어/자사몰 URL을 입력하면 광고 등록용 URL을 생성합니다.</p>
          </div>
          <form onSubmit={submit} className="space-y-4 p-5">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">광고주</span>
              <select value={form.advertiserId} onChange={(event) => update("advertiserId", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand">
                <option value="">광고주 선택</option>
                {advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">채널</span>
              <select value={form.channel} onChange={(event) => update("channel", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand">
                {TRACKING_CHANNELS.map((channel) => <option key={channel.value} value={channel.value}>{channel.label}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">이름</span>
              <input value={form.name} onChange={(event) => update("name", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">최종 랜딩 URL</span>
              <input value={form.destinationUrl} onChange={(event) => update("destinationUrl", event.target.value)} placeholder="https://smartstore.naver.com/..." className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-brand" />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">허용 도메인</span>
              <input value={previewAllowedDomain} onChange={(event) => update("allowedDomain", event.target.value)} placeholder="자동 추출" className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none placeholder:text-slate-600 focus:border-brand" />
            </label>
            <p className="rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-xs leading-5 text-warn">
              광고 등록 전 반드시 정상 랜딩 여부를 테스트하세요. 허용 도메인과 다른 최종 URL은 차단됩니다.
            </p>
            <button disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-ink disabled:opacity-60">
              <Plus size={16} />
              {loading ? "생성 중" : "보호 URL 생성"}
            </button>
          </form>
        </Card>

        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-sm font-bold text-white">생성된 경유 URL</h2>
            <p className="mt-1 text-xs text-slate-500">네이버 광고 URL 등록 방식에 붙여 넣을 주소입니다. URL에는 {`{final_url}`} 치환 변수가 포함됩니다.</p>
          </div>
          <div className="divide-y divide-line">
            {rows.map((link) => {
              const trackingUrl = buildTrackingUrl({ advertiserId: link.advertiserId, linkId: link.id, channel: link.channel });
              const testUrl = buildTrackingUrl({ advertiserId: link.advertiserId, linkId: link.id, channel: link.channel, testFinalUrl: link.destinationUrl });
              return (
                <div key={link.id} className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-white">{link.name}</p>
                      <p className="mt-1 text-xs text-slate-500">{selectedAdvertiser?.name || link.advertiserName} · {channelLabel(link.channel)} · 허용 도메인 {link.allowedDomain}</p>
                    </div>
                    <span className="rounded border border-brand/25 bg-brand/10 px-2 py-1 text-xs font-semibold text-brand">{link.isActive ? "사용 중" : "중지"}</span>
                  </div>
                  <div className="rounded-md border border-line bg-ink p-3 font-mono text-xs leading-5 text-slate-300 break-all">{trackingUrl}</div>
                  <div className="flex flex-wrap gap-2">
                    <button onClick={() => copy(trackingUrl)} className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-panelSoft px-3 text-xs font-semibold text-slate-300 hover:text-white">
                      <Copy size={14} />
                      복사
                    </button>
                    <a href={testUrl} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-panelSoft px-3 text-xs font-semibold text-slate-300 hover:text-white">
                      <ExternalLink size={14} />
                      테스트 URL 열기
                    </a>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="flex flex-col items-center justify-center px-5 py-12 text-center text-sm text-slate-500">
                <Link2 className="mb-3 text-slate-600" />
                아직 생성된 보호 URL이 없습니다.
              </div>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
