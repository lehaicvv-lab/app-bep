import { createClient } from "@supabase/supabase-js";

function normalizeSupabaseUrl(url) {
  return String(url || "")
    .trim()
    .replace(/\/rest\/v1\/?$/i, "")
    .replace(/\/+$/g, "");
}

const supabaseUrl = normalizeSupabaseUrl(import.meta.env.VITE_SUPABASE_URL);
const supabaseAnonKey = String(import.meta.env.VITE_SUPABASE_ANON_KEY || "").trim();

console.log("SUPABASE PROJECT:", supabaseUrl);
console.error("[supabase] client init:", {
  hasUrl: Boolean(supabaseUrl),
  hasAnonKey: Boolean(supabaseAnonKey),
});

export const hasSupabaseEnv = Boolean(supabaseUrl && supabaseAnonKey);
export const supabaseProjectUrl = supabaseUrl;
export const supabaseClientError = hasSupabaseEnv
  ? null
  : new Error("Missing Supabase env. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");

export const supabase = hasSupabaseEnv
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : null;
