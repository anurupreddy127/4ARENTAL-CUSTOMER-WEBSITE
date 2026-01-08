/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useMemo, useCallback, useId } from "react";
import {
  Calendar,
  MapPin,
  Truck,
  Building2,
  ChevronDown,
  GraduationCap,
  AlertCircle,
  Info,
  AlertTriangle,
} from "lucide-react";
import { Vehicle, BookingTotal, RentalType } from "@/types";
import { Button, Card } from "@/components/ui";
import { Loader } from "@/components/ui/Loader";
import { PickupTypeSelector } from "../shared";
import { PricingSummary } from "../shared";
import {
  DeliveryLocation,
  CityOption,
} from "@/services/deliveryLocations/deliveryLocationService";
import { useBookingConfig } from "@/hooks";
import { DeliveryTimeSlotSelector } from "../shared";

// ============================================
// TYPES
// ============================================
type PickupType = "store" | "delivery";

interface DateValidationResult {
  isValid: boolean;
  errors: string[];
  rentalDays: number;
  rentalType: RentalType | null;
}

interface DateSelectionStepProps {
  vehicle: Vehicle;
  pickupDate: string;
  returnDate: string;
  isStudent: boolean;
  pickupType: PickupType;
  pickupLocation: string;
  // City selection (two-step)
  availableCities: CityOption[];
  loadingCities: boolean;
  selectedCity: string;
  onCityChange: (city: string) => void;
  // Location selection (two-step)
  cityLocations: DeliveryLocation[];
  loadingCityLocations: boolean;
  deliveryLocationId: string;
  deliveryFee: number;
  onDeliveryLocationChange: (locationId: string) => void;
  // Date handlers
  onPickupDateChange: (date: string) => void;
  onReturnDateChange: (date: string) => void;
  onIsStudentChange: (isStudent: boolean) => void;
  onPickupTypeChange: (type: PickupType) => void;
  // Validation
  dateValidation: DateValidationResult;
  // Pricing
  pricing: BookingTotal | null;
  pricingLoading: boolean;
  // Other props
  additionalDriverCount: number;
  onContinue: () => void;
  isValid: boolean;
  deliveryTimeSlot: string | null;
  onDeliveryTimeSlotChange: (slot: string) => void;
  // Add availability props
  isDateBlocked: (date: Date | string) => boolean;
  getBlockedReason: (date: Date | string) => string | null;
  availabilityLoading: boolean;
}

interface SelectWithIconProps {
  id: string;
  value: string;
  onChange: (value: string) => void;
  icon: React.ReactNode;
  children: React.ReactNode;
  disabled?: boolean;
  "aria-describedby"?: string;
}

interface LoadingStateProps {
  label: string;
}

// ============================================
// CONSTANTS
// ============================================
const STORE_LOCATION_HINT = "Pick up your vehicle at our store location";

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

/**
 * Get minimum pickup date (now + lead time from config)
 */
function getMinPickupDate(leadTimeHours: number): string {
  const minDate = new Date();
  minDate.setHours(minDate.getHours() + leadTimeHours);
  return minDate.toISOString().slice(0, 16);
}

/**
 * Get maximum pickup date (now + max advance days from config)
 */
function getMaxPickupDate(maxAdvanceDays: number): string {
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + maxAdvanceDays);
  return maxDate.toISOString().slice(0, 16);
}

/**
 * Get minimum return date (pickup + min rental days from config)
 */
function getMinReturnDate(pickupDate: string, minRentalDays: number): string {
  if (!pickupDate) return "";
  const pickup = new Date(pickupDate);
  pickup.setDate(pickup.getDate() + minRentalDays);
  return pickup.toISOString().slice(0, 16);
}

function formatLocationOption(location: DeliveryLocation): string {
  return `${location.name} - ${formatCurrency(
    location.deliveryFee
  )} delivery fee`;
}

function formatCityOption(city: CityOption): string {
  const locationText = pluralize(city.locationCount, "location", "locations");
  return `${city.city}, ${city.state} (${
    city.locationCount
  } ${locationText} - from ${formatCurrency(city.minFee)})`;
}

function formatDisplayDate(dateString: string): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ============================================
// SUB-COMPONENTS
// ============================================
const LoadingState: React.FC<LoadingStateProps> = ({ label }) => (
  <div
    className="flex items-center justify-center py-4"
    role="status"
    aria-label={label}
  >
    <Loader />
  </div>
);

