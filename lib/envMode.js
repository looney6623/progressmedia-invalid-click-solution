export const projectEnv = (process.env.NEXT_PUBLIC_PM_PROJECT_ENV || process.env.PM_PROJECT_ENV || "local").toLowerCase();

export function isLocalMode() {
  return projectEnv === "local" || projectEnv === "development";
}

export function isProductionLikeMode() {
  return projectEnv === "production" || projectEnv === "cloudtype";
}

export function requireSupabaseMessage() {
  return "운영 모드에서는 Supabase 연결이 필요합니다. NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 확인해 주세요.";
}
