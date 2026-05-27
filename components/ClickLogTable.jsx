import { RadioTower } from "lucide-react";
import { Card, SectionTitle, StatusBadge } from "@/components/ui";
import { number } from "@/lib/format";

export default function ClickLogTable({ logs }) {
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
