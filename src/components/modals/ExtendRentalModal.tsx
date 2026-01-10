/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  X,
  Calendar,
  AlertCircle,
  CheckCircle,
  Loader2,
  DollarSign,
  Clock,
  Info,
} from "lucide-react";
import { Booking } from "@/types";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  extensionService,
  ExtensionEligibility,
  ExtensionPricing,
} from "@/services/extensions/extensionService";

// ============================================
// TYPES
// ============================================
interface ExtendRentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  booking: Booking;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatDateInput(dateString: string): string {
  return dateString.split("T")[0];
}

// ============================================
// COMPONENT
// ============================================
export const ExtendRentalModal: React.FC<ExtendRentalModalProps> = ({
  isOpen,
  onClose,
  booking,
}) => {
  // State
  const [newReturnDate, setNewReturnDate] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
  const [pricing, setPricing] = useState<ExtensionPricing | null>(null);

  // Check eligibility
  const eligibility: ExtensionEligibility = useMemo(
    () => extensionService.checkEligibility(booking),
    [booking]
  );

  // Date limits
  const dateLimits = useMemo(
    () => extensionService.getExtensionDateLimits(booking),
    [booking]
  );

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setNewReturnDate("");
      setError(null);
      setIsAvailable(null);
      setPricing(null);
    }
  }, [isOpen]);

  // Check availability when date changes
  useEffect(() => {
    if (!newReturnDate || !isOpen) return;

    const checkAvailability = async () => {
      setCheckingAvailability(true);
      setError(null);
      setIsAvailable(null);

      try {
        // Calculate pricing first
        const newReturnDateTime = `${newReturnDate}T${
          booking.returnDate.split("T")[1] || "10:00:00"
        }`;
        const pricingResult = extensionService.calculateExtensionPricing(
          booking,
          newReturnDateTime
        );
        setPricing(pricingResult);

        // Check availability
        const availability = await extensionService.checkAvailability(
          booking.vehicleId,
          booking.returnDate,
          newReturnDateTime,
          booking.id
        );

        setIsAvailable(availability.available);

        if (!availability.available && availability.conflictingBooking) {
          setError(
            `Vehicle is not available. There's a booking from ${formatDate(
              availability.conflictingBooking.pickupDate
            )} to ${formatDate(availability.conflictingBooking.returnDate)}.`
          );
        }
      } catch (err) {
        setError("Failed to check availability. Please try again.");
        setIsAvailable(false);
      } finally {
        setCheckingAvailability(false);
      }
    };

    checkAvailability();
  }, [newReturnDate, booking, isOpen]);

  // Handlers
  const handleClose = useCallback(() => {
    if (loading) return;
    onClose();
  }, [loading, onClose]);

  const handleDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewReturnDate(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(async () => {
    if (!pricing || !isAvailable || !newReturnDate) return;

    setLoading(true);
    setError(null);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      const newReturnDateTime = `${newReturnDate}T${
        booking.returnDate.split("T")[1] || "10:00:00"
      }`;

      const response = await fetch(
        `${supabaseUrl}/functions/v1/extend-booking`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
          },
          body: JSON.stringify({
            bookingId: booking.id,
            userId: booking.userId,
            newReturnDate: newReturnDateTime,
            extensionAmount: pricing.extensionAmount,
            additionalDays: pricing.additionalDays,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to process extension");
      }

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error("No checkout URL received");
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to process extension";
      setError(message);
      setLoading(false);
    }
  }, [pricing, isAvailable, newReturnDate, booking]);

  // Keyboard handler
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, loading, handleClose]);

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

  if (!isOpen) return null;

  const canProceed =
    isAvailable && pricing && !loading && !checkingAvailability;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="extend-modal-title"
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2
              id="extend-modal-title"
              className="text-xl font-semibold text-gray-900"
            >
              Extend Rental
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              {booking.vehicle?.name || "Vehicle"}
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Eligibility Check */}
          {!eligibility.canExtend ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Cannot Extend</p>
                  <p className="text-sm text-red-700 mt-1">
                    {eligibility.reason}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <>
              {/* Current Booking Info */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">
                  Current Booking
                </h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Current Return Date</p>
                    <p className="font-medium text-gray-900">
                      {formatDate(booking.returnDate)}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Days Remaining</p>
                    <p className="font-medium text-gray-900">
                      {eligibility.daysRemaining} days
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Extensions Used</p>
                    <p className="font-medium text-gray-900">
                      {eligibility.extensionsUsed} / {eligibility.maxExtensions}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Current Duration</p>
                    <p className="font-medium text-gray-900">
                      {booking.rentalDays || "-"} days
                    </p>
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div
                  role="alert"
                  className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2"
                >
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* New Return Date Selector */}
              <div>
                <label
                  htmlFor="newReturnDate"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  New Return Date
                </label>
                <div className="relative">
                  <Calendar
                    className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="date"
                    id="newReturnDate"
                    value={newReturnDate}
                    onChange={handleDateChange}
                    min={dateLimits.minDate}
                    max={dateLimits.maxDate}
                    disabled={loading}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Minimum extension: 7 days • Maximum extension: 90 days
                </p>
              </div>

              {/* Availability Status */}
              {newReturnDate && (
                <div>
                  {checkingAvailability ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Checking availability...
                    </div>
                  ) : isAvailable ? (
                    <div className="flex items-center gap-2 text-sm text-green-700">
                      <CheckCircle className="w-4 h-4" />
                      Vehicle is available for these dates
                    </div>
                  ) : null}
                </div>
              )}

              {/* Pricing Summary */}
              {pricing && isAvailable && (
                <Card
                  variant="default"
                  padding="md"
                  className="bg-blue-50 border-blue-200"
                >
                  <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <DollarSign className="w-4 h-4" />
                    Extension Cost
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-blue-700">Additional Days</span>
                      <span className="text-blue-900 font-medium">
                        {pricing.additionalDays} days
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">Pricing Method</span>
                      <span className="text-blue-900 font-medium capitalize">
                        {pricing.pricingMethod} Rate
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-blue-700">New Total Duration</span>
                      <span className="text-blue-900 font-medium">
                        {pricing.newTotalDays} days
                      </span>
                    </div>
                    <div className="flex justify-between pt-2 border-t border-blue-200">
                      <span className="text-blue-900 font-semibold">
                        Extension Amount
                      </span>
                      <span className="text-blue-900 font-bold text-lg">
                        {formatCurrency(pricing.extensionAmount)}
                      </span>
                    </div>
                  </div>
                </Card>
              )}

              {/* Info Box */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <Info className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-gray-600">
                    Your original security deposit will continue to cover the
                    extended rental. You will only be charged for the additional
                    rental days.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                type="button"
                variant="primary"
                fullWidth
                disabled={!canProceed}
                onClick={handleSubmit}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    Proceed to Payment
                    {pricing && ` (${formatCurrency(pricing.extensionAmount)})`}
                  </>
                )}
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default ExtendRentalModal;
