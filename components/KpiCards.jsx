import { Activity, Ban, CheckCircle2, CircleDollarSign, ShieldAlert, Siren } from "lucide-react";
import clsx from "clsx";
import { Card } from "@/components/ui";
import { currency } from "@/lib/clickData";
import { number, percent } from "@/lib/format";

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

export default function KpiCards({ summary }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
      <KpiCard label="오늘 총 클릭수" value={number(summary.total)} caption="현재 필터 기준" icon={Activity} tone="sky" />
      <KpiCard label="정상 클릭수" value={number(summary.normal)} caption="유효 세션" icon={CheckCircle2} tone="brand" />
      <KpiCard label="의심 클릭수" value={number(summary.suspicious)} caption="검토 필요" icon={Siren} tone="warn" />
      <KpiCard label="차단 클릭수" value={number(summary.blocked)} caption="자동/수동 차단" icon={Ban} tone="danger" />
      <KpiCard label="의심 클릭률" value={percent(summary.suspiciousRate)} caption="의심+차단 비중" icon={ShieldAlert} tone="warn" />
      <KpiCard label="예상 절감 광고비" value={currency.format(summary.savedCost)} caption="차단 CPC 합산" icon={CircleDollarSign} tone="brand" />
    </div>
  );
}
