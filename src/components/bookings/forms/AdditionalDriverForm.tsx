import React, { useCallback, useMemo, useId } from "react";
import { toBusinessDateString } from "@/utils/dates";
import { Trash2, Plus } from "lucide-react";
import { Card } from "@/components/ui";

// ============================================
// TYPES
// ============================================
export interface AdditionalDriverData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  driversLicenseNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  sameAddressAsPrimary: boolean;
}

interface AdditionalDriverFormProps {
  drivers: AdditionalDriverData[];
  onAdd: () => void;
  onRemove: (index: number) => void;
  onChange: (
    index: number,
    field: keyof AdditionalDriverData,
    value: string | boolean,
  ) => void;
  disabled?: boolean;
}

interface DriverCardProps {
  driver: AdditionalDriverData;
  index: number;
  baseId: string;
  maxDateOfBirth: string;
  onRemove: (index: number) => void;
  onChange: (
    index: number,
    field: keyof AdditionalDriverData,
    value: string | boolean,
  ) => void;
  disabled?: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const ADDITIONAL_DRIVER_FEE = 50;
const STATE_MAX_LENGTH = 2;
const ZIP_MAX_LENGTH = 5;

const INPUT_BASE_CLASSES =
  "w-full px-4 py-2 border border-gray-200 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed";

// ============================================
// SUB-COMPONENTS
// ============================================
const DriverCard: React.FC<DriverCardProps> = ({
  driver,
  index,
  baseId,
  maxDateOfBirth,
  onRemove,
  onChange,
  disabled = false,
}) => {
  const driverNumber = index + 1;
  const cardId = `${baseId}-driver-${index}`;
  const headingId = `${cardId}-heading`;
  const sameAddressId = `${cardId}-same-address`;

  // ============================================
  // HANDLERS
  // ============================================
  const handleRemove = useCallback(() => {
    onRemove(index);
  }, [onRemove, index]);

  const handleFirstNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, "firstName", e.target.value);
    },
    [onChange, index],
  );

  const handleLastNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, "lastName", e.target.value);
    },
    [onChange, index],
  );

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, "email", e.target.value);
    },
    [onChange, index],
  );

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, "phone", e.target.value);
    },
    [onChange, index],
  );

  const handleDateOfBirthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, "dateOfBirth", e.target.value);
    },
    [onChange, index],
  );

  const handleLicenseNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, "driversLicenseNumber", e.target.value.toUpperCase());
    },
    [onChange, index],
  );

  const handleSameAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, "sameAddressAsPrimary", e.target.checked);
    },
    [onChange, index],
  );

  const handleStreetAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, "streetAddress", e.target.value);
    },
    [onChange, index],
  );

  const handleCityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, "city", e.target.value);
    },
    [onChange, index],
  );

  const handleStateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, "state", e.target.value.toUpperCase());
    },
    [onChange, index],
  );

  const handleZipCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(index, "zipCode", e.target.value);
    },
    [onChange, index],
  );

  return (
    <Card
      variant="default"
      padding="md"
      className="space-y-4"
      role="group"
      aria-labelledby={headingId}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p id={headingId} className="text-sm font-medium text-gray-700">
          Additional Driver {driverNumber}
        </p>
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          aria-label={`Remove additional driver ${driverNumber}`}
          className="text-red-600 hover:text-red-700 p-1 rounded transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trash2 className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Name Fields */}
      <fieldset className="grid md:grid-cols-2 gap-4">
        <legend className="sr-only">Name for driver {driverNumber}</legend>
        <div>
          <label htmlFor={`${cardId}-firstName`} className="sr-only">
            First Name
          </label>
          <input
            id={`${cardId}-firstName`}
            type="text"
            value={driver.firstName}
            onChange={handleFirstNameChange}
            disabled={disabled}
            className={INPUT_BASE_CLASSES}
            placeholder="First Name"
            autoComplete="given-name"
            required
          />
        </div>
        <div>
          <label htmlFor={`${cardId}-lastName`} className="sr-only">
            Last Name
          </label>
          <input
            id={`${cardId}-lastName`}
            type="text"
            value={driver.lastName}
            onChange={handleLastNameChange}
            disabled={disabled}
            className={INPUT_BASE_CLASSES}
            placeholder="Last Name"
            autoComplete="family-name"
            required
          />
        </div>
      </fieldset>

      {/* Contact Fields */}
      <fieldset className="grid md:grid-cols-2 gap-4">
        <legend className="sr-only">
          Contact information for driver {driverNumber}
        </legend>
        <div>
          <label htmlFor={`${cardId}-email`} className="sr-only">
            Email
          </label>
          <input
            id={`${cardId}-email`}
            type="email"
            value={driver.email}
            onChange={handleEmailChange}
            disabled={disabled}
            className={INPUT_BASE_CLASSES}
            placeholder="Email"
            autoComplete="email"
            required
          />
        </div>
        <div>
          <label htmlFor={`${cardId}-phone`} className="sr-only">
            Phone
          </label>
          <input
            id={`${cardId}-phone`}
            type="tel"
            value={driver.phone}
            onChange={handlePhoneChange}
            disabled={disabled}
            className={INPUT_BASE_CLASSES}
            placeholder="Phone"
            autoComplete="tel"
            required
          />
        </div>
      </fieldset>

      {/* DOB & License */}
      <fieldset className="grid md:grid-cols-2 gap-4">
        <legend className="sr-only">
          Date of birth and license for driver {driverNumber}
        </legend>
        <div>
          <label htmlFor={`${cardId}-dob`} className="sr-only">
            Date of Birth
          </label>
          <input
            id={`${cardId}-dob`}
            type="date"
            value={driver.dateOfBirth}
            onChange={handleDateOfBirthChange}
            max={maxDateOfBirth}
            disabled={disabled}
            className={INPUT_BASE_CLASSES}
            autoComplete="bday"
            required
          />
        </div>
        <div>
          <label htmlFor={`${cardId}-license`} className="sr-only">
            Driver's License Number
          </label>
          <input
            id={`${cardId}-license`}
            type="text"
            value={driver.driversLicenseNumber}
            onChange={handleLicenseNumberChange}
            disabled={disabled}
            className={`${INPUT_BASE_CLASSES} uppercase`}
            placeholder="License Number"
            autoComplete="off"
            required
          />
        </div>
      </fieldset>

      {/* Same Address Checkbox */}
      <div className="flex items-center gap-2 py-2">
        <input
          type="checkbox"
          id={sameAddressId}
          checked={driver.sameAddressAsPrimary}
          onChange={handleSameAddressChange}
          disabled={disabled}
          className="w-4 h-4 text-gray-900 border-gray-300 rounded focus:ring-gray-900 focus:ring-offset-0"
        />
        <label
          htmlFor={sameAddressId}
          className="text-sm text-gray-700 cursor-pointer select-none"
        >
          Same address as primary driver
        </label>
      </div>

      {/* Address Fields */}
      <fieldset
        className="space-y-4"
        disabled={driver.sameAddressAsPrimary || disabled}
      >
        <legend className="sr-only">Address for driver {driverNumber}</legend>
        <div>
          <label htmlFor={`${cardId}-street`} className="sr-only">
            Street Address
          </label>
          <input
            id={`${cardId}-street`}
            type="text"
            value={driver.streetAddress}
            onChange={handleStreetAddressChange}
            className={INPUT_BASE_CLASSES}
            placeholder="Street Address"
            autoComplete="street-address"
            required={!driver.sameAddressAsPrimary}
          />
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label htmlFor={`${cardId}-city`} className="sr-only">
              City
            </label>
            <input
              id={`${cardId}-city`}
              type="text"
              value={driver.city}
              onChange={handleCityChange}
              className={INPUT_BASE_CLASSES}
              placeholder="City"
              autoComplete="address-level2"
              required={!driver.sameAddressAsPrimary}
            />
          </div>
          <div>
            <label htmlFor={`${cardId}-state`} className="sr-only">
              State
            </label>
            <input
              id={`${cardId}-state`}
              type="text"
              value={driver.state}
              onChange={handleStateChange}
              className={`${INPUT_BASE_CLASSES} uppercase`}
              placeholder="State"
              maxLength={STATE_MAX_LENGTH}
              autoComplete="address-level1"
              required={!driver.sameAddressAsPrimary}
            />
          </div>
          <div>
            <label htmlFor={`${cardId}-zip`} className="sr-only">
              ZIP Code
            </label>
            <input
              id={`${cardId}-zip`}
              type="text"
              value={driver.zipCode}
              onChange={handleZipCodeChange}
              className={INPUT_BASE_CLASSES}
              placeholder="ZIP Code"
              maxLength={ZIP_MAX_LENGTH}
              autoComplete="postal-code"
              inputMode="numeric"
              pattern="[0-9]*"
              required={!driver.sameAddressAsPrimary}
            />
          </div>
        </div>
      </fieldset>
    </Card>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const AdditionalDriverForm: React.FC<AdditionalDriverFormProps> = ({
  drivers,
  onAdd,
  onRemove,
  onChange,
  disabled = false,
}) => {
  const baseId = useId();

  // Memoize max date (today) for date of birth
  const maxDateOfBirth = useMemo(() => {
    return toBusinessDateString();
  }, []);

  // Memoized add handler
  const handleAdd = useCallback(() => {
    onAdd();
  }, [onAdd]);

  return (
    <div className="space-y-4" role="region" aria-label="Additional drivers">
      {drivers.length > 0 && (
        <ul
          className="space-y-4"
          role="list"
          aria-label="List of additional drivers"
        >
          {drivers.map((driver, index) => (
            <li key={`driver-${index}`}>
              <DriverCard
                driver={driver}
                index={index}
                baseId={baseId}
                maxDateOfBirth={maxDateOfBirth}
                onRemove={onRemove}
                onChange={onChange}
                disabled={disabled}
              />
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={handleAdd}
        disabled={disabled}
        aria-label={`Add another driver for $${ADDITIONAL_DRIVER_FEE}`}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900 focus-visible:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <Plus className="w-4 h-4" aria-hidden="true" />
        <span>Add Another Driver (+${ADDITIONAL_DRIVER_FEE})</span>
      </button>
    </div>
  );
};
