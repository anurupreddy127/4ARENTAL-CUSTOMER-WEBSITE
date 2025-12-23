// components/layout/Navbar.tsx
import React, { useState, useCallback, useEffect, useRef } from "react";
import { User, ChevronDown, UserCircle, Calendar, LogOut } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import * as Sentry from "@sentry/react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { HamburgerMenu } from "@/components/ui/HamburgerMenu";
import { UserProfileModal } from "@/components/modals/UserProfileModal";

interface NavbarProps {
  onAuthModalOpen: (mode: "login" | "register") => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onAuthModalOpen }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const dropdownButtonRef = useRef<HTMLButtonElement>(null);

  const { currentUser, userData, logout } = useAuth();
  const location = useLocation();

  // Close dropdown and mobile menu on route change
  useEffect(() => {
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isDropdownOpen]);

  // Handle Escape key to close dropdown and mobile menu
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (isDropdownOpen) {
          setIsDropdownOpen(false);
          dropdownButtonRef.current?.focus();
        }
        if (isMenuOpen) {
          setIsMenuOpen(false);
        }
      }
    };

    document.addEventListener("keydown", handleEscapeKey);
    return () => {
      document.removeEventListener("keydown", handleEscapeKey);
    };
  }, [isDropdownOpen, isMenuOpen]);

  // Proper logout using Supabase signOut
  const handleLogout = useCallback(async () => {
    setIsLoggingOut(true);
    setIsDropdownOpen(false);
    setIsMenuOpen(false);

    try {
      await logout();
      // signOut should handle navigation, but fallback just in case
      window.location.href = "/";
    } catch (error) {
      if (import.meta.env.PROD) {
        Sentry.captureException(error, {
          tags: { component: "Navbar", action: "logout" },
        });
      } else {
        console.error("[Navbar] Logout error:", error);
      }
      // Force logout even if signOut fails
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = "/";
    } finally {
      setIsLoggingOut(false);
    }
  }, [logout]);

  const openProfileModal = useCallback(() => {
    setIsProfileModalOpen(true);
    setIsDropdownOpen(false);
    setIsMenuOpen(false);
  }, []);

  const closeProfileModal = useCallback(() => {
    setIsProfileModalOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsDropdownOpen((prev) => !prev);
  }, []);

  const toggleMobileMenu = useCallback(() => {
    setIsMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  // Get display name for user
  const displayName = userData?.first_name
    ? `${userData.first_name} ${userData.last_name || ""}`.trim()
    : currentUser?.email || "User";

  return (
    <>
      <nav
        className="fixed top-0 w-full bg-white shadow-sm z-50"
        aria-label="Main navigation"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link
              to="/"
              className="flex items-center"
              aria-label="4A Rentals home"
            >
              <img
                src="/4arentals-logo.png"
                alt="4A Rentals"
                className="h-16 w-auto cursor-pointer"
              />
            </Link>

            {/* Center Navigation Links - Desktop */}
            <div className="hidden md:flex items-center space-x-8">
              <Link
                to="/"
                className="text-text-100 hover:text-primary-200 transition-colors font-body font-medium"
                aria-current={location.pathname === "/" ? "page" : undefined}
              >
                Home
              </Link>
              <Link
                to="/fleet"
                className="text-text-100 hover:text-primary-200 transition-colors font-body font-medium"
                aria-current={
                  location.pathname === "/fleet" ? "page" : undefined
                }
              >
                Vehicles
              </Link>
              <Link
                to="/contact"
                className="text-text-100 hover:text-primary-200 transition-colors font-body font-medium"
                aria-current={
                  location.pathname === "/contact" ? "page" : undefined
                }
              >
                Contact
              </Link>

              {currentUser && (
                <Link
                  to="/my-bookings"
                  className="text-text-100 hover:text-primary-200 transition-colors font-body font-medium flex items-center gap-1"
                  aria-current={
                    location.pathname === "/my-bookings" ? "page" : undefined
                  }
                >
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  My Bookings
                </Link>
              )}
            </div>

            {/* Right Side - Sign In button OR User dropdown */}
            <div className="hidden md:flex items-center">
              {currentUser ? (
                <div className="relative" ref={dropdownRef}>
                  <button
                    ref={dropdownButtonRef}
                    onClick={toggleDropdown}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-100 text-text-100 rounded-lg hover:bg-primary-200 transition-colors font-medium"
                    aria-expanded={isDropdownOpen}
                    aria-haspopup="menu"
                    aria-label="User menu"
                  >
                    <User className="w-4 h-4" aria-hidden="true" />
                    <ChevronDown
                      className={`w-3 h-3 transition-transform ${
                        isDropdownOpen ? "rotate-180" : ""
                      }`}
                      aria-hidden="true"
                    />
                  </button>

                  {isDropdownOpen && (
                    <div
                      className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-bg-200 py-2 z-50"
                      role="menu"
                      aria-orientation="vertical"
                      aria-label="User menu"
                    >
                      <div className="px-4 py-3 border-b border-bg-200">
                        <p className="font-body font-semibold text-text-100">
                          {displayName}
                        </p>
                        <p className="text-sm text-text-200 truncate font-body">
                          {currentUser.email}
                        </p>
                      </div>

                      <button
                        onClick={openProfileModal}
                        className="flex items-center gap-2 px-4 py-2 text-text-100 hover:bg-bg-100 transition-colors w-full text-left font-body"
                        role="menuitem"
                      >
                        <UserCircle className="w-4 h-4" aria-hidden="true" />
                        Profile
                      </button>

                      <Link
                        to="/my-bookings"
                        onClick={() => setIsDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-text-100 hover:bg-bg-100 transition-colors w-full text-left font-body"
                        role="menuitem"
                      >
                        <Calendar className="w-4 h-4" aria-hidden="true" />
                        My Bookings
                      </Link>

                      <button
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        className="flex items-center gap-2 w-full text-left px-4 py-2 text-text-100 hover:bg-bg-100 transition-colors font-body disabled:opacity-50"
                        role="menuitem"
                      >
                        <LogOut className="w-4 h-4" aria-hidden="true" />
                        {isLoggingOut ? "Logging out..." : "Logout"}
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => onAuthModalOpen("login")}
                  variant="primary"
                >
                  Sign In
                </Button>
              )}
            </div>

            {/* Mobile Menu Button */}
            <div className="md:hidden">
              <HamburgerMenu
                isOpen={isMenuOpen}
                onToggle={toggleMobileMenu}
                aria-expanded={isMenuOpen}
                aria-controls="mobile-menu"
                aria-label={isMenuOpen ? "Close menu" : "Open menu"}
              />
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div
            id="mobile-menu"
            className="md:hidden bg-white border-t border-bg-200"
            role="menu"
            aria-label="Mobile navigation"
          >
            <div className="px-4 pt-2 pb-3 space-y-1">
              <Link
                to="/"
                className="block px-3 py-3 text-text-100 hover:bg-bg-100 rounded-lg font-body font-medium"
                onClick={closeMobileMenu}
                role="menuitem"
                aria-current={location.pathname === "/" ? "page" : undefined}
              >
                Home
              </Link>
              <Link
                to="/fleet"
                className="block px-3 py-3 text-text-100 hover:bg-bg-100 rounded-lg font-body font-medium"
                onClick={closeMobileMenu}
                role="menuitem"
                aria-current={
                  location.pathname === "/fleet" ? "page" : undefined
                }
              >
                Vehicles
              </Link>
              <Link
                to="/contact"
                className="block px-3 py-3 text-text-100 hover:bg-bg-100 rounded-lg font-body font-medium"
                onClick={closeMobileMenu}
                role="menuitem"
                aria-current={
                  location.pathname === "/contact" ? "page" : undefined
                }
              >
                Contact
              </Link>

              {currentUser ? (
                <>
                  <div className="px-3 py-3 text-text-100 border-t border-bg-200 mt-2 font-body font-semibold">
                    {displayName}
                  </div>

                  <Link
                    to="/my-bookings"
                    onClick={closeMobileMenu}
                    className="flex items-center gap-2 px-3 py-3 text-text-100 hover:bg-bg-100 rounded-lg font-body"
                    role="menuitem"
                    aria-current={
                      location.pathname === "/my-bookings" ? "page" : undefined
                    }
                  >
                    <Calendar className="w-4 h-4" aria-hidden="true" />
                    My Bookings
                  </Link>

                  <button
                    onClick={openProfileModal}
                    className="flex items-center gap-2 w-full text-left px-3 py-3 text-text-100 hover:bg-bg-100 rounded-lg font-body"
                    role="menuitem"
                  >
                    <UserCircle className="w-4 h-4" aria-hidden="true" />
                    Profile
                  </button>

                  <button
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    className="flex items-center gap-2 w-full text-left px-3 py-3 bg-primary-100 text-text-100 rounded-lg font-body font-semibold mt-2 hover:bg-primary-200 transition-colors disabled:opacity-50"
                    role="menuitem"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    {isLoggingOut ? "Logging out..." : "Logout"}
                  </button>
                </>
              ) : (
                <Button
                  onClick={() => {
                    onAuthModalOpen("login");
                    closeMobileMenu();
                  }}
                  variant="primary"
                  fullWidth
                >
                  Sign In
                </Button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Profile Modal - owned by Navbar */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={closeProfileModal}
      />
    </>
  );
};
