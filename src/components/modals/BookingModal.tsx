/* eslint-disable @typescript-eslint/no-unused-vars */
import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { X, ArrowLeft } from "lucide-react";
import { Vehicle, BookingTotal } from "@/types";
import { useAuth } from "@/hooks/useAuth";
import {
  usePricing,
  useDateValidation,
  useBookingConfig,
  useAvailability,
} from "@/hooks";
import {
  deliveryLocationService,
  DeliveryLocation,
  CityOption,
} from "@/services/deliveryLocations/deliveryLocationService";
import { userProfileService } from "@/services/users/userProfileService";
import * as Sentry from "@sentry/react";

// Booking Components
import { VehicleSummary, ProgressSteps } from "@/components/bookings/shared";
import {
  DateSelectionStep,
  DriverInformationStep,
  BookingConfirmationStep,
} from "@/components/bookings/steps";
import {
  PrimaryDriverData,
  AdditionalDriverData,
} from "@/components/bookings/forms";

// ============================================
// TYPES
// ============================================
interface BookingModalProps {
  vehicle: Vehicle | null;
  isOpen: boolean;
  onClose: () => void;
}

interface BookingData {
  pickupDate: string;
  returnDate: string;
  isStudent: boolean;
  studentIdUrl: string | null;
  pickupType: "store" | "delivery";
  pickupLocation: string;
  deliveryTimeSlot: string | null;
  selectedCity: string;
  deliveryLocationId: string;
  deliveryFee: number;
  primaryDriver: PrimaryDriverData;
  additionalDrivers: AdditionalDriverData[];
}

// ============================================
// CONSTANTS
// ============================================
const STORAGE_KEY = "booking_driver_info";
const STORE_LOCATION = "Denton, Texas";
const PROFILE_SAVE_TIMEOUT_MS = 3000;

const INITIAL_PRIMARY_DRIVER: PrimaryDriverData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  dateOfBirth: "",
  driversLicenseNumber: "",
  streetAddress: "",
  city: "",
  state: "",
  zipCode: "",
};

const createInitialBookingData = (email: string): BookingData => ({
  pickupDate: "",
  returnDate: "",
  isStudent: false,
  studentIdUrl: null,
  pickupType: "store",
  pickupLocation: STORE_LOCATION,
  deliveryTimeSlot: null,
  selectedCity: "",
  deliveryLocationId: "",
  deliveryFee: 0,
  primaryDriver: {
    ...INITIAL_PRIMARY_DRIVER,
    email,
  },
  additionalDrivers: [],
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safe logging - dev only
 */
function logInfo(message: string, data?: unknown): void {
  if (import.meta.env.DEV) {
    console.log(`[BookingModal] ${message}`, data ?? "");
  }
}

function logError(context: string, error: unknown): void {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      tags: { component: "BookingModal", context },
    });
  } else {
    console.error(`[BookingModal] ${context}:`, error);
  }
}

function logWarning(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.warn(`[BookingModal] ${context}:`, error);
  }
}

/**
 * Load driver info from sessionStorage
 */
