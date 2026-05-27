import { createClient } from "@supabase/supabase-js";

export function hasServerSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export function createSupabaseServiceClient() {
  if (!hasServerSupabaseConfig()) return null;
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
}

export function isServerLocalMode() {
  const env = (process.env.PM_PROJECT_ENV || "local").toLowerCase();
  return env === "local" || env === "development";
}

export function serverMode() {
  return (process.env.PM_PROJECT_ENV || "local").toLowerCase();
}
