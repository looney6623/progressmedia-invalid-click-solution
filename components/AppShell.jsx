"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import LoginPage from "@/components/LoginPage";
import PageHeader from "@/components/PageHeader";
import Sidebar from "@/components/Sidebar";
import { Card } from "@/components/ui";
import { useAppState } from "@/components/AppStateProvider";

const routeRoles = {
  "/dashboard": ["admin", "marketer", "advertiser"],
  "/advertisers": ["admin", "marketer"],
  "/logs": ["admin", "marketer", "advertiser"],
  "/analysis": ["admin", "marketer"],
  "/blocks": ["admin", "marketer", "advertiser"],
  "/reports": ["admin", "marketer", "advertiser"],
  "/account": ["admin", "marketer", "advertiser"]
};

export default function AppShell({ title, description, actions, children }) {
  const router = useRouter();
  const pathname = usePathname();
  const { authReady, user, loginLoading, handleSignIn, handleSignUp, handleSignOut } = useAppState();

  useEffect(() => {
    if (authReady && user && pathname === "/") router.replace("/dashboard");
  }, [authReady, pathname, router, user]);

  if (!authReady) return <div className="min-h-screen bg-ink" />;

  if (!user) {
    return <LoginPage onSignIn={handleSignIn} onSignUp={handleSignUp} loading={loginLoading} />;
  }

  const allowedRoles = routeRoles[pathname] || routeRoles["/dashboard"];
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

  return (
    <div className="min-h-screen text-slate-200">
      <Sidebar user={user} onSignOut={handleSignOut} />
      <main className="lg:pl-72">
        <PageHeader title={title} description={description} actions={actions} />
        <div className="space-y-5 px-5 py-5 lg:px-8">{children}</div>
      </main>
    </div>
  );
}
