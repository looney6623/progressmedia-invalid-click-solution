export default function PageHeader({ eyebrow = "무효클릭 관리", title, description, actions }) {
  return (
    <header className="border-b border-line bg-ink/88 backdrop-blur no-print">
      <div className="flex flex-col gap-4 px-5 py-5 md:flex-row md:items-center md:justify-between lg:px-8">
        <div>
          <p className="text-xs font-semibold text-brand">{eyebrow}</p>
          <h1 className="mt-1 text-xl font-bold tracking-normal text-white md:text-2xl">{title}</h1>
          {description && <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
