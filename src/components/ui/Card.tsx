import React, { useMemo, useCallback } from "react";

// ============================================
// TYPES
// ============================================
export type CardVariant =
  | "default"
  | "bordered"
  | "elevated"
  | "colored"
  | "brutalist";

export type CardPadding = "none" | "sm" | "md" | "lg";

interface CardProps {
  /** Visual style variant */
  variant?: CardVariant;
  /** Internal padding */
  padding?: CardPadding;
  /** Additional CSS classes */
  className?: string;
  /** Card content */
  children: React.ReactNode;
  /** Click handler (makes card interactive) */
  onClick?: () => void;
  /** Accessible label for interactive cards */
  "aria-label"?: string;
  /** HTML role override */
  role?: string;
  /** Additional HTML attributes */
  id?: string;
}

// ============================================
// CONSTANTS
// ============================================
const BASE_STYLES = "font-body transition-all duration-300";

const VARIANT_STYLES: Record<CardVariant, string> = {
  default: [
    "bg-white",
    "shadow-sm",
    "border",
    "border-gray-100",
    "hover:shadow-md",
    "rounded-2xl",
  ].join(" "),
  bordered: [
    "bg-white",
    "border-2",
    "border-bg-200",
    "hover:border-primary-200",
    "rounded-2xl",
  ].join(" "),
  elevated: [
    "bg-white",
    "shadow-md",
    "hover:shadow-lg",
    "rounded-2xl",
  ].join(" "),
  colored: [
    "bg-bg-100",
    "border",
    "border-bg-200",
    "hover:shadow-sm",
    "rounded-2xl",
  ].join(" "),
  brutalist: [
    "relative",
    "bg-white",
    "border-[6px]",
    "border-text-100",
    "rounded-xl",
    "shadow-[0.7em_0.7em_0_#000]",
    "hover:shadow-[1em_1em_0_#000]",
    "hover:-translate-x-[0.4em]",
    "hover:-translate-y-[0.4em]",
    "hover:scale-[1.02]",
    "active:shadow-[0.5em_0.5em_0_#000]",
    "active:translate-x-[0.1em]",
    "active:translate-y-[0.1em]",
    "active:scale-[0.98]",
  ].join(" "),
} as const;

const PADDING_STYLES: Record<CardPadding, string> = {
  none: "",
  sm: "p-3",
  md: "p-4",
  lg: "p-6",
} as const;

const INTERACTIVE_STYLES = [
  "cursor-pointer",
  "focus:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-primary-200",
  "focus-visible:ring-offset-2",
].join(" ");

// ============================================
// COMPONENT
// ============================================
export const Card: React.FC<CardProps> = ({
  variant = "default",
  padding = "md",
  className = "",
  children,
  onClick,
  "aria-label": ariaLabel,
  role: roleProp,
  id,
}) => {
  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const isInteractive = useMemo(() => Boolean(onClick), [onClick]);

  const combinedClassName = useMemo(() => {
    return [
      BASE_STYLES,
      VARIANT_STYLES[variant],
      PADDING_STYLES[padding],
      isInteractive ? INTERACTIVE_STYLES : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");
  }, [variant, padding, isInteractive, className]);

  // Determine the appropriate role
  const role = useMemo(() => {
    if (roleProp) return roleProp;
    if (isInteractive) return "button";
    return undefined;
  }, [roleProp, isInteractive]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      if (!onClick) return;

      // Trigger click on Enter or Space
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onClick();
      }
    },
    [onClick]
  );

  const handleClick = useCallback(() => {
    onClick?.();
  }, [onClick]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div
      id={id}
      className={combinedClassName}
      onClick={isInteractive ? handleClick : undefined}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      role={role}
      tabIndex={isInteractive ? 0 : undefined}
      aria-label={ariaLabel}
    >
      {children}
    </div>
  );
};