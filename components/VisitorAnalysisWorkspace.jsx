"use client";

import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import FilterBar from "@/components/FilterBar";
import { Card, StatusBadge } from "@/components/ui";
import { number } from "@/lib/format";
import { useAppState } from "@/components/AppStateProvider";

function shortId(value = "") {
  if (!value) return "-";
  return value.length > 14 ? `${value.slice(0, 8)}...${value.slice(-4)}` : value;
}

function deviceType(userAgent = "") {
  return /mobile|android|iphone|ipad/i.test(userAgent) ? "Mobile" : "PC";
}

export default function VisitorAnalysisWorkspace({ mode = "realtime" }) {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;

  const stats = useMemo(() => {
    const visitorIds = new Set(filteredLogs.map((log) => log.visitorId || log.sessionId || log.ipMasked || log.ip).filter(Boolean));
    const adClicks = filteredLogs.filter((log) => log.referrer || log.utm || log.utmSource || log.media !== "직접").length;
    const repeated = filteredLogs.filter((log) => Number(log.clickCountIn10Min || log.recentCount || 0) >= 3).length;
    const stayTimes = filteredLogs.map((log) => Number(log.dwellSeconds || log.stayTime || 0)).filter((value) => value > 0);
    const avgStay = stayTimes.length ? Math.round(stayTimes.reduce((sum, value) => sum + value, 0) / stayTimes.length) : 0;
    const mobile = filteredLogs.filter((log) => deviceType(log.userAgent) === "Mobile").length;
    const pc = Math.max(filteredLogs.length - mobile, 0);
    return { visitors: visitorIds.size, pageviews: filteredLogs.length, adClicks, repeated, avgStay, pc, mobile };
  }, [filteredLogs]);

  const pageRows = useMemo(() => {
    const counts = new Map();
    filteredLogs.forEach((log) => {
      const key = log.landingPage || log.pageUrl || "-";
      const row = counts.get(key) || { page: key, count: 0, suspicious: 0, blocked: 0 };
      row.count += 1;
      if (log.status === "의심") row.suspicious += 1;
      if (log.status === "차단") row.blocked += 1;
      counts.set(key, row);
    });
    return Array.from(counts.values()).sort((a, b) => b.count - a.count).slice(0, 30);
  }, [filteredLogs]);

  const title = mode === "pages" ? "페이지별 유입" : mode === "logs" ? "방문자 로그" : "실시간 방문자";
  const description = mode === "pages"
    ? "방문자가 어떤 페이지로 들어왔는지와 유입 경로를 함께 집계합니다."
    : "방문자와 세션 관점에서 유입 기록을 확인합니다. IP는 일부를 가린 형태로만 표시합니다.";

  return (
    <AppShell title={title} description={description}>
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <Metric label="오늘 방문자 수" value={stats.visitors} />
        <Metric label="페이지뷰" value={stats.pageviews} />
        <Metric label="광고 클릭수" value={stats.adClicks} />
        <Metric label="3회 이상 클릭 IP" value={stats.repeated} />
        <Metric label="평균 체류시간" value={stats.avgStay ? `${number(stats.avgStay)}초` : "-"} />
        <Metric label="PC/Mobile" value={`${stats.pc}/${stats.mobile}`} />
      </div>
      {mode === "pages" ? <PageTable rows={pageRows} /> : <VisitorTable logs={filteredLogs} />}
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

function VisitorTable({ logs }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">실시간 방문자 테이블</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>
              {["시간", "방문자/세션", "IP", "방문 페이지", "유입 경로", "캠페인 정보", "체류시간", "상태", "위험도"].map((head) => (
                <th key={head} className="px-4 py-3 font-semibold">{head}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.slice(0, 80).map((log) => (
              <tr key={log.id} className="hover:bg-panelSoft/60">
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{log.time || log.dateTime}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">{shortId(log.visitorId || log.sessionId)}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">{log.ipMasked || log.ip}</td>
                <td className="max-w-[280px] truncate px-4 py-3 text-slate-300">{log.landingPage || log.pageUrl}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-400">{log.referrer || "-"}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-400">{log.utm || log.utmSource || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{Number(log.dwellSeconds || log.stayTime || 0) > 0 ? `${number(log.dwellSeconds || log.stayTime)}초` : "-"}</td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={log.status} /></td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-100">{log.riskScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">아직 수집된 방문자 로그가 없습니다.</div>}
      </div>
    </Card>
  );
}

function PageTable({ rows }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">페이지별 유입 현황</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>
              {["방문 페이지", "페이지뷰", "의심", "차단"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.page}>
                <td className="max-w-[520px] truncate px-4 py-3 text-slate-300">{row.page}</td>
                <td className="px-4 py-3 text-white">{number(row.count)}</td>
                <td className="px-4 py-3 text-warn">{number(row.suspicious)}</td>
                <td className="px-4 py-3 text-danger">{number(row.blocked)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">페이지별 유입 데이터가 없습니다.</div>}
      </div>
    </Card>
  );
}
