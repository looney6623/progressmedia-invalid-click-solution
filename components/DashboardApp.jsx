"use client";

import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import {
  Activity,
  Ban,
  BarChart3,
  Bot,
  CheckCircle2,
  CircleDollarSign,
  Clipboard,
  Clock3,
  Copy,
  Download,
  FileText,
  LayoutDashboard,
  Plus,
  RadioTower,
  Search,
  ShieldAlert,
  ShieldCheck,
  Siren,
  SlidersHorizontal,
  Trash2,
  Users
} from "lucide-react";
import clsx from "clsx";
import {
  clickLogs,
  currency,
  getAdvertiserStats,
  getBlockRules,
  getHourlyTrend,
  getMediaStats,
  summarizeClicks
} from "@/lib/clickData";
import { number, percent } from "@/lib/format";

const advertisers = ["전체", "브랜드A", "병원B", "쇼핑몰C", "교육D", "금융E"];
const mediaOptions = ["전체", "네이버 검색", "구글 검색", "카카오", "메타", "제휴 매체"];
const statusOptions = ["전체", "정상", "의심", "차단"];
const dateOptions = ["오늘", "최근 7일", "최근 30일"];

const navItems = [
  { id: "dashboard", label: "메인 대시보드", icon: LayoutDashboard },
  { id: "logs", label: "실시간 클릭 로그", icon: RadioTower },
  { id: "analysis", label: "무효클릭 분석", icon: ShieldAlert },
  { id: "blocks", label: "차단 관리", icon: Ban },
  { id: "scripts", label: "설치 스크립트", icon: Clipboard },
  { id: "reports", label: "광고주 리포트", icon: FileText }
];

const chartColors = {
  normal: "#39d7a5",
  suspicious: "#f8c14a",
  blocked: "#ff6b6b",
  total: "#64b5f6"
};

const installedScripts = [
  { advertiser: "브랜드A", clientId: "pm-brand-a", status: "정상 수집", lastSeen: "2026-05-27 14:28:11" },
  { advertiser: "병원B", clientId: "pm-hospital-b", status: "오류", lastSeen: "2026-05-27 11:42:03" },
  { advertiser: "쇼핑몰C", clientId: "pm-shop-c", status: "정상 수집", lastSeen: "2026-05-27 14:21:38" },
  { advertiser: "교육D", clientId: "pm-edu-d", status: "설치 전", lastSeen: "-" },
  { advertiser: "금융E", clientId: "pm-finance-e", status: "정상 수집", lastSeen: "2026-05-27 14:17:55" }
];

const initialManualBlocks = [
  { ip: "211.44.18.91", reason: "동일 IP 반복 클릭", createdAt: "2026-05-27 14:29" },
  { ip: "59.9.104.201", reason: "저품질 유입 차단", createdAt: "2026-05-27 14:12" }
];

function Card({ children, className, id }) {
  return (
    <section id={id} className={clsx("rounded-lg border border-line bg-panel/92 shadow-glow", className)}>
      {children}
    </section>
  );
}

function SectionTitle({ icon: Icon, title, right }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-panelSoft text-brand">
          <Icon size={17} />
        </span>
        <h2 className="truncate text-sm font-semibold text-slate-100">{title}</h2>
      </div>
      {right}
    </div>
  );
}

function KpiCard({ label, value, caption, icon: Icon, tone }) {
  const toneClass = {
    brand: "text-brand bg-brand/10",
    sky: "text-skyline bg-skyline/10",
    warn: "text-warn bg-warn/10",
    danger: "text-danger bg-danger/10"
  }[tone];

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400">{label}</p>
          <strong className="mt-3 block text-2xl font-semibold tracking-normal text-white">{value}</strong>
          <span className="mt-2 block text-xs text-slate-500">{caption}</span>
        </div>
        <span className={clsx("flex h-10 w-10 shrink-0 items-center justify-center rounded-md", toneClass)}>
          <Icon size={20} />
        </span>
      </div>
    </Card>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={clsx(
        "inline-flex min-w-16 items-center justify-center rounded px-2 py-1 text-xs font-semibold",
        status === "정상" && "bg-brand/10 text-brand",
        status === "의심" && "bg-warn/10 text-warn",
        status === "차단" && "bg-danger/10 text-danger"
      )}
    >
      {status}
    </span>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex min-w-0 flex-col gap-1.5">
      <span className="text-xs font-semibold text-slate-500">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none focus:border-brand"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-ink px-3 py-2 text-xs shadow-glow">
      <p className="mb-1 font-semibold text-slate-100">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {number(entry.value)}
        </p>
      ))}
    </div>
  );
}

