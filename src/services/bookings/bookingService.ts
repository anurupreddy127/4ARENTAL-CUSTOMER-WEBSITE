/* eslint-disable @typescript-eslint/no-explicit-any */
// services/bookings/bookingService.ts (CUSTOMER PORTAL - Fixed Types)
import { supabase } from "@/config/supabase";
import type {
  Booking,
  BookingStatus,
  PaymentStatus,
  PickupPhotos,
} from "@/types";
import { z } from "zod";
import * as Sentry from "@sentry/react";

// ============================================
// INPUT VALIDATION SCHEMAS
// ============================================
const uuidSchema = z.string().uuid("Invalid ID format");

const customerInfoSchema = z.object({
  firstName: z.string().min(1).max(50).trim(),
  lastName: z.string().min(1).max(50).trim(),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(5).max(20).trim(),
});

const createBookingSchema = z.object({
  userId: z.string().uuid(),
  vehicleId: z.string().uuid(),
  pickupLocation: z.string().min(1).max(200).trim(),
  pickupType: z.enum(["store", "delivery"]),
  deliveryLocationId: z.string().uuid().nullable().optional(),
  deliveryFee: z.number().min(0).max(10000).optional().default(0),
  additionalDriverFee: z.number().min(0).max(10000).optional().default(0),
  pickupDate: z.string().min(1),
  returnDate: z.string().min(1),
  rentalMonths: z.number().min(1).max(24),
  rentalAmount: z.number().min(0).max(1000000),
  securityDeposit: z.number().min(0).max(100000),
  totalPrice: z.number().min(0).max(1000000),
  status: z.enum([
    "pending",
    "confirmed",
    "active",
    "inspection",
    "completed",
    "cancelled",
  ]),
  customerInfo: customerInfoSchema,
});

// ============================================
// DATABASE ROW TYPE
// ============================================
interface BookingRow {
  id: string;
  user_id: string;
  vehicle_id: string;
  pickup_location: string;
  pickup_type: string;
  delivery_location_id: string | null;
  delivery_fee: string | number;
  additional_driver_fee: string | number | null;
  pickup_date: string;
  return_date: string;
  rental_months: number;
  rental_amount: string | number;
  security_deposit: string | number;
  total_price: string | number;
  status: string;
  payment_status: string;
  customer_info: string | CustomerInfo | null;
  drivers_license: string | null;
  actual_pickup_date: string | null;
  actual_return_date: string | null;
  extension_count: number;
  pickup_mileage: number | null;
  return_mileage: number | null;
  pickup_photos: string | PickupPhotos | null;
  admin_notes: string | null;
  security_deposit_deduction: string | number;
  security_deposit_amount_returned: string | number;
  security_deposit_returned: boolean;
  security_deposit_return_date: string | null;
  deduction_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safely parse a numeric value from string or number
 */
function parseNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Safely parse customer info JSON
 */
function parseCustomerInfo(
  value: string | CustomerInfo | null | undefined
): CustomerInfo {
  const defaultInfo: CustomerInfo = {
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  };

  if (value === null || value === undefined) return defaultInfo;

  if (typeof value === "object") {
    return {
      firstName: value.firstName || "",
      lastName: value.lastName || "",
      email: value.email || "",
      phone: value.phone || "",
    };
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      return {
        firstName: (parsed.firstName as string) || "",
        lastName: (parsed.lastName as string) || "",
        email: (parsed.email as string) || "",
        phone: (parsed.phone as string) || "",
      };
    } catch {
      return defaultInfo;
    }
  }

  return defaultInfo;
}

/**
 * Safely parse pickup photos JSON
 */
function parsePickupPhotos(
  value: string | PickupPhotos | null | undefined
): PickupPhotos | null {
  if (value === null || value === undefined) return null;

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value) as PickupPhotos;
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Maps database row to Booking type
 */
