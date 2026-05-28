"use client";

import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import FilterBar from "@/components/FilterBar";
import { Card } from "@/components/ui";
import { currency } from "@/lib/clickData";
import { number } from "@/lib/format";
import { useAppState } from "@/components/AppStateProvider";

export default function ConversionWorkspace({ mode = "events" }) {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs, summary } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;
  const title = mode === "logs" ? "전환 로그" : mode === "savings" ? "광고비 절감 추정" : "전환 이벤트";
  const blockedOrSuspicious = filteredLogs.filter((log) => log.status !== "정상");

  const sources = useMemo(() => {
    const map = new Map();
    filteredLogs.forEach((log) => {
      const key = log.utm || log.referrer || log.media || "직접/기타";
      const row = map.get(key) || { source: key, count: 0, risk: 0 };
      row.count += 1;
      row.risk += Number(log.riskScore || 0);
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 20);
  }, [filteredLogs]);

  return (
    <AppShell title={title} description="pm_conversion_events와 pm_click_logs를 연결해 전환, 체류, 광고비 절감 효과를 확인하는 메뉴입니다.">
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="수집 로그" value={filteredLogs.length} />
        <Metric label="위험 로그" value={blockedOrSuspicious.length} />
        <Metric label="차단 클릭" value={summary.blocked} />
        <Metric label="예상 절감 광고비" value={currency.format(summary.saving)} />
      </div>
      <Card>
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold text-white">{title} 요약</h2>
          <p className="mt-1 text-xs text-slate-500">전환 이벤트 원장 조회는 `pm_conversion_events` 기반 API 연결 후 이 영역에 확장됩니다.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-panelSoft text-xs uppercase text-slate-500">
              <tr>
                {["유입/전환 기준", "로그 수", "평균 위험도"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {sources.map((row) => (
                <tr key={row.source}>
                  <td className="max-w-[560px] truncate px-4 py-3 text-slate-300">{row.source}</td>
                  <td className="px-4 py-3 text-white">{number(row.count)}</td>
                  <td className="px-4 py-3 text-slate-100">{Math.round(row.risk / row.count)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {sources.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">전환 분석에 사용할 로그가 없습니다.</div>}
        </div>
      </Card>
    </AppShell>
  );
}

function Metric({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <strong className="mt-2 block text-xl text-white">{typeof value === "number" ? number(value) : value}</strong>
    </Card>
  );
}
