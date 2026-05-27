"use client";

import { useState } from "react";
import { LockKeyhole, LogIn } from "lucide-react";

export default function LoginPage({ onSignIn, loading }) {
  const [email, setEmail] = useState("marketer1@progressmedia.co.kr");
  const [password, setPassword] = useState("demo1234");
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");
    const result = await onSignIn(email, password);
    if (!result.ok) setError(result.error || "로그인에 실패했습니다.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 text-slate-200">
      <div className="w-full max-w-md rounded-lg border border-line bg-panel/95 p-6 shadow-glow">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-md bg-brand text-ink">
            <LockKeyhole size={22} />
          </span>
          <div>
            <p className="text-xs font-semibold text-brand">PROGRESSMEDIA AUTH</p>
            <h1 className="mt-1 text-xl font-bold text-white">마케터 계정 로그인</h1>
          </div>
        </div>

        <form onSubmit={submit} className="space-y-4">
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">이메일</span>
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand"
              placeholder="marketer@progressmedia.co.kr"
            />
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-slate-500">비밀번호</span>
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 h-11 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none focus:border-brand"
              placeholder="비밀번호"
            />
          </label>
          {error && <p className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
          <button
            disabled={loading}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogIn size={17} />
            {loading ? "로그인 중" : "로그인"}
          </button>
        </form>

        <div className="mt-5 rounded-md border border-line bg-panelSoft p-4 text-xs leading-5 text-slate-400">
          <p className="font-semibold text-slate-300">Mock 계정</p>
          <p>admin@progressmedia.co.kr / 관리자</p>
          <p>marketer1@progressmedia.co.kr / 윤인홍 / 샤브20, 3분페이</p>
          <p>marketer2@progressmedia.co.kr / 마케터B / 대주바이오, 바른숨병원</p>
        </div>
      </div>
    </main>
  );
}