function mapBookingFromDB(row: any): Booking {
  // Map primary driver if exists (it's a single object, not an array)
  const primaryDriver = row.primary_drivers
    ? {
        id: row.primary_drivers.id,
        bookingId: row.primary_drivers.booking_id,
        userId: row.primary_drivers.user_id,
        firstName: row.primary_drivers.first_name,
        lastName: row.primary_drivers.last_name,
        email: row.primary_drivers.email,
        phone: row.primary_drivers.phone,
        driversLicense: row.primary_drivers.drivers_license,
        dateOfBirth: row.primary_drivers.date_of_birth,
        streetAddress: row.primary_drivers.street_address || "",
        city: row.primary_drivers.city || "",
        state: row.primary_drivers.state || "",
        zipCode: row.primary_drivers.zip_code || "",
        isAccountHolder: row.primary_drivers.is_account_holder || false,
        isVerified: row.primary_drivers.is_verified || false,
        verifiedBy: row.primary_drivers.verified_by,
        verifiedAt: row.primary_drivers.verified_at,
        notes: row.primary_drivers.notes || "",
        createdAt: new Date(row.primary_drivers.created_at),
        updatedAt: new Date(row.primary_drivers.updated_at),
      }
    : undefined;

  // Map additional drivers if exist
  const additionalDrivers =
    row.additional_drivers?.map((driver: any) => ({
      id: driver.id,
      bookingId: driver.booking_id,
      userId: driver.user_id,
      firstName: driver.first_name,
      lastName: driver.last_name,
      email: driver.email,
      phone: driver.phone,
      driversLicense: driver.drivers_license,
      dateOfBirth: driver.date_of_birth,
      streetAddress: driver.street_address || "",
      city: driver.city || "",
      state: driver.state || "",
      zipCode: driver.zip_code || "",
      isVerified: driver.is_verified || false,
      verifiedBy: driver.verified_by,
      verifiedAt: driver.verified_at,
      notes: driver.notes || "",
      createdAt: new Date(driver.created_at),
      updatedAt: new Date(driver.updated_at),
    })) || [];

  // Map vehicle if exists
  const vehicle = row.vehicles
    ? {
        id: row.vehicles.id,
        name: row.vehicles.name,
        category: row.vehicles.category,
        price: row.vehicles.price,
        image: row.vehicles.image,
        features: row.vehicles.features || [],
        status: row.vehicles.status,
        specifications: row.vehicles.specifications || {},
      }
    : undefined;

  return {
    id: row.id,

    // Booking number
    bookingNumber: row.booking_number || null,

    // User and vehicle
    userId: row.user_id,
    vehicleId: row.vehicle_id,

    // Pickup location and type
    pickupLocation: row.pickup_location,
    pickupType: (row.pickup_type as "store" | "delivery") || "store",
    deliveryLocationId: row.delivery_location_id || null,
    deliveryFee: parseNumber(row.delivery_fee),
    deliveryTimeSlot: row.delivery_time_slot || null,

    // Rental type and pricing
    rentalType:
      (row.rental_type as "weekly" | "monthly" | "semester") || "weekly",
    rentalDays: row.rental_days || null,
    pricingMethod: row.pricing_method || null,
    dailyRate: parseNumber(row.daily_rate),
    weeklyRate: parseNumber(row.weekly_rate),
    monthlyRate: parseNumber(row.monthly_rate),

    // Dates
    pickupDate: row.pickup_date,
    returnDate: row.return_date,

    // Legacy field (for backward compatibility)
    rentalMonths: row.rental_months || 1,

    // Pricing
    rentalAmount: parseNumber(row.rental_amount),
    additionalDriverFee: parseNumber(row.additional_driver_fee),
    securityDeposit: parseNumber(row.security_deposit),
    totalPrice: parseNumber(row.total_price),

    // Status
    status: row.status as BookingStatus,
    paymentStatus: (row.payment_status || "pending") as PaymentStatus,

    // Customer info
    customerInfo: parseCustomerInfo(row.customer_info),
    driversLicense: row.drivers_license || undefined,

    // Student booking
    isStudentBooking: row.is_student_booking || false,
    studentIdUrl: row.student_id_url || null,
    studentVerified: row.student_verified || false,
    studentVerifiedBy: row.student_verified_by || null,
    studentVerifiedAt: row.student_verified_at || null,

    // Insurance
    insuranceUploaded: row.insurance_uploaded || false,
    insuranceUploadedAt: row.insurance_uploaded_at || null,
    insuranceUrl: row.insurance_url || null,
    insuranceCompany: row.insurance_company || null,
    insurancePolicyNumber: row.insurance_policy_number || null,
    insuranceVerified: row.insurance_verified || false,
    insuranceVerifiedBy: row.insurance_verified_by || null,
    insuranceVerifiedAt: row.insurance_verified_at || null,

    // Extensions
    parentBookingId: row.parent_booking_id || null,
    extensionNumber: row.extension_number || 0,
    extensionCount: row.extension_count || 0,

    // Actual dates and mileage
    actualPickupDate: row.actual_pickup_date || null,
    actualReturnDate: row.actual_return_date || null,
    pickupMileage: row.pickup_mileage || null,
    returnMileage: row.return_mileage || null,

    // Photos and notes
    pickupPhotos: parsePickupPhotos(row.pickup_photos),
    adminNotes: row.admin_notes || "",

    // Security deposit return
    securityDepositDeduction: parseNumber(row.security_deposit_deduction),
    securityDepositAmountReturned: parseNumber(
      row.security_deposit_amount_returned
    ),
    securityDepositReturned: row.security_deposit_returned || false,
    securityDepositReturnDate: row.security_deposit_return_date || null,
    deductionReason: row.deduction_reason || "",

    // Cancellation
    cancelledAt: row.cancelled_at || null,
    cancelledBy: row.cancelled_by || null,
    cancellationReason: row.cancellation_reason || null,
    cancellationFeeApplied: parseNumber(row.cancellation_fee_applied),

    // Payment
    stripePaymentIntentId: row.stripe_payment_intent_id || null,
    paidAt: row.paid_at || null,

    // Config snapshot
    configSnapshot: row.config_snapshot || null,

    // Timestamps
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),

    // Joined data
    vehicle,
    primaryDriver,
    additionalDrivers,
  };
}

