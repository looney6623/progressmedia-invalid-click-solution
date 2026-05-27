import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Users } from "lucide-react";
import { Card, SectionTitle, TooltipBox, chartColors } from "@/components/ui";

export default function AdvertiserChart({ data }) {
  return (
    <Card>
      <SectionTitle icon={Users} title="광고주별 클릭 현황" />
      <div className="h-80 p-4">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
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
  );
}
