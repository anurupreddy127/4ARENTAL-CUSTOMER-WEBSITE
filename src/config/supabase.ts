// src/config/supabase.ts
import { createClient } from "@supabase/supabase-js";
import * as Sentry from "@sentry/react";

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

// Validate environment variables
if (!supabaseUrl || !supabaseAnonKey) {
  const error = new Error(
    "Missing Supabase environment variables. Check your .env file."
  );

  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      tags: { category: "configuration" },
    });
  } else {
    console.error("❌ Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY");
  }

  throw error;
}

// ============================================
// SUPABASE CLIENT
// ============================================
/**
 * Supabase client instance
 * - Uses localStorage for session persistence (standard for SPAs)
 * - PKCE flow for enhanced OAuth security
 * - Auto-refresh tokens before expiration
 * - Detects OAuth callbacks automatically
 */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Use localStorage (standard for web apps)
    storage: window.localStorage,

    // Enable session persistence across page reloads
    persistSession: true,

    // Auto-refresh tokens ~5 minutes before expiration
    autoRefreshToken: true,

    // Detect OAuth callback in URL (for Google login)
    detectSessionInUrl: true,

    // Use PKCE flow (more secure than implicit flow)
    flowType: "pkce",
  },
});

// Log initialization in development
if (import.meta.env.DEV) {
  console.log("✅ Supabase client initialized");
}
