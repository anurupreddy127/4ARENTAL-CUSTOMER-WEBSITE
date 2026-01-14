import React, { useId, useMemo } from "react";
import { ChevronDown } from "lucide-react";

// ============================================
// TYPES
// ============================================
export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  /** Current selected value */
  value: string;
  /** Callback when selection changes */
  onChange: (value: string) => void;
  /** Available options */
  options: SelectOption[];
  /** Label text */
  label?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Whether select is disabled */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** ID for the select (auto-generated if not provided) */
  id?: string;
  /** Whether select takes full width */
  fullWidth?: boolean;
}

// ============================================
// COMPONENT
// ============================================
export const Select: React.FC<SelectProps> = ({
  value,
  onChange,
  options,
  label,
  placeholder = "Select...",
  disabled = false,
  className = "",
  id: idProp,
  fullWidth = true,
}) => {
  const generatedId = useId();
  const id = idProp || `select-${generatedId}`;

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  const containerClassName = useMemo(() => {
    return fullWidth ? "w-full" : "";
  }, [fullWidth]);

  const selectClassName = useMemo(() => {
    return [
      "appearance-none",
      "w-full",
      "px-4 py-3 pr-10",
      "bg-white",
      "border border-gray-200 rounded-xl",
      "text-sm text-text-100",
      "transition-colors",
      "focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:border-transparent",
      disabled ? "opacity-60 cursor-not-allowed bg-gray-100" : "cursor-pointer",
      className,
    ]
      .filter(Boolean)
      .join(" ");
  }, [disabled, className]);

  return (
    <div className={containerClassName}>
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-gray-600 mb-2"
        >
          {label}
        </label>
      )}
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          className={selectClassName}
          aria-label={label || placeholder}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-200 pointer-events-none"
          aria-hidden="true"
        />
      </div>
    </div>
  );
};