function buildTrackingScript(clientId) {
  return `<script>
(function(w,d,s,u,c){
  w.pmInvalidClick=w.pmInvalidClick||function(){(w.pmInvalidClick.q=w.pmInvalidClick.q||[]).push(arguments)};
  w.pmInvalidClick("init",{clientId:c});
  var js=d.createElement(s); js.async=true; js.src=u;
  d.head.appendChild(js);
})(window,document,"script","https://cdn.progressmedia.co.kr/invalid-click.js","${clientId}");
</script>`;
}

function toDateKey(date) {
  return date.toISOString().slice(0, 10);
}

function enrichWithManualBlocks(logs, manualBlocks) {
  const blockMap = new Map(manualBlocks.map((item) => [item.ip, item.reason]));
  return logs.map((log) => {
    const manualReason = blockMap.get(log.ip);
    if (!manualReason) return log;
    return {
      ...log,
      status: "차단",
      riskScore: Math.max(log.riskScore, 95),
      reason: `수동 차단 IP: ${manualReason}`
    };
  });
}

function filterLogs(logs, filters) {
  const latest = logs.reduce((max, log) => (log.createdAt > max ? log.createdAt : max), logs[0]?.createdAt || new Date());
  const latestKey = toDateKey(latest);
  const query = filters.query.trim().toLowerCase();

  return logs.filter((log) => {
    if (filters.advertiser !== "전체" && log.advertiser !== filters.advertiser) return false;
    if (filters.media !== "전체" && log.media !== filters.media) return false;
    if (filters.status !== "전체" && log.status !== filters.status) return false;

    if (filters.dateRange === "오늘" && toDateKey(log.createdAt) !== latestKey) return false;
    if (filters.dateRange === "최근 7일" && latest.getTime() - log.createdAt.getTime() > 7 * 24 * 60 * 60 * 1000) return false;
    if (filters.dateRange === "최근 30일" && latest.getTime() - log.createdAt.getTime() > 30 * 24 * 60 * 60 * 1000) return false;

    if (!query) return true;
    return [log.ip, log.advertiser, log.media, log.reason].some((value) => String(value).toLowerCase().includes(query));
  });
}

