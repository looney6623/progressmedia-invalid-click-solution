import { ShieldCheck, UserPlus, Users } from "lucide-react";
import { Card, SectionDescription, SectionTitle, StatusBadge } from "@/components/ui";

export default function AdminManagement({ teamMembers, advertisers, assignments, onAssign, onRemove }) {
  const marketers = teamMembers.filter((member) => member.role === "marketer");

  return (
    <div className="grid gap-5 xl:grid-cols-2">
      <Card id="team" className="scroll-mt-24">
        <SectionTitle icon={Users} title="직원 계정 관리" />
        <SectionDescription>Supabase Auth의 사용자와 `pm_profiles`를 연결해 관리자/마케터 역할을 관리하는 화면 초안입니다.</SectionDescription>
        <div className="divide-y divide-line">
          {teamMembers.map((member) => (
            <div key={member.id} className="flex items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="text-sm font-semibold text-white">{member.name}</p>
                <p className="mt-1 text-xs text-slate-500">{member.email} · {member.team}</p>
              </div>
              <StatusBadge status={member.role === "admin" ? "정상" : "의심"} label={member.role === "admin" ? "관리자" : "마케터"} />
            </div>
          ))}
        </div>
      </Card>

      <Card id="assignments" className="scroll-mt-24">
        <SectionTitle icon={UserPlus} title="광고주 배정 관리" />
        <SectionDescription>마케터가 본인 담당 광고주의 로그, 차단, 리포트만 볼 수 있도록 배정 관계를 관리합니다.</SectionDescription>
        <div className="space-y-3 p-5">
          {marketers.map((member) => {
            const assigned = assignments.filter((item) => item.marketerId === member.id);
            const available = advertisers.find((advertiser) => !assigned.some((item) => item.advertiserId === advertiser.id));
            return (
              <div key={member.id} className="rounded-md border border-line bg-panelSoft p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{member.name}</p>
                    <p className="text-xs text-slate-500">{member.email}</p>
                  </div>
                  {available && (
                    <button
                      onClick={() => onAssign(member.id, available.id)}
                      className="inline-flex h-8 items-center gap-2 rounded-md bg-brand px-3 text-xs font-semibold text-ink"
                    >
                      <ShieldCheck size={14} />
                      {available.name} 배정
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {assigned.map((item) => {
                    const advertiser = advertisers.find((adv) => adv.id === item.advertiserId);
                    return (
                      <button
                        key={item.id}
                        onClick={() => onRemove(item.id)}
                        className="rounded border border-line bg-ink px-2 py-1 text-xs text-slate-300 hover:text-danger"
                      >
                        {advertiser?.name || item.advertiserId} · {item.permission} 해제
                      </button>
                    );
                  })}
                  {assigned.length === 0 && <span className="text-xs text-slate-500">담당 광고주 없음</span>}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
