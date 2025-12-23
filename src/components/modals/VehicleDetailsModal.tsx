import React, { useEffect, useCallback, useRef, useMemo } from "react";
import {
  X,
  ArrowLeft,
  Star,
  CheckCircle,
  Users,
  Settings,
  Fuel,
  Calendar,
} from "lucide-react";
import { Vehicle } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";

// ============================================
// TYPES
// ============================================
interface VehicleDetailsModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
  onAuthModalOpen: (mode: "login" | "register") => void;
  onBookingModalOpen: (vehicle: Vehicle) => void;
}

type VehicleStatus = "available" | "reserved" | "rented";

interface StatusConfig {
  label: string;
  badgeClasses: string;
  buttonLabel: string;
  buttonLabelAuth: string;
}

// ============================================
// CONSTANTS
// ============================================
const RATING_STARS = 5;

const STATUS_CONFIG: Record<VehicleStatus, StatusConfig> = {
  available: {
    label: "Available",
    badgeClasses: "bg-green-100 text-green-800",
    buttonLabel: "Sign In to Book",
    buttonLabelAuth: "Book This Vehicle",
  },
  reserved: {
    label: "Reserved",
    badgeClasses: "bg-yellow-100 text-yellow-800",
    buttonLabel: "Currently Reserved",
    buttonLabelAuth: "Currently Reserved",
  },
  rented: {
    label: "Not Available",
    badgeClasses: "bg-red-100 text-red-800",
    buttonLabel: "Not Available",
    buttonLabelAuth: "Not Available",
  },
};

// ============================================
// COMPONENT
// ============================================
export const VehicleDetailsModal: React.FC<VehicleDetailsModalProps> = ({
  vehicle,
  isOpen,
  onClose,
  onAuthModalOpen,
  onBookingModalOpen,
}) => {
  // Refs
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Auth context
  const { currentUser } = useAuth();

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const statusConfig = useMemo((): StatusConfig => {
    if (!vehicle) {
      return STATUS_CONFIG.rented;
    }
    return (
      STATUS_CONFIG[vehicle.status as VehicleStatus] || STATUS_CONFIG.rented
    );
  }, [vehicle]);

  const isAvailable = useMemo(() => {
    return vehicle?.status === "available";
  }, [vehicle?.status]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  const handleBookClick = useCallback(() => {
    if (!vehicle) return;

    if (currentUser) {
      onClose();
      onBookingModalOpen(vehicle);
    } else {
      onClose();
      onAuthModalOpen("login");
    }
  }, [vehicle, currentUser, onClose, onBookingModalOpen, onAuthModalOpen]);

  // ============================================
  // EFFECTS
  // ============================================

  // Focus management
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Escape key to close
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, handleClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ============================================
  // RENDER
  // ============================================
  if (!isOpen || !vehicle) return null;

  const modalTitleId = "vehicle-details-modal-title";
  const modalDescriptionId = "vehicle-details-modal-description";

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={handleBackdropClick}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        aria-describedby={modalDescriptionId}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <header className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleClose}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 rounded-lg px-2 py-1"
              aria-label="Go back and close modal"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              <span className="font-medium">Back</span>
            </button>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              aria-label="Close vehicle details"
              className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 rounded-lg p-1"
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>
        </header>

        {/* Vehicle Image */}
        <div className="relative">
          <img
            src={vehicle.image}
            alt={`${vehicle.specifications.year} ${vehicle.specifications.brand} ${vehicle.specifications.model}`}
            className="w-full h-64 object-cover"
          />
          <div className="absolute top-4 right-4">
            <span
              className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.badgeClasses}`}
            >
              {statusConfig.label}
            </span>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="p-6">
          {/* Title and Price */}
          <div className="flex justify-between items-start mb-4">
            <div>
              <h2
                id={modalTitleId}
                className="text-2xl font-semibold text-gray-900 mb-1"
              >
                {vehicle.name}
              </h2>
              <p id={modalDescriptionId} className="text-gray-600 capitalize">
                {vehicle.category} Vehicle
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gray-900">
                <span className="sr-only">Price: </span>${vehicle.price}/
                {vehicle.priceUnit}
              </p>
              <div
                className="flex items-center justify-end text-yellow-500 mt-1"
                role="img"
                aria-label={`${RATING_STARS} out of ${RATING_STARS} stars`}
              >
                {[...Array(RATING_STARS)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-current"
                    aria-hidden="true"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Specifications */}
          <section aria-labelledby="specs-heading" className="mb-6">
            <h3 id="specs-heading" className="sr-only">
              Vehicle Specifications
            </h3>
            <dl className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Users
                  className="w-5 h-5 text-gray-600 flex-shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-sm text-gray-600">Seats</dt>
                  <dd className="font-medium text-gray-900">
                    {vehicle.specifications.seats} People
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Settings
                  className="w-5 h-5 text-gray-600 flex-shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-sm text-gray-600">Transmission</dt>
                  <dd className="font-medium text-gray-900 capitalize">
                    {vehicle.specifications.transmission}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Fuel
                  className="w-5 h-5 text-gray-600 flex-shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-sm text-gray-600">Fuel Type</dt>
                  <dd className="font-medium text-gray-900 capitalize">
                    {vehicle.specifications.fuelType}
                  </dd>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <Calendar
                  className="w-5 h-5 text-gray-600 flex-shrink-0"
                  aria-hidden="true"
                />
                <div>
                  <dt className="text-sm text-gray-600">Year</dt>
                  <dd className="font-medium text-gray-900">
                    {vehicle.specifications.year}
                  </dd>
                </div>
              </div>
            </dl>
          </section>

          {/* Vehicle Info */}
          <section aria-labelledby="vehicle-info-heading" className="mb-6">
            <h3
              id="vehicle-info-heading"
              className="text-lg font-semibold text-gray-900 mb-3"
            >
              Vehicle Information
            </h3>
            <dl className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex gap-2">
                <dt className="text-gray-600">Brand:</dt>
                <dd className="font-medium text-gray-900">
                  {vehicle.specifications.brand}
                </dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-gray-600">Model:</dt>
                <dd className="font-medium text-gray-900">
                  {vehicle.specifications.model}
                </dd>
              </div>
            </dl>
          </section>

          {/* Features */}
          <section aria-labelledby="features-heading" className="mb-8">
            <h3
              id="features-heading"
              className="text-lg font-semibold text-gray-900 mb-4"
            >
              Features & Amenities
            </h3>
            <ul className="grid grid-cols-1 gap-3" role="list">
              {vehicle.features.map((feature, index) => (
                <li
                  key={`feature-${index}`}
                  className="flex items-center gap-3"
                >
                  <CheckCircle
                    className="w-5 h-5 text-green-500 flex-shrink-0"
                    aria-hidden="true"
                  />
                  <span className="text-gray-700">{feature}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* Action Button */}
          <footer className="border-t border-gray-100 pt-6">
            <Button
              type="button"
              variant={isAvailable ? "primary" : "secondary"}
              size="lg"
              fullWidth
              disabled={!isAvailable}
              onClick={handleBookClick}
              aria-describedby={!isAvailable ? "availability-note" : undefined}
            >
              {currentUser
                ? statusConfig.buttonLabelAuth
                : statusConfig.buttonLabel}
            </Button>
            {!isAvailable && (
              <p id="availability-note" className="sr-only">
                This vehicle is currently {statusConfig.label.toLowerCase()} and
                cannot be booked.
              </p>
            )}
          </footer>
        </div>
      </div>
    </div>
  );
};