function downloadCsv(logs) {
  const header = ["시간", "광고주", "캠페인", "매체", "IP", "기기", "지역", "체류시간", "페이지 이동", "10분 클릭", "위험도", "상태", "판정 사유", "CPC"];
  const rows = logs.map((log) => [
    log.createdAt.toLocaleString("ko-KR"),
    log.advertiser,
    log.campaign,
    log.media,
    log.ip,
    log.device,
    log.region,
    `${log.dwellSeconds}s`,
    log.pageViews,
    log.clickCountIn10Min,
    log.riskScore,
    log.status,
    log.reason,
    log.cpc
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "progressmedia-invalid-click-report.csv";
  link.click();
  URL.revokeObjectURL(url);
}

function FilterPanel({ filters, setFilters }) {
  return (
    <Card className="p-5">
      <div className="grid gap-4 lg:grid-cols-[repeat(4,minmax(0,1fr))_1.4fr]">
        <FilterSelect label="광고주" value={filters.advertiser} onChange={(advertiser) => setFilters((prev) => ({ ...prev, advertiser }))} options={advertisers} />
        <FilterSelect label="매체" value={filters.media} onChange={(media) => setFilters((prev) => ({ ...prev, media }))} options={mediaOptions} />
        <FilterSelect label="상태" value={filters.status} onChange={(status) => setFilters((prev) => ({ ...prev, status }))} options={statusOptions} />
        <FilterSelect label="날짜" value={filters.dateRange} onChange={(dateRange) => setFilters((prev) => ({ ...prev, dateRange }))} options={dateOptions} />
        <label className="flex min-w-0 flex-col gap-1.5">
          <span className="text-xs font-semibold text-slate-500">검색</span>
          <span className="flex h-10 items-center gap-2 rounded-md border border-line bg-ink px-3 focus-within:border-brand">
            <Search size={16} className="shrink-0 text-slate-500" />
            <input
              value={filters.query}
              onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
              placeholder="IP, 광고주명, 매체명, 판정 사유"
              className="min-w-0 flex-1 bg-transparent text-sm text-slate-200 outline-none placeholder:text-slate-600"
            />
          </span>
        </label>
      </div>
    </Card>
  );
}

function DashboardSection({ summary, hourlyTrend }) {
  const pieData = [
    { name: "정상", value: summary.normal, color: chartColors.normal },
    { name: "의심", value: summary.suspicious, color: chartColors.suspicious },
    { name: "차단", value: summary.blocked, color: chartColors.blocked }
  ];

  return (
    <div id="dashboard" className="space-y-5">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <KpiCard label="오늘 총 클릭수" value={number(summary.total)} caption="현재 필터 기준" icon={Activity} tone="sky" />
        <KpiCard label="정상 클릭수" value={number(summary.normal)} caption="유효 세션" icon={CheckCircle2} tone="brand" />
        <KpiCard label="의심 클릭수" value={number(summary.suspicious)} caption="검토 필요" icon={Siren} tone="warn" />
        <KpiCard label="차단 클릭수" value={number(summary.blocked)} caption="자동/수동 차단" icon={Ban} tone="danger" />
        <KpiCard label="의심 클릭률" value={percent(summary.suspiciousRate)} caption="의심+차단 비중" icon={ShieldAlert} tone="warn" />
        <KpiCard label="예상 절감 광고비" value={currency.format(summary.savedCost)} caption="차단 CPC 합산" icon={CircleDollarSign} tone="brand" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.5fr_0.9fr]">
        <Card>
          <SectionTitle icon={Clock3} title="시간대별 클릭 추이" right={<span className="text-xs text-slate-500">필터 결과 반영</span>} />
          <div className="h-80 p-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyTrend}>
                <defs>
                  <linearGradient id="total" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={chartColors.total} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={chartColors.total} stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#253241" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                <YAxis stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<TooltipBox />} />
                <Area name="총 클릭" type="monotone" dataKey="total" stroke={chartColors.total} fill="url(#total)" strokeWidth={2} />
                <Area name="차단" type="monotone" dataKey="blocked" stroke={chartColors.blocked} fill="transparent" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <SectionTitle icon={ShieldCheck} title="클릭 상태 분포" />
          <div className="grid h-80 grid-cols-1 items-center gap-2 p-4 sm:grid-cols-[1fr_0.8fr]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={58} outerRadius={90} paddingAngle={3} dataKey="value">
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<TooltipBox />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-3">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center justify-between rounded-md bg-panelSoft px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-slate-300">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: item.color }} />
                    {item.name}
                  </span>
                  <strong className="text-sm text-white">{number(item.value)}</strong>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

function LogsSection({ logs }) {
  return (
    <Card id="logs">
      <SectionTitle
        icon={RadioTower}
        title="실시간 클릭 로그"
        right={<span className="text-xs text-slate-500">필터 결과 {number(logs.length)}건</span>}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>
              {["시간", "광고주", "매체", "IP", "기기", "체류", "이동", "10분 클릭", "위험도", "상태", "판정 사유"].map((head) => (
                <th key={head} className="px-4 py-3 font-semibold">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {logs.slice(0, 50).map((log) => (
              <tr key={log.id} className="hover:bg-panelSoft/60">
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.time}</td>
                <td className="whitespace-nowrap px-4 py-3 text-white">{log.advertiser}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.media}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{log.ip}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-400">{log.device}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.dwellSeconds}s</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.pageViews}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.clickCountIn10Min}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.riskScore}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={log.status} />
                </td>
                <td className="px-4 py-3 text-slate-400">{log.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">필터 조건에 맞는 클릭 로그가 없습니다.</div>}
      </div>
    </Card>
  );
}

function AnalysisSection({ advertiserStats, mediaStats }) {
  return (
    <div id="analysis" className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Card>
        <SectionTitle icon={Users} title="광고주별 클릭 현황" />
        <div className="h-80 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={advertiserStats}>
              <CartesianGrid stroke="#253241" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <YAxis stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip content={<TooltipBox />} />
              <Bar name="정상" dataKey="normal" stackId="a" fill={chartColors.normal} radius={[0, 0, 4, 4]} />
              <Bar name="의심" dataKey="suspicious" stackId="a" fill={chartColors.suspicious} />
              <Bar name="차단" dataKey="blocked" stackId="a" fill={chartColors.blocked} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <SectionTitle icon={BarChart3} title="매체별 클릭 현황" />
        <div className="h-80 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={mediaStats} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid stroke="#253241" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" width={76} stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
              <Tooltip content={<TooltipBox />} />
              <Bar name="총 클릭" dataKey="total" fill={chartColors.total} radius={[0, 4, 4, 0]} />
              <Bar name="차단" dataKey="blocked" fill={chartColors.blocked} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}

function BlocksSection({ manualBlocks, onAddBlock, onRemoveBlock }) {
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const rules = getBlockRules();

  function submitBlock(event) {
    event.preventDefault();
    const trimmedIp = ip.trim();
    const trimmedReason = reason.trim();
    if (!trimmedIp || !trimmedReason) return;
    onAddBlock({ ip: trimmedIp, reason: trimmedReason, createdAt: "방금 전" });
    setIp("");
    setReason("");
  }

  return (
    <div id="blocks" className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <SectionTitle icon={SlidersHorizontal} title="차단 관리" />
        <div className="divide-y divide-line">
          {rules.map((rule) => (
            <div key={rule.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_1.25fr_0.55fr_0.45fr] md:items-center">
              <div>
                <p className="text-sm font-semibold text-white">{rule.name}</p>
                <span className="text-xs text-slate-500">{rule.id}</span>
              </div>
              <p className="text-sm text-slate-300">{rule.condition}</p>
              <p className="text-sm text-slate-400">{rule.action}</p>
              <div className="flex items-center justify-between gap-3 md:justify-end">
                <span className="text-xs text-slate-500">{rule.count}건</span>
                <span className={clsx("h-5 w-9 rounded-full p-0.5", rule.enabled ? "bg-brand" : "bg-slate-700")}>
                  <span className={clsx("block h-4 w-4 rounded-full bg-white transition", rule.enabled && "translate-x-4")} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="space-y-5">
        <Card>
          <SectionTitle icon={Plus} title="수동 차단 IP 추가" />
          <form onSubmit={submitBlock} className="space-y-3 p-5">
            <input
              value={ip}
              onChange={(event) => setIp(event.target.value)}
              placeholder="예: 123.45.67.89"
              className="h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand"
            />
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="차단 사유 입력"
              className="h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand"
            />
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-ink">
              <Plus size={16} />
              차단 추가
            </button>
          </form>
        </Card>

        <Card>
          <SectionTitle icon={Ban} title="수동 차단 목록" right={<span className="text-xs text-slate-500">{manualBlocks.length}개 IP</span>} />
          <div className="divide-y divide-line">
            {manualBlocks.map((item) => (
              <div key={item.ip} className="flex items-center justify-between gap-3 px-5 py-4">
                <div className="min-w-0">
                  <p className="font-mono text-sm text-white">{item.ip}</p>
                  <p className="mt-1 truncate text-xs text-slate-500">{item.reason} · {item.createdAt}</p>
                </div>
                <button
                  onClick={() => onRemoveBlock(item.ip)}
                  className="inline-flex h-9 shrink-0 items-center gap-2 rounded-md border border-line bg-panelSoft px-3 text-xs font-semibold text-slate-300 hover:text-danger"
                >
                  <Trash2 size={14} />
                  차단 해제
                </button>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

function ScriptSection() {
  const [copied, setCopied] = useState("");

  async function copyScript(clientId, advertiser) {
    await navigator.clipboard.writeText(buildTrackingScript(clientId));
    setCopied(advertiser);
    window.setTimeout(() => setCopied(""), 1600);
  }

  return (
    <Card id="scripts">
      <SectionTitle icon={Clipboard} title="광고주별 설치 스크립트" right={<span className="text-xs text-slate-500">더미 설치 상태</span>} />
      <div className="divide-y divide-line">
        {installedScripts.map((item) => (
          <div key={item.clientId} className="grid gap-4 px-5 py-5 xl:grid-cols-[0.65fr_1.4fr_0.45fr_0.55fr] xl:items-center">
            <div>
              <p className="text-sm font-semibold text-white">{item.advertiser}</p>
              <p className="mt-1 font-mono text-xs text-slate-500">{item.clientId}</p>
            </div>
            <pre className="max-h-24 overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-300">
              {buildTrackingScript(item.clientId)}
            </pre>
            <StatusBadge status={item.status === "오류" ? "차단" : item.status === "설치 전" ? "의심" : "정상"} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-slate-500">최근 수집 {item.lastSeen}</span>
              <button
                onClick={() => copyScript(item.clientId, item.advertiser)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-panelSoft px-3 text-xs font-semibold text-slate-300 hover:text-white"
              >
                <Copy size={14} />
                {copied === item.advertiser ? "복사됨" : "복사"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function ReportsSection({ advertiserStats }) {
  return (
    <Card id="reports">
      <SectionTitle icon={FileText} title="광고주 리포트" right={<span className="text-xs text-slate-500">현재 필터 기준</span>} />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>
              {["광고주", "총 클릭", "정상", "의심", "차단", "의심 클릭률", "예상 절감 광고비"].map((head) => (
                <th key={head} className="px-5 py-3 font-semibold">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {advertiserStats.map((row) => {
              const riskRate = row.total ? ((row.suspicious + row.blocked) / row.total) * 100 : 0;
              return (
                <tr key={row.name} className="hover:bg-panelSoft/60">
                  <td className="px-5 py-4 font-semibold text-white">{row.name}</td>
                  <td className="px-5 py-4 text-slate-300">{number(row.total)}</td>
                  <td className="px-5 py-4 text-brand">{number(row.normal)}</td>
                  <td className="px-5 py-4 text-warn">{number(row.suspicious)}</td>
                  <td className="px-5 py-4 text-danger">{number(row.blocked)}</td>
                  <td className="px-5 py-4 text-slate-300">{percent(riskRate)}</td>
                  <td className="px-5 py-4 text-slate-100">{currency.format(row.savedCost)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {advertiserStats.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">리포트 데이터가 없습니다.</div>}
      </div>
    </Card>
  );
}

export default function DashboardApp() {
  const [filters, setFilters] = useState({
    advertiser: "전체",
    media: "전체",
    status: "전체",
    dateRange: "오늘",
    query: ""
  });
  const [manualBlocks, setManualBlocks] = useState(initialManualBlocks);

  const blockedAwareLogs = useMemo(() => enrichWithManualBlocks(clickLogs, manualBlocks), [manualBlocks]);
  const filteredLogs = useMemo(() => filterLogs(blockedAwareLogs, filters), [blockedAwareLogs, filters]);
  const summary = useMemo(() => summarizeClicks(filteredLogs), [filteredLogs]);
  const advertiserStats = useMemo(() => getAdvertiserStats(filteredLogs), [filteredLogs]);
  const mediaStats = useMemo(() => getMediaStats(filteredLogs), [filteredLogs]);
  const hourlyTrend = useMemo(() => getHourlyTrend(filteredLogs), [filteredLogs]);

  function addManualBlock(item) {
    setManualBlocks((prev) => {
      const rest = prev.filter((block) => block.ip !== item.ip);
      return [item, ...rest];
    });
  }

  function removeManualBlock(ip) {
    setManualBlocks((prev) => prev.filter((block) => block.ip !== ip));
  }

  return (
    <div className="min-h-screen text-slate-200">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line bg-ink/95 px-4 py-5 lg:block">
        <div className="mb-8 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-lg font-black text-ink">P</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">프로그레스미디어</p>
            <p className="truncate text-xs text-slate-500">무효클릭차단 솔루션</p>
          </div>
        </div>
        <nav className="space-y-1">
          {navItems.map(({ id, label, icon: Icon }, index) => (
            <a
              key={id}
              href={`#${id}`}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-panelSoft hover:text-white",
                index === 0 && "bg-panelSoft text-white"
              )}
            >
              <Icon size={17} />
              {label}
            </a>
          ))}
        </nav>
        <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-line bg-panel p-4">
          <p className="text-xs font-semibold text-slate-400">실시간 방어 상태</p>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-sm text-white">자동 차단 ON</span>
            <span className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_18px_rgba(57,215,165,0.9)]" />
          </div>
        </div>
      </aside>

      <main className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b border-line bg-ink/88 backdrop-blur">
          <div className="flex flex-col gap-4 px-5 py-4 md:flex-row md:items-center md:justify-between lg:px-8">
            <div>
              <p className="text-xs font-semibold text-brand">INVALID CLICK PREVENTION</p>
              <h1 className="mt-1 text-xl font-bold tracking-normal text-white md:text-2xl">프로그레스미디어 무효클릭차단 솔루션</h1>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button className="rounded-md border border-line bg-panel px-3 py-2 text-xs font-semibold text-slate-300">{filters.dateRange}</button>
              <button className="rounded-md border border-line bg-panel px-3 py-2 text-xs font-semibold text-slate-300">{filters.advertiser}</button>
              <button
                onClick={() => downloadCsv(filteredLogs)}
                className="inline-flex items-center gap-2 rounded-md bg-brand px-3 py-2 text-xs font-semibold text-ink"
              >
                <Download size={14} />
                리포트 내보내기
              </button>
            </div>
          </div>
        </header>

        <div className="space-y-5 px-5 py-5 lg:px-8">
          <FilterPanel filters={filters} setFilters={setFilters} />
          <DashboardSection summary={summary} hourlyTrend={hourlyTrend} />
          <AnalysisSection advertiserStats={advertiserStats} mediaStats={mediaStats} />
          <LogsSection logs={filteredLogs} />
          <BlocksSection manualBlocks={manualBlocks} onAddBlock={addManualBlock} onRemoveBlock={removeManualBlock} />
          <ScriptSection />
          <ReportsSection advertiserStats={advertiserStats} />
        </div>
      </main>
    </div>
  );
}
