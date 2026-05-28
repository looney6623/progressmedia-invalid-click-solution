"use client";

import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import FilterBar from "@/components/FilterBar";
import { Card, StatusBadge } from "@/components/ui";
import { number } from "@/lib/format";
import { useAppState } from "@/components/AppStateProvider";

const pageMeta = {
  "ad-click-ip": ["광고 클릭 IP", "UTM, referrer, 키워드가 있는 광고 유입 로그를 IP 단위로 확인합니다."],
  "suspicious-ip": ["의심 클릭 IP", "click_status가 suspicious인 로그를 중심으로 의심 사유를 확인합니다."],
  "blocked-ip": ["차단된 IP", "blocked 로그와 활성 차단 IP를 함께 확인합니다."],
  "repeated-ip": ["반복 클릭 IP", "recent_count와 ip_masked 기준으로 반복 클릭 패턴을 정렬합니다."],
  "exposure-limited-ip": ["노출제한 IP", "매체 연동 전 단계의 차단/노출제한 후보를 관리합니다."]
};

export default function InvalidClickWorkspace({ mode = "ad-click-ip" }) {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs, manualBlocks } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;
  const [title, description] = pageMeta[mode] || pageMeta["ad-click-ip"];

  const rows = useMemo(() => {
    if (mode === "suspicious-ip") return filteredLogs.filter((log) => log.status === "의심");
    if (mode === "blocked-ip") return filteredLogs.filter((log) => log.status === "차단");
    if (mode === "repeated-ip") return [...filteredLogs].filter((log) => Number(log.clickCountIn10Min || log.recentCount || 0) >= 2).sort((a, b) => Number(b.clickCountIn10Min || b.recentCount || 0) - Number(a.clickCountIn10Min || a.recentCount || 0));
    if (mode === "exposure-limited-ip") return filteredLogs.filter((log) => log.status !== "정상" || Number(log.riskScore || 0) >= 70);
    return filteredLogs.filter((log) => log.referrer || log.utm || log.utmSource || log.keyword);
  }, [filteredLogs, mode]);

  const repeatedSummary = useMemo(() => {
    const map = new Map();
    rows.forEach((log) => {
      const key = log.ipMasked || log.ip || "unknown";
      const item = map.get(key) || { ipMasked: key, count: 0, blocked: 0, suspicious: 0, riskScore: 0, recentCount: 0 };
      item.count += 1;
      item.blocked += log.status === "차단" ? 1 : 0;
      item.suspicious += log.status === "의심" ? 1 : 0;
      item.riskScore = Math.max(item.riskScore, Number(log.riskScore || 0));
      item.recentCount = Math.max(item.recentCount, Number(log.clickCountIn10Min || log.recentCount || 0));
      map.set(key, item);
    });
    return Array.from(map.values()).sort((a, b) => b.recentCount - a.recentCount || b.count - a.count).slice(0, 20);
  }, [rows]);

  return (
    <AppShell title={title} description={description}>
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      <div className="grid gap-4 md:grid-cols-4">
        <Metric label="대상 로그" value={rows.length} />
        <Metric label="의심 클릭" value={rows.filter((log) => log.status === "의심").length} />
        <Metric label="차단 클릭" value={rows.filter((log) => log.status === "차단").length} />
        <Metric label="활성 차단 IP" value={manualBlocks.length} />
      </div>
      {mode === "repeated-ip" ? <RepeatedTable rows={repeatedSummary} /> : <InvalidTable rows={rows} mode={mode} />}
      {mode === "exposure-limited-ip" && (
        <Card className="border-brand/20 bg-brand/5 p-5 text-sm leading-6 text-brand">
          현재는 실제 네이버/구글 광고 플랫폼의 노출 제한 API와 연결하지 않았습니다. 이 화면은 `pm_click_logs`와 `pm_blocked_ips` 기반의 노출제한 후보이며, 향후 매체 API 연동 시 제외 IP 동기화 화면으로 확장합니다.
        </Card>
      )}
    </AppShell>
  );
}

function Metric({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold text-slate-500">{label}</p>
      <strong className="mt-2 block text-xl text-white">{number(value)}</strong>
    </Card>
  );
}

function InvalidTable({ rows }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">IP 분석 로그</h2>
        <p className="mt-1 text-xs text-slate-500">ip_hash는 화면에 노출하지 않고 ip_masked 기준으로 표시합니다.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>
              {["시간", "광고주", "client_id", "ip_masked", "referrer/UTM", "키워드", "최근 클릭", "위험도", "상태", "판정 사유"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.slice(0, 100).map((log) => (
              <tr key={log.id} className="hover:bg-panelSoft/60">
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{log.time || log.dateTime}</td>
                <td className="whitespace-nowrap px-4 py-3 text-white">{log.advertiser}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{log.clientId || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">{log.ipMasked || log.ip}</td>
                <td className="max-w-[260px] truncate px-4 py-3 text-slate-400">{log.referrer || log.utm || log.media || "-"}</td>
                <td className="max-w-[180px] truncate px-4 py-3 text-slate-400">{log.keyword || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.clickCountIn10Min || log.recentCount || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-100">{log.riskScore}</td>
                <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={log.status} /></td>
                <td className="max-w-[320px] truncate px-4 py-3 text-slate-400">{log.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">해당 조건의 로그가 없습니다.</div>}
      </div>
    </Card>
  );
}

function RepeatedTable({ rows }) {
  return (
    <Card>
      <div className="border-b border-line px-5 py-4">
        <h2 className="text-sm font-bold text-white">반복 클릭 IP TOP</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>
              {["ip_masked", "로그 수", "최근 10분 클릭", "의심", "차단", "최고 위험도"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {rows.map((row) => (
              <tr key={row.ipMasked}>
                <td className="px-4 py-3 font-mono text-xs text-slate-300">{row.ipMasked}</td>
                <td className="px-4 py-3 text-white">{number(row.count)}</td>
                <td className="px-4 py-3 text-warn">{number(row.recentCount)}</td>
                <td className="px-4 py-3 text-warn">{number(row.suspicious)}</td>
                <td className="px-4 py-3 text-danger">{number(row.blocked)}</td>
                <td className="px-4 py-3 text-slate-100">{row.riskScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">반복 클릭 IP가 없습니다.</div>}
      </div>
    </Card>
  );
}
