import React, { useId, useMemo, useCallback } from "react";
import { Check } from "lucide-react";

// ============================================
// TYPES
// ============================================
export interface CheckboxProps {
  /** Whether the checkbox is checked */
  checked: boolean;
  /** Callback when checkbox state changes */
  onChange: (checked: boolean) => void;
  /** Label text */
  label: string;
  /** Whether checkbox is disabled */
  disabled?: boolean;
  /** Additional CSS classes for the container */
  className?: string;
  /** ID for the checkbox (auto-generated if not provided) */
  id?: string;
}

// ============================================
// COMPONENT
// ============================================
export const Checkbox: React.FC<CheckboxProps> = ({
  checked,
  onChange,
  label,
  disabled = false,
  className = "",
  id: idProp,
}) => {
  const generatedId = useId();
  const id = idProp || `checkbox-${generatedId}`;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.checked);
    },
    [onChange]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (!disabled) {
          onChange(!checked);
        }
      }
    },
    [checked, disabled, onChange]
  );

  const containerClassName = useMemo(() => {
    return [
      "flex items-center gap-3 cursor-pointer select-none",
      disabled ? "opacity-50 cursor-not-allowed" : "",
      className,
    ]
      .filter(Boolean)
      .join(" ");
  }, [disabled, className]);

  const boxClassName = useMemo(() => {
    return [
      "w-5 h-5 rounded border-2 flex items-center justify-center transition-all",
      checked
        ? "bg-primary-100 border-primary-200"
        : "bg-white border-bg-300 hover:border-primary-200",
      disabled ? "" : "group-hover:border-primary-200",
    ]
      .filter(Boolean)
      .join(" ");
  }, [checked, disabled]);

  return (
    <label
      htmlFor={id}
      className={`group ${containerClassName}`}
      onKeyDown={handleKeyDown}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={handleChange}
        disabled={disabled}
        className="sr-only"
        aria-checked={checked}
      />
      <span className={boxClassName} aria-hidden="true">
        {checked && (
          <Check className="w-3.5 h-3.5 text-text-100" strokeWidth={3} />
        )}
      </span>
      <span className="text-sm font-medium text-text-100">{label}</span>
    </label>
  );
};
