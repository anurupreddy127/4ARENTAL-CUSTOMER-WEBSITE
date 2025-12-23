/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useCallback, useRef } from "react";
import { X, User, Mail, Calendar } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

// ============================================
// TYPES
// ============================================
interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Format date for display
 */
function formatDate(date: string | Date | undefined): string {
  if (!date) return "N/A";

  try {
    const dateObj = typeof date === "string" ? new Date(date) : date;

    if (isNaN(dateObj.getTime())) {
      return "N/A";
    }

    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "N/A";
  }
}

/**
 * Get display name from user data
 */
function getDisplayName(
  profile: {
    first_name?: string;
    last_name?: string;
    [key: string]: any;
  } | null,
  userMetadata:
    | { first_name?: string; last_name?: string; [key: string]: any }
    | undefined
): string {
  // First try profile (from user_profiles table)
  if (profile?.firstName || profile?.lastName) {
    return `${profile.firstName || ""} ${profile.lastName || ""}`.trim();
  }

  // Fallback to user_metadata (from OAuth/signup)
  if (userMetadata?.first_name || userMetadata?.last_name) {
    return `${userMetadata.first_name || ""} ${
      userMetadata.last_name || ""
    }`.trim();
  }

  return "Not provided";
}

// ============================================
// COMPONENT
// ============================================
export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Auth context
  const { currentUser, userData } = useAuth();

  // ============================================
  // HANDLERS
  // ============================================

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Close only if clicking the backdrop, not the modal content
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  // ============================================
  // EFFECTS
  // ============================================

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
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleClose]);

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
  // RENDER
  // ============================================

  if (!isOpen || !currentUser) return null;

  const modalTitleId = "user-profile-modal-title";
  const displayName = getDisplayName(userData, currentUser.user_metadata);
  const memberSince = formatDate(
    userData?.created_at || currentUser.created_at
  );
  const avatarUrl = currentUser.user_metadata?.avatar_url;
  const isEmailVerified = Boolean(currentUser.email_confirmed_at);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 overflow-y-auto"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className="bg-white rounded-2xl max-w-md w-full my-8 max-h-[calc(100vh-4rem)] overflow-y-auto"
      >
        {/* Header */}
        <header className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <h2
              id={modalTitleId}
              className="text-xl font-semibold text-gray-900"
            >
              User Profile
            </h2>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              aria-label="Close profile modal"
              className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 rounded-lg p-1"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Profile Content */}
        <div className="p-6">
          {/* Profile Picture */}
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden">
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="w-20 h-20 rounded-full object-cover"
                  aria-hidden="true"
                />
              ) : (
                <User className="w-10 h-10 text-gray-400" aria-hidden="true" />
              )}
            </div>
          </div>

          {/* User Information */}
          <dl className="space-y-4">
            {/* Name */}
            <div className="flex items-start gap-3">
              <User
                className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <dt className="text-sm font-medium text-gray-600">Full Name</dt>
                <dd className="text-gray-900">{displayName}</dd>
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <Mail
                className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <dt className="text-sm font-medium text-gray-600">
                  Email Address
                </dt>
                <dd className="text-gray-900 break-all">{currentUser.email}</dd>
              </div>
            </div>

            {/* Member Since */}
            <div className="flex items-start gap-3">
              <Calendar
                className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <dt className="text-sm font-medium text-gray-600">
                  Member Since
                </dt>
                <dd className="text-gray-900">{memberSince}</dd>
              </div>
            </div>

            {/* Email Verification Status */}
            <div className="flex items-start gap-3">
              <Mail
                className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0"
                aria-hidden="true"
              />
              <div className="flex-1 min-w-0">
                <dt className="text-sm font-medium text-gray-600">
                  Email Status
                </dt>
                <dd>
                  <span
                    className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      isEmailVerified
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {isEmailVerified ? "Verified" : "Unverified"}
                  </span>
                </dd>
              </div>
            </div>
          </dl>
        </div>

        {/* Footer */}
        <footer className="p-6 border-t border-gray-100">
          <Button
            type="button"
            variant="primary"
            fullWidth
            onClick={handleClose}
          >
            Close
          </Button>
        </footer>
      </div>
    </div>
  );
};
