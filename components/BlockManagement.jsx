import { useMemo, useState } from "react";
import { Ban, Plus, RefreshCw, ShieldAlert, SlidersHorizontal, Trash2 } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";
import { getBlockRules } from "@/lib/clickData";
import { number } from "@/lib/format";

export default function BlockManagement({ advertisers = [], manualBlocks = [], blockedLogs = [], suspiciousLogs = [], onAddBlock, onRemoveBlock, onRefresh }) {
  const [form, setForm] = useState({ advertiserId: "", ipHash: "", ipMasked: "", reason: "" });
  const [showHash, setShowHash] = useState(false);
  const rules = getBlockRules();

  const candidateLogs = useMemo(() => {
    return [...blockedLogs, ...suspiciousLogs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 80);
  }, [blockedLogs, suspiciousLogs]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function fillCandidate(log) {
    setForm({
      advertiserId: log.advertiserId || advertisers.find((item) => item.name === log.advertiser)?.id || "",
      ipHash: log.ipHash || "",
      ipMasked: log.ipMasked || log.ip || "",
      reason: log.reason || "반복 클릭 수동 차단"
    });
  }

  async function submitBlock(event) {
    event.preventDefault();
    if (!form.advertiserId || !form.ipHash || !form.reason.trim()) return;
    const advertiser = advertisers.find((item) => item.id === form.advertiserId);
    const result = await onAddBlock({
      advertiserId: form.advertiserId,
      clientId: advertiser?.clientId,
      ipHash: form.ipHash.trim(),
      ipMasked: form.ipMasked.trim(),
      ip: form.ipMasked.trim(),
      reason: form.reason.trim()
    });
    if (result?.ok === false) return;
    setForm({ advertiserId: "", ipHash: "", ipMasked: "", reason: "" });
  }

  function confirmRelease(block) {
    if (typeof window !== "undefined" && window.confirm(`${block.ipMasked || block.ip} 차단을 해제할까요?`)) {
      onRemoveBlock(block.id || block.ip);
    }
  }

  return (
    <div id="blocks" className="space-y-5">
      <Card>
        <SectionTitle icon={SlidersHorizontal} title="자동 판정 규칙" />
        <SectionDescription>수집 API가 실제 `pm_click_logs`, `pm_blocked_ips`를 기준으로 반복 클릭과 활성 차단 IP를 판정합니다.</SectionDescription>
        <div className="grid gap-3 p-5 md:grid-cols-2 xl:grid-cols-4">
          {rules.map((rule) => (
            <div key={rule.id} className="rounded-md border border-line bg-panelSoft p-4">
              <p className="text-sm font-semibold text-white">{rule.name}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{rule.condition}</p>
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-slate-500">{rule.action}</span>
                <StatusBadge status={rule.enabled ? "정상" : "의심"} label={rule.enabled ? "ON" : "OFF"} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle icon={ShieldAlert} title="의심/차단 로그 후보" right={<span className="text-xs text-slate-500">차단 {number(blockedLogs.length)} · 의심 {number(suspiciousLogs.length)}</span>} />
        <SectionDescription>후보 로그는 `pm_click_logs.click_status`가 `suspicious` 또는 `blocked`인 실제 수집 로그입니다. `ip_hash`는 기본 노출하지 않고 차단 등록 시 내부 값으로만 사용합니다.</SectionDescription>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead className="bg-panelSoft text-xs uppercase text-slate-500">
              <tr>
                {["시간", "광고주", "client_id", "ip_masked", "상태", "위험도", "최근 클릭", "판정 사유", "작업"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {candidateLogs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-400">{log.dateTime}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-white">{log.advertiser}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-400">{log.clientId || "-"}</td>
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-300">{log.ipMasked || log.ip}</td>
                  <td className="whitespace-nowrap px-4 py-3"><StatusBadge status={log.status} /></td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-100">{log.riskScore}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.clickCountIn10Min || "-"}</td>
                  <td className="max-w-[320px] truncate px-4 py-3 text-slate-400">{log.reason}</td>
                  <td className="whitespace-nowrap px-4 py-3">
                    <button onClick={() => fillCandidate(log)} className="rounded-md border border-line bg-panelSoft px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">
                      차단 등록
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {candidateLogs.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">의심 또는 차단 상태의 실제 클릭 로그가 없습니다.</div>}
        </div>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <SectionTitle icon={Ban} title="활성 차단 IP 목록" right={<span className="text-xs text-slate-500">{number(manualBlocks.length)}개</span>} />
          <div className="flex items-center justify-between border-b border-line px-5 py-3">
            <button onClick={() => setShowHash((prev) => !prev)} className="rounded-md border border-line bg-panelSoft px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">
              ip_hash {showHash ? "숨기기" : "보기"}
            </button>
            {onRefresh && (
              <button onClick={onRefresh} className="inline-flex items-center gap-2 rounded-md border border-line bg-panelSoft px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">
                <RefreshCw size={14} />
                새로고침
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-panelSoft text-xs uppercase text-slate-500">
                <tr>
                  {["광고주", "client_id", "ip_masked", "차단 사유", "방식", "생성일", "관리"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {manualBlocks.map((block) => (
                  <tr key={block.id || `${block.ip}-${block.reason}`}>
                    <td className="whitespace-nowrap px-4 py-3 text-white">{block.advertiser || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{block.clientId || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {block.ipMasked || block.ip}
                      {showHash && <div className="mt-1 max-w-[260px] truncate text-slate-600">{block.ipHash}</div>}
                    </td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-slate-300">{block.reason}</td>
                    <td className="whitespace-nowrap px-4 py-3"><StatusBadge status="차단" label={block.method || "수동 차단"} /></td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-400">{block.createdAt || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <button onClick={() => confirmRelease(block)} className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-panelSoft px-2 text-xs font-semibold text-slate-300 hover:text-danger">
                        <Trash2 size={14} />
                        해제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {manualBlocks.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">활성 차단 IP가 없습니다. 실제 `pm_blocked_ips`의 `is_active=true` 데이터만 표시합니다.</div>}
          </div>
        </Card>

        <Card>
          <SectionTitle icon={Plus} title="수동 차단 추가" />
          <SectionDescription>단순 IP 원문 입력만으로는 동일한 hash를 만들 수 없습니다. 수집 로그 후보에서 선택해 차단하는 것을 권장합니다.</SectionDescription>
          <form onSubmit={submitBlock} className="space-y-3 p-5">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">광고주</span>
              <select value={form.advertiserId} onChange={(event) => update("advertiserId", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none focus:border-brand">
                <option value="">광고주 선택</option>
                {advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}
              </select>
            </label>
            <input value={form.ipMasked} onChange={(event) => update("ipMasked", event.target.value)} placeholder="ip_masked 예: 123.45.***.89" className="h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand" />
            <input value={form.ipHash} onChange={(event) => update("ipHash", event.target.value)} placeholder="ip_hash 필수" className="h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand" />
            <input value={form.reason} onChange={(event) => update("reason", event.target.value)} placeholder="차단 사유 입력" className="h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand" />
            {(!form.ipHash || !form.advertiserId) && <p className="text-xs leading-5 text-warn">광고주와 ip_hash가 있어야 수동 차단을 등록할 수 있습니다.</p>}
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-ink">
              <Plus size={16} />
              차단 추가
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
