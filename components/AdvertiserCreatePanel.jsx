import { useState } from "react";
import { Building2, Copy, KeyRound, Loader2, Plus } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";

const emptyForm = {
  name: "",
  siteUrl: "",
  status: "active"
};

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return ["http:", "https:"].includes(url.protocol);
  } catch {
    return false;
  }
}

export default function AdvertiserCreatePanel({ currentUser, onCreateAdvertiser }) {
  const [form, setForm] = useState(emptyForm);
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

    const payload = {
      name: form.name.trim(),
      siteUrl: form.siteUrl.trim(),
      status: form.status
    };

    if (!payload.name) {
      setError("광고주명을 입력해 주세요.");
      return;
    }
    if (!payload.siteUrl || !isValidUrl(payload.siteUrl)) {
      setError("https:// 로 시작하는 올바른 사이트 URL을 입력해 주세요.");
      return;
    }

    setLoading(true);
    setError("");
    setCreated(null);

    const result = await onCreateAdvertiser(payload, currentUser);
    if (!result.ok) {
      setError(result.error || "광고주/사이트 등록에 실패했습니다.");
      setLoading(false);
      return;
    }

    setCreated(result);
    setForm(emptyForm);
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
      <SectionTitle icon={Building2} title="광고주/사이트 등록" />
      <SectionDescription>
        광고주 기본 정보와 사이트 URL을 등록하고 추적용 client_id, project_key를 발급합니다. 로그인 계정은 다음 단계에서 별도로 발급합니다.
      </SectionDescription>
      {error && <div className="mx-5 mt-4 rounded-md border border-danger/25 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div>}
      <div className="grid gap-5 p-5 xl:grid-cols-[0.9fr_1.1fr]">
        <form onSubmit={submit} className="space-y-3">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">광고주명</span>
            <input
              type="text"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
              disabled={loading}
              className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              placeholder="예: 샤브20"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">사이트 URL</span>
            <input
              type="url"
              value={form.siteUrl}
              onChange={(event) => updateField("siteUrl", event.target.value)}
              required
              disabled={loading}
              className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-60"
              placeholder="https://example.com"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">상태</span>
            <select
              disabled={loading}
              value={form.status}
              onChange={(event) => updateField("status", event.target.value)}
              className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-60"
            >
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
          <button disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-ink transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
            {loading ? "등록 중" : "광고주/사이트 등록"}
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
                <Info label="광고주명" value={created.advertiser.name} />
                <Info label="사이트 URL" value={created.advertiser.siteUrl} />
                <Info label="client_id" value={created.advertiser.clientId} onCopy={() => copyText("client_id", created.advertiser.clientId)} />
                <Info label="project_key" value={created.advertiser.projectKey} onCopy={() => copyText("project_key", created.advertiser.projectKey)} />
              </div>
              <pre className="max-h-44 overflow-auto rounded-md border border-line bg-ink p-3 text-xs leading-5 text-slate-300">{created.installScript}</pre>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={() => copyText("script", created.installScript)} className="inline-flex h-9 items-center gap-2 rounded-md border border-line bg-ink px-3 text-xs font-semibold text-slate-300 transition hover:border-brand hover:text-brand">
                  <Copy size={14} />
                  설치 스크립트 복사
                </button>
                {copied && <StatusBadge status="정상" label={`${copied} 복사 완료`} />}
              </div>
              <p className="rounded-md border border-brand/20 bg-brand/10 px-3 py-2 text-xs leading-5 text-brand">
                광고주 로그인 계정은 [광고주 로그인 계정 발급] 탭에서 별도로 생성합니다.
              </p>
            </div>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              등록이 완료되면 이번 광고주의 추적 키와 설치 스크립트가 표시됩니다. 이 단계에서는 광고주 로그인 계정을 만들지 않습니다.
            </p>
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
        <p className="truncate text-sm font-semibold text-white">{value || "-"}</p>
        {onCopy && (
          <button onClick={onCopy} className="shrink-0 text-slate-500 transition hover:text-brand" type="button">
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
