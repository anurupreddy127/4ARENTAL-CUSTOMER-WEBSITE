// src/pages/auth/AuthCallback.tsx
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/config/supabase";
import * as Sentry from "@sentry/react";

/**
 * OAuth Callback Handler
 *
 * This page handles the OAuth redirect from providers (Google, Apple, etc.)
 * Supabase automatically exchanges the code for a session via onAuthStateChange
 * We just need to wait for that to complete and redirect appropriately
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const hasRun = useRef(false);

  useEffect(() => {
    // Prevent double execution in React Strict Mode
    if (hasRun.current) return;
    hasRun.current = true;

    const handleCallback = async () => {
      try {
        if (import.meta.env.DEV) {
          console.log("[AuthCallback] Processing OAuth callback...");
        }

        // Check if we have a code in the URL
        const params = new URLSearchParams(window.location.search);
        const code = params.get("code");
        const error = params.get("error");
        const errorDescription = params.get("error_description");

        // Handle OAuth errors
        if (error) {
          if (import.meta.env.DEV) {
            console.error(
              "[AuthCallback] OAuth error:",
              error,
              errorDescription
            );
          }

          Sentry.captureMessage("OAuth callback error", {
            level: "error",
            extra: { error, errorDescription },
          });

          // Redirect to home with error
          navigate("/?auth_error=oauth_failed", { replace: true });
          return;
        }

        // If no code, something went wrong
        if (!code) {
          if (import.meta.env.DEV) {
            console.warn("[AuthCallback] No code in callback URL");
          }
          navigate("/", { replace: true });
          return;
        }

        // Supabase automatically handles the code exchange via detectSessionInUrl
        // The onAuthStateChange listener in AuthContext will fire with SIGNED_IN
        // We just need to wait a moment for that to complete

        if (import.meta.env.DEV) {
          console.log(
            "[AuthCallback] Waiting for session to be established..."
          );
        }

        // Give Supabase a moment to process the callback
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if we now have a session
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
          if (import.meta.env.DEV) {
            console.error("[AuthCallback] Session error:", sessionError);
          }
          Sentry.captureException(sessionError);
          navigate("/?auth_error=session_failed", { replace: true });
          return;
        }

        if (session) {
          if (import.meta.env.DEV) {
            console.log(
              "[AuthCallback] Session established, redirecting to home"
            );
          }
          // Successfully authenticated - redirect to home
          navigate("/", { replace: true });
        } else {
          if (import.meta.env.DEV) {
            console.warn("[AuthCallback] No session after callback");
          }
          // No session - redirect to home
          navigate("/", { replace: true });
        }
      } catch (err) {
        console.error("[AuthCallback] Unexpected error:", err);
        Sentry.captureException(err);
        navigate("/?auth_error=unexpected", { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-bg-100 flex items-center justify-center">
      <div className="text-center">
        {/* Loading Spinner */}
        <div className="w-16 h-16 border-4 border-bg-300 border-t-primary-200 rounded-full animate-spin mx-auto mb-4" />

        {/* Loading Text */}
        <h2 className="font-heading text-2xl text-text-100 mb-2">
          Completing Sign In...
        </h2>
        <p className="font-body text-text-200">
          Please wait while we finish setting up your account
        </p>
      </div>
    </div>
  );
}
