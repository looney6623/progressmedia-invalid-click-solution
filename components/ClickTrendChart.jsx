import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock3 } from "lucide-react";
import { Card, SectionTitle, TooltipBox, chartColors } from "@/components/ui";

export default function ClickTrendChart({ data }) {
  return (
    <Card>
      <SectionTitle icon={Clock3} title="시간대별 클릭 추이" right={<span className="text-xs text-slate-500">필터 결과 반영</span>} />
      <div className="h-80 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
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
  );
}
