"use client";

import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import FilterBar from "@/components/FilterBar";
import { Card } from "@/components/ui";
import { currency, number, percent } from "@/lib/format";
import { useAppState } from "@/components/AppStateProvider";

const modeCopy = {
  events: {
    title: "전환 요약",
    description: "문의, 구매, 예약처럼 성과로 이어진 전환과 유입 경로를 요약합니다."
  },
  logs: {
    title: "전환 상세 로그",
    description: "수집된 전환 이벤트를 개별 기록 단위로 확인합니다."
  },
  savings: {
    title: "광고비 절감 추정",
    description: "차단 클릭 수, 평균 클릭 비용, 예상 절감액과 계산 근거를 확인합니다."
  }
};

function sourceOf(item) {
  return item.utmSource || item.utm || item.referrer || item.media || "직접/기타";
}

function eventLabel(event) {
  return event.eventName || event.eventType || "전환";
}

export default function ConversionWorkspace({ mode = "events" }) {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs, conversionEvents, summary } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;
  const copy = modeCopy[mode] || modeCopy.events;

  const blockedLogs = useMemo(() => filteredLogs.filter((log) => log.status === "차단"), [filteredLogs]);
  const savings = useMemo(() => {
    const blockedCount = blockedLogs.length;
    const totalCost = blockedLogs.reduce((sum, log) => sum + Number(log.cpc || 0), 0);
    const avgCpc = blockedCount ? Math.round(totalCost / blockedCount) : 0;
    const totalClicks = filteredLogs.length;
    return {
      blockedCount,
      totalCost,
      avgCpc,
      blockRate: totalClicks ? (blockedCount / totalClicks) * 100 : 0,
      totalClicks
    };
  }, [blockedLogs, filteredLogs.length]);

  const sourceRows = useMemo(() => {
    const map = new Map();
    conversionEvents.forEach((event) => {
      const key = sourceOf(event);
      const row = map.get(key) || { source: key, conversions: 0, value: 0, advertisers: new Set() };
      row.conversions += 1;
      row.value += Number(event.value || 0);
      if (event.advertiser) row.advertisers.add(event.advertiser);
      map.set(key, row);
    });
    return Array.from(map.values())
      .map((row) => ({ ...row, advertisers: row.advertisers.size }))
      .sort((a, b) => b.conversions - a.conversions)
      .slice(0, 20);
  }, [conversionEvents]);

  const eventRows = useMemo(() => conversionEvents.slice(0, 120), [conversionEvents]);

  return (
    <AppShell title={copy.title} description={copy.description}>
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      {mode === "logs" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="전환 로그" value={conversionEvents.length} />
            <Metric label="전환 광고주" value={new Set(conversionEvents.map((event) => event.advertiserId).filter(Boolean)).size} />
            <Metric label="전환 가치" value={currency(conversionEvents.reduce((sum, event) => sum + Number(event.value || 0), 0))} />
            <Metric label="최근 로그" value={eventRows[0]?.dateTime || "-"} />
          </div>
          <ConversionLogTable rows={eventRows} />
        </>
      ) : mode === "savings" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="전체 클릭" value={savings.totalClicks} />
            <Metric label="차단 클릭" value={savings.blockedCount} />
            <Metric label="평균 클릭 비용" value={currency(savings.avgCpc)} />
            <Metric label="예상 절감액" value={currency(savings.totalCost || summary.savedCost || 0)} />
          </div>
          <SavingsFormula savings={savings} />
          <BlockedCostTable rows={blockedLogs.slice(0, 100)} />
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="전환 이벤트" value={conversionEvents.length} />
            <Metric label="전환 유입 경로" value={sourceRows.length} />
            <Metric label="전환 가치" value={currency(conversionEvents.reduce((sum, event) => sum + Number(event.value || 0), 0))} />
            <Metric label="차단 클릭률" value={percent(savings.blockRate)} />
          </div>
          <ConversionSourceTable rows={sourceRows} />
        </>
      )}
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

