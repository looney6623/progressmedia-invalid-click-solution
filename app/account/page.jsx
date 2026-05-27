"use client";

import AppShell from "@/components/AppShell";
import { Card } from "@/components/ui";
import { useAppState } from "@/components/AppStateProvider";

const roleLabel = { admin: "관리자", marketer: "마케터", advertiser: "광고주" };

export default function AccountPage() {
  const { user, myAdvertisers, allAdvertisers, handleSignOut } = useAppState();
  const advertisers = user?.role === "admin" ? allAdvertisers : myAdvertisers;

  return (
    <AppShell title="내 계정" description="로그인 계정 정보와 접근 가능한 광고주 범위를 확인합니다.">
      <div className="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
        <Card className="p-5">
          <p className="text-xs font-semibold text-brand">ACCOUNT</p>
          <h2 className="mt-2 text-xl font-bold text-white">{user?.name}</h2>
          <p className="mt-1 text-sm text-slate-500">{user?.email}</p>
          <div className="mt-4 rounded-md border border-line bg-panelSoft p-4">
            <p className="text-xs text-slate-500">역할</p>
            <strong className="mt-1 block text-white">{roleLabel[user?.role] || user?.role}</strong>
          </div>
          <button onClick={handleSignOut} className="mt-4 h-10 rounded-md border border-line bg-panelSoft px-4 text-sm font-semibold text-slate-300 hover:text-danger">
            로그아웃
          </button>
        </Card>
        <Card>
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-base font-bold text-white">접근 가능한 광고주</h2>
            <p className="mt-1 text-sm text-slate-500">role과 배정 정보에 따라 접근 가능한 광고주만 표시됩니다.</p>
          </div>
          <div className="divide-y divide-line">
            {advertisers.map((advertiser) => (
              <div key={advertiser.id} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="font-semibold text-white">{advertiser.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{advertiser.siteUrl}</p>
                </div>
                <span className="text-xs text-brand">{advertiser.status}</span>
              </div>
            ))}
            {advertisers.length === 0 && <div className="px-5 py-10 text-center text-sm text-slate-500">접근 가능한 광고주가 없습니다.</div>}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
