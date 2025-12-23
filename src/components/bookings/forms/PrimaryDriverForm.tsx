import React, { useMemo, useCallback, useId } from "react";
import { User, Mail, Phone, Calendar, CreditCard, MapPin } from "lucide-react";
import { Input } from "@/components/ui";

// ============================================
// TYPES
// ============================================
export interface PrimaryDriverData {
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
}

interface PrimaryDriverFormProps {
  data: PrimaryDriverData;
  onChange: (field: keyof PrimaryDriverData, value: string) => void;
  disabled?: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const STATE_MAX_LENGTH = 2;
const ZIP_MAX_LENGTH = 5;

// ============================================
// COMPONENT
// ============================================
export const PrimaryDriverForm: React.FC<PrimaryDriverFormProps> = ({
  data,
  onChange,
  disabled = false,
}) => {
  // Generate unique IDs for accessibility
  const baseId = useId();
  const headingId = `${baseId}-heading`;

  // Memoize max date (today) for date of birth
  const maxDateOfBirth = useMemo(() => {
    return new Date().toISOString().split("T")[0];
  }, []);

  // ============================================
  // HANDLERS - Memoized to prevent unnecessary re-renders
  // ============================================
  const handleFirstNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange("firstName", e.target.value);
    },
    [onChange]
  );

  const handleLastNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange("lastName", e.target.value);
    },
    [onChange]
  );

  const handleEmailChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange("email", e.target.value);
    },
    [onChange]
  );

  const handlePhoneChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange("phone", e.target.value);
    },
    [onChange]
  );

  const handleDateOfBirthChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange("dateOfBirth", e.target.value);
    },
    [onChange]
  );

  const handleLicenseNumberChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange("driversLicenseNumber", e.target.value.toUpperCase());
    },
    [onChange]
  );

  const handleStreetAddressChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange("streetAddress", e.target.value);
    },
    [onChange]
  );

  const handleCityChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange("city", e.target.value);
    },
    [onChange]
  );

  const handleStateChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange("state", e.target.value.toUpperCase());
    },
    [onChange]
  );

  const handleZipCodeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange("zipCode", e.target.value);
    },
    [onChange]
  );

  return (
    <fieldset disabled={disabled} className="space-y-6">
      <legend id={headingId} className="text-lg font-semibold text-gray-900 mb-4">
        Primary Driver Information
      </legend>

      {/* Name Fields */}
      <div className="grid md:grid-cols-2 gap-6">
        <Input
          type="text"
          label="First Name"
          icon={<User className="w-5 h-5" aria-hidden="true" />}
          value={data.firstName}
          onChange={handleFirstNameChange}
          placeholder="John"
          autoComplete="given-name"
          required
          disabled={disabled}
        />
        <Input
          type="text"
          label="Last Name"
          icon={<User className="w-5 h-5" aria-hidden="true" />}
          value={data.lastName}
          onChange={handleLastNameChange}
          placeholder="Doe"
          autoComplete="family-name"
          required
          disabled={disabled}
        />
      </div>

      {/* Contact Fields */}
      <Input
        type="email"
        label="Email"
        icon={<Mail className="w-5 h-5" aria-hidden="true" />}
        value={data.email}
        onChange={handleEmailChange}
        placeholder="john.doe@example.com"
        autoComplete="email"
        required
        disabled={disabled}
      />

      <Input
        type="tel"
        label="Phone Number"
        icon={<Phone className="w-5 h-5" aria-hidden="true" />}
        value={data.phone}
        onChange={handlePhoneChange}
        placeholder="+1 (555) 123-4567"
        autoComplete="tel"
        required
        disabled={disabled}
      />

      {/* Date of Birth & License */}
      <div className="grid md:grid-cols-2 gap-6">
        <Input
          type="date"
          label="Date of Birth"
          icon={<Calendar className="w-5 h-5" aria-hidden="true" />}
          value={data.dateOfBirth}
          onChange={handleDateOfBirthChange}
          max={maxDateOfBirth}
          autoComplete="bday"
          required
          disabled={disabled}
        />
        <Input
          type="text"
          label="Driver's License Number"
          icon={<CreditCard className="w-5 h-5" aria-hidden="true" />}
          value={data.driversLicenseNumber}
          onChange={handleLicenseNumberChange}
          placeholder="DL123456"
          className="uppercase"
          autoComplete="off"
          required
          disabled={disabled}
        />
      </div>

      {/* Address Section */}
      <div className="space-y-6">
        <Input
          type="text"
          label="Street Address"
          icon={<MapPin className="w-5 h-5" aria-hidden="true" />}
          value={data.streetAddress}
          onChange={handleStreetAddressChange}
          placeholder="123 Main St"
          autoComplete="street-address"
          required
          disabled={disabled}
        />

        <div className="grid md:grid-cols-3 gap-6">
          <Input
            type="text"
            label="City"
            value={data.city}
            onChange={handleCityChange}
            placeholder="Denton"
            autoComplete="address-level2"
            required
            disabled={disabled}
          />
          <Input
            type="text"
            label="State"
            value={data.state}
            onChange={handleStateChange}
            placeholder="TX"
            maxLength={STATE_MAX_LENGTH}
            className="uppercase"
            autoComplete="address-level1"
            required
            disabled={disabled}
          />
          <Input
            type="text"
            label="ZIP Code"
            value={data.zipCode}
            onChange={handleZipCodeChange}
            placeholder="76201"
            maxLength={ZIP_MAX_LENGTH}
            autoComplete="postal-code"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            disabled={disabled}
          />
        </div>
      </div>
    </fieldset>
  );
};