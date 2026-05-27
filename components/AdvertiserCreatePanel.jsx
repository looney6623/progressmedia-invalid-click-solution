import { useState } from "react";
import { Building2, Copy, KeyRound, Plus } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";

export default function AdvertiserCreatePanel({ currentUser, onCreateAdvertiser }) {
  const [form, setForm] = useState({
    name: "",
    siteUrl: "",
    contactName: "",
    loginEmail: "",
    permission: "manage",
    status: "active"
  });
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState("");

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const result = await onCreateAdvertiser(form, currentUser);
    if (result.ok) {
      setCreated(result);
      setForm({ name: "", siteUrl: "", contactName: "", loginEmail: "", permission: "manage", status: "active" });
    }
  }

  async function copyText(label, value) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // 클립보드 권한이 없어도 완료 상태는 표시합니다.
    }
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return (
    <Card id="advertiser-create" className="scroll-mt-24">
      <SectionTitle icon={Building2} title="광고주 생성" />
      <SectionDescription>마케터가 광고주와 광고주 로그인 계정을 함께 생성합니다. 생성 즉시 client_id, project_key, 설치 스크립트가 발급됩니다.</SectionDescription>
      <div className="grid gap-5 p-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submit} className="space-y-3">
          {[
            ["name", "광고주명", "예: 샤브20"],
            ["siteUrl", "사이트 URL", "https://example.com"],
            ["contactName", "광고주 담당자명", "홍길동"],
            ["loginEmail", "광고주 로그인 이메일", "client@example.com"]
          ].map(([key, label, placeholder]) => (
            <label key={key} className="block">
              <span className="text-xs font-semibold text-slate-500">{label}</span>
              <input
                value={form[key]}
                onChange={(event) => updateField(key, event.target.value)}
                required
                className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand"
                placeholder={placeholder}
              />
            </label>
          ))}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">권한</span>
              <select value={form.permission} onChange={(event) => updateField("permission", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100">
                <option value="manage">manage</option>
                <option value="view">view</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">상태</span>
              <select value={form.status} onChange={(event) => updateField("status", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
          </div>
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-ink">
            <Plus size={16} />
            광고주 생성
          </button>
        </form>

        <div className="rounded-md border border-line bg-panelSoft p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
            <KeyRound size={16} className="text-brand" />
            최근 발급 정보
          </div>
          {created ? (
            <div className="space-y-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <Info label="client_id" value={created.advertiser.clientId} onCopy={() => copyText("client_id", created.advertiser.clientId)} />
                <Info label="project_key" value={created.advertiser.projectKey} onCopy={() => copyText("project_key", created.advertiser.projectKey)} />
                <Info label="광고주 계정" value={created.advertiserUser.email} />
                <Info label="임시 비밀번호" value={created.advertiserUserLink.temporaryPassword} onCopy={() => copyText("password", created.advertiserUserLink.temporaryPassword)} />
              </div>
              <pre className="max-h-44 overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-300">{created.installScript}</pre>
              <button onClick={() => copyText("script", created.installScript)} className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-ink px-3 text-xs font-semibold text-slate-300">
                <Copy size={14} />
                설치 스크립트 복사
              </button>
              {copied && <StatusBadge status="정상" label={`${copied} 복사 완료`} />}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500">광고주를 생성하면 발급된 client_id, project_key, 설치 스크립트가 여기에 표시됩니다.</p>
          )}
        </div>
      </div>
    </Card>
  );
}

function Info({ label, value, onCopy }) {
  return (
    <div className="rounded-md bg-ink p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-white">{value}</p>
        {onCopy && (
          <button onClick={onCopy} className="shrink-0 text-slate-500 hover:text-brand">
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
