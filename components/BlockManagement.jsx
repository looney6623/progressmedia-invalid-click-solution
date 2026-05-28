import { useMemo, useState } from "react";
import { Ban, CheckCircle2, Plus, RefreshCw, ShieldAlert, SlidersHorizontal, Trash2 } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";
import { number } from "@/lib/format";

const tabs = [
  { id: "rules", label: "자동 판정 규칙" },
  { id: "candidates", label: "차단 판정 로그" },
  { id: "active", label: "활성 차단 IP" },
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
  onUpdateAdvertiserBlocking,
  onUpdateLogStatus,
  onRefresh,
  defaultTab = "active"
}) {
  const initialTab = defaultTab === "manual" ? "active" : defaultTab;
  const [activeTab, setActiveTab] = useState(initialTab);
  const [form, setForm] = useState({ advertiserId: "", rawIp: "", reason: "" });
  const [showHash, setShowHash] = useState(false);
  const [savingKey, setSavingKey] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const candidateLogs = useMemo(() => {
    return [...blockedLogs, ...suspiciousLogs]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 100);
  }, [blockedLogs, suspiciousLogs]);

  const rulesByAdvertiser = useMemo(() => {
    const map = new Map();
    blockRules.forEach((rule) => {
      if (!map.has(rule.advertiserId)) map.set(rule.advertiserId, []);
      map.get(rule.advertiserId).push(rule);
    });
    return map;
  }, [blockRules]);

  function update(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function saveRule(rule, patch) {
    setSavingKey(rule.id);
    setError("");
    const result = await onUpdateRule?.(rule, patch);
    setSavingKey("");
    if (result?.ok === false) {
      setError(result.error || "자동 판정 규칙 저장에 실패했습니다.");
      return;
    }
    setNotice("자동 판정 규칙을 저장했습니다.");
  }

  async function toggleBlocking(advertiserId, nextValue) {
    setSavingKey(`blocking-${advertiserId}`);
    setError("");
    const result = await onUpdateAdvertiserBlocking?.(advertiserId, nextValue);
    setSavingKey("");
    if (result?.ok === false) {
      setError(result.error || "긴급 자동 차단 중지 설정에 실패했습니다.");
      return;
    }
    setNotice(nextValue ? "자동 판정을 다시 켰습니다." : "자동 판정을 긴급 중지했습니다.");
  }

  async function blockFromLog(log) {
    setError("");
    const result = await onAddBlock({
      logId: log.id,
      advertiserId: log.advertiserId || advertisers.find((item) => item.name === log.advertiser)?.id || "",
      clientId: log.clientId,
      ipHash: log.ipHash,
      ipMasked: log.ipMasked || log.ip,
      reason: log.reason || "차단 판정 로그 기반 실제 차단 등록"
    });
    if (result?.ok === false) {
      setError(result.error || "실제 차단 등록에 실패했습니다.");
      return;
    }
    setNotice(result?.duplicated ? "이미 활성 차단된 IP입니다." : "실제 활성 차단 IP로 등록했습니다.");
  }

  async function softenLog(log, status) {
    const label = status === "normal" ? "정상" : "의심";
    const result = await onUpdateLogStatus?.(log.id, status, `운영자 로그 상태 정정: ${label}`);
    if (result?.ok === false) {
      setError(result.error || "로그 상태 정정에 실패했습니다.");
      return;
    }
    setNotice(`로그 상태를 ${label}(으)로 정정했습니다.`);
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
    setNotice("서버에서 IP를 hash 처리한 뒤 활성 차단 IP로 등록했습니다.");
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
          <SectionTitle icon={SlidersHorizontal} title="자동 판정 규칙" />
          <SectionDescription>
            ON/OFF와 threshold는 `pm_block_rules`에 저장됩니다. 긴급 자동 차단 중지는 `pm_advertisers.blocking_enabled=false`로 저장되며, 활성 수동 차단 IP는 계속 유지됩니다.
          </SectionDescription>
          <div className="space-y-5 p-5">
            {advertisers.map((advertiser) => {
              const rules = rulesByAdvertiser.get(advertiser.id) || [];
              const blockingEnabled = rules[0]?.blockingEnabled !== false;
              return (
                <div key={advertiser.id} className="rounded-lg border border-line bg-panelSoft p-4">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-white">{advertiser.name}</h3>
                      <p className="mt-1 text-xs text-slate-500">자동 판정 상태: {blockingEnabled ? "ON" : "긴급 중지"}</p>
                    </div>
                    <button
                      type="button"
                      disabled={savingKey === `blocking-${advertiser.id}`}
                      onClick={() => toggleBlocking(advertiser.id, !blockingEnabled)}
                      className={`rounded-md px-3 py-2 text-xs font-bold transition ${blockingEnabled ? "border border-danger/40 bg-danger/10 text-danger" : "bg-brand text-ink"}`}
                    >
                      {savingKey === `blocking-${advertiser.id}` ? "저장 중" : blockingEnabled ? "긴급 자동 차단 중지" : "자동 판정 다시 켜기"}
                    </button>
                  </div>
                  <div className="grid gap-3 xl:grid-cols-2">
                    {rules.map((rule) => (
                      <div key={rule.id} className="rounded-md border border-line bg-ink p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-white">{rule.ruleName}</p>
                            <p className="mt-1 text-xs leading-5 text-slate-500">{rule.description}</p>
                          </div>
                          <button
                            type="button"
                            disabled={savingKey === rule.id}
                            onClick={() => saveRule(rule, { is_enabled: !rule.isEnabled })}
                            className={`h-8 min-w-16 rounded-full border px-3 text-xs font-bold transition ${rule.isEnabled ? "border-brand/40 bg-brand/15 text-brand" : "border-line bg-panelSoft text-slate-500"}`}
                          >
                            {savingKey === rule.id ? "저장 중" : rule.isEnabled ? "ON" : "OFF"}
                          </button>
                        </div>
                        <div className="mt-4 grid gap-3 sm:grid-cols-4">
                          <Info label="action" value={rule.action} />
                          <label>
                            <span className="text-xs text-slate-500">threshold</span>
                            <input
                              type="number"
                              value={rule.threshold ?? ""}
                              onChange={(event) => saveRule(rule, { threshold: event.target.value === "" ? null : Number(event.target.value) })}
                              className="mt-1 h-9 w-full rounded-md border border-line bg-panel px-3 text-sm text-slate-100 outline-none focus:border-brand"
                            />
                          </label>
                          <Info label="risk_delta" value={rule.riskDelta ?? 0} />
                          <label className="flex flex-col gap-1">
                            <span className="text-xs text-slate-500">auto block</span>
                            <button
                              type="button"
                              onClick={() => saveRule(rule, { auto_block_create: !rule.autoBlockCreate })}
                              className={`h-9 rounded-md border px-3 text-xs font-bold ${rule.autoBlockCreate ? "border-brand/40 bg-brand/15 text-brand" : "border-line bg-panel text-slate-500"}`}
                            >
                              {rule.autoBlockCreate ? "생성" : "로그만"}
                            </button>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {activeTab === "candidates" && (
        <Card>
          <SectionTitle icon={ShieldAlert} title="차단 판정 로그" right={<span className="text-xs text-slate-500">차단 판정 {number(blockedLogs.length)} · 의심 {number(suspiciousLogs.length)}</span>} />
          <SectionDescription>
            이 목록은 `pm_click_logs.click_status` 판정 로그입니다. 실제 해제 대상은 아니며, 필요하면 실제 차단 등록 또는 로그 상태 정정을 수행합니다.
          </SectionDescription>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1180px] text-left text-sm">
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
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => blockFromLog(log)} className="rounded-md border border-line bg-panelSoft px-2 py-1 text-xs font-semibold text-slate-300 hover:text-white">실제 차단 등록</button>
                        <button onClick={() => softenLog(log, "suspicious")} className="rounded-md border border-line bg-panelSoft px-2 py-1 text-xs font-semibold text-warn">의심으로 정정</button>
                        <button onClick={() => softenLog(log, "normal")} className="rounded-md border border-line bg-panelSoft px-2 py-1 text-xs font-semibold text-brand">정상으로 정정</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {candidateLogs.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">차단/의심 판정 로그가 없습니다.</div>}
          </div>
        </Card>
      )}

      {activeTab === "active" && (
        <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
          <Card>
            <SectionTitle icon={Ban} title="활성 차단 IP" right={<span className="text-xs text-slate-500">{number(manualBlocks.length)}개</span>} />
            <SectionDescription>`pm_blocked_ips.is_active=true`인 실제 차단 row입니다. 이 목록에서만 차단 해제가 가능합니다.</SectionDescription>
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

function Info({ label, value }) {
  return (
    <div>
      <span className="text-xs text-slate-500">{label}</span>
      <p className="mt-1 flex h-9 items-center rounded-md border border-line bg-panel px-3 text-sm text-slate-100">{value ?? "-"}</p>
    </div>
  );
}

function BlockTable({ blocks, showHash, onRelease, released = false }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="bg-panelSoft text-xs uppercase text-slate-500">
          <tr>
            {["광고주", "client_id", "ip_masked", "차단 사유", "유형", released ? "해제일" : "생성일", "관리"].map((head) => <th key={head} className="px-4 py-3 font-semibold">{head}</th>)}
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
              <td className="whitespace-nowrap px-4 py-3"><StatusBadge status="차단" label={block.blockType === "auto" ? "자동 차단" : "수동 차단"} /></td>
              <td className="whitespace-nowrap px-4 py-3 text-slate-400">{released ? block.releasedAt || "-" : block.createdAt || "-"}</td>
              <td className="whitespace-nowrap px-4 py-3">
                {!released && onRelease ? (
                  <button onClick={() => onRelease(block)} className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-panelSoft px-2 text-xs font-semibold text-slate-300 hover:text-danger">
                    <Trash2 size={14} />
                    차단 해제
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
