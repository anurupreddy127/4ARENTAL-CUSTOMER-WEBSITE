// src/services/auth/authService.ts
import { supabase } from "@/config/supabase";
import type { User, AuthError } from "@supabase/supabase-js";
import { z } from "zod";
import * as Sentry from "@sentry/react";

// ============================================
// TYPES
// ============================================
export interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  updated_at: string;
}

interface AuthResult<T = User | null> {
  data: T;
  error: string | null;
}

interface OAuthResult {
  url: string | null;
  error: string | null;
}

// ============================================
// INPUT VALIDATION SCHEMAS
// ============================================
const emailSchema = z
  .string()
  .email("Please enter a valid email address")
  .min(5)
  .max(255)
  .toLowerCase()
  .trim();

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password is too long");

const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(50, "Name is too long")
  .trim();

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required"),
});

const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  firstName: nameSchema,
  lastName: nameSchema,
});

const passwordResetSchema = z.object({
  email: emailSchema,
});

const updatePasswordSchema = z.object({
  password: passwordSchema,
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safe error logging - dev console, prod Sentry
 */
function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[authService] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "authService", context },
    });
  }
}

/**
 * Safe info logging - dev only
 */
function logInfo(message: string): void {
  if (import.meta.env.DEV) {
    console.log(`[authService] ${message}`);
  }
}

/**
 * Convert Supabase AuthError to user-friendly message
 */
function getAuthErrorMessage(error: AuthError | Error): string {
  const message = error.message?.toLowerCase() || "";

  // Common Supabase error patterns
  const errorMap: Record<string, string> = {
    "invalid login credentials": "Invalid email or password.",
    invalid_credentials: "Invalid email or password.",
    invalid_grant: "Invalid email or password.",
    "user not found": "No account found with this email.",
    user_not_found: "No account found with this email.",
    "email not confirmed": "Please verify your email before logging in.",
    "user already registered": "An account with this email already exists.",
    email_exists: "An account with this email already exists.",
    weak_password: "Password is too weak. Please use a stronger password.",
    over_request_rate_limit: "Too many requests. Please try again later.",
    over_email_send_rate_limit: "Too many emails sent. Please try again later.",
    session_not_found: "Session expired. Please log in again.",
    refresh_token_not_found: "Session expired. Please log in again.",
    bad_jwt: "Session expired. Please log in again.",
  };

  // Check for matching error patterns
  for (const [key, friendlyMessage] of Object.entries(errorMap)) {
    if (message.includes(key.toLowerCase())) {
      return friendlyMessage;
    }
  }

  // Check HTTP status codes
  if ("status" in error) {
    const status = (error as AuthError).status;
    if (status === 400)
      return "Invalid request. Please check your information.";
    if (status === 401) return "Invalid email or password.";
    if (status === 422) return "Invalid email or password format.";
    if (status === 429) return "Too many attempts. Please try again later.";
  }

  // Default message (don't expose raw error)
  return "An error occurred. Please try again.";
}

// ============================================
// AUTH SERVICE
// ============================================

/**
 * Email/Password Login
 */
export async function loginWithEmail(
  email: string,
  password: string
): Promise<AuthResult> {
  try {
    // Validate input
    const validated = loginSchema.parse({ email, password });

    logInfo(`Login attempt for: ${validated.email}`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: validated.email,
      password: validated.password,
    });

    if (error) {
      logError("loginWithEmail", error);
      return { data: null, error: getAuthErrorMessage(error) };
    }

    if (!data.user) {
      return { data: null, error: "Login failed. Please try again." };
    }

    logInfo(`Login successful for: ${validated.email}`);

    // Set Sentry user context (no PII)
    Sentry.setUser({ id: data.user.id });

    return { data: data.user, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { data: null, error: error.issues[0]?.message || "Invalid input" };
    }
    logError("loginWithEmail", error);
    return { data: null, error: "Unable to sign in. Please try again." };
  }
}

