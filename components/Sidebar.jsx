import clsx from "clsx";
import { Ban, Clipboard, FileText, LayoutDashboard, RadioTower, ShieldAlert } from "lucide-react";

const navItems = [
  { id: "dashboard", label: "메인 대시보드", icon: LayoutDashboard },
  { id: "logs", label: "실시간 클릭 로그", icon: RadioTower },
  { id: "analysis", label: "무효클릭 분석", icon: ShieldAlert },
  { id: "blocks", label: "차단 관리", icon: Ban },
  { id: "scripts", label: "설치 스크립트", icon: Clipboard },
  { id: "reports", label: "광고주 리포트", icon: FileText }
];

export default function Sidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r border-line bg-ink/95 px-4 py-5 lg:block">
      <div className="mb-8 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-brand text-lg font-black text-ink">P</div>
        <div className="min-w-0">
          <p className="truncate text-sm font-bold text-white">프로그레스미디어</p>
          <p className="truncate text-xs text-slate-500">무효클릭차단 솔루션</p>
        </div>
      </div>
      <nav className="space-y-1">
        {navItems.map(({ id, label, icon: Icon }, index) => (
          <a
            key={id}
            href={`#${id}`}
            className={clsx(
              "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-panelSoft hover:text-white",
              index === 0 && "bg-panelSoft text-white"
            )}
          >
            <Icon size={17} />
            {label}
          </a>
        ))}
      </nav>
      <div className="absolute bottom-5 left-4 right-4 rounded-lg border border-line bg-panel p-4">
        <p className="text-xs font-semibold text-slate-400">실시간 방어 상태</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-sm text-white">자동 차단 ON</span>
          <span className="h-2.5 w-2.5 rounded-full bg-brand shadow-[0_0_18px_rgba(57,215,165,0.9)]" />
        </div>
      </div>
    </aside>
  );
}
