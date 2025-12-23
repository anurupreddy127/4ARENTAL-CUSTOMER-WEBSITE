import React, { useMemo } from "react";

// ============================================
// TYPES
// ============================================
export type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "error"
  | "info"
  | "pending";

export type BadgeSize = "sm" | "md" | "lg";

interface BadgeProps {
  /** Visual style variant */
  variant?: BadgeVariant;
  /** Size of the badge */
  size?: BadgeSize;
  /** Optional icon to display before text */
  icon?: React.ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Badge content */
  children: React.ReactNode;
  /** Accessible label (if badge content isn't descriptive) */
  "aria-label"?: string;
}

// ============================================
// CONSTANTS
// ============================================
const BASE_STYLES = "inline-flex items-center gap-1.5 font-medium rounded-full";

const VARIANT_STYLES: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-gray-800",
  success: "bg-green-100 text-green-800",
  warning: "bg-yellow-100 text-yellow-800",
  error: "bg-red-100 text-red-800",
  info: "bg-blue-100 text-blue-800",
  pending: "bg-orange-100 text-orange-800",
} as const;

const SIZE_STYLES: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-3 py-1.5 text-xs",
  lg: "px-4 py-2 text-sm",
} as const;

// ============================================
// COMPONENT
// ============================================
export const Badge: React.FC<BadgeProps> = ({
  variant = "default",
  size = "md",
  icon,
  className = "",
  children,
  "aria-label": ariaLabel,
}) => {
  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const combinedClassName = useMemo(() => {
    return [
      BASE_STYLES,
      VARIANT_STYLES[variant],
      SIZE_STYLES[size],
      className,
    ]
      .filter(Boolean)
      .join(" ");
  }, [variant, size, className]);

  return (
    <span
      className={combinedClassName}
      role="status"
      aria-label={ariaLabel}
    >
      {icon && (
        <span className="flex-shrink-0" aria-hidden="true">
          {icon}
        </span>
      )}
      {children}
    </span>
  );
};