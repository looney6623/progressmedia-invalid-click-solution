import clsx from "clsx";
import {
  Ban,
  BarChart3,
  Building2,
  Clipboard,
  FileText,
  LayoutDashboard,
  LogOut,
  RadioTower,
  ShieldAlert,
  UserCog,
  Users
} from "lucide-react";

const navByRole = {
  admin: [
    { id: "dashboard", label: "전체 대시보드", icon: LayoutDashboard },
    { id: "team", label: "마케터 관리", icon: Users },
    { id: "assignments", label: "전체 광고주 관리", icon: UserCog },
    { id: "logs", label: "전체 로그", icon: RadioTower },
    { id: "reports", label: "전체 리포트", icon: FileText }
  ],
  marketer: [
    { id: "dashboard", label: "내 광고주", icon: LayoutDashboard },
    { id: "advertiser-create", label: "광고주 생성", icon: Building2 },
    { id: "logs", label: "실시간 클릭 로그", icon: RadioTower },
    { id: "analysis", label: "무효클릭 분석", icon: ShieldAlert },
    { id: "blocks", label: "차단 관리", icon: Ban },
    { id: "scripts", label: "설치 스크립트", icon: Clipboard },
    { id: "reports", label: "광고주 리포트", icon: FileText },
    { id: "advertiser-users", label: "광고주 계정 관리", icon: UserCog }
  ],
  advertiser: [
    { id: "dashboard", label: "내 대시보드", icon: LayoutDashboard },
    { id: "logs", label: "실시간 클릭 로그", icon: RadioTower },
    { id: "blocks", label: "차단 관리", icon: Ban },
    { id: "reports", label: "리포트", icon: FileText },
    { id: "scripts", label: "설치 스크립트 확인", icon: Clipboard }
  ]
};

export default function Sidebar({ activeSection, onNavigate, user, onSignOut }) {
  const navItems = navByRole[user?.role] || navByRole.marketer;

  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line bg-ink/95 px-4 py-5 lg:block no-print">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-lg font-black text-ink">P</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">프로그레스미디어</p>
          <p className="truncate text-xs text-slate-500">무효클릭차단 솔루션</p>
        </div>
      </div>
      <nav className="space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const active = activeSection === id;
          return (
            <a
              key={id}
              href={`#${id}`}
              onClick={() => onNavigate(id)}
              className={clsx(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition",
                active ? "bg-brand text-ink shadow-[0_0_24px_rgba(57,215,165,0.18)]" : "text-slate-400 hover:bg-panelSoft hover:text-white"
              )}
            >
              <Icon size={17} />
              {label}
            </a>
          );
        })}
      </nav>
      <div className="absolute bottom-5 left-4 right-4 space-y-3">
        <div className="rounded-lg border border-line bg-panel p-4">
          <p className="text-xs font-semibold text-slate-400">로그인 사용자</p>
          <p className="mt-2 truncate text-sm font-semibold text-white">{user?.name}</p>
          <p className="mt-1 truncate text-xs text-slate-500">{user?.email}</p>
          <p className="mt-2 text-xs text-brand">{user?.role} · {user?.team}</p>
          <button
            onClick={onSignOut}
            className="mt-3 inline-flex h-8 w-full items-center justify-center gap-2 rounded-md border border-line bg-panelSoft text-xs font-semibold text-slate-300 hover:text-white"
          >
            <LogOut size={14} />
            로그아웃
          </button>
        </div>
        <div className="rounded-lg border border-line bg-panel p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-slate-400">권한 범위</p>
            <BarChart3 size={14} className="text-brand" />
          </div>
          <p className="mt-2 text-sm text-white">{user?.role === "admin" ? "전체 접근" : "배정 광고주만"}</p>
        </div>
      </div>
    </aside>
  );
}