/**
 * OAuth Login (Google, Apple)
 */
export async function loginWithOAuth(
  provider: "google" | "apple"
): Promise<OAuthResult> {
  try {
    logInfo(`Initiating ${provider} OAuth flow`);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams:
          provider === "google"
            ? {
                access_type: "offline",
                prompt: "consent",
              }
            : undefined,
      },
    });

    if (error) {
      logError(`loginWithOAuth - ${provider}`, error);
      return { url: null, error: getAuthErrorMessage(error) };
    }

    logInfo(`OAuth redirect URL generated for ${provider}`);
    return { url: data.url, error: null };
  } catch (error) {
    logError("loginWithOAuth", error);
    return {
      url: null,
      error: "Unable to start authentication. Please try again.",
    };
  }
}

/**
 * Email/Password Registration
 */
export async function registerWithEmail(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<AuthResult> {
  try {
    // Validate input
    const validated = registerSchema.parse({
      email,
      password,
      firstName,
      lastName,
    });

    logInfo(`Registration attempt for: ${validated.email}`);

    const { data, error } = await supabase.auth.signUp({
      email: validated.email,
      password: validated.password,
      options: {
        data: {
          first_name: validated.firstName,
          last_name: validated.lastName,
        },
      },
    });

    if (error) {
      logError("registerWithEmail", error);
      return { data: null, error: getAuthErrorMessage(error) };
    }

    // Check if user already exists (Supabase returns user but no session)
    if (data.user && !data.session) {
      if (data.user.identities?.length === 0) {
        return {
          data: null,
          error: "An account with this email already exists.",
        };
      }
      // Email confirmation required
      logInfo(
        `Registration successful, email confirmation required for: ${validated.email}`
      );
      return { data: data.user, error: null };
    }

    logInfo(`Registration successful for: ${validated.email}`);

    // Set Sentry user context
    if (data.user) {
      Sentry.setUser({ id: data.user.id });
    }

    return { data: data.user, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { data: null, error: error.issues[0]?.message || "Invalid input" };
    }
    logError("registerWithEmail", error);
    return { data: null, error: "Unable to create account. Please try again." };
  }
}

/**
 * Logout
 */
export async function logout(): Promise<{ error: string | null }> {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      logError("logout", error);
      return { error: getAuthErrorMessage(error) };
    }

    logInfo("Logged out successfully");

    // Clear Sentry user context
    Sentry.setUser(null);

    return { error: null };
  } catch (error) {
    logError("logout", error);
    return { error: "Unable to sign out. Please try again." };
  }
}

/**
 * Request Password Reset Email
 */
export async function requestPasswordReset(
  email: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Validate input
    const validated = passwordResetSchema.parse({ email });

    logInfo(`Password reset requested for: ${validated.email}`);

    const { error } = await supabase.auth.resetPasswordForEmail(
      validated.email,
      {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      }
    );

    if (error) {
      logError("requestPasswordReset", error);
      // Don't reveal if email exists or not (security)
      return { success: true, error: null };
    }

    logInfo(`Password reset email sent to: ${validated.email}`);
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid email",
      };
    }
    logError("requestPasswordReset", error);
    // Always return success to prevent email enumeration
    return { success: true, error: null };
  }
}

/**
 * Update Password (after reset link clicked)
 */
export async function updatePassword(
  newPassword: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Validate input
    const validated = updatePasswordSchema.parse({ password: newPassword });

    const { error } = await supabase.auth.updateUser({
      password: validated.password,
    });

    if (error) {
      logError("updatePassword", error);
      return { success: false, error: getAuthErrorMessage(error) };
    }

    logInfo("Password updated successfully");
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid password",
      };
    }
    logError("updatePassword", error);
    return {
      success: false,
      error: "Unable to update password. Please try again.",
    };
  }
}

