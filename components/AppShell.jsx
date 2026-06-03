"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import LoginPage from "@/components/LoginPage";
import PageHeader from "@/components/PageHeader";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui";
import { useAppState } from "@/components/AppStateProvider";

const routeRoles = {
  "/dashboard": ["admin", "marketer", "advertiser"],
  "/advertisers": ["admin", "marketer"],
  "/advertisers/create": ["admin", "marketer"],
  "/advertisers/accounts": ["admin", "marketer"],
  "/advertisers/scripts": ["admin", "marketer"],
  "/advertisers/tracking": ["admin", "marketer"],
  "/visitors/realtime": ["admin", "marketer", "advertiser"],
  "/visitors/logs": ["admin", "marketer", "advertiser"],
  "/visitors/pages": ["admin", "marketer"],
  "/invalid-clicks/ad-click-ip": ["admin", "marketer", "advertiser"],
  "/invalid-clicks/suspicious-ip": ["admin", "marketer", "advertiser"],
  "/invalid-clicks/blocked-ip": ["admin", "marketer", "advertiser"],
  "/invalid-clicks/repeated-ip": ["admin", "marketer"],
  "/invalid-clicks/exposure-limited-ip": ["admin", "marketer"],
  "/blocks": ["admin", "marketer", "advertiser"],
  "/blocks/rules": ["admin", "marketer"],
  "/blocks/manual": ["admin", "marketer", "advertiser"],
  "/blocks/history": ["admin", "marketer"],
  "/conversions/events": ["admin", "marketer", "advertiser"],
  "/conversions/logs": ["admin", "marketer"],
  "/conversions/savings": ["admin", "marketer"],
  "/logs": ["admin", "marketer"],
  "/logs/all": ["admin", "marketer"],
  "/logs/referrers": ["admin", "marketer"],
  "/logs/utm": ["admin", "marketer"],
  "/logs/keywords": ["admin", "marketer"],
  "/analysis": ["admin", "marketer"],
  "/reports": ["admin", "marketer", "advertiser"],
  "/reports/advertisers": ["admin", "marketer", "advertiser"],
  "/reports/export": ["admin", "marketer"],
  "/reports/print": ["admin", "marketer"],
  "/settings/account": ["admin", "marketer", "advertiser"],
  "/settings/policy": ["admin", "marketer"],
  "/account": ["admin", "marketer", "advertiser"]
};

function allowedRolesForPath(pathname) {
  if (routeRoles[pathname]) return routeRoles[pathname];
  const matched = Object.keys(routeRoles)
    .filter((route) => pathname.startsWith(`${route}/`))
    .sort((a, b) => b.length - a.length)[0];
  return routeRoles[matched] || routeRoles["/dashboard"];
}

export default function AppShell({ title, description, actions, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { authReady, authError, user, myAdvertisers, dataError, loginLoading, handleSignIn, handleSignUp, handleSignOut } = useAppState();

  useEffect(() => {
    if (authReady && user && pathname === "/") router.replace("/dashboard");
  }, [authReady, pathname, router, user]);

  if (!authReady) return <div className="min-h-screen bg-ink" />;

  if (authError && !user) {
    return (
      <main className="flex min-h-screen items-center justify-center px-5 py-10 text-slate-200">
        <Card className="max-w-lg p-6">
          <p className="text-xs font-semibold text-danger">CONFIGURATION ERROR</p>
          <h1 className="mt-2 text-xl font-bold text-white">서비스 연결 설정이 필요합니다</h1>
          <p className="mt-3 text-sm leading-6 text-slate-400">{authError}</p>
        </Card>
      </main>
    );
  }

  if (!user) {
    return <LoginPage onSignIn={handleSignIn} onSignUp={handleSignUp} loading={loginLoading} />;
  }

  const allowedRoles = allowedRolesForPath(pathname);
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen text-slate-200">
        <Sidebar user={user} onSignOut={handleSignOut} />
        <main className="lg:pl-72">
          <PageHeader title="접근 권한 없음" description="현재 계정 권한으로는 이 메뉴를 사용할 수 없습니다." />
          <div className="px-5 py-5 lg:px-8">
            <Card className="p-6 text-sm text-slate-400">좌측 메뉴에서 사용 가능한 페이지를 선택해 주세요.</Card>
          </div>
        </main>
      </div>
    );
  }

  if (user.role === "advertiser" && myAdvertisers.length === 0) {
    return (
      <div className="min-h-screen text-slate-200">
        <Sidebar user={user} onSignOut={handleSignOut} />
        <main className="lg:pl-72">
          <PageHeader title="접근 가능한 광고주가 없습니다" description="현재 광고주 계정에 연결된 광고주가 없습니다." />
          <div className="px-5 py-5 lg:px-8">
            <Card className="p-6">
              <p className="text-sm leading-6 text-slate-400">
                담당 마케터가 광고주 계정을 광고주 정보와 연결하면 로그, 차단 관리, 리포트를 확인할 수 있습니다.
              </p>
              <Link href="/account" className="mt-4 inline-flex h-10 items-center rounded-md border border-line bg-panelSoft px-4 text-sm font-semibold text-slate-300 hover:text-white">
                내 계정 확인
              </Link>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-slate-200">
      <Sidebar user={user} onSignOut={handleSignOut} />
      <main className="lg:pl-72">
        <PageHeader title={title} description={description} actions={actions} />
        <div className="space-y-5 px-5 py-5 lg:px-8">
          {dataError && <Card className="border-danger/30 bg-danger/10 p-4 text-sm text-danger">{dataError}</Card>}
          {children}
        </div>
      </main>
    </div>
  );
}
