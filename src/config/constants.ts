// ============================================
// APP INFORMATION
// ============================================
export const APP_NAME = "4A Rentals";
export const APP_DESCRIPTION = "Premium car rental service with a wide selection of vehicles";
export const APP_URL = "https://4arentals.com";

// ============================================
// CONTACT INFORMATION
// ============================================
export const SUPPORT_EMAIL = "support@4arentals.com";
export const PHONE_NUMBER = "+1 (555) 123-4567";
export const PHONE_NUMBER_RAW = "+15551234567"; // For tel: links

// ============================================
// SOCIAL MEDIA (if applicable)
// ============================================
export const SOCIAL_LINKS = {
  FACEBOOK: "https://facebook.com/4arentals",
  TWITTER: "https://twitter.com/4arentals",
  INSTAGRAM: "https://instagram.com/4arentals",
  LINKEDIN: "https://linkedin.com/company/4arentals",
} as const;

// ============================================
// ROUTES
// ============================================
export const ROUTES = {
  HOME: "/",
  FLEET: "/fleet",
  BOOKINGS: "/my-bookings",
  BOOKING_DETAILS: "/my-bookings/:id",
  CONTACT: "/contact",
  PRIVACY: "/privacy-policy",
  TERMS: "/terms-of-service",
  NOT_FOUND: "/404",
} as const;

/** Type for valid route paths */
export type RoutePath = (typeof ROUTES)[keyof typeof ROUTES];

// ============================================
// VEHICLE CONFIGURATION
// ============================================
export const VEHICLE_STATUS = {
  AVAILABLE: "available",
  RENTED: "rented",
  MAINTENANCE: "maintenance",
} as const;

/** Type for vehicle status values */
export type VehicleStatus = (typeof VEHICLE_STATUS)[keyof typeof VEHICLE_STATUS];

export const VEHICLE_CATEGORIES = {
  ECONOMY: "economy",
  COMPACT: "compact",
  MIDSIZE: "midsize",
  FULLSIZE: "fullsize",
  SUV: "suv",
  LUXURY: "luxury",
  SPORTS: "sports",
  VAN: "van",
} as const;

/** Type for vehicle category values */
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[keyof typeof VEHICLE_CATEGORIES];

export const FUEL_TYPES = {
  GASOLINE: "gasoline",
  DIESEL: "diesel",
  ELECTRIC: "electric",
  HYBRID: "hybrid",
} as const;

/** Type for fuel type values */
export type FuelType = (typeof FUEL_TYPES)[keyof typeof FUEL_TYPES];

export const TRANSMISSION_TYPES = {
  AUTOMATIC: "automatic",
  MANUAL: "manual",
} as const;

/** Type for transmission values */
export type TransmissionType = (typeof TRANSMISSION_TYPES)[keyof typeof TRANSMISSION_TYPES];

// ============================================
// BOOKING CONFIGURATION
// ============================================
export const BOOKING_STATUS = {
  PENDING: "pending",
  CONFIRMED: "confirmed",
  IN_PROGRESS: "in_progress",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
} as const;

/** Type for booking status values */
export type BookingStatus = (typeof BOOKING_STATUS)[keyof typeof BOOKING_STATUS];

export const PICKUP_TYPES = {
  STORE: "store",
  DELIVERY: "delivery",
} as const;

/** Type for pickup type values */
export type PickupType = (typeof PICKUP_TYPES)[keyof typeof PICKUP_TYPES];

// ============================================
// PRICING
// ============================================
export const PRICING = {
  /** Fee per additional driver */
  ADDITIONAL_DRIVER_FEE: 50,
  /** Security deposit multiplier (months) */
  DEPOSIT_MONTHS: 1,
  /** Delivery fee for vehicle delivery */
  DELIVERY_FEE: 75,
  /** Days in a month for calculations */
  DAYS_PER_MONTH: 30,
  /** Maximum rental duration in months */
  MAX_RENTAL_MONTHS: 12,
  /** Currency code */
  CURRENCY: "USD",
  /** Currency symbol */
  CURRENCY_SYMBOL: "$",
} as const;

// ============================================
// VALIDATION LIMITS
// ============================================
export const VALIDATION = {
  /** Minimum age for primary driver */
  MIN_DRIVER_AGE: 21,
  /** Maximum additional drivers allowed */
  MAX_ADDITIONAL_DRIVERS: 3,
  /** State abbreviation length */
  STATE_MAX_LENGTH: 2,
  /** ZIP code length */
  ZIP_MAX_LENGTH: 5,
  /** Minimum password length */
  MIN_PASSWORD_LENGTH: 8,
  /** Maximum file upload size in bytes (5MB) */
  MAX_FILE_SIZE: 5 * 1024 * 1024,
} as const;

// ============================================
// UI CONFIGURATION
// ============================================
export const UI = {
  /** Number of vehicles per page in grid */
  VEHICLES_PER_PAGE: 12,
  /** Number of visible features on vehicle card */
  MAX_VISIBLE_FEATURES: 3,
  /** Debounce delay for search input (ms) */
  SEARCH_DEBOUNCE_MS: 300,
  /** Toast notification duration (ms) */
  TOAST_DURATION_MS: 5000,
  /** Animation duration (ms) */
  ANIMATION_DURATION_MS: 300,
} as const;

// ============================================
// DATE/TIME
// ============================================
export const DATE_FORMAT = {
  /** Display format for dates */
  DISPLAY: "MMM dd, yyyy",
  /** Format for date inputs */
  INPUT: "yyyy-MM-dd",
  /** Format with time */
  DISPLAY_WITH_TIME: "MMM dd, yyyy 'at' h:mm a",
} as const;

// ============================================
// ERROR MESSAGES
// ============================================
export const ERROR_MESSAGES = {
  GENERIC: "Something went wrong. Please try again.",
  NETWORK: "Unable to connect. Please check your internet connection.",
  UNAUTHORIZED: "Please sign in to continue.",
  NOT_FOUND: "The requested resource was not found.",
  VALIDATION: "Please check your input and try again.",
} as const;

// ============================================
// LOCAL STORAGE KEYS
// ============================================
export const STORAGE_KEYS = {
  AUTH_TOKEN: "4a_auth_token",
  USER_PREFERENCES: "4a_user_prefs",
  THEME: "4a_theme",
  RECENT_SEARCHES: "4a_recent_searches",
} as const;