/**
 * Safe error logging
 */
function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[bookingService] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "bookingService", context },
    });
  }
}

/**
 * Safe info logging (dev only)
 */
function logInfo(message: string): void {
  if (import.meta.env.DEV) {
    console.log(`[bookingService] ${message}`);
  }
}

/**
 * Creates user-friendly error messages
 */
function createUserError(context: string): Error {
  const messages: Record<string, string> = {
    createBooking: "Unable to create booking. Please try again.",
    getUserBookings: "Unable to load your bookings. Please try again.",
    getBooking: "Unable to load booking details.",
    cancelBooking: "Unable to cancel booking. Please try again.",
    unauthorized: "You are not authorized to perform this action.",
    notAuthenticated: "Please log in to continue.",
    bookingNotFound: "Booking not found.",
    alreadyCancelled: "This booking has already been cancelled.",
    cannotCancel: "This booking cannot be cancelled.",
    timeout: "Request timed out. Please try again.",
  };
  return new Error(messages[context] || "An unexpected error occurred.");
}

/**
 * Check if error is a user-friendly error
 */
function isUserError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Unable to") ||
      error.message.includes("not authorized") ||
      error.message.includes("Please log in") ||
      error.message.includes("not found") ||
      error.message.includes("cannot be") ||
      error.message.includes("already been") ||
      error.message.includes("timed out"))
  );
}

/**
 * Get current session (uses cached session, doesn't make API call)
 * This is faster and more reliable than getUser()
 */
async function getSessionUser(): Promise<{ id: string; email: string } | null> {
  try {
    logInfo("Getting session...");
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      logError("getSessionUser", error);
      return null;
    }

    if (!session?.user) {
      logInfo("No session found");
      return null;
    }

    logInfo(`Session found for user: ${session.user.id}`);
    return {
      id: session.user.id,
      email: session.user.email || "",
    };
  } catch (error) {
    logError("getSessionUser", error);
    return null;
  }
}

