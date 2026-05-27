"use client";

import { useMemo, useState } from "react";
import { Download } from "lucide-react";
import AdvertiserChart from "@/components/AdvertiserChart";
import AdvertiserReport from "@/components/AdvertiserReport";
import BlockManagement from "@/components/BlockManagement";
import ClickLogTable from "@/components/ClickLogTable";
import ClickStatusChart from "@/components/ClickStatusChart";
import ClickTrendChart from "@/components/ClickTrendChart";
import FilterBar from "@/components/FilterBar";
import InstallScriptPanel from "@/components/InstallScriptPanel";
import KpiCards from "@/components/KpiCards";
import MediaChart from "@/components/MediaChart";
import Sidebar from "@/components/Sidebar";
import {
  clickLogs,
  getAdvertiserStats,
  getHourlyTrend,
  getMediaStats,
  summarizeClicks
} from "@/lib/clickData";
import { downloadClickReportCsv } from "@/lib/exportCsv";
import { enrichWithManualBlocks, filterClicks } from "@/lib/filterClicks";

const initialManualBlocks = [
  { ip: "211.44.18.91", reason: "동일 IP 반복 클릭", createdAt: "2026-05-27 14:29" },
  { ip: "59.9.104.201", reason: "저품질 유입 차단", createdAt: "2026-05-27 14:12" }
];

export default function DashboardApp() {
  const [filters, setFilters] = useState({
    advertiser: "전체",
    media: "전체",
    status: "전체",
    dateRange: "오늘",
    query: ""
  });
  const [manualBlocks, setManualBlocks] = useState(initialManualBlocks);

  const blockedAwareLogs = useMemo(() => enrichWithManualBlocks(clickLogs, manualBlocks), [manualBlocks]);
  const filteredLogs = useMemo(() => filterClicks(blockedAwareLogs, filters), [blockedAwareLogs, filters]);
  const summary = useMemo(() => summarizeClicks(filteredLogs), [filteredLogs]);
  const advertiserStats = useMemo(() => getAdvertiserStats(filteredLogs), [filteredLogs]);
  const mediaStats = useMemo(() => getMediaStats(filteredLogs), [filteredLogs]);
  const hourlyTrend = useMemo(() => getHourlyTrend(filteredLogs), [filteredLogs]);

  function addManualBlock(item) {
    setManualBlocks((prev) => {
      const rest = prev.filter((block) => block.ip !== item.ip);
      return [item, ...rest];
    });
  }

  function removeManualBlock(ip) {
    setManualBlocks((prev) => prev.filter((block) => block.ip !== ip));
  }

  return (
    <div className="min-h-screen text-slate-200">
      <Sidebar />

      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-line bg-ink/88 backdrop-blur no-print">
          <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold text-brand">INVALID CLICK PREVENTION</p>
              <h1 className="mt-1 text-xl font-bold tracking-normal text-white md:text-2xl">프로그레스미디어 무효클릭차단 솔루션</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-md border border-line bg-panel px-3 py-2 text-xs font-semibold text-slate-300">{filters.dateRange}</button>
              <button className="rounded-md border border-line bg-panel px-3 py-2 text-xs font-semibold text-slate-300">{filters.advertiser}</button>
              <button
                onClick={() => downloadClickReportCsv(filteredLogs)}
                className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-ink"
              >
                <Download size={14} />
                리포트 내보내기
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-5 px-5 py-5 lg:px-8">
          <FilterBar filters={filters} setFilters={setFilters} />
          <div id="dashboard" className="space-y-5">
            <KpiCards summary={summary} />
            <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
              <ClickTrendChart data={hourlyTrend} />
              <ClickStatusChart summary={summary} />
            </div>
          </div>
          <div id="analysis" className="grid gap-5 xl:grid-cols-[1fr_1fr]">
            <AdvertiserChart data={advertiserStats} />
            <MediaChart data={mediaStats} />
          </div>
          <ClickLogTable logs={filteredLogs} />
          <BlockManagement manualBlocks={manualBlocks} onAddBlock={addManualBlock} onRemoveBlock={removeManualBlock} />
          <InstallScriptPanel />
          <AdvertiserReport advertiserStats={advertiserStats} logs={filteredLogs} />
        </div>
      </main>
    </div>
  );
}
