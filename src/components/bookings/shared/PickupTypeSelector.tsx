import React, { useCallback, useId } from "react";
import { Store, Truck, LucideIcon } from "lucide-react";

// ============================================
// TYPES
// ============================================
export type PickupType = "store" | "delivery";

interface PickupOption {
  id: PickupType;
  icon: LucideIcon;
  label: string;
  description: string;
}

interface PickupTypeSelectorProps {
  selectedType: PickupType;
  onSelect: (type: PickupType) => void;
  disabled?: boolean;
}

interface OptionButtonProps {
  option: PickupOption;
  isSelected: boolean;
  onSelect: () => void;
  disabled?: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const PICKUP_OPTIONS: PickupOption[] = [
  {
    id: "store",
    icon: Store,
    label: "Store Pickup",
    description: "Pick up at our Denton location",
  },
  {
    id: "delivery",
    icon: Truck,
    label: "Delivery",
    description: "We deliver to your location",
  },
] as const;

// ============================================
// SUB-COMPONENTS
// ============================================
const OptionButton: React.FC<OptionButtonProps> = ({
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
      className={`p-4 rounded-xl border-2 transition-all text-center focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
        isSelected
          ? "border-gray-900 bg-gray-50"
          : "border-gray-200 hover:border-gray-300"
      }`}
    >
      <Icon
        className={`w-6 h-6 mx-auto mb-2 ${
          isSelected ? "text-gray-900" : "text-gray-400"
        }`}
        aria-hidden="true"
      />
      <p
        className={`font-medium ${
          isSelected ? "text-gray-900" : "text-gray-600"
        }`}
      >
        {option.label}
      </p>
      <p className="text-xs text-gray-500 mt-1">{option.description}</p>
    </button>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const PickupTypeSelector: React.FC<PickupTypeSelectorProps> = ({
  selectedType,
  onSelect,
  disabled = false,
}) => {
  const baseId = useId();
  const labelId = `${baseId}-label`;

  // ============================================
  // HANDLERS
  // ============================================
  const handleStoreSelect = useCallback(() => {
    onSelect("store");
  }, [onSelect]);

  const handleDeliverySelect = useCallback(() => {
    onSelect("delivery");
  }, [onSelect]);

  // Map option IDs to their handlers
  const handlers: Record<PickupType, () => void> = {
    store: handleStoreSelect,
    delivery: handleDeliverySelect,
  };

  return (
    <div>
      <p id={labelId} className="block text-sm font-medium text-gray-600 mb-3">
        Pickup Type
      </p>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="grid grid-cols-2 gap-4"
      >
        {PICKUP_OPTIONS.map((option) => (
          <OptionButton
            key={option.id}
            option={option}
            isSelected={selectedType === option.id}
            onSelect={handlers[option.id]}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};