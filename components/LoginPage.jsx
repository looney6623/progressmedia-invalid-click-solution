"use client";

import { useState } from "react";
import { Eye, EyeOff, LockKeyhole, LogIn, UserPlus } from "lucide-react";

const COMPANY_EMAIL_DOMAIN = "my-progress.co.kr";
const DOMAIN_ERROR = "회사 이메일만 가입 가능합니다. 허용 도메인: my-progress.co.kr";
const inputClass =
  "mt-1 h-11 w-full rounded-md border border-line bg-ink px-3 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 hover:border-slate-600 focus:border-brand focus:ring-2 focus:ring-brand/20";

function isAllowedCompanyEmail(email) {
  return /^[^\s@]+@my-progress\.co\.kr$/i.test(email.trim());
}

export default function LoginPage({ onSignIn, onSignUp, loading }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [signupForm, setSignupForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    team: ""
  });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function updateSignupField(field, value) {
    setSignupForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submitLogin(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    const result = await onSignIn(email, password);
    if (!result.ok) setError(result.error || "로그인에 실패했습니다.");
  }

  async function submitSignup(event) {
    event.preventDefault();
    setError("");
    setNotice("");

    if (!isAllowedCompanyEmail(signupForm.email)) {
      setError(DOMAIN_ERROR);
      return;
    }

    if (signupForm.password !== signupForm.confirmPassword) {
      setError("비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    const result = await onSignUp({
      name: signupForm.name,
      email: signupForm.email,
      password: signupForm.password,
      team: signupForm.team
    });

    if (!result.ok) {
      setError(result.error || "마케터 계정 생성에 실패했습니다.");
      return;
    }

    setNotice("마케터 계정이 생성되었습니다. 생성된 계정으로 로그인되었습니다.");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 text-slate-200">
      <div className="w-full max-w-lg rounded-lg border border-line bg-panel/95 p-7 shadow-glow">
        <div className="mb-7 flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md bg-brand text-ink shadow-[0_0_22px_rgba(61,242,184,0.18)]">
            <LockKeyhole size={22} />
          </span>
          <div>
            <p className="text-xs font-semibold text-brand">PROGRESSMEDIA AUTH</p>
            <h1 className="mt-1 text-xl font-bold text-white">{mode === "login" ? "계정 로그인" : "마케터 계정 생성"}</h1>
          </div>
        </div>

        {mode === "login" ? (
          <form onSubmit={submitLogin} className="space-y-4">
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">이메일</span>
              <input
                required
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className={inputClass}
                placeholder={`account@${COMPANY_EMAIL_DOMAIN}`}
              />
            </label>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">비밀번호</span>
              <div className="relative">
                <input
                  required
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={`${inputClass} pr-11`}
                  placeholder="비밀번호"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-panelSoft hover:text-slate-200"
                  aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                >
                  {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                </button>
              </div>
            </label>
            {error && <p className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            {notice && <p className="rounded-md border border-brand/25 bg-brand/10 px-3 py-2 text-sm text-brand">{notice}</p>}
            <button
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-ink transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={17} />
              {loading ? "로그인 중" : "로그인"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("signup");
                setError("");
                setNotice("");
              }}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md border border-line bg-panelSoft px-4 text-sm font-semibold text-slate-200 transition hover:border-brand/60 hover:bg-panel"
            >
              <UserPlus size={17} />
              마케터 계정 생성하기
            </button>
          </form>
        ) : (
          <form onSubmit={submitSignup} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-slate-400">이름</span>
                <input
                  required
                  value={signupForm.name}
                  onChange={(event) => updateSignupField("name", event.target.value)}
                  className={inputClass}
                  placeholder="홍길동"
                />
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-400">소속/팀</span>
                <input
                  required
                  value={signupForm.team}
                  onChange={(event) => updateSignupField("team", event.target.value)}
                  className={inputClass}
                  placeholder="퍼포먼스팀"
                />
              </label>
            </div>
            <label className="block">
              <span className="text-xs font-semibold text-slate-400">회사 이메일</span>
              <input
                required
                type="email"
                value={signupForm.email}
                onChange={(event) => updateSignupField("email", event.target.value)}
                className={inputClass}
                placeholder={`name@${COMPANY_EMAIL_DOMAIN}`}
              />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <label className="block">
                <span className="text-xs font-semibold text-slate-400">비밀번호</span>
                <div className="relative">
                  <input
                    required
                    type={showSignupPassword ? "text" : "password"}
                    value={signupForm.password}
                    onChange={(event) => updateSignupField("password", event.target.value)}
                    className={`${inputClass} pr-11`}
                    placeholder="비밀번호"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignupPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-500 transition hover:bg-panelSoft hover:text-slate-200"
                    aria-label={showSignupPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
                  >
                    {showSignupPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                  </button>
                </div>
              </label>
              <label className="block">
                <span className="text-xs font-semibold text-slate-400">비밀번호 확인</span>
                <input
                  required
                  type={showSignupPassword ? "text" : "password"}
                  value={signupForm.confirmPassword}
                  onChange={(event) => updateSignupField("confirmPassword", event.target.value)}
                  className={inputClass}
                  placeholder="비밀번호 확인"
                />
              </label>
            </div>
            {error && <p className="rounded-md border border-danger/25 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>}
            <button
              disabled={loading}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-ink transition hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <UserPlus size={17} />
              {loading ? "계정 생성 중" : "마케터 계정 생성"}
            </button>
            <button
              type="button"
              onClick={() => {
                setMode("login");
                setError("");
                setNotice("");
              }}
              className="h-10 w-full rounded-md border border-line bg-panelSoft px-4 text-sm font-semibold text-slate-300 transition hover:border-brand/60 hover:bg-panel"
            >
              로그인으로 돌아가기
            </button>
          </form>
        )}

        <div className="mt-6 rounded-md border border-brand/20 bg-brand/10 px-4 py-3 text-sm leading-6 text-slate-300">
          <p>프로그레스미디어 내부 마케터는 @{COMPANY_EMAIL_DOMAIN} 회사 이메일로 계정을 생성한 뒤 로그인할 수 있습니다.</p>
          <p className="mt-1">광고주 계정은 담당 마케터가 광고주 관리 화면에서 발급합니다.</p>
        </div>
      </div>
    </main>
  );
}
