import React, { useCallback, useId } from "react";
import { Clock, Sun, Sunset, Moon } from "lucide-react";

// ============================================
// TYPES
// ============================================
export type DeliveryTimeSlot = "morning" | "afternoon" | "evening";

interface TimeSlotOption {
  id: DeliveryTimeSlot;
  icon: React.FC<{ className?: string }>;
  label: string;
  timeRange: string;
}

interface DeliveryTimeSlotSelectorProps {
  selectedSlot: string | null;
  onSelect: (slot: string) => void;
  disabled?: boolean;
}

interface SlotButtonProps {
  option: TimeSlotOption;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const TIME_SLOT_OPTIONS: TimeSlotOption[] = [
  {
    id: "morning",
    icon: Sun,
    label: "Morning",
    timeRange: "9:00 AM - 12:00 PM",
  },
  {
    id: "afternoon",
    icon: Sunset,
    label: "Afternoon",
    timeRange: "12:00 PM - 5:00 PM",
  },
  {
    id: "evening",
    icon: Moon,
    label: "Evening",
    timeRange: "5:00 PM - 8:00 PM",
  },
] as const;

// ============================================
// SUB-COMPONENTS
// ============================================
const SlotButton: React.FC<SlotButtonProps> = ({
  option,
  isSelected,
  onSelect,
  disabled = false,
}) => {
  const Icon = option.icon;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={onSelect}
      disabled={disabled}
      className={`p-3 rounded-xl border-2 transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        isSelected
          ? "border-gray-900 bg-gray-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <Icon
        className={`w-5 h-5 mx-auto mb-1.5 ${
          isSelected ? "text-gray-900" : "text-gray-400"
        }`}
        aria-hidden="true"
      />
      <p
        className={`font-medium text-sm ${
          isSelected ? "text-gray-900" : "text-gray-600"
        }`}
      >
        {option.label}
      </p>
      <p className="text-xs text-gray-500 mt-0.5">{option.timeRange}</p>
    </button>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const DeliveryTimeSlotSelector: React.FC<
  DeliveryTimeSlotSelectorProps
> = ({ selectedSlot, onSelect, disabled = false }) => {
  const baseId = useId();
  const labelId = `${baseId}-label`;
  const hintId = `${baseId}-hint`;

  // ============================================
  // HANDLERS
  // ============================================
  const handleSelect = useCallback(
    (slotId: DeliveryTimeSlot) => {
      onSelect(slotId);
    },
    [onSelect]
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Clock className="w-4 h-4 text-gray-500" aria-hidden="true" />
        <label id={labelId} className="block text-sm font-medium text-gray-600">
          Preferred Delivery Time
        </label>
      </div>

      <div
        role="radiogroup"
        aria-labelledby={labelId}
        aria-describedby={hintId}
        className="grid grid-cols-3 gap-3"
      >
        {TIME_SLOT_OPTIONS.map((option) => (
          <SlotButton
            key={option.id}
            option={option}
            isSelected={selectedSlot === option.id}
            onSelect={() => handleSelect(option.id)}
            disabled={disabled}
          />
        ))}
      </div>

      <p id={hintId} className="text-xs text-gray-500 mt-2">
        We'll contact you to confirm the exact delivery time within your
        selected window.
      </p>
    </div>
  );
};

export default DeliveryTimeSlotSelector;