function ConversionSourceTable({ rows }) {
  return (
    <DataCard title="전환 유입 요약" description="전환이 발생한 유입 경로와 성과 가치를 집계합니다.">
      <Table headers={["유입 경로", "전환 수", "광고주 수", "전환 가치"]}>
        {rows.map((row) => (
          <tr key={row.source}>
            <Cell truncate>{row.source}</Cell>
            <Cell strong>{number(row.conversions)}</Cell>
            <Cell>{number(row.advertisers)}</Cell>
            <Cell>{currency(row.value)}</Cell>
          </tr>
        ))}
      </Table>
      {rows.length === 0 && <Empty>전환으로 확인된 기록이 없습니다.</Empty>}
    </DataCard>
  );
}

function ConversionLogTable({ rows }) {
  return (
    <DataCard title="개별 전환 로그" description="전환이 들어온 시간, 광고주, 방문 페이지, 유입 경로를 개별 기록으로 확인합니다.">
      <Table headers={["시간", "광고주", "전환명", "전환 가치", "방문 페이지", "유입 경로", "IP"]}>
        {rows.map((event) => (
          <tr key={event.id}>
            <Cell>{event.dateTime || "-"}</Cell>
            <Cell>{event.advertiser}</Cell>
            <Cell>{eventLabel(event)}</Cell>
            <Cell>{currency(event.value)}</Cell>
            <Cell truncate>{event.pageUrl || "-"}</Cell>
            <Cell truncate>{sourceOf(event)}</Cell>
            <Mono>{event.ipMasked || "-"}</Mono>
          </tr>
        ))}
      </Table>
      {rows.length === 0 && <Empty>전환 상세 로그가 없습니다.</Empty>}
    </DataCard>
  );
}

function SavingsFormula({ savings }) {
  return (
    <Card className="p-5">
      <h2 className="text-sm font-bold text-white">절감액 계산 기준</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <Formula label="차단 클릭 수" value={number(savings.blockedCount)} />
        <Formula label="평균 클릭 비용" value={currency(savings.avgCpc)} />
        <Formula label="차단 클릭 수 x 평균 클릭 비용" value={currency(savings.totalCost)} />
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">클릭 비용이 없는 기록은 0원으로 계산합니다. 값이 없어도 화면에는 숫자가 아닌 값이 노출되지 않습니다.</p>
    </Card>
  );
}

function Formula({ label, value }) {
  return (
    <div className="rounded-md border border-line bg-panelSoft p-4">
      <p className="text-xs text-slate-500">{label}</p>
      <strong className="mt-2 block text-lg text-white">{value}</strong>
    </div>
  );
}

function BlockedCostTable({ rows }) {
  return (
    <DataCard title="차단 클릭 비용 근거" description="절감액 계산에 포함된 차단 클릭만 표시합니다.">
      <Table headers={["시간", "광고주", "IP", "유입 경로", "클릭 비용", "판정 사유"]}>
        {rows.map((log) => (
          <tr key={log.id}>
            <Cell>{log.dateTime || log.time}</Cell>
            <Cell>{log.advertiser}</Cell>
            <Mono>{log.ipMasked || log.ip}</Mono>
            <Cell truncate>{sourceOf(log)}</Cell>
            <Cell>{currency(log.cpc)}</Cell>
            <Cell truncate>{log.reason || "-"}</Cell>
          </tr>
        ))}
      </Table>
      {rows.length === 0 && <Empty>절감액 계산에 포함할 차단 클릭이 없습니다.</Empty>}
    </DataCard>
  );
}

function DataCard({ title, description, children }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">{title}</h2>
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      </div>
      <div className="overflow-x-auto">{children}</div>
    </Card>
  );
}

function Table({ headers, children }) {
  return (
    <table className="w-full min-w-[900px] text-left text-sm">
      <thead className="bg-panelSoft text-xs uppercase text-slate-500">
        <tr>{headers.map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-line">{children}</tbody>
    </table>
  );
}

function Cell({ children, strong, truncate }) {
  return <td className={`${truncate ? "max-w-[320px] truncate " : "whitespace-nowrap "}px-4 py-3 ${strong ? "text-white" : "text-slate-300"}`}>{children}</td>;
}

function Mono({ children }) {
  return <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">{children}</td>;
}

function Empty({ children }) {
  return <div className="px-5 py-10 text-center text-sm text-slate-500">{children}</div>;
}
