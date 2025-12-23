import React, { useCallback, useId, useMemo } from "react";
import { Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui";
import {
  PrimaryDriverForm,
  AdditionalDriverForm,
  PrimaryDriverData,
  AdditionalDriverData,
} from "../forms";

// ============================================
// TYPES
// ============================================
interface DriverInformationStepProps {
  primaryDriver: PrimaryDriverData;
  additionalDrivers: AdditionalDriverData[];
  showAdditionalDriver: boolean;
  onPrimaryDriverChange: (field: keyof PrimaryDriverData, value: string) => void;
  onAdditionalDriverChange: (
    index: number,
    field: keyof AdditionalDriverData,
    value: string | boolean
  ) => void;
  onAddDriver: () => void;
  onRemoveDriver: (index: number) => void;
  onToggleAdditionalDriverSection: () => void;
  onContinue: () => void;
  isValid: boolean;
  disabled?: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const ADDITIONAL_DRIVER_FEE = 50;

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

// ============================================
// COMPONENT
// ============================================
export const DriverInformationStep: React.FC<DriverInformationStepProps> = ({
  primaryDriver,
  additionalDrivers,
  showAdditionalDriver,
  onPrimaryDriverChange,
  onAdditionalDriverChange,
  onAddDriver,
  onRemoveDriver,
  onToggleAdditionalDriverSection,
  onContinue,
  isValid,
  disabled = false,
}) => {
  const baseId = useId();

  // ============================================
  // ELEMENT IDS
  // ============================================
  const ids = useMemo(
    () => ({
      additionalHeading: `${baseId}-additional-heading`,
      additionalSection: `${baseId}-additional-section`,
      validationHint: `${baseId}-validation-hint`,
    }),
    [baseId]
  );

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const additionalDriverCount = useMemo(
    () => additionalDrivers.length,
    [additionalDrivers.length]
  );

  const toggleButtonText = useMemo(() => {
    if (showAdditionalDriver) {
      return "Remove Section";
    }
    return "Add Additional Driver";
  }, [showAdditionalDriver]);

  const toggleButtonAriaLabel = useMemo(() => {
    if (showAdditionalDriver) {
      return "Remove additional drivers section";
    }
    return `Add additional driver for ${formatCurrency(ADDITIONAL_DRIVER_FEE)}`;
  }, [showAdditionalDriver]);

  // ============================================
  // HANDLERS
  // ============================================
  const handlePrimaryDriverChange = useCallback(
    (field: keyof PrimaryDriverData, value: string) => {
      onPrimaryDriverChange(field, value);
    },
    [onPrimaryDriverChange]
  );

  const handleAdditionalDriverChange = useCallback(
    (index: number, field: keyof AdditionalDriverData, value: string | boolean) => {
      onAdditionalDriverChange(index, field, value);
    },
    [onAdditionalDriverChange]
  );

  const handleAddDriver = useCallback(() => {
    onAddDriver();
  }, [onAddDriver]);

  const handleRemoveDriver = useCallback(
    (index: number) => {
      onRemoveDriver(index);
    },
    [onRemoveDriver]
  );

  const handleToggleSection = useCallback(() => {
    onToggleAdditionalDriverSection();
  }, [onToggleAdditionalDriverSection]);

  const handleContinue = useCallback(() => {
    onContinue();
  }, [onContinue]);

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      {/* Primary Driver Section */}
      <PrimaryDriverForm
        data={primaryDriver}
        onChange={handlePrimaryDriverChange}
        disabled={disabled}
      />

      {/* Additional Drivers Section */}
      <section
        className="border-t border-gray-200 pt-6"
        aria-labelledby={ids.additionalHeading}
      >
        <div className="flex items-center justify-between mb-4">
          <header>
            <h4
              id={ids.additionalHeading}
              className="font-medium text-gray-900"
            >
              Additional Drivers
              {additionalDriverCount > 0 && (
                <span className="ml-2 text-sm font-normal text-gray-500">
                  ({additionalDriverCount} added)
                </span>
              )}
            </h4>
            <p className="text-xs text-gray-500 mt-1">
              {formatCurrency(ADDITIONAL_DRIVER_FEE)} per additional driver
            </p>
          </header>

          <button
            type="button"
            onClick={handleToggleSection}
            disabled={disabled}
            aria-expanded={showAdditionalDriver}
            aria-controls={ids.additionalSection}
            aria-label={toggleButtonAriaLabel}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 py-1 px-2 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {showAdditionalDriver ? (
              <>
                <Minus className="w-4 h-4" aria-hidden="true" />
                <span>{toggleButtonText}</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" aria-hidden="true" />
                <span>{toggleButtonText}</span>
              </>
            )}
          </button>
        </div>

        {/* Collapsible Additional Drivers Form */}
        <div
          id={ids.additionalSection}
          role="region"
          aria-labelledby={ids.additionalHeading}
          hidden={!showAdditionalDriver}
        >
          {showAdditionalDriver && (
            <AdditionalDriverForm
              drivers={additionalDrivers}
              onAdd={handleAddDriver}
              onRemove={handleRemoveDriver}
              onChange={handleAdditionalDriverChange}
              disabled={disabled}
            />
          )}
        </div>
      </section>

      {/* Continue Button */}
      <Button
        type="button"
        onClick={handleContinue}
        disabled={!isValid || disabled}
        fullWidth
        aria-describedby={!isValid ? ids.validationHint : undefined}
      >
        Review Booking
      </Button>

      {/* Hidden validation hint for screen readers */}
      {!isValid && (
        <p id={ids.validationHint} className="sr-only">
          Please complete all required driver information fields to continue
        </p>
      )}
    </div>
  );
};