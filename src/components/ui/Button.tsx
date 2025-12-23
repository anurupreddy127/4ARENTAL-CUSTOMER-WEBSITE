import React, { useMemo } from "react";
import { Loader } from "./Loader";

// ============================================
// TYPES
// ============================================
export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";

export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual style variant */
  variant?: ButtonVariant;
  /** Size of the button */
  size?: ButtonSize;
  /** Shows loading spinner and disables button */
  loading?: boolean;
  /** Custom loading text (default: "Loading...") */
  loadingText?: string;
  /** Optional icon to display before text */
  icon?: React.ReactNode;
  /** Makes button take full width of container */
  fullWidth?: boolean;
  /** Button content */
  children: React.ReactNode;
}

// ============================================
// CONSTANTS
// ============================================
const BASE_STYLES = [
  "cursor-pointer",
  "font-body",
  "font-semibold",
  "transition-all",
  "rounded-lg",
  "flex",
  "items-center",
  "justify-center",
  "gap-2",
  "focus:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-offset-2",
].join(" ");

const VARIANT_STYLES: Record<ButtonVariant, string> = {
  primary: [
    "bg-primary-100",
    "text-text-100",
    "border-primary-200",
    "border-b-[4px]",
    "hover:brightness-110",
    "hover:-translate-y-[1px]",
    "hover:border-b-[6px]",
    "active:border-b-[2px]",
    "active:brightness-90",
    "active:translate-y-[2px]",
    "focus-visible:ring-primary-200",
    "disabled:opacity-50",
    "disabled:cursor-not-allowed",
    "disabled:hover:translate-y-0",
    "disabled:hover:border-b-[4px]",
    "disabled:hover:brightness-100",
  ].join(" "),
  secondary: [
    "bg-accent-100",
    "text-text-100",
    "border-accent-200",
    "border-b-[4px]",
    "hover:brightness-110",
    "hover:-translate-y-[1px]",
    "hover:border-b-[6px]",
    "active:border-b-[2px]",
    "active:brightness-90",
    "active:translate-y-[2px]",
    "focus-visible:ring-accent-200",
    "disabled:opacity-50",
    "disabled:cursor-not-allowed",
    "disabled:hover:translate-y-0",
    "disabled:hover:border-b-[4px]",
    "disabled:hover:brightness-100",
  ].join(" "),
  outline: [
    "bg-bg-100",
    "text-text-100",
    "border-bg-300",
    "border-b-[4px]",
    "hover:brightness-95",
    "hover:-translate-y-[1px]",
    "hover:border-b-[6px]",
    "active:border-b-[2px]",
    "active:brightness-90",
    "active:translate-y-[2px]",
    "focus-visible:ring-bg-300",
    "disabled:opacity-50",
    "disabled:cursor-not-allowed",
    "disabled:hover:translate-y-0",
    "disabled:hover:border-b-[4px]",
    "disabled:hover:brightness-100",
  ].join(" "),
  ghost: [
    "text-text-100",
    "hover:bg-bg-100",
    "focus-visible:ring-gray-400",
    "disabled:opacity-50",
    "disabled:cursor-not-allowed",
    "disabled:hover:bg-transparent",
  ].join(" "),
  danger: [
    "bg-red-600",
    "text-white",
    "border-red-700",
    "border-b-[4px]",
    "hover:brightness-110",
    "hover:-translate-y-[1px]",
    "hover:border-b-[6px]",
    "active:border-b-[2px]",
    "active:brightness-90",
    "active:translate-y-[2px]",
    "focus-visible:ring-red-500",
    "disabled:opacity-50",
    "disabled:cursor-not-allowed",
    "disabled:hover:translate-y-0",
    "disabled:hover:border-b-[4px]",
    "disabled:hover:brightness-100",
  ].join(" "),
} as const;

const SIZE_STYLES: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-2 text-base",
  lg: "px-8 py-3 text-lg",
} as const;

const DEFAULT_LOADING_TEXT = "Loading...";

// ============================================
// COMPONENT
// ============================================
export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  size = "md",
  loading = false,
  loadingText = DEFAULT_LOADING_TEXT,
  icon,
  fullWidth = false,
  disabled,
  className = "",
  children,
  type = "button",
  "aria-label": ariaLabel,
  ...props
}) => {
  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const isDisabled = useMemo(() => disabled || loading, [disabled, loading]);

  const combinedClassName = useMemo(() => {
    return [
      BASE_STYLES,
      VARIANT_STYLES[variant],
      SIZE_STYLES[size],
      fullWidth ? "w-full" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");
  }, [variant, size, fullWidth, className]);

  // Compute aria-label when loading
  const computedAriaLabel = useMemo(() => {
    if (loading && ariaLabel) {
      return `${ariaLabel} - ${loadingText}`;
    }
    return ariaLabel;
  }, [loading, ariaLabel, loadingText]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <button
      type={type}
      className={combinedClassName}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      aria-busy={loading}
      aria-label={computedAriaLabel}
      {...props}
    >
      {loading ? (
        <>
          <Loader aria-hidden="true" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {icon && (
            <span className="flex-shrink-0" aria-hidden="true">
              {icon}
            </span>
          )}
          {children}
        </>
      )}
    </button>
  );
};