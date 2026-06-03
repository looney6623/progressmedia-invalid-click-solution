"use client";

import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import ClickLogTable from "@/components/ClickLogTable";
import FilterBar from "@/components/FilterBar";
import { Card } from "@/components/ui";
import { number } from "@/lib/format";
import { useAppState } from "@/components/AppStateProvider";

export default function LogAnalysisWorkspace({ mode = "all" }) {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs, refreshAccess } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;
  const title = mode === "referrers" ? "유입 경로" : mode === "utm" ? "캠페인 분석" : mode === "keywords" ? "검색어/키워드" : "전체 로그";

  const rows = useMemo(() => {
    const field = mode === "referrers" ? "referrer" : mode === "utm" ? "utm" : "keyword";
    if (mode === "all") return [];
    const counts = new Map();
    filteredLogs.forEach((log) => {
      const value = log[field] || (mode === "utm" ? log.utmSource : "") || "-";
      const row = counts.get(value) || { value, count: 0, suspicious: 0, blocked: 0 };
      row.count += 1;
      if (log.status === "의심") row.suspicious += 1;
      if (log.status === "차단") row.blocked += 1;
      counts.set(value, row);
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 50);
  }, [filteredLogs, mode]);

  return (
    <AppShell title={title} description="수집된 클릭 기록을 기준으로 유입 경로, 캠페인, 검색어 흐름을 분석합니다.">
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      {mode === "all" ? <ClickLogTable logs={filteredLogs} onRefresh={() => refreshAccess()} /> : <AggregateTable title={title} rows={rows} />}
    </AppShell>
  );
}

function AggregateTable({ title, rows }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">{title} 집계</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>
              {["값", "로그 수", "의심", "차단"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.value}>
                <td className="max-w-[560px] truncate px-4 py-3 text-slate-300">{row.value}</td>
                <td className="px-4 py-3 text-white">{number(row.count)}</td>
                <td className="px-4 py-3 text-warn">{number(row.suspicious)}</td>
                <td className="px-4 py-3 text-danger">{number(row.blocked)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">집계할 로그가 없습니다.</div>}
      </div>
    </Card>
  );
}
