import React, { useMemo } from "react";
import { Loader2 } from "lucide-react";

// ============================================
// TYPES
// ============================================
export type SpinnerSize = "xs" | "sm" | "md" | "lg" | "xl";

export interface SpinnerProps {
  /** Size of the spinner */
  size?: SpinnerSize;
  /** Accessible label for screen readers */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Color (defaults to currentColor, inherits from parent) */
  color?: string;
  /** Whether to show visible label text next to spinner */
  showLabel?: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: "h-3 w-3",
  sm: "h-4 w-4",
  md: "h-5 w-5",
  lg: "h-6 w-6",
  xl: "h-8 w-8",
} as const;

const LABEL_SIZE_CLASSES: Record<SpinnerSize, string> = {
  xs: "text-xs",
  sm: "text-sm",
  md: "text-sm",
  lg: "text-base",
  xl: "text-base",
} as const;

const BASE_STYLES = "animate-spin";

const DEFAULT_LABEL = "Loading";

// ============================================
// COMPONENT
// ============================================
export const Spinner: React.FC<SpinnerProps> = ({
  size = "md",
  label = DEFAULT_LABEL,
  className = "",
  color,
  showLabel = false,
}) => {
  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const iconClassName = useMemo(() => {
    return [BASE_STYLES, SIZE_CLASSES[size], className]
      .filter(Boolean)
      .join(" ");
  }, [size, className]);

  const labelClassName = useMemo(() => {
    return LABEL_SIZE_CLASSES[size];
  }, [size]);

  const style = useMemo(() => {
    return color ? { color } : undefined;
  }, [color]);

  // ============================================
  // RENDER
  // ============================================
  if (showLabel) {
    return (
      <span
        role="status"
        aria-label={label}
        className="inline-flex items-center gap-2"
        style={style}
      >
        <Loader2 className={iconClassName} aria-hidden="true" />
        <span className={labelClassName}>{label}</span>
      </span>
    );
  }

  return (
    <span role="status" aria-label={label} className="inline-flex" style={style}>
      <Loader2 className={iconClassName} aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
};