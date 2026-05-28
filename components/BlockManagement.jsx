import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Plus, RefreshCw, ShieldAlert, SlidersHorizontal, Trash2 } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";
import { number } from "@/lib/format";

const tabs = [
  { id: "rules", label: "자동 차단 규칙" },
  { id: "manual", label: "수동 차단 IP" },
  { id: "history", label: "차단 해제 이력" }
];

export default function BlockManagement({
  advertisers = [],
  manualBlocks = [],
  releasedBlocks = [],
  blockRules = [],
  blockedLogs = [],
  suspiciousLogs = [],
  onAddBlock,
  onRemoveBlock,
  onUpdateRule,
  onRefresh,
  defaultTab = "manual"
}) {
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [form, setForm] = useState({ advertiserId: "", rawIp: "", reason: "" });
  const [showHash, setShowHash] = useState(false);
  const [savingRuleId, setSavingRuleId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const candidateLogs = useMemo(() => {
    return [...blockedLogs, ...suspiciousLogs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 80);
  }, [blockedLogs, suspiciousLogs]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function toggleRule(rule) {
    setSavingRuleId(rule.id);
    setError("");
    const result = await onUpdateRule?.(rule, { is_enabled: !rule.isEnabled });
    setSavingRuleId("");
    if (result?.ok === false) {
      setError(result.error || "규칙 저장에 실패했습니다.");
      return;
    }
    setNotice("자동 차단 규칙을 저장했습니다.");
  }

  async function updateThreshold(rule, threshold) {
    setSavingRuleId(rule.id);
    setError("");
    const result = await onUpdateRule?.(rule, { threshold });
    setSavingRuleId("");
    if (result?.ok === false) setError(result.error || "threshold 저장에 실패했습니다.");
  }

  async function blockFromLog(log) {
    setError("");
    const result = await onAddBlock({
      logId: log.id,
      advertiserId: log.advertiserId || advertisers.find((item) => item.name === log.advertiser)?.id || "",
      clientId: log.clientId,
      ipHash: log.ipHash,
      ipMasked: log.ipMasked || log.ip,
      reason: log.reason || "수집 로그 기반 수동 차단"
    });
    if (result?.ok === false) {
      setError(result.error || "차단 등록에 실패했습니다.");
      return;
    }
    setNotice(result?.duplicated ? "이미 활성 차단된 IP입니다." : "수집 로그 기반 차단을 등록했습니다.");
  }

  async function submitBlock(event) {
    event.preventDefault();
    setError("");
    if (!form.advertiserId || !form.rawIp.trim() || !form.reason.trim()) {
      setError("광고주, IP, 차단 사유를 입력해 주세요.");
      return;
    }
    const advertiser = advertisers.find((item) => item.id === form.advertiserId);
    const result = await onAddBlock({
      advertiserId: form.advertiserId,
      clientId: advertiser?.clientId,
      rawIp: form.rawIp.trim(),
      reason: form.reason.trim()
    });
    if (result?.ok === false) {
      setError(result.error || "차단 등록에 실패했습니다.");
      return;
    }
    setNotice("서버에서 IP를 hash 처리한 뒤 수동 차단을 등록했습니다.");
    setForm({ advertiserId: "", rawIp: "", reason: "" });
  }

  function confirmRelease(block) {
    if (typeof window !== "undefined" && window.confirm(`${block.ipMasked || block.ip} 차단을 해제할까요?`)) {
      onRemoveBlock(block.id || block.ip);
    }
  }

  return (
    <div id="blocks" className="space-y-5">
      {(notice || error) && (
        <Card className={`p-4 text-sm ${error ? "border-danger/30 bg-danger/10 text-danger" : "border-brand/30 bg-brand/10 text-brand"}`}>
          {error || notice}
        </Card>
      )}

      <Card className="p-2 no-print">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-md px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id ? "bg-brand text-ink" : "text-slate-400 hover:bg-panelSoft hover:text-white"}`}
            >
              {tab.label}
            </button>
          ))}
          {onRefresh && (
            <button onClick={onRefresh} className="ml-auto inline-flex items-center gap-2 rounded-md border border-line bg-panelSoft px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">
              <RefreshCw size={14} />
              새로고침
            </button>
          )}
        </div>
      </Card>

      {activeTab === "rules" && (
        <Card>
          <SectionTitle icon={SlidersHorizontal} title="자동 차단 규칙" />
          <SectionDescription>규칙 ON/OFF와 threshold는 `pm_block_rules`에 저장되며, `/api/collect` 판정 시 즉시 반영됩니다. 활성 수동 차단 IP는 규칙 상태와 무관하게 항상 차단됩니다.</SectionDescription>
          <div className="grid gap-3 p-5 xl:grid-cols-2">
            {blockRules.map((rule) => (
              <div key={rule.id} className="rounded-md border border-line bg-panelSoft p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-white">{rule.ruleName}</p>
                    <p className="mt-1 text-xs text-slate-500">{rule.advertiserName || "광고주 공통"}</p>
                  </div>
                  <button
                    type="button"
                    disabled={savingRuleId === rule.id}
                    onClick={() => toggleRule(rule)}
                    className={`h-8 min-w-16 rounded-full border px-3 text-xs font-bold transition ${rule.isEnabled ? "border-brand/40 bg-brand/15 text-brand" : "border-line bg-ink text-slate-500"}`}
                  >
                    {savingRuleId === rule.id ? "저장 중" : rule.isEnabled ? "ON" : "OFF"}
                  </button>
                </div>
                <p className="mt-3 text-xs leading-5 text-slate-400">{rule.description}</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <Field label="action" value={rule.action} />
                  <label className="block">
                    <span className="text-xs text-slate-500">threshold</span>
                    <input
                      type="number"
                      value={rule.threshold ?? ""}
                      onChange={(event) => updateThreshold(rule, event.target.value === "" ? null : Number(event.target.value))}
                      className="mt-1 h-9 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand"
                    />
                  </label>
                  <Field label="risk_delta" value={rule.riskDelta ?? 0} />
                </div>
              </div>
            ))}
            {blockRules.length === 0 && <div className="rounded-md border border-line bg-panelSoft p-6 text-center text-sm text-slate-500 xl:col-span-2">표시할 자동 차단 규칙이 없습니다.</div>}
          </div>
        </Card>
      )}

      {activeTab === "manual" && (
        <>
          <Card>
            <SectionTitle icon={ShieldAlert} title="의심/차단 로그 후보" right={<span className="text-xs text-slate-500">차단 {number(blockedLogs.length)} · 의심 {number(suspiciousLogs.length)}</span>} />
            <SectionDescription>후보 로그의 차단 등록은 `log_id`를 서버로 보내고, 서버가 `pm_click_logs.ip_hash`를 사용해 `pm_blocked_ips`에 저장합니다.</SectionDescription>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-panelSoft text-xs uppercase text-slate-500">
                  <tr>
                    {["시간", "광고주", "client_id", "ip_masked", "상태", "위험도", "최근 클릭", "적용 규칙", "판정 사유", "작업"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
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
                      <td className="whitespace-nowrap px-4 py-3 text-slate-300">{log.recentCount || log.clickCountIn10Min || "-"}</td>
                      <td className="max-w-[220px] truncate px-4 py-3 text-slate-400">{(log.appliedRules || []).map((rule) => rule.rule_key).join(", ") || "-"}</td>
                      <td className="max-w-[300px] truncate px-4 py-3 text-slate-400">{log.reason}</td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <button onClick={() => blockFromLog(log)} className="rounded-md border border-line bg-panelSoft px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">
                          차단 등록
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {candidateLogs.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">의심 또는 차단 상태의 수집 로그가 없습니다.</div>}
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
            <Card>
              <SectionTitle icon={Ban} title="활성 차단 IP 목록" right={<span className="text-xs text-slate-500">{number(manualBlocks.length)}개</span>} />
              <div className="flex items-center justify-between border-b border-line px-5 py-3">
                <button onClick={() => setShowHash((prev) => !prev)} className="rounded-md border border-line bg-panelSoft px-3 py-2 text-xs font-semibold text-slate-300 hover:text-white">
                  ip_hash {showHash ? "숨기기" : "보기"}
                </button>
              </div>
              <BlockTable blocks={manualBlocks} showHash={showHash} onRelease={confirmRelease} />
            </Card>

            <Card>
              <SectionTitle icon={Plus} title="직접 IP 차단" />
              <SectionDescription>IP 원문은 DB에 저장하지 않습니다. 서버 API가 서버 전용 salt로 `ip_hash`를 생성하고 `ip_masked`만 저장합니다.</SectionDescription>
              <form onSubmit={submitBlock} className="space-y-3 p-5">
                <label className="block">
                  <span className="text-xs font-semibold text-slate-500">광고주</span>
                  <select value={form.advertiserId} onChange={(event) => update("advertiserId", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none focus:border-brand">
                    <option value="">광고주 선택</option>
                    {advertisers.map((advertiser) => <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>)}
                  </select>
                </label>
                <input value={form.rawIp} onChange={(event) => update("rawIp", event.target.value)} placeholder="차단할 IP 원문" className="h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand" />
                <input value={form.reason} onChange={(event) => update("reason", event.target.value)} placeholder="차단 사유 입력" className="h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-200 outline-none placeholder:text-slate-600 focus:border-brand" />
                <button className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-semibold text-ink">
                  <Plus size={16} />
                  차단 추가
                </button>
              </form>
            </Card>
          </div>
        </>
      )}

      {activeTab === "history" && (
        <Card>
          <SectionTitle icon={CheckCircle2} title="차단 해제 이력" right={<span className="text-xs text-slate-500">{number(releasedBlocks.length)}개</span>} />
          <BlockTable blocks={releasedBlocks} showHash={showHash} released />
        </Card>
      )}
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <p className="mt-1 flex h-9 items-center rounded-md border border-line bg-ink px-3 text-sm text-slate-100">{value ?? "-"}</p>
    </div>
  );
}

function BlockTable({ blocks, showHash, onRelease, released = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="bg-panelSoft text-xs uppercase text-slate-500">
          <tr>
            {["광고주", "client_id", "ip_masked", "차단 사유", "방식", released ? "해제일" : "생성일", "관리"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {blocks.map((block) => (
            <tr key={block.id || `${block.ip}-${block.reason}`}>
              <td className="whitespace-nowrap px-4 py-3 text-white">{block.advertiser || "-"}</td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">{block.clientId || "-"}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-300">
                {block.ipMasked || block.ip}
                {showHash && <div className="mt-1 max-w-[260px] truncate text-slate-600">{block.ipHash}</div>}
              </td>
              <td className="max-w-[260px] truncate px-4 py-3 text-slate-300">{block.reason}</td>
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge status="차단" label={block.method || "수동 차단"} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-400">{released ? block.releasedAt || "-" : block.createdAt || "-"}</td>
              <td className="whitespace-nowrap px-4 py-3">
                {!released && onRelease ? (
                  <button onClick={() => onRelease(block)} className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-panelSoft px-2 text-xs font-semibold text-slate-300 hover:text-danger">
                    <Trash2 size={14} />
                    해제
                  </button>
                ) : (
                  <span className="text-xs text-slate-500">-</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {blocks.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">표시할 차단 IP가 없습니다.</div>}
    </div>
  );
}
