import React, { forwardRef, useId, useMemo } from "react";

// ============================================
// TYPES
// ============================================
export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  /** Label text displayed above the input */
  label?: string;
  /** Error message (displays in red, sets aria-invalid) */
  error?: string;
  /** Helper text displayed below input (hidden when error present) */
  helperText?: string;
  /** Icon displayed on the left side of input */
  icon?: React.ReactNode;
  /** Whether input takes full container width */
  fullWidth?: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const BASE_STYLES = [
  "px-4",
  "py-3",
  "border",
  "rounded-xl",
  "transition-colors",
  "focus:outline-none",
  "focus-visible:ring-2",
  "focus-visible:ring-offset-0",
].join(" ");

const ENABLED_STYLES = "bg-white";

const DISABLED_STYLES = [
  "bg-gray-100",
  "cursor-not-allowed",
  "opacity-60",
].join(" ");

const NORMAL_BORDER_STYLES = [
  "border-gray-200",
  "focus-visible:ring-gray-900",
  "focus-visible:border-transparent",
].join(" ");

const ERROR_BORDER_STYLES = [
  "border-red-300",
  "focus-visible:ring-red-500",
  "focus-visible:border-transparent",
].join(" ");

const LABEL_STYLES = "block text-sm font-medium text-gray-600 mb-2";

const ICON_WRAPPER_STYLES = [
  "absolute",
  "left-3",
  "top-1/2",
  "-translate-y-1/2",
  "text-gray-400",
  "pointer-events-none",
].join(" ");

const ERROR_TEXT_STYLES = "mt-1 text-sm text-red-600";

const HELPER_TEXT_STYLES = "mt-1 text-sm text-gray-500";

// ============================================
// COMPONENT
// ============================================
export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      icon,
      fullWidth = true,
      className = "",
      disabled,
      id: idProp,
      "aria-describedby": ariaDescribedByProp,
      required,
      ...props
    },
    ref
  ) => {
    // ============================================
    // IDS
    // ============================================
    const generatedId = useId();
    
    const ids = useMemo(() => {
      const inputId = idProp || `input-${generatedId}`;
      return {
        input: inputId,
        label: `${inputId}-label`,
        error: `${inputId}-error`,
        helper: `${inputId}-helper`,
      };
    }, [idProp, generatedId]);

    // ============================================
    // MEMOIZED VALUES
    // ============================================
    const hasError = useMemo(() => Boolean(error), [error]);
    
    const widthStyle = useMemo(
      () => (fullWidth ? "w-full" : ""),
      [fullWidth]
    );

    const inputClassName = useMemo(() => {
      return [
        BASE_STYLES,
        widthStyle,
        icon ? "pl-10" : "",
        disabled ? DISABLED_STYLES : ENABLED_STYLES,
        hasError ? ERROR_BORDER_STYLES : NORMAL_BORDER_STYLES,
        className,
      ]
        .filter(Boolean)
        .join(" ");
    }, [widthStyle, icon, disabled, hasError, className]);

    // Build aria-describedby from helper/error text
    const ariaDescribedBy = useMemo(() => {
      const describedByParts: string[] = [];
      
      if (ariaDescribedByProp) {
        describedByParts.push(ariaDescribedByProp);
      }
      
      if (hasError) {
        describedByParts.push(ids.error);
      } else if (helperText) {
        describedByParts.push(ids.helper);
      }
      
      return describedByParts.length > 0 
        ? describedByParts.join(" ") 
        : undefined;
    }, [ariaDescribedByProp, hasError, helperText, ids.error, ids.helper]);

    // ============================================
    // RENDER
    // ============================================
    return (
      <div className={widthStyle}>
        {label && (
          <label
            id={ids.label}
            htmlFor={ids.input}
            className={LABEL_STYLES}
          >
            {label}
            {required && (
              <span className="text-red-500 ml-1" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}

        <div className="relative">
          {icon && (
            <div className={ICON_WRAPPER_STYLES} aria-hidden="true">
              {icon}
            </div>
          )}

          <input
            ref={ref}
            id={ids.input}
            disabled={disabled}
            required={required}
            className={inputClassName}
            aria-invalid={hasError || undefined}
            aria-describedby={ariaDescribedBy}
            aria-labelledby={label ? ids.label : undefined}
            {...props}
          />
        </div>

        {hasError && (
          <p
            id={ids.error}
            className={ERROR_TEXT_STYLES}
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        {helperText && !hasError && (
          <p id={ids.helper} className={HELPER_TEXT_STYLES}>
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";