// ============================================
// BOOKING SERVICE (CUSTOMER PORTAL)
// ============================================
export const bookingService = {
  /**
   * Create a new booking
   * Requires authentication
   */
  async createBooking(
    bookingData: Omit<
      Booking,
      | "id"
      | "createdAt"
      | "updatedAt"
      | "paymentStatus"
      | "actualPickupDate"
      | "actualReturnDate"
      | "extensionCount"
      | "pickupMileage"
      | "returnMileage"
      | "pickupPhotos"
      | "adminNotes"
      | "securityDepositDeduction"
      | "securityDepositAmountReturned"
      | "securityDepositReturned"
      | "securityDepositReturnDate"
      | "deductionReason"
      | "primaryDriver"
      | "additionalDrivers"
    >
  ): Promise<string> {
    try {
      // Verify user is authenticated (use session, not getUser API call)
      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        throw createUserError("notAuthenticated");
      }

      // Verify user is creating booking for themselves
      if (bookingData.userId !== sessionUser.id) {
        logError("createBooking - user mismatch", {
          requestUserId: bookingData.userId,
          currentUserId: sessionUser.id,
        });
        throw createUserError("unauthorized");
      }

      // Validate input data
      const validated = createBookingSchema.parse(bookingData);

      // Prepare payload for database
      const payload = {
        user_id: validated.userId,
        vehicle_id: validated.vehicleId,
        pickup_location: validated.pickupLocation,
        pickup_type: validated.pickupType,
        delivery_location_id: validated.deliveryLocationId || null,
        delivery_fee: validated.deliveryFee.toString(),
        additional_driver_fee: validated.additionalDriverFee.toString(),
        pickup_date: validated.pickupDate,
        return_date: validated.returnDate,
        rental_months: validated.rentalMonths,
        rental_amount: validated.rentalAmount.toString(),
        security_deposit: validated.securityDeposit.toString(),
        total_price: validated.totalPrice.toString(),
        status: validated.status,
        payment_status: "pending",
        customer_info: JSON.stringify(validated.customerInfo),
      };

      logInfo("Creating booking...");

      const { data, error } = await supabase
        .from("bookings")
        .insert([payload])
        .select("id")
        .single();

      if (error) {
        logError("createBooking", error);
        if (error.code === "42501") {
          throw createUserError("unauthorized");
        }
        throw createUserError("createBooking");
      }

      if (!data?.id) {
        throw createUserError("createBooking");
      }

      logInfo(`Booking created: ${data.id}`);
      return data.id;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logError("createBooking - validation failed", error);
        throw new Error(`Invalid booking data: ${error.issues[0]?.message}`);
      }
      if (isUserError(error)) {
        throw error;
      }
      logError("createBooking", error);
      throw createUserError("createBooking");
    }
  },

  /**
   * Get current user's bookings
   * Requires authentication - RLS enforces user can only see their own bookings
   */
  async getMyBookings(): Promise<Booking[]> {
    try {
      logInfo("Fetching user bookings...");

      // Check session first (quick, uses cached data)
      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        logInfo("No authenticated session, returning empty array");
        return [];
      }

      logInfo(`Querying bookings for user: ${sessionUser.id}`);

      const { data, error } = await supabase
        .from("bookings")
        .select(
          `
    *,
    vehicles:vehicle_id (
      id,
      name,
      category,
      price,
      image,
      features,
      status,
      specifications
    ),
    primary_drivers:primary_drivers!booking_id (
      id,
      booking_id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      drivers_license,
      date_of_birth,
      street_address,
      city,
      state,
      zip_code,
      is_account_holder,
      is_verified,
      verified_by,
      verified_at,
      notes,
      created_at,
      updated_at
    ),
    additional_drivers:additional_drivers!booking_id (
      id,
      booking_id,
      user_id,
      first_name,
      last_name,
      email,
      phone,
      drivers_license,
      date_of_birth,
      street_address,
      city,
      state,
      zip_code,
      is_verified,
      verified_by,
      verified_at,
      notes,
      created_at,
      updated_at
    )
  `
        )
        .eq("user_id", sessionUser.id)
        .order("created_at", { ascending: false });

      if (error) {
        logError("getMyBookings", error);

        // Check for auth-related errors
        if (error.code === "PGRST301" || error.message?.includes("JWT")) {
          logInfo("Auth error, returning empty array");
          return [];
        }

        throw createUserError("getUserBookings");
      }

      logInfo(`Found ${data?.length || 0} bookings`);
      if (data && data.length > 0) {
        console.log("🔍 First booking data:", data[0]);
        console.log("🚗 Vehicle data:", data[0].vehicles);
        console.log("👤 Primary driver data:", data[0].primary_drivers);
        console.log("👥 Additional drivers data:", data[0].additional_drivers);
      }
      return (data || []).map((row) => mapBookingFromDB(row as BookingRow));
    } catch (error) {
      if (isUserError(error)) {
        throw error;
      }

      logError("getMyBookings", error);
      throw createUserError("getUserBookings");
    }
  },

  /**
   * Get a single booking by ID
   * Requires authentication and ownership verification via RLS
   */
  async getBooking(id: string): Promise<Booking | null> {
    try {
      const validatedId = uuidSchema.parse(id);

      logInfo(`Fetching booking: ${validatedId}`);

      const { data, error } = await supabase
        .from("bookings")
        .select("*")
        .eq("id", validatedId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          // Not found (could be doesn't exist or RLS blocked it)
          return null;
        }
        logError("getBooking", error);
        throw createUserError("getBooking");
      }

      if (!data) {
        return null;
      }

      logInfo(`Booking found: ${data.id}`);
      return mapBookingFromDB(data as BookingRow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return null;
      }
      if (isUserError(error)) {
        throw error;
      }
      logError("getBooking", error);
      throw createUserError("getBooking");
    }
  },

  /**
   * Cancel a booking
   * Requires authentication and ownership verification
   * Only pending or confirmed bookings can be cancelled
   */
  async cancelBooking(id: string): Promise<void> {
    try {
      const validatedId = uuidSchema.parse(id);

      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        throw createUserError("notAuthenticated");
      }

      logInfo(`Cancelling booking: ${validatedId}`);

      // Get booking and verify ownership (RLS will enforce this)
      const { data: booking, error: fetchError } = await supabase
        .from("bookings")
        .select("user_id, status")
        .eq("id", validatedId)
        .single();

      if (fetchError) {
        if (fetchError.code === "PGRST116") {
          throw createUserError("bookingNotFound");
        }
        logError("cancelBooking - fetch", fetchError);
        throw createUserError("cancelBooking");
      }

      if (!booking) {
        throw createUserError("bookingNotFound");
      }

      // Verify ownership
      if (booking.user_id !== sessionUser.id) {
        logError("cancelBooking - unauthorized", {
          bookingUserId: booking.user_id,
          currentUserId: sessionUser.id,
        });
        throw createUserError("unauthorized");
      }

      // Check if booking can be cancelled
      if (booking.status === "cancelled") {
        throw createUserError("alreadyCancelled");
      }

      if (!["pending", "confirmed"].includes(booking.status)) {
        throw createUserError("cannotCancel");
      }

      // Update booking status
      const { error: updateError } = await supabase
        .from("bookings")
        .update({ status: "cancelled" })
        .eq("id", validatedId)
        .eq("user_id", sessionUser.id); // Extra safety

      if (updateError) {
        logError("cancelBooking - update", updateError);
        if (updateError.code === "42501") {
          throw createUserError("unauthorized");
        }
        throw createUserError("cancelBooking");
      }

      logInfo(`Booking cancelled: ${validatedId}`);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw createUserError("bookingNotFound");
      }
      if (isUserError(error)) {
        throw error;
      }
      logError("cancelBooking", error);
      throw createUserError("cancelBooking");
    }
  },

  /**
   * Get booking statistics for current user
   */
  async getMyBookingStats(): Promise<{
    total: number;
    pending: number;
    active: number;
    completed: number;
    cancelled: number;
  }> {
    try {
      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        return { total: 0, pending: 0, active: 0, completed: 0, cancelled: 0 };
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("status")
        .eq("user_id", sessionUser.id);

      if (error) {
        logError("getMyBookingStats", error);
        throw createUserError("getUserBookings");
      }

      const bookings = data || [];

      return {
        total: bookings.length,
        pending: bookings.filter((b) => b.status === "pending").length,
        active: bookings.filter(
          (b) =>
            b.status === "active" ||
            b.status === "confirmed" ||
            b.status === "inspection"
        ).length,
        completed: bookings.filter((b) => b.status === "completed").length,
        cancelled: bookings.filter((b) => b.status === "cancelled").length,
      };
    } catch (error) {
      if (isUserError(error)) {
        throw error;
      }
      logError("getMyBookingStats", error);
      throw createUserError("getUserBookings");
    }
  },

  /**
   * Check if user has an active booking for a vehicle
   */
  async hasActiveBookingForVehicle(vehicleId: string): Promise<boolean> {
    try {
      const validatedVehicleId = uuidSchema.parse(vehicleId);

      const sessionUser = await getSessionUser();
      if (!sessionUser) {
        return false;
      }

      const { data, error } = await supabase
        .from("bookings")
        .select("id")
        .eq("user_id", sessionUser.id)
        .eq("vehicle_id", validatedVehicleId)
        .in("status", ["pending", "confirmed", "active", "inspection"])
        .limit(1);

      if (error) {
        logError("hasActiveBookingForVehicle", error);
        return false;
      }

      return (data?.length || 0) > 0;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return false;
      }
      logError("hasActiveBookingForVehicle", error);
      return false;
    }
  },

  // ============================================
  // BACKWARD COMPATIBILITY (DEPRECATED)
  // ============================================

  /**
   * @deprecated Use getMyBookings() instead
   */
  async getUserBookings(userId: string): Promise<Booking[]> {
    if (import.meta.env.DEV) {
      console.warn(
        "⚠️ getUserBookings(userId) is deprecated. Use getMyBookings() instead."
      );
    }

    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.id !== userId) {
      throw createUserError("unauthorized");
    }

    return this.getMyBookings();
  },
};
