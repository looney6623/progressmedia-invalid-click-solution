import clsx from "clsx";
import { number } from "@/lib/format";

export const chartColors = {
  normal: "#39d7a5",
  suspicious: "#f8c14a",
  blocked: "#ff6b6b",
  total: "#64b5f6"
};

export function Card({ children, className, id }) {
  return (
    <section id={id} className={clsx("rounded-lg border border-line bg-panel/92 shadow-glow", className)}>
      {children}
    </section>
  );
}

export function SectionTitle({ icon: Icon, title, right }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
      <div className="flex min-w-0 items-center gap-3">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-panelSoft text-brand">
          <Icon size={17} />
        </span>
        <h2 className="truncate text-sm font-semibold text-slate-100">{title}</h2>
      </div>
      {right}
    </div>
  );
}

export function StatusBadge({ status, label = status }) {
  const tone = status === "정상" || status === "정상 수집" ? "bg-brand/10 text-brand border-brand/25 shadow-[inset_0_0_0_1px_rgba(57,215,165,0.08)]"
    : status === "의심" || status === "설치 전" ? "bg-warn/10 text-warn border-warn/25 shadow-[inset_0_0_0_1px_rgba(248,193,74,0.08)]"
      : "bg-danger/10 text-danger border-danger/25 shadow-[inset_0_0_0_1px_rgba(255,107,107,0.08)]";

  return (
    <span className={clsx("inline-flex min-w-16 items-center justify-center rounded border px-2 py-1 text-xs font-semibold", tone)}>
      {label}
    </span>
  );
}

export function SectionDescription({ children }) {
  return <p className="border-b border-line bg-panelSoft/35 px-5 py-3 text-sm text-slate-400">{children}</p>;
}

export function TooltipBox({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md border border-line bg-ink px-3 py-2 text-xs shadow-glow">
      <p className="mb-1 font-semibold text-slate-100">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {number(entry.value)}
        </p>
      ))}
    </div>
  );
}
