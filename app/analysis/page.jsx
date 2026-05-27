"use client";

import { useMemo } from "react";
import AdvertiserChart from "@/components/AdvertiserChart";
import AppShell from "@/components/AppShell";
import ClickStatusChart from "@/components/ClickStatusChart";
import ClickTrendChart from "@/components/ClickTrendChart";
import FilterBar from "@/components/FilterBar";
import MediaChart from "@/components/MediaChart";
import { useAppState } from "@/components/AppStateProvider";

export default function AnalysisPage() {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, summary, hourlyTrend, advertiserStats, mediaStats, filteredLogs } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;
  const reasonTop = useMemo(() => {
    const counts = filteredLogs
      .filter((log) => log.status !== "정상")
      .flatMap((log) => String(log.reason || "").split(",").map((item) => item.trim()).filter(Boolean))
      .reduce((acc, reason) => ({ ...acc, [reason]: (acc[reason] || 0) + 1 }), {});
    return Object.entries(counts).map(([reason, count]) => ({ reason, count })).sort((a, b) => b.count - a.count).slice(0, 5);
  }, [filteredLogs]);
  const repeatedIps = useMemo(() => {
    const counts = filteredLogs.reduce((acc, log) => {
      if (!log.ipHash) return acc;
      acc[log.ipHash] ||= { ipMasked: log.ipMasked || log.ip, count: 0, blocked: 0 };
      acc[log.ipHash].count += 1;
      if (log.status === "차단") acc[log.ipHash].blocked += 1;
      return acc;
    }, {});
    return Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filteredLogs]);

  return (
    <AppShell title="무효클릭 분석" description="광고주, 매체, 시간대별로 의심 클릭과 차단 패턴을 분석합니다.">
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <ClickTrendChart data={hourlyTrend} />
        <ClickStatusChart summary={summary} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <AdvertiserChart data={advertiserStats} />
        <MediaChart data={mediaStats} />
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-lg border border-line bg-panel p-5">
          <h3 className="text-sm font-bold text-white">의심 사유 TOP 5</h3>
          <div className="mt-4 space-y-2">
            {reasonTop.map((item, index) => (
              <div key={item.reason} className="flex items-center justify-between rounded-md bg-panelSoft px-3 py-2 text-sm">
                <span className="text-slate-300">{index + 1}. {item.reason}</span>
                <strong className="text-warn">{item.count}건</strong>
              </div>
            ))}
            {reasonTop.length === 0 && <p className="text-sm text-slate-500">아직 집계된 의심 사유가 없습니다.</p>}
          </div>
        </div>
        <div className="rounded-lg border border-line bg-panel p-5">
          <h3 className="text-sm font-bold text-white">반복 클릭 IP TOP 10</h3>
          <div className="mt-4 space-y-2">
            {repeatedIps.map((item, index) => (
              <div key={`${item.ipMasked}-${index}`} className="flex items-center justify-between rounded-md bg-panelSoft px-3 py-2 text-sm">
                <span className="font-mono text-slate-300">{item.ipMasked}</span>
                <span className="text-slate-400">{item.count}회 · 차단 {item.blocked}회</span>
              </div>
            ))}
            {repeatedIps.length === 0 && <p className="text-sm text-slate-500">반복 클릭 IP가 아직 없습니다. 화면에는 ip_masked만 표시합니다.</p>}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
