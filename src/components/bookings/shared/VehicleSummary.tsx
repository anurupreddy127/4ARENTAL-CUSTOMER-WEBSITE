import React, { useMemo, useCallback } from "react";
import { Vehicle } from "@/types";

// ============================================
// TYPES
// ============================================
interface VehicleSummaryProps {
  vehicle: Vehicle;
}

// ============================================
// CONSTANTS
// ============================================
const PLACEHOLDER_IMAGE = "https://via.placeholder.com/400x300?text=No+Image";

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

function getVehicleImageUrl(image: string | string[]): string {
  return Array.isArray(image) ? image[0] : image;
}

// ============================================
// COMPONENT
// ============================================
export const VehicleSummary: React.FC<VehicleSummaryProps> = ({ vehicle }) => {
  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const imageUrl = useMemo(
    () => getVehicleImageUrl(vehicle.image),
    [vehicle.image]
  );

  const vehicleSpecs = useMemo(() => {
    const { seats, transmission } = vehicle.specifications;
    return `${seats} seats • ${transmission}`;
  }, [vehicle.specifications]);

  const imageAlt = useMemo(() => {
    const { brand, model, year } = vehicle.specifications;
    return `${year} ${brand} ${model}`;
  }, [vehicle.specifications]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleImageError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const target = e.target as HTMLImageElement;
      if (target.src !== PLACEHOLDER_IMAGE) {
        target.src = PLACEHOLDER_IMAGE;
      }
    },
    []
  );

  return (
    <article
      className="p-6 bg-gray-50 border-b border-gray-100"
      aria-label={`Selected vehicle: ${vehicle.name}`}
    >
      <div className="flex items-center gap-4">
        <img
          src={imageUrl}
          alt={imageAlt}
          className="w-24 h-20 object-cover rounded-lg flex-shrink-0"
          loading="lazy"
          onError={handleImageError}
        />

        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">
            {vehicle.name}
          </h3>
          <p className="text-gray-600 text-sm">{vehicleSpecs}</p>
          <p className="text-lg font-semibold text-gray-900">
            <span className="sr-only">Price: </span>
            {formatCurrency(vehicle.price)}
            <span className="text-sm font-normal text-gray-600">/month</span>
          </p>
        </div>
      </div>
    </article>
  );
};
