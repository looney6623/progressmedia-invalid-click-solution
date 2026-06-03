"use client";

import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import ClickLogTable from "@/components/ClickLogTable";
import FilterBar from "@/components/FilterBar";
import { Card } from "@/components/ui";
import { number } from "@/lib/format";
import { useAppState } from "@/components/AppStateProvider";

const meta = {
  all: {
    title: "전체 로그",
    description: "클릭 로그를 시간, 상태, 위험도, 판정 사유 기준으로 검색하고 상세 확인합니다.",
    fieldLabel: "값"
  },
  referrers: {
    title: "유입 경로",
    description: "어떤 경로에서 광고 클릭이 들어왔고 위험 신호가 어디에 몰리는지 확인합니다.",
    fieldLabel: "유입 경로"
  },
  utm: {
    title: "캠페인 분석",
    description: "캠페인 출처, 매체, 캠페인명을 묶어 광고 유입 성과와 위험도를 비교합니다.",
    fieldLabel: "캠페인 정보"
  },
  keywords: {
    title: "검색어/키워드",
    description: "검색어와 키워드별 클릭 규모, 의심 클릭, 차단 클릭을 집계합니다.",
    fieldLabel: "검색어/키워드"
  }
};

function valueFor(log, mode) {
  if (mode === "referrers") return log.referrer || log.media || "직접 유입";
  if (mode === "utm") return log.utm || [log.utmSource, log.utmMedium, log.utmCampaign].filter(Boolean).join(" / ") || "-";
  return log.keyword || log.utmTerm || "-";
}

export default function LogAnalysisWorkspace({ mode = "all" }) {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs, refreshAccess } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;
  const copy = meta[mode] || meta.all;

  const rows = useMemo(() => {
    if (mode === "all") return [];
    const counts = new Map();
    filteredLogs.forEach((log) => {
      const value = valueFor(log, mode);
      const row = counts.get(value) || { value, count: 0, suspicious: 0, blocked: 0, riskSum: 0 };
      row.count += 1;
      row.riskSum += Number(log.riskScore || 0);
      if (log.status === "의심") row.suspicious += 1;
      if (log.status === "차단") row.blocked += 1;
      counts.set(value, row);
    });
    return Array.from(counts.values())
      .map((row) => ({ ...row, avgRisk: row.count ? Math.round(row.riskSum / row.count) : 0 }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50);
  }, [filteredLogs, mode]);

  return (
    <AppShell title={copy.title} description={copy.description}>
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      {mode === "all" ? <ClickLogTable logs={filteredLogs} onRefresh={() => refreshAccess()} /> : <AggregateTable label={copy.fieldLabel} rows={rows} />}
    </AppShell>
  );
}

function AggregateTable({ label, rows }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">{label}별 집계</h2>
        <p className="mt-1 text-xs text-slate-500">클릭 수와 위험 신호를 함께 비교합니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>{[label, "클릭 수", "의심", "차단", "평균 위험도"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.value}>
                <td className="max-w-[560px] truncate px-4 py-3 text-slate-300">{row.value}</td>
                <td className="px-4 py-3 text-white">{number(row.count)}</td>
                <td className="px-4 py-3 text-warn">{number(row.suspicious)}</td>
                <td className="px-4 py-3 text-danger">{number(row.blocked)}</td>
                <td className="px-4 py-3 text-slate-100">{row.avgRisk}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">집계할 로그가 없습니다.</div>}
      </div>
    </Card>
  );
}
