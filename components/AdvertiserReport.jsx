import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { FileText, Printer } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge, TooltipBox, chartColors } from "@/components/ui";
import { currency } from "@/lib/clickData";
import { number, percent } from "@/lib/format";

function groupBy(logs, key) {
  return Object.values(
    logs.reduce((acc, item) => {
      const value = item[key];
      acc[value] ||= { name: value, total: 0, normal: 0, suspicious: 0, blocked: 0, savedCost: 0 };
      acc[value].total += 1;
      if (item.status === "정상") acc[value].normal += 1;
      if (item.status === "의심") acc[value].suspicious += 1;
      if (item.status === "차단") {
        acc[value].blocked += 1;
        acc[value].savedCost += item.cpc;
      }
      return acc;
    }, {})
  ).sort((a, b) => b.total - a.total);
}

function summarize(logs) {
  const total = logs.length;
  const normal = logs.filter((item) => item.status === "정상").length;
  const suspicious = logs.filter((item) => item.status === "의심").length;
  const blocked = logs.filter((item) => item.status === "차단").length;
  const suspiciousRate = total ? ((suspicious + blocked) / total) * 100 : 0;
  const savedCost = logs.filter((item) => item.status === "차단").reduce((sum, item) => sum + item.cpc, 0);
  return { total, normal, suspicious, blocked, suspiciousRate, savedCost };
}

function topReasons(logs) {
  const counts = logs
    .filter((item) => item.status !== "정상")
    .flatMap((item) => item.reason.split(", "))
    .reduce((acc, reason) => {
      acc[reason] = (acc[reason] || 0) + 1;
      return acc;
    }, {});
  return Object.entries(counts)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

export default function AdvertiserReport({ advertiserStats, logs }) {
  const advertisers = advertiserStats.map((item) => item.name);
  const [selectedAdvertiser, setSelectedAdvertiser] = useState(advertisers[0] || "");
  const activeAdvertiser = advertisers.includes(selectedAdvertiser) ? selectedAdvertiser : advertisers[0] || "";

  const detail = useMemo(() => {
    const advertiserLogs = logs.filter((item) => item.advertiser === activeAdvertiser);
    const hourly = groupBy(advertiserLogs, "hour").sort((a, b) => a.name.localeCompare(b.name));
    const media = groupBy(advertiserLogs, "media");
    const blockedIps = advertiserLogs.filter((item) => item.status === "차단").map((item) => item.ip);
    return {
      summary: summarize(advertiserLogs),
      media,
      hourly,
      reasons: topReasons(advertiserLogs),
      blockedIps: [...new Set(blockedIps)]
    };
  }, [activeAdvertiser, logs]);

  return (
    <Card id="reports" className="print-area">
      <SectionTitle
        icon={FileText}
        title="광고주 리포트"
        right={
          <div className="flex items-center gap-2 no-print">
            <select
              value={activeAdvertiser}
              onChange={(event) => setSelectedAdvertiser(event.target.value)}
              className="h-9 rounded-md border border-line bg-ink px-3 text-xs text-slate-200 outline-none focus:border-brand"
            >
              {advertisers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button onClick={() => window.print()} className="inline-flex h-9 items-center gap-2 rounded-md bg-brand px-3 text-xs font-semibold text-ink">
              <Printer size={14} />
              인쇄
            </button>
          </div>
        }
      />
      <SectionDescription>광고주별 무효 클릭 현황을 운영 리포트 형태로 확인합니다. 인쇄 시 사이드바와 필터는 숨기고 본문만 출력됩니다.</SectionDescription>

      <div className="overflow-x-auto no-print">
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
      </div>

      {activeAdvertiser ? (
        <div className="space-y-5 p-5 print-report">
          <div>
            <p className="text-xs font-semibold text-brand">ADVERTISER DETAIL REPORT</p>
            <h3 className="mt-1 text-2xl font-bold text-white">{activeAdvertiser} 상세 리포트</h3>
          </div>
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              ["총 클릭", number(detail.summary.total)],
              ["정상 클릭", number(detail.summary.normal)],
              ["의심 클릭", number(detail.summary.suspicious)],
              ["차단 클릭", number(detail.summary.blocked)],
              ["의심 클릭률", percent(detail.summary.suspiciousRate)],
              ["예상 절감 광고비", currency.format(detail.summary.savedCost)]
            ].map(([label, value]) => (
              <div key={label} className="rounded-md border border-line bg-panelSoft p-4">
                <p className="text-xs text-slate-500">{label}</p>
                <strong className="mt-2 block text-lg text-white">{value}</strong>
              </div>
            ))}
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-md border border-line bg-ink p-4">
              <h4 className="mb-3 text-sm font-semibold text-white">매체별 클릭</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detail.media}>
                    <CartesianGrid stroke="#253241" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip content={<TooltipBox />} />
                    <Bar name="총 클릭" dataKey="total" fill={chartColors.total} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="rounded-md border border-line bg-ink p-4">
              <h4 className="mb-3 text-sm font-semibold text-white">시간대별 클릭</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={detail.hourly}>
                    <CartesianGrid stroke="#253241" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                    <YAxis stroke="#7b8794" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} allowDecimals={false} />
                    <Tooltip content={<TooltipBox />} />
                    <Bar name="총 클릭" dataKey="total" fill={chartColors.normal} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            <div className="rounded-md border border-line bg-ink p-4">
              <h4 className="mb-3 text-sm font-semibold text-white">의심 사유 TOP 5</h4>
              <div className="space-y-2">
                {detail.reasons.map((item, index) => (
                  <div key={item.reason} className="flex items-center justify-between rounded bg-panelSoft px-3 py-2 text-sm">
                    <span className="text-slate-300">
                      {index + 1}. {item.reason}
                    </span>
                    <strong className="text-warn">{item.count}건</strong>
                  </div>
                ))}
                {detail.reasons.length === 0 && <p className="text-sm text-slate-500">의심 사유가 없습니다.</p>}
              </div>
            </div>
            <div className="rounded-md border border-line bg-ink p-4">
              <h4 className="mb-3 text-sm font-semibold text-white">차단 IP 목록</h4>
              <div className="flex flex-wrap gap-2">
                {detail.blockedIps.map((ip) => (
                  <StatusBadge key={ip} status="차단" label={ip} />
                ))}
                {detail.blockedIps.length === 0 && <p className="text-sm text-slate-500">차단 IP가 없습니다.</p>}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="px-5 py-10 text-center text-sm text-slate-500">리포트 데이터가 없습니다.</div>
      )}
    </Card>
  );
}
