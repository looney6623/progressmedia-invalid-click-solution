import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3 } from "lucide-react";
import { Card, SectionTitle, TooltipBox, chartColors } from "@/components/ui";

export default function MediaChart({ data }) {
  return (
    <Card>
      <SectionTitle icon={BarChart3} title="매체별 클릭 현황" />
      <div className="h-80 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
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
  );
}
