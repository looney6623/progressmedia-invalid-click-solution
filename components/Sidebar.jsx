"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import {
  Ban,
  BarChart3,
  Blocks,
  ChevronDown,
  FileDown,
  FileText,
  LayoutDashboard,
  LineChart,
  Link2,
  LogOut,
  MousePointerClick,
  RadioTower,
  Search,
  Settings,
  ShieldAlert,
  Target,
  UserCircle,
  UsersRound
} from "lucide-react";

const menuGroups = [
  {
    title: "메인",
    items: [
      { href: "/dashboard", label: "대시보드", icon: LayoutDashboard, roles: ["admin", "marketer", "advertiser"] }
    ]
  },
  {
    title: "방문자 분석",
    items: [
      { href: "/visitors/realtime", label: "실시간 방문자", icon: RadioTower, roles: ["admin", "marketer", "advertiser"] },
      { href: "/visitors/logs", label: "방문자 로그", icon: UsersRound, roles: ["admin", "marketer", "advertiser"] },
      { href: "/visitors/pages", label: "페이지별 유입", icon: Link2, roles: ["admin", "marketer"] }
    ]
  },
  {
    title: "부정클릭 분석",
    items: [
      { href: "/invalid-clicks/ad-click-ip", label: "광고 클릭 IP", icon: MousePointerClick, roles: ["admin", "marketer", "advertiser"] },
      { href: "/invalid-clicks/suspicious-ip", label: "의심 클릭 IP", icon: ShieldAlert, roles: ["admin", "marketer", "advertiser"] },
      { href: "/invalid-clicks/blocked-ip", label: "차단 판정 로그", icon: Ban, roles: ["admin", "marketer", "advertiser"] },
      { href: "/invalid-clicks/repeated-ip", label: "반복 클릭 IP", icon: LineChart, roles: ["admin", "marketer"] },
      { href: "/invalid-clicks/exposure-limited-ip", label: "노출제한 IP", icon: Target, roles: ["admin", "marketer"] }
    ]
  },
  {
    title: "차단 관리",
    items: [
      { href: "/blocks/rules", label: "자동 차단 규칙", icon: Blocks, roles: ["admin", "marketer"] },
      { href: "/blocks/manual", label: "수동 차단 IP", icon: Ban, roles: ["admin", "marketer", "advertiser"] },
      { href: "/blocks/history", label: "차단 해제 이력", icon: FileText, roles: ["admin", "marketer"] }
    ]
  },
  {
    title: "전환 분석",
    items: [
      { href: "/conversions/events", label: "전환 이벤트", icon: Target, roles: ["admin", "marketer", "advertiser"] },
      { href: "/conversions/logs", label: "전환 로그", icon: FileText, roles: ["admin", "marketer"] },
      { href: "/conversions/savings", label: "광고비 절감 추정", icon: BarChart3, roles: ["admin", "marketer"] }
    ]
  },
  {
    title: "로그 분석",
    items: [
      { href: "/logs/all", label: "전체 로그", icon: FileText, roles: ["admin", "marketer"] },
      { href: "/logs/referrers", label: "Referrer URL", icon: Link2, roles: ["admin", "marketer"] },
      { href: "/logs/utm", label: "UTM 분석", icon: BarChart3, roles: ["admin", "marketer"] },
      { href: "/logs/keywords", label: "검색어/키워드", icon: Search, roles: ["admin", "marketer"] }
    ]
  },
  {
    title: "광고주 관리",
    items: [
      { href: "/advertisers", label: "광고주 목록", icon: UsersRound, roles: ["admin", "marketer"] },
      { href: "/advertisers/create", label: "광고주/사이트 등록", icon: Target, roles: ["admin", "marketer"] },
      { href: "/advertisers/accounts", label: "광고주 로그인 계정 발급", icon: UserCircle, roles: ["admin", "marketer"] },
      { href: "/advertisers/scripts", label: "설치 스크립트", icon: FileText, roles: ["admin", "marketer"] }
    ]
  },
  {
    title: "리포트",
    items: [
      { href: "/reports/advertisers", label: "광고주 리포트", icon: FileText, roles: ["admin", "marketer", "advertiser"] },
      { href: "/reports/export", label: "CSV 내보내기", icon: FileDown, roles: ["admin", "marketer"] },
      { href: "/reports/print", label: "인쇄용 리포트", icon: FileText, roles: ["admin", "marketer"] }
    ]
  },
  {
    title: "설정",
    items: [
      { href: "/settings/account", label: "내 계정", icon: UserCircle, roles: ["admin", "marketer", "advertiser"] },
      { href: "/settings/policy", label: "운영 정책", icon: Settings, roles: ["admin", "marketer"] }
    ]
  }
];

const roleLabel = {
  admin: "관리자",
  marketer: "마케터",
  advertiser: "광고주"
};

function isActive(pathname, href) {
  if (href === "/dashboard") return pathname === href;
  if (href === "/advertisers") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ user, onSignOut }) {
  const pathname = usePathname();
  const visibleGroups = useMemo(() => {
    return menuGroups
      .map((group) => ({ ...group, items: group.items.filter((item) => item.roles.includes(user?.role)) }))
      .filter((group) => group.items.length > 0);
  }, [user?.role]);
  const [openGroups, setOpenGroups] = useState(() => Object.fromEntries(visibleGroups.map((group) => [group.title, true])));

  function toggleGroup(title) {
    setOpenGroups((prev) => ({ ...prev, [title]: prev[title] === false }));
  }

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line bg-ink/95 px-4 py-4 lg:flex lg:flex-col no-print">
      <div className="mb-4 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-lg font-black text-ink shadow-[0_0_22px_rgba(61,242,184,0.18)]">
          P
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">프로그레스미디어</p>
          <p className="truncate text-xs text-slate-500">무효클릭차단 솔루션</p>
        </div>
      </div>

      <div className="mb-3 rounded-lg border border-line bg-panel px-3 py-3">
        <div className="flex min-w-0 items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
            <p className="mt-0.5 truncate text-xs text-slate-500">{user?.email}</p>
          </div>
          <span className="shrink-0 rounded-full border border-brand/25 bg-brand/10 px-2 py-1 text-[11px] font-bold text-brand">
            {roleLabel[user?.role] || user?.role}
          </span>
        </div>
      </div>

      <nav className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {visibleGroups.map((group) => {
          const open = openGroups[group.title] !== false;
          const groupActive = group.items.some((item) => isActive(pathname, item.href));
          return (
            <div key={group.title}>
              <button
                type="button"
                onClick={() => toggleGroup(group.title)}
                className={clsx(
                  "flex w-full items-center justify-between rounded-md px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide transition",
                  groupActive ? "text-brand" : "text-slate-600 hover:text-slate-400"
                )}
              >
                <span>{group.title}</span>
                <ChevronDown size={14} className={clsx("transition", open ? "rotate-0" : "-rotate-90")} />
              </button>
              {open && (
                <div className="mt-1 space-y-1">
                  {group.items.map(({ href, label, icon: Icon }) => {
                    const active = isActive(pathname, href);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={clsx(
                          "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold transition",
                          active ? "bg-brand text-ink shadow-[0_0_24px_rgba(57,215,165,0.18)]" : "text-slate-400 hover:bg-panelSoft hover:text-white"
                        )}
                      >
                        <Icon size={16} className="shrink-0" />
                        <span className="truncate">{label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      <div className="mt-3 border-t border-line pt-3">
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
