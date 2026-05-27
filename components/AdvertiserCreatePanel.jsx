import { useState } from "react";
import { Building2, Copy, KeyRound, Loader2, Plus } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";

export default function AdvertiserCreatePanel({ currentUser, onCreateAdvertiser }) {
  const [form, setForm] = useState({
    name: "",
    siteUrl: "",
    contactName: "",
    loginEmail: "",
    temporaryPassword: "",
    permission: "manage",
    status: "active"
  });
  const [created, setCreated] = useState(null);
  const [copied, setCopied] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    setCreated(null);

    const requestedEmail = form.loginEmail.trim().toLowerCase();
    const result = await onCreateAdvertiser({ ...form, loginEmail: requestedEmail }, currentUser);

    if (!result.ok) {
      setError(result.error || "광고주 생성에 실패했습니다.");
      setLoading(false);
      return;
    }

    const issuedEmail = result.advertiserUser?.email?.trim().toLowerCase();
    if (issuedEmail && issuedEmail !== requestedEmail) {
      setError("발급된 광고주 이메일이 입력한 이메일과 일치하지 않습니다.");
      setLoading(false);
      return;
    }

    setCreated(result);
    setForm({ name: "", siteUrl: "", contactName: "", loginEmail: "", temporaryPassword: "", permission: "manage", status: "active" });
    setLoading(false);
  }

  async function copyText(label, value) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard permission can be unavailable in some browsers.
    }
    setCopied(label);
    window.setTimeout(() => setCopied(""), 1800);
  }

  return (
    <Card id="advertiser-create" className="scroll-mt-24">
      <SectionTitle icon={Building2} title="광고주 생성" />
      <SectionDescription>
        광고주와 로그인 계정을 함께 발급합니다. 운영 환경에서는 서버 API Route가 Supabase Auth Admin API로 광고주 계정을 생성합니다.
      </SectionDescription>
      {error && <div className="mx-5 mt-4 rounded-md border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
      <div className="grid gap-5 p-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submit} className="space-y-3">
          {[
            ["name", "광고주명", "예: 샤브20", "text"],
            ["siteUrl", "사이트 URL", "https://example.com", "url"],
            ["contactName", "광고주 담당자명", "홍길동", "text"],
            ["loginEmail", "광고주 로그인 이메일", "client@example.com", "email"],
            ["temporaryPassword", "임시 비밀번호", "광고주에게 전달할 임시 비밀번호", "password"]
          ].map(([key, label, placeholder, type]) => (
            <label key={key} className="block">
              <span className="text-xs font-semibold text-slate-500">{label}</span>
              <input
                type={type}
                value={form[key]}
                onChange={(event) => updateField(key, event.target.value)}
                required
                disabled={loading}
                className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-60"
                placeholder={placeholder}
              />
            </label>
          ))}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">권한</span>
              <select disabled={loading} value={form.permission} onChange={(event) => updateField("permission", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 disabled:opacity-60">
                <option value="manage">manage</option>
                <option value="view">view</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">상태</span>
              <select disabled={loading} value={form.status} onChange={(event) => updateField("status", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 disabled:opacity-60">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
          </div>
          <button disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {loading ? "생성 중" : "광고주 생성"}
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
                <Info label="광고주" value={created.advertiser.name} />
                <Info label="광고주 계정" value={created.advertiserUser.email} />
                <Info label="client_id" value={created.advertiser.clientId} onCopy={() => copyText("client_id", created.advertiser.clientId)} />
                <Info label="project_key" value={created.advertiser.projectKey} onCopy={() => copyText("project_key", created.advertiser.projectKey)} />
                <Info label="임시 비밀번호" value={created.advertiserUserLink?.temporaryPassword || "-"} onCopy={() => copyText("password", created.advertiserUserLink?.temporaryPassword)} />
              </div>
              <pre className="max-h-44 overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-300">{created.installScript}</pre>
              <button onClick={() => copyText("script", created.installScript)} className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-ink px-3 text-xs font-semibold text-slate-300">
                <Copy size={14} />
                설치 스크립트 복사
              </button>
              {copied && <StatusBadge status="정상" label={`${copied} 복사 완료`} />}
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500">모든 생성 단계가 성공하면 이번에 발급된 광고주 정보만 표시됩니다.</p>
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
