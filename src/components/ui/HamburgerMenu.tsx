import React, { useCallback } from "react";
import "./HamburgerMenu.css";

// ============================================
// TYPES
// ============================================
interface HamburgerMenuProps {
  /** Whether the menu is currently open */
  isOpen: boolean;
  /** Toggle handler */
  onToggle: () => void;
  /** ID of the menu element this button controls */
  controlsId?: string;
  /** Accessible label (default: "Toggle menu") */
  "aria-label"?: string;
}

// ============================================
// CONSTANTS
// ============================================
const DEFAULT_ARIA_LABEL_CLOSED = "Open menu";
const DEFAULT_ARIA_LABEL_OPEN = "Close menu";

// ============================================
// COMPONENT
// ============================================
export const HamburgerMenu: React.FC<HamburgerMenuProps> = ({
  isOpen,
  onToggle,
  controlsId,
  "aria-label": ariaLabelProp,
}) => {
  // ============================================
  // HANDLERS
  // ============================================
  const handleClick = useCallback(() => {
    onToggle();
  }, [onToggle]);

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      // Enter and Space are handled natively by button
      // But we can handle Escape to close
      if (event.key === "Escape" && isOpen) {
        event.preventDefault();
        onToggle();
      }
    },
    [isOpen, onToggle]
  );

  // ============================================
  // COMPUTED VALUES
  // ============================================
  const ariaLabel =
    ariaLabelProp || (isOpen ? DEFAULT_ARIA_LABEL_OPEN : DEFAULT_ARIA_LABEL_CLOSED);

  // ============================================
  // RENDER
  // ============================================
  return (
    <button
      type="button"
      className={`hamburger-menu cursor-pointer p-1 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:ring-offset-2 ${
        isOpen ? "is-open" : ""
      }`}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-expanded={isOpen}
      aria-controls={controlsId}
      aria-label={ariaLabel}
    >
      <svg
        viewBox="0 0 32 32"
        className="h-8 w-8"
        aria-hidden="true"
        focusable="false"
      >
        <path
          className="line line-top-bottom"
          d="M27 10 13 10C10.8 10 9 8.2 9 6 9 3.5 10.8 2 13 2 15.2 2 17 3.8 17 6L17 26C17 28.2 18.8 30 21 30 23.2 30 25 28.2 25 26 25 23.8 23.2 22 21 22L7 22"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
        <path
          className="line"
          d="M7 16 27 16"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="3"
        />
      </svg>
    </button>
  );
};