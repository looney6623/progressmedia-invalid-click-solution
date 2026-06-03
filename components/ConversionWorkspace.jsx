"use client";

import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import FilterBar from "@/components/FilterBar";
import { Card } from "@/components/ui";
import { currency, number } from "@/lib/format";
import { useAppState } from "@/components/AppStateProvider";

const modeCopy = {
  events: {
    title: "전환 이벤트",
    description: "광고 클릭 이후 문의, 구매, 예약처럼 성과로 이어진 행동을 확인합니다.",
    summaryTitle: "전환 유입 요약",
    summaryDescription: "전환 데이터가 연결되면 유입 경로별 성과를 비교할 수 있습니다.",
    empty: "아직 전환으로 확인된 기록이 없습니다."
  },
  logs: {
    title: "전환 로그",
    description: "수집된 클릭과 전환 기록을 함께 보며 어떤 유입이 성과로 이어졌는지 확인합니다.",
    summaryTitle: "유입 경로별 기록",
    summaryDescription: "현재는 클릭 기록 기준으로 유입 경로별 위험도를 집계합니다.",
    empty: "표시할 전환 관련 기록이 없습니다."
  },
  savings: {
    title: "광고비 절감 추정",
    description: "차단된 클릭에 책정된 클릭 비용을 기준으로 아낀 광고비를 추정합니다.",
    summaryTitle: "절감 추정 근거",
    summaryDescription: "차단 또는 의심으로 분류된 클릭의 유입 경로와 평균 위험도를 비교합니다.",
    empty: "절감액을 계산할 차단 기록이 없습니다."
  }
};

export default function ConversionWorkspace({ mode = "events" }) {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs, conversionEvents, summary } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;
  const copy = modeCopy[mode] || modeCopy.events;
  const title = copy.title;
  const blockedOrSuspicious = filteredLogs.filter((log) => log.status !== "정상");
  const savingAmount = summary.savedCost || 0;
  const conversionCount = conversionEvents.length;

  const sources = useMemo(() => {
    const map = new Map();
    filteredLogs.forEach((log) => {
      if (mode === "savings" && log.status !== "차단") return;
      const key = log.utm || log.referrer || log.media || "직접/기타";
      const row = map.get(key) || { source: key, count: 0, risk: 0 };
      row.count += 1;
      row.risk += Number(log.riskScore || 0);
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, 20);
  }, [filteredLogs, mode]);

  return (
    <AppShell title={title} description={copy.description}>
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label={mode === "events" ? "전환 수" : "전체 클릭"} value={mode === "events" ? conversionCount : filteredLogs.length} />
        <Metric label="검토 대상" value={blockedOrSuspicious.length} />
        <Metric label="차단 클릭" value={summary.blocked} />
        <Metric label="예상 절감 광고비" value={currency(savingAmount)} />
      </div>
      <Card>
        <div className="border-b border-line px-5 py-4">
          <h2 className="text-sm font-bold text-white">{copy.summaryTitle}</h2>
          <p className="mt-1 text-xs text-slate-500">{copy.summaryDescription}</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-panelSoft text-xs uppercase text-slate-500">
              <tr>
                {["유입 경로", "클릭 수", "평균 위험도"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
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
          {sources.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">{copy.empty}</div>}
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
