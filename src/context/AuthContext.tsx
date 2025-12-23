// src/context/AuthContext.tsx
import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/config/supabase";
import {
  loginWithEmail,
  loginWithOAuth,
  registerWithEmail,
  logout as authLogout,
  fetchUserProfile,
  ensureUserProfile,
  getCurrentUser,
  type UserProfile,
} from "@/services/auth/authService";
import type { AuthContextType } from "@/types/auth.types";
import * as Sentry from "@sentry/react";

// ============================================
// CONTEXT
// ============================================
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safe logging for development
 */
function logInfo(message: string, data?: unknown): void {
  if (import.meta.env.DEV) {
    if (data) {
      console.log(`[AuthContext] ${message}`, data);
    } else {
      console.log(`[AuthContext] ${message}`);
    }
  }
}

function logError(message: string, error?: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[AuthContext] ${message}`, error);
  } else if (error) {
    Sentry.captureException(error, {
      tags: { context: "AuthContext", message },
    });
  }
}

// ============================================
// PROVIDER COMPONENT
// ============================================
export function AuthProvider({ children }: { children: React.ReactNode }) {
  // State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Refs to prevent double initialization in React Strict Mode
  const initializationRef = useRef(false);
  const authListenerRef = useRef<{ unsubscribe: () => void } | null>(null);

  // ============================================
  // PROFILE MANAGEMENT
  // ============================================
  const loadProfile = useCallback(async (userId: string): Promise<void> => {
    try {
      logInfo(`Loading profile for user: ${userId}`);
      const { profile: fetchedProfile, error: profileError } =
        await fetchUserProfile(userId);

      if (profileError) {
        logError("Failed to load profile", profileError);
        return;
      }

      if (fetchedProfile) {
        logInfo("Profile loaded successfully");
        setUserData(fetchedProfile);
      }
    } catch (err) {
      logError("Error loading profile", err);
    }
  }, []);

  // ============================================
  // AUTH STATE HANDLERS
  // ============================================
  const handleSignIn = useCallback(
    async (signedInUser: User) => {
      logInfo(`Handling sign-in for: ${signedInUser.email}`);

      setCurrentUser(signedInUser);
      setLoading(false);

      Sentry.setUser({ id: signedInUser.id });

      // Load profile in background - don't block auth flow
      ensureUserProfile(signedInUser)
        .then(() => loadProfile(signedInUser.id))
        .then(() => logInfo("Profile setup complete"))
        .catch((err) => logError("Error setting up user profile", err));
    },
    [loadProfile]
  );

  const handleSignOut = useCallback(() => {
    logInfo("Handling sign-out");
    setCurrentUser(null);
    setUserData(null);
    Sentry.setUser(null);
  }, []);

  // ============================================
  // INITIALIZATION
  // ============================================
  useEffect(() => {
    // Prevent double initialization in React Strict Mode
    if (initializationRef.current) {
      logInfo("Already initialized, skipping");
      return;
    }
    initializationRef.current = true;

    const initializeAuth = async () => {
      try {
        logInfo("Initializing auth...");

        // Get current user (validates JWT with server - SECURE)
        const { data: user } = await getCurrentUser();

        if (user) {
          logInfo(`Session found for: ${user.email}`);
          await handleSignIn(user);
        } else {
          logInfo("No session found");
          setLoading(false);
        }
      } catch (err) {
        logError("Auth initialization error", err);
        setLoading(false);
      }
    };

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      logInfo(`Auth state changed: ${event}`, { userId: session?.user?.id });

      switch (event) {
        case "INITIAL_SESSION":
          // Fired when auth is initialized (including OAuth callbacks)
          if (session?.user) {
            logInfo("INITIAL_SESSION with user");
            await handleSignIn(session.user);
          } else {
            setLoading(false);
          }
          break;

        case "SIGNED_IN":
          if (session?.user) {
            await handleSignIn(session.user);
          }
          break;

        case "SIGNED_OUT":
          handleSignOut();
          setLoading(false);
          break;

        case "TOKEN_REFRESHED":
          logInfo("Token refreshed");
          if (session?.user) {
            setCurrentUser(session.user);
          }
          break;

        case "USER_UPDATED":
          logInfo("User updated");
          if (session?.user) {
            setCurrentUser(session.user);
            await loadProfile(session.user.id);
          }
          break;

        case "PASSWORD_RECOVERY":
          logInfo("Password recovery event");
          break;

        default:
          logInfo(`Unhandled auth event: ${event}`);
      }
    });

    authListenerRef.current = subscription;

    // Initialize auth
    initializeAuth();

    // Cleanup on unmount
    return () => {
      logInfo("Cleaning up auth listener");
      if (authListenerRef.current) {
        authListenerRef.current.unsubscribe();
      }
    };
  }, [handleSignIn, handleSignOut, loadProfile]);

  // ============================================
  // AUTH METHODS
  // ============================================
  const login = useCallback(
    async (email: string, password: string): Promise<void> => {
      setLoading(true);

      const { data: loggedInUser, error: loginError } = await loginWithEmail(
        email,
        password
      );

      if (loginError || !loggedInUser) {
        setLoading(false);
        throw new Error(loginError || "Login failed");
      }

      // Auth state change listener will handle the rest
      // Don't set loading=false here, let the listener do it
    },
    []
  );

  const loginWithOAuthProvider = useCallback(
    async (provider: "google" | "apple"): Promise<void> => {
      const { url, error: oauthError } = await loginWithOAuth(provider);

      if (oauthError || !url) {
        throw new Error(oauthError || `${provider} login failed`);
      }

      logInfo(`Redirecting to ${provider} OAuth...`);
      // Redirect to OAuth provider (will come back to /auth/callback)
      window.location.href = url;
    },
    []
  );

  const register = useCallback(
    async (
      email: string,
      password: string,
      firstName: string,
      lastName: string
    ): Promise<void> => {
      setLoading(true);

      const { data: registeredUser, error: registerError } =
        await registerWithEmail(email, password, firstName, lastName);

      if (registerError) {
        setLoading(false);
        throw new Error(registerError);
      }

      // Check if email confirmation is required
      if (registeredUser && !currentUser) {
        setLoading(false);
        // User created but not automatically signed in = email confirmation required
        throw new Error("CONFIRMATION_REQUIRED");
      }

      // Auth state change listener will handle the rest
    },
    [currentUser]
  );

  const logout = useCallback(async (): Promise<void> => {
    setLoading(true);

    const { error: logoutError } = await authLogout();

    if (logoutError) {
      logError("Logout error", logoutError);
      // Force sign out locally even if server call fails
      handleSignOut();
    }

    setLoading(false);
    // handleSignOut will be called by the auth state listener
  }, [handleSignOut]);

  // ============================================
  // CONTEXT VALUE
  // ============================================
  const value: AuthContextType = {
    currentUser,
    userData,
    loading,
    login,
    loginWithOAuth: loginWithOAuthProvider,
    register,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthContext;
