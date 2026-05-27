"use client";

import { useEffect, useMemo, useState } from "react";
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
import { Card } from "@/components/ui";
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
  { ip: "211.44.18.91", reason: "샤브20 브랜드 키워드 반복 클릭", createdAt: "2026-05-27 14:29", method: "수동 차단" },
  { ip: "59.9.104.201", reason: "3분페이 제휴 매체 저품질 유입", createdAt: "2026-05-27 14:12", method: "수동 차단" }
];

function SectionLead({ title, children }) {
  return (
    <Card className="p-5">
      <p className="text-xs font-semibold text-brand">SECTION</p>
      <h2 className="mt-1 text-lg font-bold text-white">{title}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-400">{children}</p>
    </Card>
  );
}

export default function DashboardApp() {
  const [filters, setFilters] = useState({
    advertiser: "전체",
    media: "전체",
    status: "전체",
    dateRange: "오늘",
    query: ""
  });
  const [manualBlocks, setManualBlocks] = useState(initialManualBlocks);
  const [activeSection, setActiveSection] = useState("dashboard");

  useEffect(() => {
    const sectionIds = ["dashboard", "logs", "analysis", "blocks", "scripts", "reports"];
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        if (visible?.target?.id) setActiveSection(visible.target.id);
      },
      { rootMargin: "-18% 0px -65% 0px", threshold: [0.1, 0.25, 0.5] }
    );

    sectionIds.forEach((id) => {
      const element = document.getElementById(id);
      if (element) observer.observe(element);
    });
    return () => observer.disconnect();
  }, []);

  const blockedAwareLogs = useMemo(() => enrichWithManualBlocks(clickLogs, manualBlocks), [manualBlocks]);
  const filteredLogs = useMemo(() => filterClicks(blockedAwareLogs, filters), [blockedAwareLogs, filters]);
  const summary = useMemo(() => summarizeClicks(filteredLogs), [filteredLogs]);
  const advertiserStats = useMemo(() => getAdvertiserStats(filteredLogs), [filteredLogs]);
  const mediaStats = useMemo(() => getMediaStats(filteredLogs), [filteredLogs]);
  const hourlyTrend = useMemo(() => getHourlyTrend(filteredLogs), [filteredLogs]);
  const blockedLogs = useMemo(() => filteredLogs.filter((log) => log.status === "차단"), [filteredLogs]);

  function addManualBlock(item) {
    setManualBlocks((prev) => {
      const rest = prev.filter((block) => block.ip !== item.ip);
      return [item, ...rest];
    });
  }

  function removeManualBlock(ip) {
    setManualBlocks((prev) => prev.filter((block) => block.ip !== ip));
  }

  function handleNavigate(id) {
    setActiveSection(id);
  }

  return (
    <div className="min-h-screen text-slate-200">
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />

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
          <div id="dashboard" className="space-y-5 scroll-mt-24">
            <SectionLead title="메인 대시보드">오늘 유입된 광고 클릭의 품질과 차단 효과를 한눈에 봅니다.</SectionLead>
            <KpiCards summary={summary} />
            <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
              <ClickTrendChart data={hourlyTrend} />
              <ClickStatusChart summary={summary} />
            </div>
          </div>
          <ClickLogTable logs={filteredLogs} />
          <div id="analysis" className="space-y-5 scroll-mt-24">
            <SectionLead title="무효클릭 분석">광고주와 매체 단위로 위험 클릭이 어디에 집중되는지 비교합니다.</SectionLead>
            <div className="grid gap-5 xl:grid-cols-[1fr_1fr]">
              <AdvertiserChart data={advertiserStats} />
              <MediaChart data={mediaStats} />
            </div>
          </div>
          <BlockManagement manualBlocks={manualBlocks} blockedLogs={blockedLogs} onAddBlock={addManualBlock} onRemoveBlock={removeManualBlock} />
          <InstallScriptPanel />
          <AdvertiserReport advertiserStats={advertiserStats} logs={filteredLogs} />
        </div>
      </main>
    </div>
  );
}
