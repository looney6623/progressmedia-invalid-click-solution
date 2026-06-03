import { useMemo, useState } from "react";
import { Eye, RadioTower, RefreshCw, X } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";
import { currency, number } from "@/lib/format";

function maskIp(ip) {
  const parts = ip.split(".");
  if (parts.length !== 4) return ip;
  return `${parts[0]}.${parts[1]}.***.${parts[3]}`;
}

export default function ClickLogTable({ logs, onRefresh }) {
  const [sortMode, setSortMode] = useState("latest");
  const [maskIps, setMaskIps] = useState(false);
  const [selectedLog, setSelectedLog] = useState(null);

  const sortedLogs = useMemo(() => {
    return [...logs].sort((a, b) => {
      if (sortMode === "risk") return b.riskScore - a.riskScore || b.createdAt - a.createdAt;
      return b.createdAt - a.createdAt;
    });
  }, [logs, sortMode]);

  return (
    <Card id="logs">
      <SectionTitle
        icon={RadioTower}
        title="실시간 클릭 로그"
        right={<span className="text-xs text-slate-500">총 {number(logs.length)}건</span>}
      />
      <SectionDescription>
        유입 클릭을 시간, 매체, IP, 체류 행동 기준으로 확인합니다. 위험도가 높은 순서로 정렬하거나 IP 일부를 가려서 볼 수 있습니다.
      </SectionDescription>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center gap-2">
          {["정상", "의심", "차단"].map((status) => (
            <StatusBadge key={status} status={status} label={`${status} ${number(logs.filter((item) => item.status === status).length)}`} />
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={sortMode}
            onChange={(event) => setSortMode(event.target.value)}
            className="h-9 rounded-md border border-line bg-ink px-3 text-xs text-slate-200 outline-none focus:border-brand"
          >
            <option value="latest">최신순</option>
            <option value="risk">위험도 높은 순</option>
          </select>
          <button
            onClick={() => setMaskIps((prev) => !prev)}
            className="h-9 rounded-md border border-line bg-panelSoft px-3 text-xs font-semibold text-slate-300 hover:text-white"
          >
            IP 마스킹 {maskIps ? "ON" : "OFF"}
          </button>
          {onRefresh && (
            <button
              onClick={onRefresh}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-panelSoft px-3 text-xs font-semibold text-slate-300 hover:text-white"
            >
              <RefreshCw size={14} />
              새로고침
            </button>
          )}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1120px] text-left text-sm">
          <thead className="bg-panelSoft text-xs uppercase text-slate-500">
            <tr>
          {["시간", "광고주", "고객 코드", "IP", "방문 페이지", "유입 경로", "캠페인 정보", "체류", "최근 클릭", "위험도", "상태", "판정 사유", "상세"].map((head) => (
                <th key={head} className="px-4 py-3 font-semibold">
                  {head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {sortedLogs.slice(0, 60).map((log) => (
              <tr key={log.id} className="hover:bg-panelSoft/60">
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.time}</td>
                <td className="whitespace-nowrap px-4 py-3 text-white">{log.advertiser}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{log.clientId || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{maskIps ? maskIp(log.ip) : log.ip}</td>
                <td className="max-w-[260px] truncate px-4 py-3 text-slate-300">{log.landingPage}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-300">{log.referrer || log.media}</td>
                <td className="max-w-[220px] truncate px-4 py-3 text-slate-400">{log.utm || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{Number(log.dwellSeconds || 0) > 0 ? `${number(log.dwellSeconds)}초` : "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.clickCountIn10Min || "-"}</td>
                <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-100">{log.riskScore}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <StatusBadge status={log.status} />
                </td>
                <td className="max-w-[280px] truncate px-4 py-3 text-slate-400">{log.reason}</td>
                <td className="whitespace-nowrap px-4 py-3">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-panelSoft px-2 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    <Eye size={14} />
                    보기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="px-5 py-10 text-center text-sm text-slate-500">
            아직 수집된 클릭 로그가 없습니다. 광고주 사이트에 설치 스크립트를 삽입하면 이 화면에 실제 클릭 로그가 표시됩니다.
          </div>
        )}
      </div>

      {selectedLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-lg border border-line bg-panel shadow-glow">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <div>
                <p className="text-xs font-semibold text-brand">CLICK DETAIL</p>
                <h3 className="mt-1 text-lg font-bold text-white">{selectedLog.id}</h3>
              </div>
              <button onClick={() => setSelectedLog(null)} className="rounded-md border border-line bg-panelSoft p-2 text-slate-400 hover:text-white">
                <X size={16} />
              </button>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2">
              {[
                ["광고주", selectedLog.advertiser],
                ["고객 코드", selectedLog.clientId || "-"],
                ["캠페인", selectedLog.campaign],
                ["키워드", selectedLog.keyword],
                ["매체", selectedLog.media],
                ["IP", selectedLog.ip],
                ["유입 경로", selectedLog.referrer || selectedLog.media || "-"],
                ["UTM", selectedLog.utm || "-"],
                ["지역/기기", `${selectedLog.region} · ${selectedLog.device}`],
                ["랜딩 페이지", selectedLog.landingPage],
                ["브라우저", selectedLog.userAgent],
                ["체류/이동", `${Number(selectedLog.dwellSeconds || 0) > 0 ? `${number(selectedLog.dwellSeconds)}초` : "-"} · ${selectedLog.pageViews}회`],
                ["10분 내 클릭", `${selectedLog.clickCountIn10Min}회`],
                ["클릭 비용", currency(selectedLog.cpc)],
                ["위험도", `${selectedLog.riskScore}점`]
              ].map(([label, value]) => (
                <div key={label} className="rounded-md bg-panelSoft p-3">
                  <p className="text-xs text-slate-500">{label}</p>
                  <p className="mt-1 text-sm font-semibold text-slate-100">{value}</p>
                </div>
              ))}
              <div className="rounded-md bg-panelSoft p-3 sm:col-span-2">
                <p className="text-xs text-slate-500">판정 결과</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <StatusBadge status={selectedLog.status} />
                  <span className="text-sm text-slate-300">{selectedLog.reason}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
