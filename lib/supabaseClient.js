import { createBrowserClient } from "@supabase/ssr";
import { isLocalMode, requireSupabaseMessage } from "@/lib/envMode";

export function hasSupabaseConfig() {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function canUseMockFallback() {
  return isLocalMode() && !hasSupabaseConfig();
}

export function getSupabaseConfigError() {
  if (hasSupabaseConfig()) return "";
  return requireSupabaseMessage();
}

export function createSupabaseBrowserClient() {
  if (!hasSupabaseConfig()) {
    if (canUseMockFallback()) return null;
    throw new Error(getSupabaseConfigError());
  }
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}
