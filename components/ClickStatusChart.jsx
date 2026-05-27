import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { ShieldCheck } from "lucide-react";
import { Card, SectionTitle, TooltipBox, chartColors } from "@/components/ui";
import { number } from "@/lib/format";

export default function ClickStatusChart({ summary }) {
  const pieData = [
    { name: "정상", value: summary.normal, color: chartColors.normal },
    { name: "의심", value: summary.suspicious, color: chartColors.suspicious },
    { name: "차단", value: summary.blocked, color: chartColors.blocked }
  ];

  return (
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
  );
}