// Add a new sub-component for blocked date warning:
const BlockedDateWarning: React.FC<{ reason: string }> = ({ reason }) => (
  <div
    role="alert"
    className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2"
  >
    <AlertTriangle
      className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5"
      aria-hidden="true"
    />
    <div>
      <p className="text-sm font-medium text-amber-800">Date Not Available</p>
      <p className="text-sm text-amber-700 mt-0.5">{reason}</p>
    </div>
  </div>
);

const SelectChevron: React.FC = () => (
  <div
    className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
    aria-hidden="true"
  >
    <ChevronDown className="w-5 h-5 text-gray-400" />
  </div>
);

const SelectWithIcon: React.FC<SelectWithIconProps> = ({
  id,
  value,
  onChange,
  icon,
  children,
  disabled = false,
  "aria-describedby": ariaDescribedBy,
}) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  return (
    <div className="relative">
      <div
        className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"
        aria-hidden="true"
      >
        {icon}
      </div>
      <select
        id={id}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        aria-describedby={ariaDescribedBy}
        className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
      >
        {children}
      </select>
      <SelectChevron />
    </div>
  );
};

const LocationDetailsCard: React.FC<{
  location: DeliveryLocation;
  deliveryFee: number;
}> = ({ location, deliveryFee }) => (
  <Card variant="colored" padding="sm">
    <dl className="text-sm">
      <dt className="sr-only">Location name</dt>
      <dd className="font-medium text-blue-900">{location.name}</dd>

      <dt className="sr-only">Address</dt>
      <dd className="text-blue-700 text-xs mt-1">
        {location.address}, {location.city}, {location.state} {location.zipCode}
      </dd>

      {location.notes && (
        <>
          <dt className="sr-only">Notes</dt>
          <dd className="text-blue-600 text-xs mt-1 italic">
            {location.notes}
          </dd>
        </>
      )}

      <dt className="sr-only">Delivery fee</dt>
      <dd className="text-blue-800 font-semibold mt-2">
        Delivery Fee: {formatCurrency(deliveryFee)}
      </dd>
    </dl>
  </Card>
);

const RentalDurationCard: React.FC<{
  pickupDate: string;
  returnDate: string;
  rentalDays: number;
  rentalType: RentalType | null;
}> = ({ pickupDate, returnDate, rentalDays, rentalType }) => {
  const cardId = useId();

  if (!pickupDate || !returnDate) return null;

  return (
    <Card variant="colored" padding="md">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-blue-600" aria-hidden="true" />
        <p id={cardId} className="text-sm font-medium text-blue-900">
          Rental Duration
        </p>
      </div>
      <div className="space-y-1">
        <p className="text-blue-800">
          <span className="font-semibold">{rentalDays} days</span>
          {rentalType && (
            <span className="text-blue-600 ml-2 text-sm">
              (
              {rentalType === "weekly"
                ? "Weekly"
                : rentalType === "monthly"
                ? "Monthly"
                : "Semester"}{" "}
              rate)
            </span>
          )}
        </p>
        <p className="text-xs text-blue-700">
          {formatDisplayDate(pickupDate)} → {formatDisplayDate(returnDate)}
        </p>
      </div>
    </Card>
  );
};

const StudentCheckbox: React.FC<{
  isStudent: boolean;
  onChange: (checked: boolean) => void;
  id: string;
}> = ({ isStudent, onChange, id }) => {
  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.checked);
    },
    [onChange]
  );

  return (
    <Card variant="default" padding="md">
      <label htmlFor={id} className="flex items-start gap-3 cursor-pointer">
        <input
          type="checkbox"
          id={id}
          checked={isStudent}
          onChange={handleChange}
          className="mt-1 w-5 h-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900 cursor-pointer"
        />
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <GraduationCap
              className="w-5 h-5 text-blue-600"
              aria-hidden="true"
            />
            <span className="font-medium text-gray-900">I am a student</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Get special semester pricing when you verify your student status at
            pickup. You'll need to show a valid student ID.
          </p>
        </div>
      </label>
    </Card>
  );
};

