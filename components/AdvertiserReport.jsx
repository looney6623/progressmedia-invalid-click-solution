import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download, FileText, Printer } from "lucide-react";
import { Card, SectionDescription, SectionTitle, TooltipBox, chartColors } from "@/components/ui";
import { currency } from "@/lib/clickData";
import { downloadClickReportCsv } from "@/lib/exportCsv";
import { number, percent } from "@/lib/format";

const dateOptions = ["오늘", "어제", "최근 7일", "최근 30일", "직접 날짜 범위"];

function dateKey(date) {
  return date.toISOString().slice(0, 10);
}

function withinDateRange(itemDate, range, startDate, endDate, latestDate) {
  const key = dateKey(itemDate);
  const latestKey = dateKey(latestDate);
  if (range === "오늘") return key === latestKey;
  if (range === "어제") {
    const yesterday = new Date(latestDate);
    yesterday.setDate(yesterday.getDate() - 1);
    return key === dateKey(yesterday);
  }
  if (range === "최근 7일") return latestDate.getTime() - itemDate.getTime() <= 7 * 24 * 60 * 60 * 1000;
  if (range === "최근 30일") return latestDate.getTime() - itemDate.getTime() <= 30 * 24 * 60 * 60 * 1000;
  if (range === "직접 날짜 범위") {
    if (startDate && key < startDate) return false;
    if (endDate && key > endDate) return false;
  }
  return true;
}

