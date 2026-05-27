import { useMemo, useState } from "react";
import { Ban, Plus, RefreshCw, ShieldAlert, Trash2 } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";
import { number } from "@/lib/format";

export default function BlockManagement({ advertisers = [], manualBlocks = [], blockedLogs = [], suspiciousLogs = [], onAddBlock, onRemoveBlock, onRefresh }) {
  const [form, setForm] = useState({ advertiserId: advertisers[0]?.id || "", ipHash: "", ipMasked: "", reason: "" });
  const [showHash, setShowHash] = useState(false);

  const candidateLogs = useMemo(() => [...blockedLogs, ...suspiciousLogs].slice(0, 40), [blockedLogs, suspiciousLogs]);

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
    setForm({ advertiserId: advertisers[0]?.id || "", ipHash: "", ipMasked: "", reason: "" });
  }

  function confirmRelease(block) {
    if (typeof window !== "undefined" && window.confirm(`${block.ipMasked || block.ip} 차단을 해제할까요?`)) {
      onRemoveBlock(block.id || block.ip);
    }
  }

  return (
    <div id="blocks" className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <SectionTitle icon={ShieldAlert} title="수동 차단 추가" />
          <SectionDescription>차단 대상은 ip_hash 기준으로 저장하고, 화면에는 ip_masked를 중심으로 표시합니다.</SectionDescription>
          <form onSubmit={submitBlock} className="space-y-3 p-5">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">광고주</span>
              <select value={form.advertiserId} onChange={(event) => update("advertiserId", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none focus:border-brand">
                <option value="">광고주 선택</option>
                {advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}
              </select>
            </label>
            <input value={form.ipMasked} onChange={(event) => update("ipMasked", event.target.value)} placeholder="ip_masked 예: 123.45.***.89" className="h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand" />
            <input value={form.ipHash} onChange={(event) => update("ipHash", event.target.value)} placeholder="ip_hash" className="h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand" />
            <input value={form.reason} onChange={(event) => update("reason", event.target.value)} placeholder="차단 사유 입력" className="h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand" />
            <button className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-ink">
              <Plus size={16} />
              차단 추가
            </button>
          </form>
        </Card>

        <Card>
          <SectionTitle
            icon={Ban}
            title="활성 차단 IP"
            right={<span className="text-xs text-slate-500">{number(manualBlocks.length)}개</span>}
          />
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
            <table className="w-full min-w-[780px] text-left text-sm">
              <thead className="bg-panelSoft text-xs uppercase text-slate-500">
                <tr>
                  {["광고주", "IP", "차단 사유", "방식", "생성일", "관리"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {manualBlocks.map((block) => (
                  <tr key={block.id || `${block.ip}-${block.reason}`}>
                    <td className="px-4 py-3 text-white">{block.advertiser || "-"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-300">
                      {block.ipMasked || block.ip}
                      {showHash && <div className="mt-1 max-w-[260px] truncate text-slate-600">{block.ipHash}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-300">{block.reason}</td>
                    <td className="px-4 py-3"><StatusBadge status="차단" label={block.method || "수동 차단"} /></td>
                    <td className="px-4 py-3 text-slate-400">{block.createdAt || "-"}</td>
                    <td className="px-4 py-3">
                      <button onClick={() => confirmRelease(block)} className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-panelSoft px-2 text-xs font-semibold text-slate-300 hover:text-danger">
                        <Trash2 size={14} />
                        해제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {manualBlocks.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">활성 차단 IP가 없습니다.</div>}
          </div>
        </Card>
      </div>

      <Card>
        <SectionTitle icon={ShieldAlert} title="차단/의심 후보 로그" right={<span className="text-xs text-slate-500">차단 {blockedLogs.length} · 의심 {suspiciousLogs.length}</span>} />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="bg-panelSoft text-xs uppercase text-slate-500">
              <tr>
                {["시간", "광고주", "IP", "상태", "최근 클릭", "위험도", "사유", "작업"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {candidateLogs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-3 text-slate-400">{log.dateTime}</td>
                  <td className="px-4 py-3 text-white">{log.advertiser}</td>
                  <td className="px-4 py-3 font-mono text-xs text-slate-300">{log.ipMasked || log.ip}</td>
                  <td className="px-4 py-3"><StatusBadge status={log.status} /></td>
                  <td className="px-4 py-3 text-slate-300">{log.clickCountIn10Min}</td>
                  <td className="px-4 py-3 text-slate-100">{log.riskScore}</td>
                  <td className="max-w-[320px] truncate px-4 py-3 text-slate-400">{log.reason}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => fillCandidate(log)} className="rounded-md border border-line bg-panelSoft px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">폼에 입력</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {candidateLogs.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">차단 또는 의심 상태의 로그가 없습니다.</div>}
        </div>
      </Card>
    </div>
  );
}
