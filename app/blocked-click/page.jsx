import Link from "next/link";

export default function BlockedClickPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-ink px-5 text-slate-200">
      <section className="max-w-md rounded-lg border border-line bg-panel p-6 text-center shadow-glow">
        <p className="text-xs font-semibold text-danger">접근 제한</p>
        <h1 className="mt-2 text-xl font-bold text-white">보호 정책에 따라 이동이 제한되었습니다</h1>
        <p className="mt-3 text-sm leading-6 text-slate-400">
          반복 클릭 또는 차단 정책에 해당하는 접속으로 판단되어 최종 랜딩 페이지로 이동하지 않았습니다.
        </p>
        <Link href="/" className="mt-5 inline-flex h-10 items-center rounded-md bg-brand px-4 text-sm font-semibold text-ink">
          홈으로 이동
        </Link>
      </section>
    </main>
  );
}
