import { createClient, SupabaseClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/react";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim() || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() || "";

if (!supabaseUrl || !supabaseAnonKey) {
  const msg = "Missing Supabase environment variables. Check your .env file.";
  if (import.meta.env.PROD) {
    Sentry.captureException(new Error(msg), {
      tags: { category: "configuration" },
    });
  } else {
    console.warn(msg);
  }
}

export const supabase: SupabaseClient = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder",
  {
    auth: {
      storage: window.localStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      flowType: "pkce",
    },
  }
);
