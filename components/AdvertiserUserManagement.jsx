import { useState } from "react";
import { Copy, KeyRound, UserPlus, UsersRound } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";

export default function AdvertiserUserManagement({
  advertiserUsers,
  advertisers,
  onCreateUser,
  onUpdatePermission,
  onDeactivateUser
}) {
  const [form, setForm] = useState({ advertiserId: advertisers[0]?.id || "", name: "", email: "", permission: "view" });
  const [notice, setNotice] = useState("");

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function submit(event) {
    event.preventDefault();
    const advertiser = advertisers.find((item) => item.id === form.advertiserId);
    const result = await onCreateUser({ ...form, advertiserName: advertiser?.name });
    if (result.ok) {
      setNotice(`${form.email} 계정을 생성했습니다.`);
      setForm({ advertiserId: advertisers[0]?.id || "", name: "", email: "", permission: "view" });
    }
  }

  async function copyInvite(row) {
    try {
      await navigator.clipboard.writeText(row.inviteLink || "https://app.progressmedia.example/invite/mock");
    } catch {
      // 클립보드 권한 제한 시에도 안내는 유지합니다.
    }
    setNotice(`${row.email} 초대 링크를 복사했습니다.`);
  }

  return (
    <Card id="advertiser-users" className="scroll-mt-24">
      <SectionTitle icon={UsersRound} title="광고주 계정 관리" />
      <SectionDescription>마케터는 본인 담당 광고주의 광고주 로그인 계정을 만들고 권한, 활성 상태, 초대 링크를 관리합니다.</SectionDescription>
      {notice && <div className="mx-5 mt-4 rounded-md border border-brand/25 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand">{notice}</div>}
      <div className="grid gap-5 p-5 xl:grid-cols-[0.75fr_1.25fr]">
        <form onSubmit={submit} className="space-y-3 rounded-md border border-line bg-panelSoft p-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">광고주</span>
            <select value={form.advertiserId} onChange={(event) => updateField("advertiserId", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100">
              {advertisers.map((advertiser) => (
                <option key={advertiser.id} value={advertiser.id}>{advertiser.name}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">담당자명</span>
            <input value={form.name} onChange={(event) => updateField("name", event.target.value)} required className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">로그인 이메일</span>
            <input type="email" value={form.email} onChange={(event) => updateField("email", event.target.value)} required className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100" />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">권한</span>
            <select value={form.permission} onChange={(event) => updateField("permission", event.target.value)} className="mt-1 h-10 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100">
              <option value="view">view</option>
              <option value="manage">manage</option>
            </select>
          </label>
          <button className="inline-flex h-10 items-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-ink">
            <UserPlus size={16} />
            계정 생성
          </button>
        </form>

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
                    <select value={row.permission} onChange={(event) => onUpdatePermission(row.id, event.target.value)} className="h-8 rounded border border-line bg-ink px-2 text-xs text-slate-100">
                      <option value="view">view</option>
                      <option value="manage">manage</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={row.isActive ? "정상" : "차단"} label={row.isActive ? "활성" : "비활성"} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => onDeactivateUser(row.id)} className="rounded border border-line bg-panelSoft px-2 py-1 text-xs text-slate-300">비활성화</button>
                      <button onClick={() => setNotice(`${row.email} 임시 비밀번호: Temp!2026`)} className="inline-flex items-center gap-1 rounded border border-line bg-panelSoft px-2 py-1 text-xs text-slate-300">
                        <KeyRound size={13} />
                        임시 비밀번호
                      </button>
                      <button onClick={() => copyInvite(row)} className="inline-flex items-center gap-1 rounded border border-line bg-panelSoft px-2 py-1 text-xs text-slate-300">
                        <Copy size={13} />
                        초대 링크
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {advertiserUsers.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">광고주 계정이 없습니다.</div>}
        </div>
      </div>
    </Card>
  );
}
