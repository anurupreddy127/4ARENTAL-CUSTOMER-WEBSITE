import React, { useState, useCallback, useEffect, useRef } from "react";
import { X, Mail, Lock, User, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import * as Sentry from "@sentry/react";

// ============================================
// TYPES
// ============================================
interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: "login" | "register";
}

interface FormData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  confirmPassword: string;
}

type OAuthProvider = "google" | "apple";

// ============================================
// CONSTANTS
// ============================================
const INITIAL_FORM_DATA: FormData = {
  email: "",
  password: "",
  firstName: "",
  lastName: "",
  confirmPassword: "",
};

const MIN_PASSWORD_LENGTH = 6;

// ============================================
// COMPONENT
// ============================================
export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  initialMode = "login",
}) => {
  // Refs
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // State
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);

  // Auth context
  const { login, register, loginWithOAuth } = useAuth();

  // Derived state
  const isAnyLoading = loading || oauthLoading !== null;

  // ============================================
  // EFFECTS
  // ============================================

  // Sync mode with initialMode when prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Focus management - focus close button when modal opens
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isAnyLoading) {
        setError("");
        setMode(initialMode);
        setFormData(INITIAL_FORM_DATA);
        setOauthLoading(null);
        setShowPassword(false);
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, isAnyLoading, initialMode, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleClose = useCallback(() => {
    setError("");
    setMode(initialMode);
    setFormData(INITIAL_FORM_DATA);
    setOauthLoading(null);
    setShowPassword(false);
    onClose();
  }, [initialMode, onClose]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));
    },
    []
  );

  const handleTogglePassword = useCallback(() => {
    setShowPassword((prev) => !prev);
  }, []);

  const handleModeSwitch = useCallback(() => {
    setMode((prev) => (prev === "login" ? "register" : "login"));
    setError("");
    setFormData(INITIAL_FORM_DATA);
    setShowPassword(false);
  }, []);

  const handleOAuthLogin = useCallback(
    async (provider: OAuthProvider) => {
      setError("");
      setOauthLoading(provider);

      try {
        await loginWithOAuth(provider);
        // If we reach here, redirect is happening
        // (function redirects and never returns)
      } catch (err) {
        const errorMessage =
          err instanceof Error
            ? err.message
            : `Failed to sign in with ${provider}`;

        setError(errorMessage);

        if (import.meta.env.PROD) {
          Sentry.captureException(err, {
            tags: { component: "AuthModal", action: "oauth_login", provider },
          });
        } else {
          console.error(`[AuthModal] OAuth login error (${provider}):`, err);
        }

        setOauthLoading(null);
      }
    },
    [loginWithOAuth]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setError("");
      setLoading(true);

      try {
        if (mode === "register") {
          // Validate passwords match
          if (formData.password !== formData.confirmPassword) {
            throw new Error("Passwords do not match");
          }
          if (formData.password.length < MIN_PASSWORD_LENGTH) {
            throw new Error(
              `Password must be at least ${MIN_PASSWORD_LENGTH} characters long`
            );
          }

          // Register user
          await register(
            formData.email,
            formData.password,
            formData.firstName,
            formData.lastName
          );

          // If we get here, registration was successful
          // Check if email confirmation is required
          onClose();
        } else {
          // Login
          await login(formData.email, formData.password);

          // If we get here, login was successful
          onClose();
        }
      } catch (err) {
        // Handle specific error types
        if (err instanceof Error) {
          if (err.message === "CONFIRMATION_REQUIRED") {
            setError(
              "Account created! Please check your email to verify your account before logging in."
            );
          } else {
            setError(err.message);
          }
        } else {
          setError("An error occurred. Please try again.");
        }

        if (import.meta.env.PROD) {
          Sentry.captureException(err, {
            tags: {
              component: "AuthModal",
              action: mode === "login" ? "login" : "register",
            },
            extra: { email: formData.email },
          });
        } else {
          console.error(`[AuthModal] ${mode} error:`, err);
        }
      } finally {
        setLoading(false);
      }
    },
    [mode, formData, login, register, onClose]
  );

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen) return null;

  const modalTitleId = "auth-modal-title";
  const modalDescId = "auth-modal-description";

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        aria-describedby={modalDescId}
        className="bg-white rounded-2xl max-w-md w-full p-8 relative max-h-[90vh] overflow-y-auto shadow-2xl"
      >
        {/* Close Button */}
        <button
          ref={closeButtonRef}
          type="button"
          onClick={handleClose}
          aria-label="Close authentication modal"
          className="absolute top-4 right-4 text-text-200 hover:text-text-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2 rounded-lg p-1"
          disabled={isAnyLoading}
        >
          <X className="w-5 h-5" aria-hidden="true" />
        </button>

        {/* Header */}
        <header className="text-center mb-8">
          <h2
            id={modalTitleId}
            className="font-heading text-3xl text-text-100 mb-3 uppercase tracking-wide"
          >
            {mode === "login" ? "Welcome Back" : "Create Account"}
          </h2>
          <p id={modalDescId} className="font-body text-text-200">
            {mode === "login"
              ? "Sign in to your account to continue"
              : "Join us to start your rental journey"}
          </p>
        </header>

        {/* Error Message */}
        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 font-body text-sm"
          >
            {error}
          </div>
        )}

        {/* OAuth Sign-In Buttons */}
        <div className="space-y-3 mb-6">
          {/* Google Sign-In Button */}
          <button
            type="button"
            onClick={() => handleOAuthLogin("google")}
            disabled={isAnyLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border-2 border-bg-200 text-text-100 py-3 rounded-xl hover:bg-bg-100 hover:border-primary-200 transition-colors font-body font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2"
          >
            {oauthLoading === "google" ? (
              <>
                <span
                  className="w-5 h-5 border-2 border-bg-300 border-t-text-100 rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span>Redirecting to Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>Continue with Google</span>
              </>
            )}
          </button>

          {/* Apple Sign-In Button */}
          <button
            type="button"
            onClick={() => handleOAuthLogin("apple")}
            disabled={isAnyLoading}
            className="w-full flex items-center justify-center gap-3 bg-text-100 text-white py-3 rounded-xl hover:bg-text-200 transition-colors font-body font-medium disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2"
          >
            {oauthLoading === "apple" ? (
              <>
                <span
                  className="w-5 h-5 border-2 border-bg-300 border-t-white rounded-full animate-spin"
                  aria-hidden="true"
                />
                <span>Redirecting to Apple...</span>
              </>
            ) : (
              <>
                <svg
                  className="w-5 h-5"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
                </svg>
                <span>Continue with Apple</span>
              </>
            )}
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6" aria-hidden="true">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-bg-200" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-white font-body text-text-200">
              Or continue with email
            </span>
          </div>
        </div>

        {/* Email/Password Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {mode === "register" && (
            <div className="grid grid-cols-2 gap-4">
              {/* First Name */}
              <div>
                <label
                  htmlFor="auth-firstName"
                  className="block font-body text-sm font-semibold text-text-100 mb-2"
                >
                  First Name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-3 w-5 h-5 text-text-200 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-firstName"
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border-2 border-bg-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-200 font-body text-text-100 transition-all"
                    placeholder="John"
                    required
                    disabled={isAnyLoading}
                    autoComplete="given-name"
                  />
                </div>
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="auth-lastName"
                  className="block font-body text-sm font-semibold text-text-100 mb-2"
                >
                  Last Name
                </label>
                <div className="relative">
                  <User
                    className="absolute left-3 top-3 w-5 h-5 text-text-200 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    id="auth-lastName"
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="w-full pl-10 pr-4 py-3 border-2 border-bg-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-200 font-body text-text-100 transition-all"
                    placeholder="Doe"
                    required
                    disabled={isAnyLoading}
                    autoComplete="family-name"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="auth-email"
              className="block font-body text-sm font-semibold text-text-100 mb-2"
            >
              Email
            </label>
            <div className="relative">
              <Mail
                className="absolute left-3 top-3 w-5 h-5 text-text-200 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="auth-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="w-full pl-10 pr-4 py-3 border-2 border-bg-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-200 font-body text-text-100 transition-all"
                placeholder="john@example.com"
                required
                disabled={isAnyLoading}
                autoComplete="email"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="auth-password"
              className="block font-body text-sm font-semibold text-text-100 mb-2"
            >
              Password
            </label>
            <div className="relative">
              <Lock
                className="absolute left-3 top-3 w-5 h-5 text-text-200 pointer-events-none"
                aria-hidden="true"
              />
              <input
                id="auth-password"
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="w-full pl-10 pr-12 py-3 border-2 border-bg-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-200 font-body text-text-100 transition-all"
                placeholder="••••••••"
                required
                disabled={isAnyLoading}
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={MIN_PASSWORD_LENGTH}
              />
              <button
                type="button"
                onClick={handleTogglePassword}
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                className="absolute right-3 top-3 text-text-200 hover:text-text-100 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 rounded"
                disabled={isAnyLoading}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" aria-hidden="true" />
                ) : (
                  <Eye className="w-5 h-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password (Register only) */}
          {mode === "register" && (
            <div>
              <label
                htmlFor="auth-confirmPassword"
                className="block font-body text-sm font-semibold text-text-100 mb-2"
              >
                Confirm Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3 top-3 w-5 h-5 text-text-200 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="auth-confirmPassword"
                  type={showPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-4 py-3 border-2 border-bg-200 rounded-lg focus:ring-2 focus:ring-primary-200 focus:border-primary-200 font-body text-text-100 transition-all"
                  placeholder="••••••••"
                  required
                  disabled={isAnyLoading}
                  autoComplete="new-password"
                  minLength={MIN_PASSWORD_LENGTH}
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            variant="primary"
            fullWidth
            loading={loading}
            disabled={isAnyLoading}
            className="py-3"
          >
            {mode === "login" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        {/* Mode Switch */}
        <footer className="mt-6 text-center">
          <p className="font-body text-text-200 text-sm">
            {mode === "login"
              ? "Don't have an account? "
              : "Already have an account? "}
            <button
              type="button"
              onClick={handleModeSwitch}
              className="font-body text-text-100 font-semibold hover:text-primary-200 transition-colors focus:outline-none focus-visible:underline"
              disabled={isAnyLoading}
            >
              {mode === "login" ? "Sign up" : "Sign in"}
            </button>
          </p>
        </footer>
      </div>
    </div>
  );
};
