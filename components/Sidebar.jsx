"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Ban, BarChart3, Building2, FileText, LayoutDashboard, LogOut, RadioTower, ShieldAlert, UserCircle } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "대시보드", icon: LayoutDashboard, roles: ["admin", "marketer", "advertiser"] },
  { href: "/advertisers", label: "광고주 관리", icon: Building2, roles: ["admin", "marketer"] },
  { href: "/logs", label: "실시간 클릭 로그", icon: RadioTower, roles: ["admin", "marketer", "advertiser"] },
  { href: "/analysis", label: "무효클릭 분석", icon: ShieldAlert, roles: ["admin", "marketer"] },
  { href: "/blocks", label: "차단 관리", icon: Ban, roles: ["admin", "marketer", "advertiser"] },
  { href: "/reports", label: "광고주 리포트", icon: FileText, roles: ["admin", "marketer", "advertiser"] }
];

const roleLabel = {
  admin: "관리자",
  marketer: "마케터",
  advertiser: "광고주"
};

export default function Sidebar({ user, onSignOut }) {
  const pathname = usePathname();
  const visibleItems = navItems.filter((item) => item.roles.includes(user?.role));

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line bg-ink/95 px-4 py-5 lg:flex lg:flex-col no-print">
      <div className="mb-6 flex items-center gap-3 px-2">
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-brand text-lg font-black text-ink shadow-[0_0_22px_rgba(61,242,184,0.18)]">
          P
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">프로그레스미디어</p>
          <p className="truncate text-xs text-slate-500">무효클릭차단 솔루션</p>
        </div>
      </div>

      <div className="mb-5 rounded-lg border border-line bg-panel p-4">
        <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
        <p className="mt-1 truncate text-xs text-slate-500">{user?.email}</p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-2.5 py-1 text-xs font-semibold text-brand">
          <BarChart3 size={13} />
          {roleLabel[user?.role] || user?.role}
        </div>
      </div>

      <nav className="space-y-1.5">
        {visibleItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
                active ? "bg-brand text-ink shadow-[0_0_24px_rgba(57,215,165,0.18)]" : "text-slate-400 hover:bg-panelSoft hover:text-white"
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2 pt-6">
        <Link
          href="/account"
          className={clsx(
            "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-semibold transition",
            pathname === "/account" ? "bg-brand text-ink" : "text-slate-400 hover:bg-panelSoft hover:text-white"
          )}
        >
          <UserCircle size={18} />
          내 계정
        </Link>
        <button
          onClick={onSignOut}
          className="flex h-10 w-full items-center gap-3 rounded-md border border-line bg-panelSoft px-3 text-sm font-semibold text-slate-300 transition hover:border-danger/40 hover:text-danger"
        >
          <LogOut size={18} />
          로그아웃
        </button>
      </div>
    </aside>
  );
}
