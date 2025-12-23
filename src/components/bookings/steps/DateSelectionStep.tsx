import React, { useMemo, useCallback, useId } from "react";
import { Calendar, MapPin, Truck, Building2, ChevronDown } from "lucide-react";
import { Vehicle } from "@/types";
import { Button, Card } from "@/components/ui";
import { Loader } from "@/components/ui/Loader";
import { PickupTypeSelector } from "../shared";
import { PricingSummary } from "../shared";
import {
  DeliveryLocation,
  CityOption,
} from "@/services/deliveryLocations/deliveryLocationService";

// ============================================
// TYPES
// ============================================
type PickupType = "store" | "delivery";

interface DateSelectionStepProps {
  vehicle: Vehicle;
  pickupDate: string;
  months: number;
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
  // Other props
  additionalDriverCount: number;
  onPickupDateChange: (date: string) => void;
  onMonthsChange: (months: number) => void;
  onPickupTypeChange: (type: PickupType) => void;
  onContinue: () => void;
  isValid: boolean;
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
const DAYS_PER_MONTH = 30;
const MAX_RENTAL_MONTHS = 12;
const STORE_LOCATION_HINT = "Pick up your vehicle at our store location";
const PICKUP_DATE_HINT = "Select your preferred pickup date and time";

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString()}`;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function calculateReturnDate(pickupDate: string, months: number): string {
  if (!pickupDate) return "";
  const pickup = new Date(pickupDate);
  const returnDate = new Date(pickup);
  returnDate.setDate(returnDate.getDate() + months * DAYS_PER_MONTH);
  return returnDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getMinPickupDate(): string {
  return new Date().toISOString().slice(0, 16);
}

function formatLocationOption(location: DeliveryLocation): string {
  return `${location.name} - ${formatCurrency(location.deliveryFee)} delivery fee`;
}

function formatCityOption(city: CityOption): string {
  const locationText = pluralize(city.locationCount, "location", "locations");
  return `${city.city}, ${city.state} (${city.locationCount} ${locationText} - from ${formatCurrency(city.minFee)})`;
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
          <dd className="text-blue-600 text-xs mt-1 italic">{location.notes}</dd>
        </>
      )}

      <dt className="sr-only">Delivery fee</dt>
      <dd className="text-blue-800 font-semibold mt-2">
        Delivery Fee: {formatCurrency(deliveryFee)}
      </dd>
    </dl>
  </Card>
);

const ReturnDateCard: React.FC<{
  returnDate: string;
  totalDays: number;
}> = ({ returnDate, totalDays }) => {
  const cardId = useId();

  return (
    <Card variant="colored" padding="md">
      <div className="flex items-center gap-2 mb-2">
        <Calendar className="w-4 h-4 text-blue-600" aria-hidden="true" />
        <p id={cardId} className="text-sm font-medium text-blue-900">
          Return Date (Auto-calculated)
        </p>
      </div>
      <p className="text-blue-800 font-semibold" aria-labelledby={cardId}>
        {returnDate}
      </p>
      <p className="text-xs text-blue-700 mt-1">{totalDays} days from pickup date</p>
    </Card>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const DateSelectionStep: React.FC<DateSelectionStepProps> = ({
  vehicle,
  pickupDate,
  months,
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
  // Other props
  additionalDriverCount,
  onPickupDateChange,
  onMonthsChange,
  onPickupTypeChange,
  onContinue,
  isValid,
}) => {
  const baseId = useId();

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const minPickupDate = useMemo(() => getMinPickupDate(), []);

  const returnDate = useMemo(
    () => calculateReturnDate(pickupDate, months),
    [pickupDate, months]
  );

  const totalDays = useMemo(() => months * DAYS_PER_MONTH, [months]);

  const selectedLocation = useMemo(
    () => cityLocations.find((loc) => loc.id === deliveryLocationId),
    [cityLocations, deliveryLocationId]
  );

  const durationOptions = useMemo(() => {
    return Array.from({ length: MAX_RENTAL_MONTHS }, (_, index) => {
      const monthCount = index + 1;
      const monthText = pluralize(monthCount, "Month", "Months");
      const total = formatCurrency(vehicle.price * monthCount);
      return {
        value: monthCount,
        label: `${monthCount} ${monthText} (${total})`,
      };
    });
  }, [vehicle.price]);

  const hasNoCities = useMemo(
    () => availableCities.length === 0 && !loadingCities,
    [availableCities.length, loadingCities]
  );

  const hasNoLocationsInCity = useMemo(
    () => cityLocations.length === 0 && !loadingCityLocations && selectedCity,
    [cityLocations.length, loadingCityLocations, selectedCity]
  );

  // ============================================
  // HANDLERS
  // ============================================
  const handlePickupDateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onPickupDateChange(e.target.value);
    },
    [onPickupDateChange]
  );

  const handleMonthsChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      onMonthsChange(parseInt(e.target.value, 10));
    },
    [onMonthsChange]
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
      rentalDuration: `${baseId}-rental-duration`,
    }),
    [baseId]
  );

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="space-y-6">
      <header>
        <h3 id={ids.heading} className="text-lg font-semibold text-gray-900 mb-4">
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
                aria-describedby={hasNoCities ? ids.deliveryCityHint : undefined}
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
        </fieldset>
      )}

      {/* Date and Duration */}
      <fieldset className="grid md:grid-cols-2 gap-6">
        <legend className="sr-only">Pickup date and rental duration</legend>

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
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent"
              required
              aria-describedby={ids.pickupDateHint}
            />
          </div>
          <p id={ids.pickupDateHint} className="text-xs text-gray-500 mt-1">
            {PICKUP_DATE_HINT}
          </p>
        </div>

        {/* Rental Duration */}
        <div>
          <label
            htmlFor={ids.rentalDuration}
            className="block text-sm font-medium text-gray-600 mb-2"
          >
            Rental Duration
          </label>
          <div className="relative">
            <select
              id={ids.rentalDuration}
              value={months}
              onChange={handleMonthsChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent appearance-none bg-white pr-10"
              required
            >
              {durationOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <SelectChevron />
          </div>
        </div>
      </fieldset>

      {/* Auto-calculated Return Date */}
      {pickupDate && (
        <ReturnDateCard returnDate={returnDate} totalDays={totalDays} />
      )}

      {/* Pricing Summary */}
      {pickupDate && (
        <PricingSummary
          vehicle={vehicle}
          months={months}
          deliveryFee={deliveryFee}
          additionalDriverCount={additionalDriverCount}
          showDeposit
        />
      )}

      {/* Continue Button */}
      <Button
        type="button"
        onClick={handleContinue}
        disabled={!isValid}
        fullWidth
        aria-describedby={!isValid ? `${baseId}-validation-hint` : undefined}
      >
        Continue to Driver Details
      </Button>

      {!isValid && (
        <p id={`${baseId}-validation-hint`} className="sr-only">
          Please complete all required fields to continue
        </p>
      )}
    </div>
  );
};