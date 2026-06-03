"use client";

import { useMemo } from "react";
import AppShell from "@/components/AppShell";
import FilterBar from "@/components/FilterBar";
import { Card, StatusBadge } from "@/components/ui";
import { number } from "@/lib/format";
import { trafficSourceLabel } from "@/lib/trafficSource";
import { useAppState } from "@/components/AppStateProvider";

const pageMeta = {
  "ad-click-ip": ["광고 클릭 IP", "정상, 의심, 차단을 모두 포함해 광고 클릭 IP 현황을 확인합니다."],
  "suspicious-ip": ["의심 클릭 IP", "의심 상태 또는 위험도가 높은 클릭의 사유와 행동 신호를 확인합니다."],
  "blocked-ip": ["차단 판정 로그", "차단으로 판정된 클릭 기록만 확인합니다. 실제 활성 차단 IP 해제는 차단 관리에서 처리합니다."],
  "repeated-ip": ["반복 클릭 IP", "짧은 시간 안에 반복 클릭 조건에 걸린 IP와 최근 반복 패턴을 봅니다."],
  "exposure-limited-ip": ["노출제한 IP", "광고 매체 연동 후 제외 IP로 보낼 후보 정책을 안내합니다."]
};

function sourceOf(log) {
  return trafficSourceLabel(log);
}

function stayLabel(log) {
  const stay = Number(log.dwellSeconds || log.stayTime || 0);
  return stay > 0 ? `${number(stay)}초` : "-";
}

