"use client";

import { useMemo } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import AppShell from "@/components/AppShell";
import FilterBar from "@/components/FilterBar";
import { Card, StatusBadge, TooltipBox, chartColors } from "@/components/ui";
import { number } from "@/lib/format";
import { classifyTrafficSource, isAdTraffic, trafficSourceLabel } from "@/lib/trafficSource";
import { useAppState } from "@/components/AppStateProvider";

function shortId(value = "") {
  if (!value) return "-";
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function latestTime(log) {
  return log.dateTime || log.time || "-";
}

function logDate(log) {
  const date = log.createdAt instanceof Date ? log.createdAt : new Date(log.createdAt || log.dateTime || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function stayLabel(value) {
  const numeric = Number(value || 0);
  return numeric > 0 ? `${number(numeric)}초` : "-";
}

export default function VisitorAnalysisWorkspace({ mode = "realtime" }) {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;

  const latestDate = useMemo(() => {
    return filteredLogs.reduce((max, log) => {
      const date = logDate(log);
      return date > max ? date : max;
    }, filteredLogs[0] ? logDate(filteredLogs[0]) : new Date());
  }, [filteredLogs]);

  const recentLogs = useMemo(() => {
    const cutoff = latestDate.getTime() - 60 * 60 * 1000;
    return filteredLogs.filter((log) => logDate(log).getTime() >= cutoff);
  }, [filteredLogs, latestDate]);

  const stats = useMemo(() => {
    const tenMinuteCutoff = latestDate.getTime() - 10 * 60 * 1000;
    const tenMinuteLogs = filteredLogs.filter((log) => logDate(log).getTime() >= tenMinuteCutoff);
    const currentVisitors = new Set(tenMinuteLogs.map((log) => log.visitorId || log.sessionId || log.ipMasked || log.ip).filter(Boolean)).size;
    const suspicious = tenMinuteLogs.filter((log) => log.status === "의심").length;
    const blocked = tenMinuteLogs.filter((log) => log.status === "차단").length;
    const sourceCounts = new Map();
    filteredLogs.forEach((log) => {
      const label = trafficSourceLabel(log);
      sourceCounts.set(label, (sourceCounts.get(label) || 0) + 1);
    });
    const topSource = Array.from(sourceCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "-";
    const stayTimes = filteredLogs.map((log) => Number(log.dwellSeconds || log.stayTime || 0)).filter((value) => value > 0);
    const avgStay = stayTimes.length ? Math.round(stayTimes.reduce((sum, value) => sum + value, 0) / stayTimes.length) : 0;
    return {
      currentVisitors,
      recentClicks: tenMinuteLogs.length,
      suspicious,
      blocked,
      topSource,
      avgStay,
      uniqueVisitors: new Set(filteredLogs.map((log) => log.visitorId || log.sessionId || log.ipMasked || log.ip).filter(Boolean)).size
    };
  }, [filteredLogs, latestDate]);

  const trendRows = useMemo(() => {
    const bucketMs = 5 * 60 * 1000;
    const end = Math.ceil(latestDate.getTime() / bucketMs) * bucketMs;
    const start = end - 60 * 60 * 1000;
    const buckets = new Map();
    for (let time = start; time <= end; time += bucketMs) {
      const date = new Date(time);
      buckets.set(time, {
        name: `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`,
        visits: 0,
        adClicks: 0
      });
    }
    recentLogs.forEach((log) => {
      const bucket = Math.floor(logDate(log).getTime() / bucketMs) * bucketMs;
      const row = buckets.get(bucket);
      if (!row) return;
      row.visits += 1;
      if (isAdTraffic(log)) row.adClicks += 1;
    });
    return Array.from(buckets.values());
  }, [latestDate, recentLogs]);

  const sourceRows = useMemo(() => {
    const initial = ["네이버", "메타/인스타그램", "구글", "직접 유입", "기타"].map((label) => ({ label, visits: 0, adClicks: 0 }));
    const map = new Map(initial.map((row) => [row.label, row]));
    filteredLogs.forEach((log) => {
      const label = trafficSourceLabel(log);
      const row = map.get(label) || { label, visits: 0, adClicks: 0 };
      row.visits += 1;
      if (isAdTraffic(log)) row.adClicks += 1;
      map.set(label, row);
    });
    return Array.from(map.values());
  }, [filteredLogs]);

  const sessionRows = useMemo(() => {
    const map = new Map();
    filteredLogs.forEach((log) => {
      const key = log.visitorId || log.sessionId || `${log.ipMasked || log.ip}-${log.advertiser}`;
      const row = map.get(key) || {
        id: key,
        advertiser: log.advertiser,
        visitorId: log.visitorId || log.sessionId,
        ip: log.ipMasked || log.ip,
        lastSeen: latestTime(log),
        clicks: 0,
        pages: new Set(),
        source: trafficSourceLabel(log),
        stay: 0,
        risk: 0,
        status: "정상"
      };
      row.clicks += 1;
      row.pages.add(log.landingPage || log.pageUrl || "-");
      row.lastSeen = latestTime(log);
      row.source = trafficSourceLabel(log);
      row.stay = Math.max(row.stay, Number(log.dwellSeconds || log.stayTime || 0));
      row.risk = Math.max(row.risk, Number(log.riskScore || 0));
      if (log.status === "차단") row.status = "차단";
      else if (log.status === "의심" && row.status !== "차단") row.status = "의심";
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => b.lastSeen.localeCompare(a.lastSeen)).slice(0, 80);
  }, [filteredLogs]);

  const pageRows = useMemo(() => {
    const counts = new Map();
    filteredLogs.forEach((log) => {
      const key = log.landingPage || log.pageUrl || "-";
      const row = counts.get(key) || { page: key, views: 0, visitors: new Set(), sources: new Map(), staySum: 0, stayCount: 0, suspicious: 0, blocked: 0 };
      row.views += 1;
      row.visitors.add(log.visitorId || log.sessionId || log.ipMasked || log.ip);
      const source = trafficSourceLabel(log);
      row.sources.set(source, (row.sources.get(source) || 0) + 1);
      const stay = Number(log.dwellSeconds || log.stayTime || 0);
      if (stay > 0) {
        row.staySum += stay;
        row.stayCount += 1;
      }
      if (log.status === "의심") row.suspicious += 1;
      if (log.status === "차단") row.blocked += 1;
      counts.set(key, row);
    });
    return Array.from(counts.values())
      .map((row) => ({
        ...row,
        visitors: row.visitors.size,
        topSource: Array.from(row.sources.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || "-",
        avgStay: row.stayCount ? Math.round(row.staySum / row.stayCount) : 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 30);
  }, [filteredLogs]);

  const meta = {
    realtime: {
      title: "실시간 방문자",
      description: "최근 1시간 방문과 광고 유입 흐름을 실시간 현황판처럼 확인합니다."
    },
    logs: {
      title: "방문자 로그",
      description: "방문자와 세션 단위의 전체 유입 기록을 검색하고 상세 흐름을 확인합니다."
    },
    pages: {
      title: "페이지별 유입",
      description: "방문 페이지별 유입 규모, 주요 유입 경로, 체류시간과 위험 신호를 집계합니다."
    }
  }[mode] || {};

  return (
    <AppShell title={meta.title} description={meta.description}>
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      {mode === "pages" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="방문 페이지" value={pageRows.length} />
            <Metric label="페이지뷰" value={filteredLogs.length} />
            <Metric label="평균 체류시간" value={stats.avgStay ? `${number(stats.avgStay)}초` : "-"} />
            <Metric label="위험 신호" value={stats.suspicious + stats.blocked} />
          </div>
          <PageTable rows={pageRows} />
        </>
      ) : mode === "logs" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="전체 방문 기록" value={filteredLogs.length} />
            <Metric label="고유 방문자" value={stats.uniqueVisitors} />
            <Metric label="평균 체류시간" value={stats.avgStay ? `${number(stats.avgStay)}초` : "-"} />
            <Metric label="주요 유입 경로" value={stats.topSource} />
          </div>
          <VisitorLogTable rows={sessionRows} />
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-5">
            <Metric label="현재 방문자 수" value={stats.currentVisitors} />
            <Metric label="최근 10분 클릭 수" value={stats.recentClicks} />
            <Metric label="의심 클릭 수" value={stats.suspicious} />
            <Metric label="차단 클릭 수" value={stats.blocked} />
            <Metric label="주요 유입 경로" value={stats.topSource} />
          </div>
          <div className="grid gap-5 xl:grid-cols-[1.5fr_0.8fr]">
            <RealtimeTrendChart rows={trendRows} />
            <TrafficSourcePanel rows={sourceRows} />
          </div>
          <RealtimeTable logs={filteredLogs.slice(0, 30)} />
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

function RealtimeTrendChart({ rows }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">최근 1시간 방문/광고 클릭 추이</h2>
        <p className="mt-1 text-xs text-slate-500">5분 단위로 방문 수와 광고 클릭 수를 구분해 표시합니다.</p>
      </div>
      <div className="h-80 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <CartesianGrid stroke="#253241" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
            <YAxis stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
            <Tooltip content={<TooltipBox />} />
            <Line name="방문 수" type="monotone" dataKey="visits" stroke={chartColors.total} strokeWidth={2} dot={false} />
            <Line name="광고 클릭 수" type="monotone" dataKey="adClicks" stroke={chartColors.suspicious} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

function TrafficSourcePanel({ rows }) {
  const total = rows.reduce((sum, row) => sum + row.visits, 0);
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">유입 경로 분포</h2>
        <p className="mt-1 text-xs text-slate-500">네이버, 메타/인스타그램, 구글, 직접 유입, 기타로 자동 분류합니다.</p>
      </div>
      <div className="space-y-3 p-5">
        {rows.map((row) => {
          const ratio = total ? Math.round((row.visits / total) * 100) : 0;
          return (
            <div key={row.label}>
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-200">{row.label}</span>
                <span className="text-slate-400">{number(row.visits)}건 · {ratio}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-panelSoft">
                <div className="h-full rounded-full bg-brand" style={{ width: `${ratio}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function RealtimeTable({ logs }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">최근 방문 로그</h2>
        <p className="mt-1 text-xs text-slate-500">최근 방문자의 페이지, 유입 경로, 체류 신호를 확인합니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>{["최근 시간", "광고주", "IP", "방문 페이지", "유입 경로", "체류", "상태"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-panelSoft/60">
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{latestTime(log)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-white">{log.advertiser}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">{log.ipMasked || log.ip}</td>
                <td className="max-w-[300px] truncate px-4 py-3 text-slate-300">{log.landingPage || log.pageUrl}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{trafficSourceLabel(log)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{stayLabel(log.dwellSeconds || log.stayTime)}</td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={log.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <Empty>최근 방문 기록이 없습니다.</Empty>}
      </div>
    </Card>
  );
}

function VisitorLogTable({ rows }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">방문자별 상세 로그</h2>
        <p className="mt-1 text-xs text-slate-500">같은 방문자 또는 세션의 클릭 수, 방문 페이지 수, 최고 위험도를 묶어서 보여줍니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>{["마지막 방문", "광고주", "방문자/세션", "IP", "클릭 수", "방문 페이지 수", "주요 유입 경로", "최대 체류", "최고 위험도", "상태"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-panelSoft/60">
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{row.lastSeen}</td>
                <td className="whitespace-nowrap px-4 py-3 text-white">{row.advertiser}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">{shortId(row.visitorId)}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">{row.ip}</td>
                <td className="px-4 py-3 text-white">{number(row.clicks)}</td>
                <td className="px-4 py-3 text-slate-300">{number(row.pages.size)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{row.source}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{stayLabel(row.stay)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-100">{row.risk}</td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={row.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>방문자 로그가 없습니다.</Empty>}
      </div>
    </Card>
  );
}

function PageTable({ rows }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">방문 페이지별 집계</h2>
        <p className="mt-1 text-xs text-slate-500">페이지별 유입 규모와 위험 신호를 비교합니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[920px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>{["방문 페이지", "페이지뷰", "방문자", "주요 유입 경로", "평균 체류", "의심", "차단"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.page}>
                <td className="max-w-[420px] truncate px-4 py-3 text-slate-300">{row.page}</td>
                <td className="px-4 py-3 text-white">{number(row.views)}</td>
                <td className="px-4 py-3 text-slate-300">{number(row.visitors)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{row.topSource}</td>
                <td className="px-4 py-3 text-slate-300">{stayLabel(row.avgStay)}</td>
                <td className="px-4 py-3 text-warn">{number(row.suspicious)}</td>
                <td className="px-4 py-3 text-danger">{number(row.blocked)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <Empty>페이지별 유입 데이터가 없습니다.</Empty>}
      </div>
    </Card>
  );
}

function Empty({ children }) {
  return <div className="px-5 py-10 text-center text-sm text-slate-500">{children}</div>;
}