const ValidationErrors: React.FC<{ errors: string[] }> = ({ errors }) => {
  if (errors.length === 0) return null;

  return (
    <div
      role="alert"
      className="bg-red-50 border border-red-200 rounded-lg p-3"
    >
      <div className="flex items-start gap-2">
        <AlertCircle
          className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5"
          aria-hidden="true"
        />
        <ul className="text-sm text-red-700 space-y-1">
          {errors.map((error, index) => (
            <li key={index}>{error}</li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const MinRentalDaysInfo: React.FC<{ minDays: number }> = ({ minDays }) => (
  <div className="flex items-start gap-2 text-xs text-gray-500 mt-2">
    <Info className="w-4 h-4 flex-shrink-0 mt-0.5" aria-hidden="true" />
    <span>Minimum rental duration is {minDays} days</span>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
export const DateSelectionStep: React.FC<DateSelectionStepProps> = ({
  vehicle,
  pickupDate,
  returnDate,
  isStudent,
  pickupType,
  pickupLocation,
  // City selection
  availableCities,
  loadingCities,
  selectedCity,
  onCityChange,
  // Location selection
  cityLocations,
  loadingCityLocations,
  deliveryLocationId,
  deliveryFee,
  onDeliveryLocationChange,
  // Date handlers
  onPickupDateChange,
  onReturnDateChange,
  onIsStudentChange,
  onPickupTypeChange,
  // Validation
  dateValidation,
  // Pricing
  pricing,
  pricingLoading,
  // Other props
  additionalDriverCount,
  onContinue,
  isValid,
  deliveryTimeSlot,
  onDeliveryTimeSlotChange,
  isDateBlocked,
  getBlockedReason,
  availabilityLoading,
}) => {
  const baseId = useId();

  // Get config values for date constraints
  const {
    minLeadTimeHours,
    maxAdvanceDays,
    minRentalDays,
    loading: configLoading,
  } = useBookingConfig();

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const minPickupDate = useMemo(
    () => getMinPickupDate(minLeadTimeHours),
    [minLeadTimeHours]
  );

  const maxPickupDate = useMemo(
    () => getMaxPickupDate(maxAdvanceDays),
    [maxAdvanceDays]
  );

  const minReturnDate = useMemo(
    () => getMinReturnDate(pickupDate, minRentalDays),
    [pickupDate, minRentalDays]
  );

  const selectedLocation = useMemo(
    () => cityLocations.find((loc) => loc.id === deliveryLocationId),
    [cityLocations, deliveryLocationId]
  );

  const hasNoCities = useMemo(
    () => availableCities.length === 0 && !loadingCities,
    [availableCities.length, loadingCities]
  );

  const hasNoLocationsInCity = useMemo(
    () => cityLocations.length === 0 && !loadingCityLocations && selectedCity,
    [cityLocations.length, loadingCityLocations, selectedCity]
  );

  const pickupDateBlocked = useMemo(() => {
    if (!pickupDate) return null;
    const reason = getBlockedReason(pickupDate);
    return reason;
  }, [pickupDate, getBlockedReason]);

  const returnDateBlocked = useMemo(() => {
    if (!returnDate) return null;
    const reason = getBlockedReason(returnDate);
    return reason;
  }, [returnDate, getBlockedReason]);

  // Check if any date in the range is blocked BY A BOOKING (not holidays)
  // Holidays only affect pickup/return dates, not dates in between
  const rangeHasBookingConflict = useMemo(() => {
    if (!pickupDate || !returnDate) return null;

    const start = new Date(pickupDate);
    const end = new Date(returnDate);
    const current = new Date(start);

    // Skip first and last day (those are checked separately as pickup/return)
    current.setDate(current.getDate() + 1);
    const endCheck = new Date(end);
    endCheck.setDate(endCheck.getDate() - 1);

    while (current <= endCheck) {
      const reason = getBlockedReason(current);
      if (reason && reason.includes("already booked")) {
        // Only flag booking conflicts, not holidays
        return {
          date: current.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          }),
          reason,
        };
      }
      current.setDate(current.getDate() + 1);
    }

    return null;
  }, [pickupDate, returnDate, getBlockedReason]);

  // ============================================
  // HANDLERS
  // ============================================
  const handlePickupDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const newPickupDate = e.target.value;
      onPickupDateChange(newPickupDate);

      // If return date is before new minimum, clear it
      if (returnDate && newPickupDate) {
        const newMinReturn = getMinReturnDate(newPickupDate, minRentalDays);
        if (returnDate < newMinReturn) {
          onReturnDateChange("");
        }
      }
    },
    [onPickupDateChange, returnDate, minRentalDays, onReturnDateChange]
  );

  const handleReturnDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onReturnDateChange(e.target.value);
    },
    [onReturnDateChange]
  );

  const handleCityChange = useCallback(
    (value: string) => {
      onCityChange(value);
    },
    [onCityChange]
  );

  const handleLocationChange = useCallback(
    (value: string) => {
      onDeliveryLocationChange(value);
    },
    [onDeliveryLocationChange]
  );

  const handleContinue = useCallback(() => {
    onContinue();
  }, [onContinue]);

  // ============================================
  // ELEMENT IDS
  // ============================================
  const ids = useMemo(
    () => ({
      heading: `${baseId}-heading`,
      storeLocation: `${baseId}-store-location`,
      storeLocationHint: `${baseId}-store-hint`,
      deliveryCity: `${baseId}-delivery-city`,
      deliveryCityHint: `${baseId}-city-hint`,
      deliveryLocation: `${baseId}-delivery-location`,
      pickupDate: `${baseId}-pickup-date`,
      pickupDateHint: `${baseId}-pickup-hint`,
      returnDate: `${baseId}-return-date`,
      returnDateHint: `${baseId}-return-hint`,
      studentCheckbox: `${baseId}-student`,
    }),
    [baseId]
  );

  // Loading state
  if (configLoading) {
    return <LoadingState label="Loading configuration" />;
  }

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      <header>
        <h3
          id={ids.heading}
          className="text-lg font-semibold text-gray-900 mb-4"
        >
          Select Rental Details
        </h3>
      </header>

      {/* Pickup Type Selection */}
      <PickupTypeSelector
        selectedType={pickupType}
        onSelect={onPickupTypeChange}
      />

      {/* Store Pickup Location */}
      {pickupType === "store" && (
        <div>
          <label
            htmlFor={ids.storeLocation}
            className="block text-sm font-medium text-gray-600 mb-2"
          >
            Pickup Location
          </label>
          <div className="relative">
            <MapPin
              className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={ids.storeLocation}
              type="text"
              value={pickupLocation}
              readOnly
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-600"
              aria-describedby={ids.storeLocationHint}
            />
          </div>
          <p id={ids.storeLocationHint} className="text-xs text-gray-500 mt-1">
            {STORE_LOCATION_HINT}
          </p>
        </div>
      )}

      {/* Delivery Location - Two Step Selection */}
      {pickupType === "delivery" && (
        <fieldset className="space-y-4">
          <legend className="text-sm font-medium text-gray-600 mb-2">
            Delivery Location
          </legend>

          {/* Step 1: City Selection */}
          <div>
            <label
              htmlFor={ids.deliveryCity}
              className="block text-sm font-medium text-gray-600 mb-2"
            >
              Select City
            </label>
            {loadingCities ? (
              <LoadingState label="Loading cities" />
            ) : (
              <SelectWithIcon
                id={ids.deliveryCity}
                value={selectedCity}
                onChange={handleCityChange}
                icon={<Building2 className="w-5 h-5" />}
                aria-describedby={
                  hasNoCities ? ids.deliveryCityHint : undefined
                }
              >
                <option value="">Select a city...</option>
                {availableCities.map((city) => (
                  <option key={`${city.city}-${city.state}`} value={city.city}>
                    {formatCityOption(city)}
                  </option>
                ))}
              </SelectWithIcon>
            )}
            {hasNoCities && (
              <p
                id={ids.deliveryCityHint}
                className="text-xs text-amber-600 mt-1"
                role="alert"
              >
                No delivery locations available at this time
              </p>
            )}
          </div>

          {/* Step 2: Location Selection (shown after city is selected) */}
          {selectedCity && (
            <div>
              <label
                htmlFor={ids.deliveryLocation}
                className="block text-sm font-medium text-gray-600 mb-2"
              >
                Select Delivery Address
              </label>
              {loadingCityLocations ? (
                <LoadingState label="Loading locations" />
              ) : cityLocations.length > 0 ? (
                <SelectWithIcon
                  id={ids.deliveryLocation}
                  value={deliveryLocationId}
                  onChange={handleLocationChange}
                  icon={<Truck className="w-5 h-5" />}
                >
                  <option value="">Select delivery address...</option>
                  {cityLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {formatLocationOption(location)}
                    </option>
                  ))}
                </SelectWithIcon>
              ) : (
                hasNoLocationsInCity && (
                  <p className="text-sm text-amber-600 py-2" role="alert">
                    No delivery locations available in {selectedCity}
                  </p>
                )
              )}
            </div>
          )}

          {/* Selected Location Details */}
          {selectedLocation && (
            <LocationDetailsCard
              location={selectedLocation}
              deliveryFee={deliveryFee}
            />
          )}
          {/* Delivery Time Slot - Show after location is selected */}
          {selectedLocation && (
            <DeliveryTimeSlotSelector
              selectedSlot={deliveryTimeSlot}
              onSelect={onDeliveryTimeSlotChange}
            />
          )}
        </fieldset>
      )}

      {/* Date Selection */}
      <fieldset className="grid md:grid-cols-2 gap-6">
        <legend className="sr-only">Pickup and return dates</legend>

        {/* Pickup Date */}
        <div>
          <label
            htmlFor={ids.pickupDate}
            className="block text-sm font-medium text-gray-600 mb-2"
          >
            Pickup Date
          </label>
          <div className="relative">
            <Calendar
              className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={ids.pickupDate}
              type="datetime-local"
              value={pickupDate}
              onChange={handlePickupDateChange}
              min={minPickupDate}
              max={maxPickupDate}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent ${
                pickupDateBlocked
                  ? "border-amber-300 bg-amber-50"
                  : "border-gray-200"
              }`}
              required
              aria-describedby={ids.pickupDateHint}
            />
          </div>
          <p id={ids.pickupDateHint} className="text-xs text-gray-500 mt-1">
            Earliest pickup: {minLeadTimeHours} hours from now
          </p>
          {pickupDateBlocked && (
            <div className="mt-2">
              <BlockedDateWarning reason={pickupDateBlocked} />
            </div>
          )}
        </div>

        {/* Return Date */}
        <div>
          <label
            htmlFor={ids.returnDate}
            className="block text-sm font-medium text-gray-600 mb-2"
          >
            Return Date
          </label>
          <div className="relative">
            <Calendar
              className="absolute left-3 top-3 w-5 h-5 text-gray-400 pointer-events-none"
              aria-hidden="true"
            />
            <input
              id={ids.returnDate}
              type="datetime-local"
              value={returnDate}
              onChange={handleReturnDateChange}
              min={minReturnDate}
              disabled={!pickupDate}
              className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed ${
                returnDateBlocked
                  ? "border-amber-300 bg-amber-50"
                  : "border-gray-200"
              }`}
              required
              aria-describedby={ids.returnDateHint}
            />
          </div>
          {!pickupDate ? (
            <p id={ids.returnDateHint} className="text-xs text-gray-500 mt-1">
              Select pickup date first
            </p>
          ) : (
            <MinRentalDaysInfo minDays={minRentalDays} />
          )}
          {returnDateBlocked && (
            <div className="mt-2">
              <BlockedDateWarning reason={returnDateBlocked} />
            </div>
          )}
        </div>
      </fieldset>

      {/* Range has booking conflict warning */}
      {rangeHasBookingConflict && !pickupDateBlocked && !returnDateBlocked && (
        <BlockedDateWarning
          reason={`${rangeHasBookingConflict.date}: ${rangeHasBookingConflict.reason}. Please select different dates.`}
        />
      )}

      {/* Validation Errors */}
      {pickupDate && returnDate && (
        <ValidationErrors errors={dateValidation.errors} />
      )}

      {/* Validation Errors */}
      {pickupDate && returnDate && (
        <ValidationErrors errors={dateValidation.errors} />
      )}

      {/* Rental Duration Card */}
      {dateValidation.isValid && (
        <RentalDurationCard
          pickupDate={pickupDate}
          returnDate={returnDate}
          rentalDays={dateValidation.rentalDays}
          rentalType={dateValidation.rentalType}
        />
      )}

      {/* Student Checkbox */}
      <StudentCheckbox
        isStudent={isStudent}
        onChange={onIsStudentChange}
        id={ids.studentCheckbox}
      />

      {/* Pricing Summary */}
      {dateValidation.isValid && (
        <PricingSummary
          pricing={pricing}
          loading={pricingLoading}
          isStudent={isStudent}
        />
      )}

      {/* Continue Button */}
      <Button
        type="button"
        onClick={handleContinue}
        disabled={!isValid || pricingLoading}
        fullWidth
        aria-describedby={!isValid ? `${baseId}-validation-hint` : undefined}
      >
        {pricingLoading ? "Calculating Price..." : "Continue to Driver Details"}
      </Button>

      {!isValid && !pricingLoading && (
        <p id={`${baseId}-validation-hint`} className="sr-only">
          Please complete all required fields to continue
        </p>
      )}
    </div>
  );
};