export default function InvalidClickWorkspace({ mode = "ad-click-ip" }) {
  const { user, myAdvertisers, allAdvertisers, filters, setFilters, filteredLogs, manualBlocks } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;
  const [title, description] = pageMeta[mode] || pageMeta["ad-click-ip"];

  const rows = useMemo(() => {
    if (mode === "suspicious-ip") return filteredLogs.filter((log) => log.status === "의심" || Number(log.riskScore || 0) >= 60);
    if (mode === "blocked-ip") return filteredLogs.filter((log) => log.status === "차단");
    if (mode === "repeated-ip") return filteredLogs.filter((log) => Number(log.clickCountIn10Min || log.recentCount || 0) >= 2);
    return filteredLogs;
  }, [filteredLogs, mode]);

  const ipSummary = useMemo(() => {
    const map = new Map();
    rows.forEach((log) => {
      const key = `${log.advertiserId || log.advertiser}:${log.ipMasked || log.ip || "-"}`;
      const row = map.get(key) || {
        key,
        advertiser: log.advertiser,
        clientId: log.clientId,
        ip: log.ipMasked || log.ip || "-",
        clicks: 0,
        suspicious: 0,
        blocked: 0,
        recentCount: 0,
        risk: 0,
        lastClick: log.dateTime || log.time || "-",
        source: sourceOf(log),
        reason: log.reason || "-",
        stay: 0,
        pageViews: 0
      };
      row.clicks += 1;
      row.suspicious += log.status === "의심" ? 1 : 0;
      row.blocked += log.status === "차단" ? 1 : 0;
      row.recentCount = Math.max(row.recentCount, Number(log.clickCountIn10Min || log.recentCount || 0));
      row.risk = Math.max(row.risk, Number(log.riskScore || 0));
      row.lastClick = log.dateTime || log.time || row.lastClick;
      row.source = sourceOf(log);
      row.reason = log.reason || row.reason;
      row.stay = Math.max(row.stay, Number(log.dwellSeconds || log.stayTime || 0));
      row.pageViews = Math.max(row.pageViews, Number(log.pageViews || 0));
      map.set(key, row);
    });
    return Array.from(map.values()).sort((a, b) => b.clicks - a.clicks || b.risk - a.risk).slice(0, 100);
  }, [rows]);

  const metrics = {
    total: rows.length,
    ipCount: ipSummary.length,
    suspicious: rows.filter((log) => log.status === "의심").length,
    blocked: rows.filter((log) => log.status === "차단").length,
    activeBlocks: manualBlocks.length,
    highRisk: rows.filter((log) => Number(log.riskScore || 0) >= 70).length
  };

  if (mode === "exposure-limited-ip") {
    return (
      <AppShell title={title} description={description}>
        <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
        <div className="grid gap-4 md:grid-cols-3">
          <Metric label="현재 연동 상태" value="준비중" />
          <Metric label="활성 차단 IP" value={metrics.activeBlocks} />
          <Metric label="제외 후보" value={metrics.highRisk} />
        </div>
        <Card className="p-5">
          <h2 className="text-sm font-bold text-white">매체 연동 준비중</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            현재는 네이버/구글 광고 계정과 자동 연동하지 않습니다. 이 메뉴는 향후 광고 매체의 제외 IP 목록으로 보낼 후보를 검토하는 화면입니다.
            실제 차단은 수동 차단 IP 메뉴의 활성 차단 목록을 기준으로 운영합니다.
          </p>
        </Card>
      </AppShell>
    );
  }

  return (
    <AppShell title={title} description={description}>
      <FilterBar filters={filters} setFilters={setFilters} advertiserOptions={advertisers} />
      {mode === "ad-click-ip" && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="광고 클릭" value={metrics.total} />
            <Metric label="IP 수" value={metrics.ipCount} />
            <Metric label="의심/차단" value={`${number(metrics.suspicious)}/${number(metrics.blocked)}`} />
            <Metric label="활성 차단 IP" value={metrics.activeBlocks} />
          </div>
          <AdClickIpTable rows={ipSummary} />
        </>
      )}
      {mode === "suspicious-ip" && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="의심 클릭" value={metrics.suspicious} />
            <Metric label="고위험 클릭" value={metrics.highRisk} />
            <Metric label="대상 IP" value={metrics.ipCount} />
            <Metric label="차단 판정 포함" value={metrics.blocked} />
          </div>
          <SuspiciousTable rows={rows} />
        </>
      )}
      {mode === "repeated-ip" && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="반복 클릭 로그" value={metrics.total} />
            <Metric label="반복 IP" value={metrics.ipCount} />
            <Metric label="최다 반복" value={ipSummary[0]?.recentCount || 0} />
            <Metric label="차단 판정" value={metrics.blocked} />
          </div>
          <RepeatedTable rows={ipSummary} />
        </>
      )}
      {mode === "blocked-ip" && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Metric label="차단 판정 로그" value={metrics.blocked} />
            <Metric label="대상 IP" value={metrics.ipCount} />
            <Metric label="평균 위험도" value={rows.length ? Math.round(rows.reduce((sum, log) => sum + Number(log.riskScore || 0), 0) / rows.length) : 0} />
            <Metric label="활성 차단 IP" value={metrics.activeBlocks} />
          </div>
          <BlockedDecisionTable rows={rows} />
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

function AdClickIpTable({ rows }) {
  return (
    <DataCard title="IP별 광고 클릭 현황" description="전체 상태를 포함해 IP별 클릭 수와 최근 유입 경로를 집계합니다.">
      <Table headers={["광고주", "IP", "클릭 수", "최근 클릭", "유입 경로", "의심", "차단", "최고 위험도"]}>
        {rows.map((row) => (
          <tr key={row.key}>
            <Cell>{row.advertiser}</Cell>
            <Mono>{row.ip}</Mono>
            <Cell strong>{number(row.clicks)}</Cell>
            <Cell>{row.lastClick}</Cell>
            <Cell truncate>{row.source}</Cell>
            <Cell warn>{number(row.suspicious)}</Cell>
            <Cell danger>{number(row.blocked)}</Cell>
            <Cell>{row.risk}</Cell>
          </tr>
        ))}
      </Table>
      {rows.length === 0 && <Empty>광고 클릭 IP 데이터가 없습니다.</Empty>}
    </DataCard>
  );
}

function SuspiciousTable({ rows }) {
  return (
    <DataCard title="의심 클릭 상세" description="의심 사유, 반복 횟수, 체류시간, 페이지 이동 여부를 중심으로 표시합니다.">
      <Table headers={["시간", "광고주", "IP", "의심 사유", "반복 횟수", "체류시간", "페이지 이동", "위험도", "상태"]}>
        {rows.slice(0, 100).map((log) => (
          <tr key={log.id}>
            <Cell>{log.dateTime || log.time}</Cell>
            <Cell>{log.advertiser}</Cell>
            <Mono>{log.ipMasked || log.ip}</Mono>
            <Cell truncate>{log.reason || "-"}</Cell>
            <Cell warn>{log.clickCountIn10Min || log.recentCount || "-"}</Cell>
            <Cell>{stayLabel(log)}</Cell>
            <Cell>{Number(log.pageViews || 0) > 0 ? `${number(log.pageViews)}회` : "-"}</Cell>
            <Cell>{log.riskScore}</Cell>
            <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={log.status} /></td>
          </tr>
        ))}
      </Table>
      {rows.length === 0 && <Empty>의심 클릭 데이터가 없습니다.</Empty>}
    </DataCard>
  );
}

function RepeatedTable({ rows }) {
  return (
    <DataCard title="반복 클릭 패턴" description="반복 클릭 조건에 걸린 IP의 최근 반복 횟수와 판정 결과를 봅니다.">
      <Table headers={["광고주", "IP", "로그 수", "최근 10분 클릭", "최근 클릭", "유입 경로", "의심", "차단"]}>
        {rows.map((row) => (
          <tr key={row.key}>
            <Cell>{row.advertiser}</Cell>
            <Mono>{row.ip}</Mono>
            <Cell strong>{number(row.clicks)}</Cell>
            <Cell warn>{number(row.recentCount)}</Cell>
            <Cell>{row.lastClick}</Cell>
            <Cell truncate>{row.source}</Cell>
            <Cell warn>{number(row.suspicious)}</Cell>
            <Cell danger>{number(row.blocked)}</Cell>
          </tr>
        ))}
      </Table>
      {rows.length === 0 && <Empty>반복 클릭 조건에 걸린 IP가 없습니다.</Empty>}
    </DataCard>
  );
}

function BlockedDecisionTable({ rows }) {
  return (
    <DataCard title="차단 판정 기록" description="이 표는 클릭 로그의 차단 판정 기록입니다. 실제 활성 차단 IP 목록과는 다릅니다.">
      <Table headers={["시간", "광고주", "IP", "유입 경로", "위험도", "판정 사유"]}>
        {rows.slice(0, 100).map((log) => (
          <tr key={log.id}>
            <Cell>{log.dateTime || log.time}</Cell>
            <Cell>{log.advertiser}</Cell>
            <Mono>{log.ipMasked || log.ip}</Mono>
            <Cell truncate>{sourceOf(log)}</Cell>
            <Cell>{log.riskScore}</Cell>
            <Cell truncate>{log.reason || "-"}</Cell>
          </tr>
        ))}
      </Table>
      {rows.length === 0 && <Empty>차단으로 판정된 클릭 로그가 없습니다.</Empty>}
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
    <table className="w-full min-w-[980px] text-left text-sm">
      <thead className="bg-panelSoft text-xs uppercase text-slate-500">
        <tr>{headers.map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-line">{children}</tbody>
    </table>
  );
}

function Cell({ children, strong, warn, danger, truncate }) {
  const color = danger ? "text-danger" : warn ? "text-warn" : strong ? "text-white" : "text-slate-300";
  return <td className={`${truncate ? "max-w-[320px] truncate " : "whitespace-nowrap "}px-4 py-3 ${color}`}>{children}</td>;
}

function Mono({ children }) {
  return <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">{children}</td>;
}

function Empty({ children }) {
  return <div className="px-5 py-10 text-center text-sm text-slate-500">{children}</div>;
}
