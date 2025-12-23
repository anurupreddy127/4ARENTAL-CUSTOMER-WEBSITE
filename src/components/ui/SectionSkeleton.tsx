import React, { useMemo } from "react";

// ============================================
// TYPES
// ============================================
export type SkeletonSize = "sm" | "md" | "lg" | "xl" | "full";

export type SkeletonRounded = "none" | "sm" | "md" | "lg" | "xl" | "full";

export interface SectionSkeletonProps {
  /** Predefined height size */
  size?: SkeletonSize;
  /** Custom height (overrides size) */
  height?: string;
  /** Width (defaults to full) */
  width?: string;
  /** Border radius */
  rounded?: SkeletonRounded;
  /** Accessible label for screen readers */
  label?: string;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show the pulse animation */
  animate?: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const SIZE_MAP: Record<SkeletonSize, string> = {
  sm: "200px",
  md: "300px",
  lg: "400px",
  xl: "500px",
  full: "100%",
} as const;

const ROUNDED_CLASSES: Record<SkeletonRounded, string> = {
  none: "rounded-none",
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
} as const;

const BASE_CLASSES = "bg-gray-200";

const ANIMATION_CLASS = "animate-pulse";

const DEFAULT_LABEL = "Loading content";

// ============================================
// COMPONENT
// ============================================
export const SectionSkeleton: React.FC<SectionSkeletonProps> = ({
  size = "lg",
  height,
  width = "100%",
  rounded = "none",
  label = DEFAULT_LABEL,
  className = "",
  animate = true,
}) => {
  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const computedHeight = useMemo(() => {
    return height || SIZE_MAP[size];
  }, [height, size]);

  const style = useMemo(() => ({
    height: computedHeight,
    width,
  }), [computedHeight, width]);

  const combinedClassName = useMemo(() => {
    return [
      BASE_CLASSES,
      animate ? ANIMATION_CLASS : "",
      ROUNDED_CLASSES[rounded],
      className,
    ]
      .filter(Boolean)
      .join(" ");
  }, [animate, rounded, className]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div
      className={combinedClassName}
      style={style}
      role="status"
      aria-label={label}
      aria-busy="true"
    >
      <span className="sr-only">{label}</span>
    </div>
  );
};