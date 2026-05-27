import { useState } from "react";
import clsx from "clsx";
import { Ban, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import { Card, SectionTitle } from "@/components/ui";
import { getBlockRules } from "@/lib/clickData";

export default function BlockManagement({ manualBlocks, onAddBlock, onRemoveBlock }) {
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
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {item.reason} · {item.createdAt}
                  </p>
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
