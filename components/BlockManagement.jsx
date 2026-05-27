import { useMemo, useState } from "react";
import clsx from "clsx";
import { Ban, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";
import { getBlockRules } from "@/lib/clickData";
import { number } from "@/lib/format";

export default function BlockManagement({ manualBlocks, blockedLogs, onAddBlock, onRemoveBlock }) {
  const [ip, setIp] = useState("");
  const [reason, setReason] = useState("");
  const rules = getBlockRules();

  const blockRows = useMemo(() => {
    const manualRows = manualBlocks.map((item) => ({
      ip: item.ip,
      startedAt: item.createdAt,
      reason: item.reason,
      method: "수동 차단"
    }));
    const autoRows = Object.values(
      blockedLogs.reduce((acc, log) => {
        if (manualBlocks.some((item) => item.ip === log.ip)) return acc;
        acc[log.ip] ||= {
          ip: log.ip,
          startedAt: log.dateTime,
          reason: log.reason,
          method: "자동 차단"
        };
        return acc;
      }, {})
    );
    return [...manualRows, ...autoRows].slice(0, 24);
  }, [blockedLogs, manualBlocks]);

  function submitBlock(event) {
    event.preventDefault();
    const trimmedIp = ip.trim();
    const trimmedReason = reason.trim();
    if (!trimmedIp || !trimmedReason) return;
    onAddBlock({ ip: trimmedIp, reason: trimmedReason, createdAt: "방금 전", method: "수동 차단" });
    setIp("");
    setReason("");
  }

  function confirmRelease(ipAddress) {
    if (typeof window !== "undefined" && window.confirm(`${ipAddress} 차단을 해제할까요?`)) {
      onRemoveBlock(ipAddress);
    }
  }

  return (
    <div id="blocks" className="grid gap-5 xl:grid-cols-[1fr_1fr]">
      <Card>
        <SectionTitle icon={SlidersHorizontal} title="차단 관리" />
        <SectionDescription>자동 판정 규칙과 수동 차단 IP를 함께 관리합니다. 현재 수동 차단은 브라우저 상태값으로만 반영됩니다.</SectionDescription>
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
          <SectionTitle icon={Ban} title="차단 IP 목록" right={<span className="text-xs text-slate-500">{number(blockRows.length)}개 IP</span>} />
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-panelSoft text-xs uppercase text-slate-500">
                <tr>
                  {["IP", "차단 시작일", "차단 사유", "차단 방식", "관리"].map((head) => (
                    <th key={head} className="px-4 py-3 font-semibold">
                      {head}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {blockRows.map((item) => {
                  const manual = item.method === "수동 차단";
                  return (
                    <tr key={`${item.method}-${item.ip}`}>
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-white">{item.ip}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-slate-400">{item.startedAt}</td>
                      <td className="px-4 py-3 text-slate-300">{item.reason}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StatusBadge status={manual ? "의심" : "차단"} label={item.method} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {manual ? (
                          <button
                            onClick={() => confirmRelease(item.ip)}
                            className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-panelSoft px-2 text-xs font-semibold text-slate-300 hover:text-danger"
                          >
                            <Trash2 size={14} />
                            차단 해제
                          </button>
                        ) : (
                          <span className="text-xs text-slate-600">자동 규칙</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}
