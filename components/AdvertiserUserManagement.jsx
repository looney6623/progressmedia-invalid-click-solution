import { useEffect, useMemo, useState } from "react";
import { Copy, KeyRound, Loader2, UserPlus, UsersRound } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";

const COMPANY_DOMAIN = "my-progress.co.kr";

function emptyForm(advertiserId = "") {
  return {
    advertiserId,
    name: "",
    email: "",
    temporaryPassword: "",
    permission: "view",
    status: "active"
  };
}

export default function AdvertiserUserManagement({
  advertiserUsers,
  advertisers,
  selectedAdvertiserId,
  onSelectedAdvertiserHandled,
  onCreateUser,
  onUpdatePermission,
  onDeactivateUser
}) {
  const initialAdvertiserId = selectedAdvertiserId || advertisers[0]?.id || "";
  const [form, setForm] = useState(emptyForm(initialAdvertiserId));
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [issued, setIssued] = useState(null);
  const [loading, setLoading] = useState(false);

  const advertiserById = useMemo(() => new Map(advertisers.map((advertiser) => [advertiser.id, advertiser])), [advertisers]);

  useEffect(() => {
    if (selectedAdvertiserId) {
      setForm((prev) => ({ ...prev, advertiserId: selectedAdvertiserId }));
      onSelectedAdvertiserHandled?.();
      return;
    }
    setForm((prev) => ({ ...prev, advertiserId: prev.advertiserId || advertisers[0]?.id || "" }));
  }, [advertisers, onSelectedAdvertiserHandled, selectedAdvertiserId]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate() {
    const email = form.email.trim().toLowerCase();
    if (!form.advertiserId) return "계정을 연결할 광고주를 선택해 주세요.";
    if (!form.name.trim()) return "담당자명을 입력해 주세요.";
    if (!email) return "로그인 이메일을 입력해 주세요.";
    if (email.endsWith(`@${COMPANY_DOMAIN}`)) {
      return `@${COMPANY_DOMAIN} 이메일은 내부 마케터 계정용입니다. 광고주 담당자 이메일을 사용해 주세요.`;
    }
    if (!form.temporaryPassword) return "임시 비밀번호를 입력해 주세요.";
    if (form.temporaryPassword.length < 6) return "임시 비밀번호는 최소 6자 이상이어야 합니다.";
    return "";
  }

  async function submit(event) {
    event.preventDefault();
    if (loading) return;

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setNotice("");
      setIssued(null);
      return;
    }

    const advertiser = advertiserById.get(form.advertiserId);
    const payload = {
      advertiserId: form.advertiserId,
      advertiserName: advertiser?.name,
      name: form.name.trim(),
      email: form.email.trim().toLowerCase(),
      temporaryPassword: form.temporaryPassword,
      permission: form.permission,
      status: form.status
    };

    setLoading(true);
    setError("");
    setNotice("");
    setIssued(null);

    const result = await onCreateUser(payload);
    setLoading(false);

    if (!result.ok) {
      setError(result.error || "광고주 로그인 계정 발급에 실패했습니다.");
      return;
    }

    const issuedInfo = {
      advertiserName: result.advertiserUser?.advertiserName || advertiser?.name || "-",
      email: result.user?.email || payload.email,
      permission: result.advertiserUser?.permission || payload.permission,
      status: payload.status,
      temporaryPassword: result.advertiserUser?.temporaryPassword || payload.temporaryPassword,
      duplicated: result.duplicated
    };

    setIssued(issuedInfo);
    setNotice(result.duplicated ? "이미 연결된 광고주 계정을 확인했습니다." : `${issuedInfo.email} 계정을 발급했습니다.`);
    setForm(emptyForm(form.advertiserId));
  }

  async function copyText(value, message) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // Clipboard permission can be unavailable in some browsers.
    }
    setNotice(message);
  }

  async function copyInvite(row) {
    await copyText(row.inviteLink || "https://app.progressmedia.example/invite/mock", `${row.email} 초대 링크를 복사했습니다.`);
  }

  return (
    <Card id="advertiser-users" className="scroll-mt-24">
      <SectionTitle icon={UsersRound} title="광고주 로그인 계정 발급" />
      <SectionDescription>
        이미 등록된 광고주에 로그인 계정을 연결합니다. 광고주 계정은 담당 마케터가 발급하며, 광고주는 직접 가입하지 않습니다.
      </SectionDescription>
      {notice && <div className="mx-5 mt-4 rounded-md border border-brand/25 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand">{notice}</div>}
      {error && <div className="mx-5 mt-4 rounded-md border border-danger/25 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">{error}</div>}
      <div className="grid gap-5 p-5 xl:grid-cols-[0.78fr_1.22fr]">
        <form onSubmit={submit} className="space-y-3 rounded-md border border-line bg-panelSoft p-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">광고주 선택</span>
            <select
              value={form.advertiserId}
              onChange={(event) => updateField("advertiserId", event.target.value)}
              required
              disabled={loading || advertisers.length === 0}
              className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-60"
            >
              {advertisers.length === 0 && <option value="">등록된 광고주가 없습니다</option>}
              {advertisers.map((advertiser) => (
                <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">담당자명</span>
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required disabled={loading} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-60" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">로그인 이메일</span>
            <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required disabled={loading} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-60" placeholder="client@example.com" />
            <p className="mt-1 text-xs text-slate-500">@{COMPANY_DOMAIN}은 내부 마케터 계정용이므로 광고주 계정에는 사용할 수 없습니다.</p>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">임시 비밀번호</span>
            <input type="password" value={form.temporaryPassword} onChange={(event) => updateField("temporaryPassword", event.target.value)} required minLength={6} disabled={loading} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-60" />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">권한</span>
              <select value={form.permission} onChange={(event) => updateField("permission", event.target.value)} disabled={loading} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-60">
                <option value="view">view</option>
                <option value="manage">manage</option>
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-500">상태</span>
              <select value={form.status} onChange={(event) => updateField("status", event.target.value)} disabled={loading} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand disabled:opacity-60">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
          </div>
          <button disabled={loading || advertisers.length === 0} className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-ink transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
            {loading ? "발급 중" : "계정 발급"}
          </button>
        </form>

        <div className="space-y-4">
          {issued && (
            <div className="rounded-md border border-brand/25 bg-brand/10 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-brand">
                <KeyRound size={16} />
                최근 발급 계정
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <IssuedInfo label="광고주명" value={issued.advertiserName} />
                <IssuedInfo label="로그인 이메일" value={issued.email} />
                <IssuedInfo label="권한" value={issued.permission} />
                <IssuedInfo label="상태" value={issued.status} />
                <IssuedInfo label="임시 비밀번호" value={issued.temporaryPassword} onCopy={() => copyText(issued.temporaryPassword, "임시 비밀번호를 복사했습니다.")} />
              </div>
              <p className="mt-3 text-xs leading-5 text-brand">광고주는 위 계정으로 로그인 후 본인 광고주 데이터만 확인할 수 있습니다.</p>
            </div>
          )}

          <div className="overflow-x-auto rounded-md border border-line">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead className="bg-panelSoft text-xs uppercase text-slate-500">
                <tr>
                  {["광고주", "계정", "권한", "상태", "관리"].map((head) => (
                    <th key={head} className="px-4 py-3 font-semibold">{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {advertiserUsers.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-white">{row.advertiserName}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-100">{row.name}</p>
                      <p className="text-xs text-slate-500">{row.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <select value={row.permission} onChange={(event) => onUpdatePermission(row.id, event.target.value)} className="h-8 rounded border border-line bg-ink px-2 text-xs text-slate-100 outline-none focus:border-brand">
                        <option value="view">view</option>
                        <option value="manage">manage</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={row.isActive ? "정상" : "차단"} label={row.isActive ? "활성" : "비활성"} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => onDeactivateUser(row.id)} className="rounded border border-line bg-panelSoft px-2 py-1 text-xs text-slate-300 transition hover:border-danger hover:text-danger">비활성화</button>
                        <button onClick={() => setNotice(`${row.email} 임시 비밀번호 재발급은 서버 API 연결 후 처리합니다.`)} className="inline-flex items-center gap-1 rounded border border-line bg-panelSoft px-2 py-1 text-xs text-slate-300 transition hover:border-brand hover:text-brand">
                          <KeyRound size={13} />
                          임시 비밀번호
                        </button>
                        <button onClick={() => copyInvite(row)} className="inline-flex items-center gap-1 rounded border border-line bg-panelSoft px-2 py-1 text-xs text-slate-300 transition hover:border-brand hover:text-brand">
                          <Copy size={13} />
                          초대 링크
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {advertiserUsers.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">발급된 광고주 로그인 계정이 없습니다.</div>}
          </div>
        </div>
      </div>
    </Card>
  );
}

function IssuedInfo({ label, value, onCopy }) {
  return (
    <div className="rounded-md bg-ink/80 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="truncate text-sm font-semibold text-white">{value || "-"}</p>
        {onCopy && (
          <button type="button" onClick={onCopy} className="shrink-0 text-slate-500 transition hover:text-brand">
            <Copy size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