function topBy(items, getKey, limit = 5) {
  const counts = new Map();
  items.forEach((item) => {
    const key = getKey(item) || "-";
    counts.set(key, (counts.get(key) || 0) + 1);
  });
  return Array.from(counts.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}

function topReasons(logs) {
  const counts = new Map();
  logs
    .filter((item) => item.status !== "정상")
    .flatMap((item) => String(item.reason || "").split(",").map((reason) => reason.trim()).filter(Boolean))
    .forEach((reason) => counts.set(reason, (counts.get(reason) || 0) + 1));
  return Array.from(counts.entries())
    .map(([name, total]) => ({ name, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
}

function dailyTrend(logs) {
  const counts = new Map();
  logs.forEach((log) => {
    const key = dateKey(log.createdAt);
    const row = counts.get(key) || { name: key, total: 0, normal: 0, suspicious: 0, blocked: 0 };
    row.total += 1;
    if (log.status === "정상") row.normal += 1;
    if (log.status === "의심") row.suspicious += 1;
    if (log.status === "차단") row.blocked += 1;
    counts.set(key, row);
  });
  return Array.from(counts.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function conversionTrend(events) {
  const counts = new Map();
  events.forEach((event) => {
    const key = dateKey(event.createdAt);
    counts.set(key, { name: key, total: (counts.get(key)?.total || 0) + 1 });
  });
  return Array.from(counts.values()).sort((a, b) => a.name.localeCompare(b.name));
}

function summarize(logs, conversionEvents, activeBlocks) {
  const total = logs.length;
  const normal = logs.filter((item) => item.status === "정상").length;
  const suspicious = logs.filter((item) => item.status === "의심").length;
  const blocked = logs.filter((item) => item.status === "차단").length;
  const avgRisk = total ? Math.round(logs.reduce((sum, item) => sum + Number(item.riskScore || 0), 0) / total) : 0;
  const stayRows = logs.filter((item) => Number(item.dwellSeconds || 0) > 0);
  const avgStay = stayRows.length ? Math.round(stayRows.reduce((sum, item) => sum + Number(item.dwellSeconds || 0), 0) / stayRows.length) : 0;
  const saving = logs.filter((item) => item.status === "차단").reduce((sum, item) => sum + Number(item.cpc || 0), 0);
  return {
    total,
    normal,
    suspicious,
    blocked,
    suspiciousRate: total ? ((suspicious + blocked) / total) * 100 : 0,
    blockedRate: total ? (blocked / total) * 100 : 0,
    avgRisk,
    avgStay,
    conversionCount: conversionEvents.length,
    saving,
    activeBlockCount: activeBlocks.length
  };
}

export default function AdvertiserReport({ logs, advertisers = [], conversionEvents = [], manualBlocks = [], releasedBlocks = [], allowAll = true }) {
  const [selectedAdvertiserId, setSelectedAdvertiserId] = useState(allowAll ? "all" : advertisers[0]?.id || "");
  const [dateRange, setDateRange] = useState("최근 7일");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const latestDate = useMemo(() => logs.reduce((max, log) => (log.createdAt > max ? log.createdAt : max), logs[0]?.createdAt || new Date("2026-05-27T14:30:00+09:00")), [logs]);
  const effectiveAdvertiserId = allowAll ? selectedAdvertiserId : (selectedAdvertiserId || advertisers[0]?.id || "");
  const selectedAdvertiser = advertisers.find((item) => item.id === effectiveAdvertiserId);

  const reportLogs = useMemo(() => {
    return logs.filter((log) => {
      if (effectiveAdvertiserId !== "all" && log.advertiserId !== effectiveAdvertiserId) return false;
      return withinDateRange(log.createdAt, dateRange, startDate, endDate, latestDate);
    });
  }, [dateRange, effectiveAdvertiserId, endDate, latestDate, logs, startDate]);

  const reportConversions = useMemo(() => {
    return conversionEvents.filter((event) => {
      if (effectiveAdvertiserId !== "all" && event.advertiserId !== effectiveAdvertiserId) return false;
      return withinDateRange(event.createdAt, dateRange, startDate, endDate, latestDate);
    });
  }, [conversionEvents, dateRange, effectiveAdvertiserId, endDate, latestDate, startDate]);

  const scopedActiveBlocks = useMemo(() => manualBlocks.filter((block) => effectiveAdvertiserId === "all" || block.advertiserId === effectiveAdvertiserId), [effectiveAdvertiserId, manualBlocks]);
  const scopedReleasedBlocks = useMemo(() => releasedBlocks.filter((block) => effectiveAdvertiserId === "all" || block.advertiserId === effectiveAdvertiserId).slice(0, 8), [effectiveAdvertiserId, releasedBlocks]);
  const summary = useMemo(() => summarize(reportLogs, reportConversions, scopedActiveBlocks), [reportConversions, reportLogs, scopedActiveBlocks]);
  const repeatedIps = useMemo(() => topBy(reportLogs, (log) => log.ipMasked || log.ip, 10).map((row) => {
    const maxRecent = Math.max(...reportLogs.filter((log) => (log.ipMasked || log.ip) === row.name).map((log) => Number(log.recentCount || log.clickCountIn10Min || 1)));
    return { ...row, recentCount: maxRecent };
  }).sort((a, b) => b.recentCount - a.recentCount).slice(0, 10), [reportLogs]);
  const reasons = useMemo(() => topReasons(reportLogs), [reportLogs]);
  const referrers = useMemo(() => topBy(reportLogs, (log) => log.referrer || log.media, 5), [reportLogs]);
  const pages = useMemo(() => topBy(reportLogs, (log) => log.landingPage, 5), [reportLogs]);
  const utmSources = useMemo(() => topBy(reportLogs, (log) => log.utmSource, 5), [reportLogs]);
  const utmMediums = useMemo(() => topBy(reportLogs, (log) => log.utmMedium, 5), [reportLogs]);
  const utmCampaigns = useMemo(() => topBy(reportLogs, (log) => log.utmCampaign, 5), [reportLogs]);
  const statusData = [
    { name: "정상", total: summary.normal },
    { name: "의심", total: summary.suspicious },
    { name: "차단", total: summary.blocked }
  ];
  const generatedAt = "2026-05-28";

  return (
    <Card id="reports" className="print-area">
      <SectionTitle
        icon={FileText}
        title="광고주 리포트"
        right={
          <div className="flex items-center gap-2 no-print">
            <button onClick={() => downloadClickReportCsv(reportLogs, reportConversions)} className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-panelSoft px-3 text-xs font-semibold text-slate-300 hover:text-white">
              <Download size={14} />
              CSV
            </button>
            <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-xs font-semibold text-ink">
              <Printer size={14} />
              인쇄
            </button>
          </div>
        }
      />
      <SectionDescription>권한 범위 내 광고주의 클릭 로그, 차단 IP, 전환 이벤트를 기준으로 운영 리포트를 생성합니다.</SectionDescription>

      <div className="grid gap-3 border-b border-line p-5 no-print lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">광고주</span>
          <select value={effectiveAdvertiserId} onChange={(event) => setSelectedAdvertiserId(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand">
            {allowAll && <option value="all">전체</option>}
            {advertisers.map((advertiser) => (
              <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">날짜 범위</span>
          <select value={dateRange} onChange={(event) => setDateRange(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand">
            {dateOptions.map((option) => <option key={option} value={option}>{option}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">시작일</span>
          <input type="date" disabled={dateRange !== "직접 날짜 범위"} value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-40" />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-slate-500">종료일</span>
          <input type="date" disabled={dateRange !== "직접 날짜 범위"} value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-40" />
        </label>
      </div>

      <div className="space-y-5 p-5 print-report">
        <div>
          <p className="text-xs font-semibold text-brand">REPORT</p>
          <h3 className="mt-1 text-2xl font-bold text-white">{selectedAdvertiser?.name || "전체 광고주"} 리포트</h3>
          <p className="mt-1 text-xs text-slate-500">기간: {dateRange}{dateRange === "직접 날짜 범위" ? ` ${startDate || "-"} ~ ${endDate || "-"}` : ""} · 생성일: {generatedAt}</p>
        </div>

        {reportLogs.length === 0 ? (
          <div className="rounded-md border border-line bg-panelSoft px-5 py-12 text-center text-sm text-slate-500">선택한 기간에 수집된 클릭 로그가 없습니다.</div>
        ) : (
          <>
            <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
              {[
                ["총 클릭수", number(summary.total)],
                ["정상 클릭수", number(summary.normal)],
                ["의심 클릭수", number(summary.suspicious)],
                ["차단 클릭수", number(summary.blocked)],
                ["의심 클릭률", percent(summary.suspiciousRate)],
                ["차단 클릭률", percent(summary.blockedRate)],
                ["평균 위험도", `${summary.avgRisk}점`],
                ["평균 체류시간", `${number(summary.avgStay)}s`],
                ["전환 이벤트 수", number(summary.conversionCount)],
                ["예상 절감 광고비", currency.format(summary.saving)],
                ["활성 차단 IP 수", number(summary.activeBlockCount)]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md border border-line bg-panelSoft p-4">
                  <p className="text-xs text-slate-500">{label}</p>
                  <strong className="mt-2 block text-lg text-white">{value}</strong>
                </div>
              ))}
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <Chart title="일자별 클릭 추이" data={dailyTrend(reportLogs)} barKey="total" color={chartColors.total} />
              <Chart title="상태별 분포" data={statusData} barKey="total" color={chartColors.normal} />
              <Chart title="유입경로별 클릭" data={referrers} barKey="total" color={chartColors.total} />
              <Chart title="의심 사유 TOP 5" data={reasons} barKey="total" color={chartColors.suspicious} />
              <Chart title="전환 이벤트 추이" data={conversionTrend(reportConversions)} barKey="total" color={chartColors.normal} />
              <Chart title="page_url TOP 5" data={pages} barKey="total" color={chartColors.total} />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
              <List title="반복 클릭 TOP IP" rows={repeatedIps.map((item) => ({ name: item.name, value: `${item.recentCount}회 / 로그 ${item.total}건` }))} />
              <List title="UTM source" rows={utmSources.map((item) => ({ name: item.name, value: `${item.total}건` }))} />
              <List title="UTM medium / campaign" rows={[...utmMediums, ...utmCampaigns].slice(0, 5).map((item) => ({ name: item.name, value: `${item.total}건` }))} />
            </div>

            <div className="grid gap-5 xl:grid-cols-2">
              <List title="최근 활성 차단 IP" rows={scopedActiveBlocks.slice(0, 8).map((block) => ({ name: block.ipMasked || block.ip, value: block.reason }))} />
              <List title="최근 차단 해제 이력" rows={scopedReleasedBlocks.map((block) => ({ name: block.ipMasked || block.ip, value: block.releasedAt || "-" }))} />
            </div>
          </>
        )}

        <p className="rounded-md border border-line bg-panelSoft px-4 py-3 text-xs leading-5 text-slate-500">
          본 리포트는 IP 원문을 저장하지 않으며, 마스킹된 IP와 해시 기반 식별값을 기준으로 무효 클릭 패턴을 분석합니다.
        </p>
      </div>
    </Card>
  );
}

function Chart({ title, data, barKey, color }) {
  return (
    <div className="rounded-md border border-line bg-ink p-4">
      <h4 className="mb-3 text-sm font-semibold text-white">{title}</h4>
      {data.length ? (
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid stroke="#253241" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<TooltipBox />} />
              <Bar name="건수" dataKey={barKey} fill={color} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="flex h-64 items-center justify-center text-sm text-slate-500">표시할 데이터가 없습니다.</div>
      )}
    </div>
  );
}

function List({ title, rows }) {
  return (
    <div className="rounded-md border border-line bg-ink p-4">
      <h4 className="mb-3 text-sm font-semibold text-white">{title}</h4>
      <div className="space-y-2">
        {rows.map((item, index) => (
          <div key={`${item.name}-${index}`} className="flex items-center justify-between gap-3 rounded bg-panelSoft px-3 py-2 text-sm">
            <span className="min-w-0 truncate text-slate-300">{index + 1}. {item.name}</span>
            <strong className="shrink-0 text-slate-100">{item.value}</strong>
          </div>
        ))}
        {rows.length === 0 && <p className="text-sm text-slate-500">표시할 데이터가 없습니다.</p>}
      </div>
    </div>
  );
}