function loadDriverInfoFromStorage(): Partial<PrimaryDriverData> | null {
  try {
    const stored = sessionStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored) as Partial<PrimaryDriverData>;
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

/**
 * Save driver info to sessionStorage
 */
function saveDriverInfoToStorage(driver: PrimaryDriverData): void {
  try {
    // Only save non-sensitive fields
    const dataToSave: Partial<PrimaryDriverData> = {
      firstName: driver.firstName,
      lastName: driver.lastName,
      phone: driver.phone,
      dateOfBirth: driver.dateOfBirth,
      driversLicenseNumber: driver.driversLicenseNumber,
      streetAddress: driver.streetAddress,
      city: driver.city,
      state: driver.state,
      zipCode: driver.zipCode,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Clear driver info from sessionStorage
 */
function clearDriverInfoFromStorage(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

/**
 * Check if form has user-entered data
 */
function hasFormData(bookingData: BookingData): boolean {
  const { primaryDriver, pickupDate, additionalDrivers } = bookingData;

  const hasDriverData =
    primaryDriver.firstName.trim() !== "" ||
    primaryDriver.lastName.trim() !== "" ||
    primaryDriver.phone.trim() !== "" ||
    primaryDriver.dateOfBirth.trim() !== "" ||
    primaryDriver.driversLicenseNumber.trim() !== "" ||
    primaryDriver.streetAddress.trim() !== "";

  return hasDriverData || pickupDate !== "" || additionalDrivers.length > 0;
}

// ============================================
// COMPONENT
// ============================================
export const BookingModal: React.FC<BookingModalProps> = ({
  vehicle,
  isOpen,
  onClose,
}) => {
  // Refs
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Auth
  const { currentUser } = useAuth();

  // Config
  const { additionalDriverFee: driverFeePerPerson } = useBookingConfig();

  // State
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [showAdditionalDriver, setShowAdditionalDriver] = useState(false);
  const [bookingData, setBookingData] = useState<BookingData>(() =>
    createInitialBookingData(currentUser?.email || "")
  );

  // Delivery location state (two-step selection)
  const [availableCities, setAvailableCities] = useState<CityOption[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [cityLocations, setCityLocations] = useState<DeliveryLocation[]>([]);
  const [loadingCityLocations, setLoadingCityLocations] = useState(false);

  // ============================================
  // AVAILABILITY (blocked dates)
  // ============================================
  const {
    isDateBlocked,
    getBlockedReason,
    loading: availabilityLoading,
  } = useAvailability({
    vehicleId: vehicle?.id || null,
    enabled: isOpen,
  });

  // ============================================
  // DATE VALIDATION (using config values)
  // ============================================
  const dateValidation = useDateValidation({
    pickupDate: bookingData.pickupDate || null,
    returnDate: bookingData.returnDate || null,
  });

  // ============================================
  // PRICING (from database)
  // ============================================
  const {
    pricing,
    breakdown,
    loading: pricingLoading,
    error: pricingError,
  } = usePricing({
    vehicleId: vehicle?.id || null,
    pickupDate: bookingData.pickupDate || null,
    returnDate: bookingData.returnDate || null,
    isStudent: bookingData.isStudent,
    deliveryFee: bookingData.deliveryFee,
    additionalDrivers: bookingData.additionalDrivers.length,
    enabled: dateValidation.isValid,
  });

  // ============================================
  // MEMOIZED VALUES
  // ============================================

  const modalTitleId = "booking-modal-title";

  const handleClose = useCallback(() => {
    if (hasFormData(bookingData) && step > 1) {
      const confirmed = window.confirm(
        "You have unsaved booking information. Are you sure you want to close?"
      );
      if (!confirmed) return;
    }

    onClose();
    setStep(1);
    setError("");
  }, [bookingData, step, onClose]);

  const isStep1Valid = useMemo(() => {
    // Must have valid dates
    if (!dateValidation.isValid) return false;

    // Must have pricing loaded
    if (!pricing) return false;

    // Check pickup date is not on a closed day
    if (bookingData.pickupDate && isDateBlocked(bookingData.pickupDate)) {
      return false;
    }

    // Check return date is not on a closed day
    if (bookingData.returnDate && isDateBlocked(bookingData.returnDate)) {
      return false;
    }

    // Check if any date in range has a BOOKING conflict (not holidays)
    // Holidays in the middle of rental period are OK - customer already has the car
    if (bookingData.pickupDate && bookingData.returnDate) {
      const start = new Date(bookingData.pickupDate);
      const end = new Date(bookingData.returnDate);
      const current = new Date(start);

      while (current <= end) {
        const reason = getBlockedReason(current);
        // Only block if it's a booking conflict
        if (reason && reason.toLowerCase().includes("already booked")) {
          return false;
        }
        current.setDate(current.getDate() + 1);
      }
    }

    // For delivery, need city, location, AND time slot selected
    if (bookingData.pickupType === "delivery") {
      return (
        bookingData.selectedCity !== "" &&
        bookingData.deliveryLocationId !== "" &&
        bookingData.deliveryTimeSlot !== null
      );
    }

    return true;
  }, [
    dateValidation.isValid,
    pricing,
    bookingData.pickupDate,
    bookingData.returnDate,
    bookingData.pickupType,
    bookingData.selectedCity,
    bookingData.deliveryLocationId,
    bookingData.deliveryTimeSlot,
    isDateBlocked,
    getBlockedReason,
  ]);

  const isStep2Valid = useMemo(() => {
    const { primaryDriver } = bookingData;
    return (
      primaryDriver.firstName.trim() !== "" &&
      primaryDriver.lastName.trim() !== "" &&
      primaryDriver.email.trim() !== "" &&
      primaryDriver.phone.trim() !== "" &&
      primaryDriver.dateOfBirth.trim() !== "" &&
      primaryDriver.driversLicenseNumber.trim() !== "" &&
      primaryDriver.streetAddress.trim() !== "" &&
      primaryDriver.city.trim() !== "" &&
      primaryDriver.state.trim() !== "" &&
      primaryDriver.zipCode.trim() !== ""
    );
  }, [bookingData]);

  // ============================================
  // DATA FETCHING
  // ============================================

  const fetchAvailableCities = useCallback(async () => {
    try {
      setLoadingCities(true);
      setError("");

      const cities = await deliveryLocationService.getAvailableCities();
      setAvailableCities(cities);
    } catch (err) {
      logError("fetchAvailableCities", err);
      setError("Failed to load delivery cities. Please try again.");
    } finally {
      setLoadingCities(false);
    }
  }, []);

  const fetchLocationsByCity = useCallback(async (city: string) => {
    if (!city) {
      setCityLocations([]);
      return;
    }

    try {
      setLoadingCityLocations(true);

      const locations = await deliveryLocationService.getLocationsByCity(city);
      setCityLocations(locations);
    } catch (err) {
      logError("fetchLocationsByCity", err);
      setError("Failed to load delivery locations. Please try again.");
      setCityLocations([]);
    } finally {
      setLoadingCityLocations(false);
    }
  }, []);

  const fetchUserProfile = useCallback(async () => {
    if (!currentUser) return;

    try {
      const profile = await userProfileService.getProfile(currentUser.id);

      if (profile) {
        setBookingData((prev) => ({
          ...prev,
          primaryDriver: {
            firstName: profile.firstName || prev.primaryDriver.firstName,
            lastName: profile.lastName || prev.primaryDriver.lastName,
            email: currentUser.email || prev.primaryDriver.email,
            phone: profile.phone || prev.primaryDriver.phone,
            dateOfBirth: profile.dateOfBirth || prev.primaryDriver.dateOfBirth,
            driversLicenseNumber:
              profile.driversLicenseNumber ||
              prev.primaryDriver.driversLicenseNumber,
            streetAddress:
              profile.streetAddress || prev.primaryDriver.streetAddress,
            city: profile.city || prev.primaryDriver.city,
            state: profile.state || prev.primaryDriver.state,
            zipCode: profile.zipCode || prev.primaryDriver.zipCode,
          },
        }));
      }
    } catch (err) {
      logWarning("fetchUserProfile - continuing without profile", err);
    }
  }, [currentUser]);

  // ============================================
  // EFFECTS
  // ============================================

  // Fetch data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    // Load from sessionStorage first (persisted driver info)
    const storedDriverInfo = loadDriverInfoFromStorage();

    if (storedDriverInfo) {
      setBookingData((prev) => ({
        ...prev,
        primaryDriver: {
          ...prev.primaryDriver,
          ...storedDriverInfo,
          email: currentUser?.email || prev.primaryDriver.email,
        },
      }));
    }

    // Fetch available cities for delivery
    fetchAvailableCities();
    // Fetch user profile
    fetchUserProfile();
  }, [isOpen, fetchAvailableCities, fetchUserProfile, currentUser?.email]);

  // Fetch locations when city changes
  useEffect(() => {
    if (bookingData.selectedCity) {
      fetchLocationsByCity(bookingData.selectedCity);
    } else {
      setCityLocations([]);
    }
  }, [bookingData.selectedCity, fetchLocationsByCity]);

  // Save driver info to sessionStorage when it changes
  useEffect(() => {
    if (isOpen && hasFormData(bookingData)) {
      saveDriverInfoToStorage(bookingData.primaryDriver);
    }
  }, [isOpen, bookingData]);

  // Focus management
  useEffect(() => {
    if (isOpen && closeButtonRef.current) {
      closeButtonRef.current.focus();
    }
  }, [isOpen]);

  // Escape key handler
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

  // ============================================
  // HANDLERS
  // ============================================

  const handleStepBack = useCallback(() => {
    setStep((prev) => prev - 1);
  }, []);

  const handlePickupDateChange = useCallback((date: string) => {
    setBookingData((prev) => ({ ...prev, pickupDate: date }));
  }, []);

  const handleReturnDateChange = useCallback((date: string) => {
    setBookingData((prev) => ({ ...prev, returnDate: date }));
  }, []);

  const handleIsStudentChange = useCallback((isStudent: boolean) => {
    setBookingData((prev) => ({
      ...prev,
      isStudent,
      // Clear student ID if unchecked
      studentIdUrl: isStudent ? prev.studentIdUrl : null,
    }));
  }, []);

  const handlePickupTypeChange = useCallback((type: "store" | "delivery") => {
    setBookingData((prev) => ({
      ...prev,
      pickupType: type,
      pickupLocation: type === "store" ? STORE_LOCATION : "",
      deliveryTimeSlot: null,
      selectedCity: type === "store" ? "" : prev.selectedCity,
      deliveryLocationId: type === "store" ? "" : prev.deliveryLocationId,
      deliveryFee: type === "store" ? 0 : prev.deliveryFee,
    }));

    if (type === "store") {
      setCityLocations([]);
    }
  }, []);

  const handleCityChange = useCallback((city: string) => {
    setBookingData((prev) => ({
      ...prev,
      selectedCity: city,
      // Reset location when city changes
      deliveryLocationId: "",
      deliveryFee: 0,
      pickupLocation: "",
      deliveryTimeSlot: null,
    }));
  }, []);

  const handleDeliveryLocationChange = useCallback(
    (locationId: string) => {
      const location = cityLocations.find((loc) => loc.id === locationId);
      if (location) {
        setBookingData((prev) => ({
          ...prev,
          deliveryLocationId: locationId,
          deliveryFee: location.deliveryFee,
          pickupLocation: `${location.address}, ${location.city}, ${location.state} ${location.zipCode}`,
        }));
      } else {
        setBookingData((prev) => ({
          ...prev,
          deliveryLocationId: "",
          deliveryFee: 0,
          pickupLocation: "",
        }));
      }
    },
    [cityLocations]
  );

  const handleDeliveryTimeSlotChange = useCallback((timeSlot: string) => {
    setBookingData((prev) => ({
      ...prev,
      deliveryTimeSlot: timeSlot,
    }));
  }, []);

  const handlePrimaryDriverChange = useCallback(
    (field: keyof PrimaryDriverData, value: string) => {
      setBookingData((prev) => ({
        ...prev,
        primaryDriver: {
          ...prev.primaryDriver,
          [field]: value,
        },
      }));
    },
    []
  );

  const handleAddAdditionalDriver = useCallback(() => {
    setBookingData((prev) => ({
      ...prev,
      additionalDrivers: [
        ...prev.additionalDrivers,
        {
          firstName: "",
          lastName: "",
          email: "",
          phone: "",
          dateOfBirth: "",
          driversLicenseNumber: "",
          streetAddress: "",
          city: "",
          state: "",
          zipCode: "",
          sameAddressAsPrimary: false,
        },
      ],
    }));
  }, []);

  const handleRemoveAdditionalDriver = useCallback((index: number) => {
    setBookingData((prev) => ({
      ...prev,
      additionalDrivers: prev.additionalDrivers.filter((_, i) => i !== index),
    }));
  }, []);

  const handleUpdateAdditionalDriver = useCallback(
    (
      index: number,
      field: keyof AdditionalDriverData,
      value: string | boolean
    ) => {
      setBookingData((prev) => ({
        ...prev,
        additionalDrivers: prev.additionalDrivers.map((driver, i) => {
          if (i !== index) return driver;

          if (field === "sameAddressAsPrimary" && value === true) {
            return {
              ...driver,
              sameAddressAsPrimary: true,
              streetAddress: prev.primaryDriver.streetAddress,
              city: prev.primaryDriver.city,
              state: prev.primaryDriver.state,
              zipCode: prev.primaryDriver.zipCode,
            };
          }

          const addressFields = ["streetAddress", "city", "state", "zipCode"];
          if (addressFields.includes(field) && driver.sameAddressAsPrimary) {
            return {
              ...driver,
              [field]: value,
              sameAddressAsPrimary: false,
            };
          }

          return { ...driver, [field]: value };
        }),
      }));
    },
    []
  );

  const handleToggleAdditionalDriverSection = useCallback(() => {
    setShowAdditionalDriver((prev) => !prev);
  }, []);

  const handleContinueToStep2 = useCallback(() => {
    setStep(2);
  }, []);

  const handleContinueToStep3 = useCallback(() => {
    setStep(3);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!vehicle || !currentUser || !pricing) return;

    setLoading(true);
    setError("");

    try {
      logInfo("Starting booking submission");

      // Step 1: Save profile (with timeout, non-blocking)
      try {
        const profileSavePromise = userProfileService.upsertProfile(
          currentUser.id,
          {
            firstName: bookingData.primaryDriver.firstName,
            lastName: bookingData.primaryDriver.lastName,
            phone: bookingData.primaryDriver.phone,
            dateOfBirth: bookingData.primaryDriver.dateOfBirth,
            driversLicenseNumber:
              bookingData.primaryDriver.driversLicenseNumber,
            streetAddress: bookingData.primaryDriver.streetAddress,
            city: bookingData.primaryDriver.city,
            state: bookingData.primaryDriver.state,
            zipCode: bookingData.primaryDriver.zipCode,
          }
        );

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(
            () => reject(new Error("Profile save timeout")),
            PROFILE_SAVE_TIMEOUT_MS
          )
        );

        await Promise.race([profileSavePromise, timeoutPromise]);
        logInfo("Profile saved successfully");
      } catch (profileError) {
        logWarning("Profile save failed (continuing anyway)", profileError);
      }

      // Step 2: Get environment variables
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error(
          "Application configuration error. Please contact support."
        );
      }

      // Step 3: Build payload (using pricing from database)
      const payload = {
        userId: currentUser.id,
        vehicleId: vehicle.id,
        vehicleName: vehicle.name,
        vehicleImage: Array.isArray(vehicle.image)
          ? vehicle.image[0]
          : vehicle.image,
        // Pickup details
        pickupType: bookingData.pickupType,
        pickupLocation: bookingData.pickupLocation,
        deliveryLocationId:
          bookingData.pickupType === "delivery"
            ? bookingData.deliveryLocationId
            : null,
        deliveryFee: pricing.deliveryFee,
        deliveryTimeSlot: bookingData.deliveryTimeSlot,
        // Dates
        pickupDate: new Date(bookingData.pickupDate).toISOString(),
        returnDate: new Date(bookingData.returnDate).toISOString(),
        // Rental details (from database pricing)
        rentalDays: pricing.rentalDays,
        rentalType: pricing.rentalType,
        pricingMethod: pricing.pricingMethod,
        dailyRate: pricing.dailyRate,
        weeklyRate: pricing.weeklyRate,
        monthlyRate: pricing.monthlyRate,
        // Amounts (from database pricing)
        rentalAmount: pricing.rentalAmount,
        securityDeposit: pricing.securityDeposit,
        additionalDriverFee: pricing.additionalDriverFee,
        totalAmount: pricing.totalDueNow,
        // Student info
        isStudentBooking: bookingData.isStudent,
        studentIdUrl: bookingData.studentIdUrl,
        // Customer info
        customerEmail: bookingData.primaryDriver.email,
        primaryDriver: {
          ...bookingData.primaryDriver,
          isAccountHolder: true,
        },
        additionalDrivers: bookingData.additionalDrivers.map((driver) => {
          const { sameAddressAsPrimary, ...driverData } = driver;
          return driverData;
        }),
      };

      // Step 4: Make API call
      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-checkout-session`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${supabaseKey}`,
            apikey: supabaseKey,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        logError("Checkout session creation failed", {
          status: response.status,
          errorText,
        });
        throw new Error("Failed to create booking. Please try again.");
      }

      const data = await response.json();

      if (data?.url) {
        // Clear stored driver info on successful booking
        clearDriverInfoFromStorage();
        // Redirect to checkout
        window.location.href = data.url;
      } else {
        throw new Error("Unable to proceed to payment. Please try again.");
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Booking failed. Please try again.";

      setError(errorMessage);
      logError("handleSubmit", err);
      setLoading(false);
    }
  }, [vehicle, currentUser, bookingData, pricing]);

  // ============================================
  // RENDER
  // ============================================

  if (!isOpen || !vehicle) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={modalTitleId}
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
      >
        {/* Header */}
        <header className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {step > 1 && step < 4 && (
                <button
                  type="button"
                  onClick={handleStepBack}
                  aria-label="Go back to previous step"
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 rounded-lg p-1"
                  disabled={loading}
                >
                  <ArrowLeft className="w-5 h-5" aria-hidden="true" />
                </button>
              )}
              <h2
                id={modalTitleId}
                className="text-xl font-semibold text-gray-900"
              >
                Book {vehicle.name}
              </h2>
            </div>
            <button
              ref={closeButtonRef}
              type="button"
              onClick={handleClose}
              aria-label="Close booking modal"
              className="text-gray-400 hover:text-gray-600 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 rounded-lg p-1"
              disabled={loading}
            >
              <X className="w-5 h-5" aria-hidden="true" />
            </button>
          </div>

          {/* Progress Steps */}
          {step < 4 && (
            <nav aria-label="Booking progress">
              <ProgressSteps currentStep={step} />
            </nav>
          )}
        </header>

        {/* Vehicle Summary */}
        {step < 4 && <VehicleSummary vehicle={vehicle} />}

        <form onSubmit={(e) => e.preventDefault()} className="p-6" noValidate>
          {/* Error Display */}
          {error && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm"
            >
              {error}
            </div>
          )}

          {/* Pricing Error */}
          {pricingError && (
            <div
              role="alert"
              className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-3 rounded-lg mb-6 text-sm"
            >
              {pricingError}
            </div>
          )}

          {/* Step 1: Date Selection */}
          {step === 1 && (
            <DateSelectionStep
              vehicle={vehicle}
              pickupDate={bookingData.pickupDate}
              returnDate={bookingData.returnDate}
              isStudent={bookingData.isStudent}
              pickupType={bookingData.pickupType}
              pickupLocation={bookingData.pickupLocation}
              // City selection
              availableCities={availableCities}
              loadingCities={loadingCities}
              selectedCity={bookingData.selectedCity}
              onCityChange={handleCityChange}
              // Location selection
              cityLocations={cityLocations}
              loadingCityLocations={loadingCityLocations}
              deliveryLocationId={bookingData.deliveryLocationId}
              deliveryFee={bookingData.deliveryFee}
              onDeliveryLocationChange={handleDeliveryLocationChange}
              // Delivery time slot
              deliveryTimeSlot={bookingData.deliveryTimeSlot}
              onDeliveryTimeSlotChange={handleDeliveryTimeSlotChange}
              // Date handlers
              onPickupDateChange={handlePickupDateChange}
              onReturnDateChange={handleReturnDateChange}
              onIsStudentChange={handleIsStudentChange}
              onPickupTypeChange={handlePickupTypeChange}
              // Validation
              dateValidation={dateValidation}
              // Availability (NEW!)
              isDateBlocked={isDateBlocked}
              getBlockedReason={getBlockedReason}
              availabilityLoading={availabilityLoading}
              // Pricing
              pricing={pricing}
              pricingLoading={pricingLoading}
              // Additional drivers
              additionalDriverCount={bookingData.additionalDrivers.length}
              // Actions
              onContinue={handleContinueToStep2}
              isValid={isStep1Valid}
            />
          )}

          {/* Step 2: Driver Information */}
          {step === 2 && (
            <DriverInformationStep
              primaryDriver={bookingData.primaryDriver}
              additionalDrivers={bookingData.additionalDrivers}
              showAdditionalDriver={showAdditionalDriver}
              onPrimaryDriverChange={handlePrimaryDriverChange}
              onAdditionalDriverChange={handleUpdateAdditionalDriver}
              onAddDriver={handleAddAdditionalDriver}
              onRemoveDriver={handleRemoveAdditionalDriver}
              onToggleAdditionalDriverSection={
                handleToggleAdditionalDriverSection
              }
              onContinue={handleContinueToStep3}
              isValid={isStep2Valid}
            />
          )}

          {/* Step 3: Confirmation */}
          {step === 3 && pricing && (
            <BookingConfirmationStep
              vehicle={vehicle}
              pickupDate={bookingData.pickupDate}
              returnDate={bookingData.returnDate}
              pickupType={bookingData.pickupType}
              pickupLocation={bookingData.pickupLocation}
              isStudent={bookingData.isStudent}
              pricing={pricing}
              primaryDriver={bookingData.primaryDriver}
              additionalDrivers={bookingData.additionalDrivers}
              loading={loading}
              onSubmit={handleSubmit}
            />
          )}
        </form>
      </div>
    </div>
  );
};