/**
 * Get Current User (SECURE - validates JWT with server)
 * ⚠️ NEVER use getSession() for auth checks - it reads from storage which can be tampered
 */
export async function getCurrentUser(): Promise<AuthResult> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error) {
      // Don't log "not authenticated" errors
      if (error.status !== 401) {
        logError("getCurrentUser", error);
      }
      return { data: null, error: null }; // Not an error, just not logged in
    }

    return { data: user, error: null };
  } catch (error) {
    logError("getCurrentUser", error);
    return { data: null, error: null };
  }
}

/**
 * Fetch User Profile
 */
export async function fetchUserProfile(
  userId: string
): Promise<{ profile: UserProfile | null; error: string | null }> {
  try {
    // Validate userId
    const validatedId = z.string().uuid().parse(userId);

    const { data, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("id", validatedId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // Profile not found - not an error
        return { profile: null, error: null };
      }
      logError("fetchUserProfile", error);
      return { profile: null, error: "Unable to load profile." };
    }

    return { profile: data as UserProfile, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { profile: null, error: "Invalid user ID" };
    }
    logError("fetchUserProfile", error);
    return { profile: null, error: "Unable to load profile." };
  }
}

/**
 * Update User Profile
 */
export async function updateUserProfile(
  userId: string,
  updates: { first_name?: string; last_name?: string; phone?: string }
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Validate userId
    const validatedId = z.string().uuid().parse(userId);

    // Validate updates
    const updateSchema = z.object({
      first_name: z.string().min(1).max(50).trim().optional(),
      last_name: z.string().min(1).max(50).trim().optional(),
      phone: z.string().min(5).max(20).trim().optional(),
    });
    const validated = updateSchema.parse(updates);

    const { error } = await supabase
      .from("user_profiles")
      .update(validated)
      .eq("id", validatedId);

    if (error) {
      logError("updateUserProfile", error);
      return { success: false, error: "Unable to update profile." };
    }

    logInfo("Profile updated successfully");
    return { success: true, error: null };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        error: error.issues[0]?.message || "Invalid input",
      };
    }
    logError("updateUserProfile", error);
    return { success: false, error: "Unable to update profile." };
  }
}

/**
 * Ensure User Profile Exists (for OAuth users)
 */
export async function ensureUserProfile(
  user: User
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Check if profile already exists
    const { data: existingProfile, error: fetchError } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (fetchError && fetchError.code !== "PGRST116") {
      logError("ensureUserProfile - check", fetchError);
      return { success: false, error: "Unable to verify profile." };
    }

    if (existingProfile) {
      logInfo("Profile already exists");
      return { success: true, error: null };
    }

    // Extract name from user metadata
    const metadata = user.user_metadata || {};

    const firstName =
      metadata.given_name ||
      metadata.first_name ||
      metadata.full_name?.split(" ")[0] ||
      metadata.name?.split(" ")[0] ||
      user.email?.split("@")[0] ||
      "User";

    const lastName =
      metadata.family_name ||
      metadata.last_name ||
      metadata.full_name?.split(" ").slice(1).join(" ") ||
      metadata.name?.split(" ").slice(1).join(" ") ||
      "";

    logInfo(`Creating profile for OAuth user: ${user.email}`);

    // Create the profile
    const { error: insertError } = await supabase.from("user_profiles").insert({
      id: user.id,
      first_name: firstName.slice(0, 50),
      last_name: lastName.slice(0, 50),
    });

    if (insertError) {
      // Ignore duplicate key errors (race condition with trigger)
      if (insertError.code === "23505") {
        logInfo("Profile already created by trigger");
        return { success: true, error: null };
      }
      logError("ensureUserProfile - create", insertError);
      return { success: false, error: "Unable to create profile." };
    }

    logInfo("Profile created successfully");
    return { success: true, error: null };
  } catch (error) {
    logError("ensureUserProfile", error);
    return { success: false, error: "Unable to set up profile." };
  }
}
