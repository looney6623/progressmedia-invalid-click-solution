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

function latestTime(log) {
  return log.dateTime || log.time || "-";
}

export default function VisitorAnalysisWorkspace({ mode = "realtime" }) {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;

  const stats = useMemo(() => {
    const visitorIds = new Set(filteredLogs.map((log) => log.visitorId || log.sessionId || log.ipMasked || log.ip).filter(Boolean));
    const stayTimes = filteredLogs.map((log) => Number(log.dwellSeconds || log.stayTime || 0)).filter((value) => value > 0);
    const mobile = filteredLogs.filter((log) => deviceType(log.userAgent) === "Mobile").length;
    const suspicious = filteredLogs.filter((log) => log.status === "의심").length;
    const blocked = filteredLogs.filter((log) => log.status === "차단").length;
    const recentVisitors = filteredLogs.slice(0, 15).length;
    const avgStay = stayTimes.length ? Math.round(stayTimes.reduce((sum, value) => sum + value, 0) / stayTimes.length) : 0;
    return {
      visitors: visitorIds.size,
      logs: filteredLogs.length,
      recentVisitors,
      avgStay,
      mobile,
      pc: Math.max(filteredLogs.length - mobile, 0),
      suspicious,
      blocked
    };
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
        firstSeen: latestTime(log),
        lastSeen: latestTime(log),
        clicks: 0,
        pages: new Set(),
        source: log.referrer || log.utm || log.media || "직접 유입",
        stay: 0,
        risk: 0,
        status: "정상"
      };
      row.clicks += 1;
      row.pages.add(log.landingPage || log.pageUrl || "-");
      row.lastSeen = latestTime(log);
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
      const row = counts.get(key) || { page: key, views: 0, visitors: new Set(), sources: new Map(), avgStaySum: 0, stayCount: 0, suspicious: 0, blocked: 0 };
      row.views += 1;
      row.visitors.add(log.visitorId || log.sessionId || log.ipMasked || log.ip);
      const source = log.referrer || log.utmSource || log.media || "직접 유입";
      row.sources.set(source, (row.sources.get(source) || 0) + 1);
      const stay = Number(log.dwellSeconds || log.stayTime || 0);
      if (stay > 0) {
        row.avgStaySum += stay;
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
        avgStay: row.stayCount ? Math.round(row.avgStaySum / row.stayCount) : 0
      }))
      .sort((a, b) => b.views - a.views)
      .slice(0, 30);
  }, [filteredLogs]);

  const meta = {
    realtime: {
      title: "실시간 방문자",
      description: "최근 유입된 방문자의 흐름, 현재 방문 페이지, 체류 신호를 빠르게 확인합니다."
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
            <Metric label="페이지뷰" value={stats.logs} />
            <Metric label="평균 체류시간" value={stats.avgStay ? `${number(stats.avgStay)}초` : "-"} />
            <Metric label="위험 신호" value={stats.suspicious + stats.blocked} />
          </div>
          <PageTable rows={pageRows} />
        </>
      ) : mode === "logs" ? (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="전체 방문 기록" value={stats.logs} />
            <Metric label="고유 방문자" value={stats.visitors} />
            <Metric label="평균 체류시간" value={stats.avgStay ? `${number(stats.avgStay)}초` : "-"} />
            <Metric label="PC/Mobile" value={`${stats.pc}/${stats.mobile}`} />
          </div>
          <VisitorLogTable rows={sessionRows} />
        </>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="최근 방문" value={stats.recentVisitors} />
            <Metric label="고유 방문자" value={stats.visitors} />
            <Metric label="의심/차단" value={`${number(stats.suspicious)}/${number(stats.blocked)}`} />
            <Metric label="평균 체류시간" value={stats.avgStay ? `${number(stats.avgStay)}초` : "-"} />
          </div>
          <RealtimeTable logs={filteredLogs.slice(0, 15)} />
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

function RealtimeTable({ logs }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">최근 유입 흐름</h2>
        <p className="mt-1 text-xs text-slate-500">가장 최근에 들어온 방문자의 현재 페이지와 체류 신호만 간결하게 표시합니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>{["최근 시간", "광고주", "IP", "현재 방문 페이지", "유입 경로", "체류", "상태"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-panelSoft/60">
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{latestTime(log)}</td>
                <td className="whitespace-nowrap px-4 py-3 text-white">{log.advertiser}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">{log.ipMasked || log.ip}</td>
                <td className="max-w-[300px] truncate px-4 py-3 text-slate-300">{log.landingPage || log.pageUrl}</td>
                <td className="max-w-[240px] truncate px-4 py-3 text-slate-400">{log.referrer || log.utm || log.media || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{Number(log.dwellSeconds || 0) > 0 ? `${number(log.dwellSeconds)}초` : "-"}</td>
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
                <td className="max-w-[260px] truncate px-4 py-3 text-slate-400">{row.source}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{row.stay ? `${number(row.stay)}초` : "-"}</td>
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
                <td className="max-w-[240px] truncate px-4 py-3 text-slate-400">{row.topSource}</td>
                <td className="px-4 py-3 text-slate-300">{row.avgStay ? `${number(row.avgStay)}초` : "-"}</td>
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
