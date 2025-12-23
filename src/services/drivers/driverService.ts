// services/driverService.ts
import { supabase } from "@/config/supabase";
import { z } from "zod";
import * as Sentry from "@sentry/react";
import { PrimaryDriver, AdditionalDriver } from "@/types";

// ============================================
// TYPES
// ============================================
interface PrimaryDriverRow {
  id: string;
  booking_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  drivers_license: string;
  date_of_birth: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  is_account_holder: boolean;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface AdditionalDriverRow {
  id: string;
  booking_id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  drivers_license: string;
  date_of_birth: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  is_verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================
const uuidSchema = z.string().uuid("Invalid booking ID format");

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safe error logging - dev console, prod Sentry
 */
function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[driverService] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "driverService", context },
    });
  }
}

/**
 * Create user-friendly error
 */
function createUserError(context: string): Error {
  const messages: Record<string, string> = {
    getDrivers: "Unable to load driver information. Please try again.",
    unauthorized: "You can only view drivers for your own bookings.",
    notAuthenticated: "Please log in to view driver information.",
    notFound: "Booking not found.",
    invalidId: "Invalid booking ID.",
  };
  return new Error(messages[context] || "An unexpected error occurred.");
}

/**
 * Check if error is user-friendly (should be re-thrown as-is)
 */
function isUserError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Unable to") ||
      error.message.includes("only view") ||
      error.message.includes("Please log in") ||
      error.message.includes("not found") ||
      error.message.includes("Invalid"))
  );
}

/**
 * Check if error is rate limit
 */
function isRateLimitError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Too many") ||
      error.message.includes("Please wait"))
  );
}

/**
 * Get current authenticated user
 */
async function getCurrentUser(): Promise<{ id: string } | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return { id: user.id };
  } catch {
    return null;
  }
}

/**
 * Verify current user owns the booking
 */
async function verifyBookingOwnership(bookingId: string): Promise<boolean> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return false;
  }

  const { data, error } = await supabase
    .from("bookings")
    .select("user_id")
    .eq("id", bookingId)
    .single();

  if (error || !data) {
    return false;
  }

  return data.user_id === currentUser.id;
}

/**
 * Map database row to PrimaryDriver
 */
function mapPrimaryDriverFromDB(row: PrimaryDriverRow): PrimaryDriver {
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    driversLicense: row.drivers_license,
    dateOfBirth: row.date_of_birth,
    streetAddress: row.street_address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    isAccountHolder: row.is_account_holder,
    isVerified: row.is_verified,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

/**
 * Map database row to AdditionalDriver
 */
function mapAdditionalDriverFromDB(row: AdditionalDriverRow): AdditionalDriver {
  return {
    id: row.id,
    bookingId: row.booking_id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    phone: row.phone,
    driversLicense: row.drivers_license,
    dateOfBirth: row.date_of_birth,
    streetAddress: row.street_address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    isVerified: row.is_verified,
    verifiedBy: row.verified_by,
    verifiedAt: row.verified_at,
    notes: row.notes ?? undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ============================================
// DRIVER SERVICE
// ============================================
export const driverService = {
  /**
   * Get primary driver for a booking
   * Requires authentication and booking ownership
   */
  async getPrimaryDriver(bookingId: string): Promise<PrimaryDriver | null> {
    try {
      // Validate input
      const validatedId = uuidSchema.safeParse(bookingId);
      if (!validatedId.success) {
        throw createUserError("invalidId");
      }

      // Verify authentication
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw createUserError("notAuthenticated");
      }

      // Verify ownership
      const isOwner = await verifyBookingOwnership(validatedId.data);
      if (!isOwner) {
        logError("getPrimaryDriver - unauthorized access attempt", {
          bookingId: validatedId.data,
          userId: currentUser.id,
        });
        throw createUserError("unauthorized");
      }

      // Fetch primary driver using Supabase client
      const { data, error } = await supabase
        .from("primary_drivers")
        .select("*")
        .eq("booking_id", validatedId.data)
        .maybeSingle();

      if (error) {
        logError("getPrimaryDriver", error);
        throw createUserError("getDrivers");
      }

      if (!data) {
        return null;
      }

      return mapPrimaryDriverFromDB(data as PrimaryDriverRow);
    } catch (error) {
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getPrimaryDriver", error);
      throw createUserError("getDrivers");
    }
  },

  /**
   * Get additional drivers for a booking
   * Requires authentication and booking ownership
   */
  async getAdditionalDrivers(bookingId: string): Promise<AdditionalDriver[]> {
    try {
      // Validate input
      const validatedId = uuidSchema.safeParse(bookingId);
      if (!validatedId.success) {
        throw createUserError("invalidId");
      }

      // Verify authentication
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw createUserError("notAuthenticated");
      }

      // Verify ownership
      const isOwner = await verifyBookingOwnership(validatedId.data);
      if (!isOwner) {
        logError("getAdditionalDrivers - unauthorized access attempt", {
          bookingId: validatedId.data,
          userId: currentUser.id,
        });
        throw createUserError("unauthorized");
      }

      // Fetch additional drivers using Supabase client
      const { data, error } = await supabase
        .from("additional_drivers")
        .select("*")
        .eq("booking_id", validatedId.data)
        .order("created_at", { ascending: true });

      if (error) {
        logError("getAdditionalDrivers", error);
        throw createUserError("getDrivers");
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((row) =>
        mapAdditionalDriverFromDB(row as AdditionalDriverRow)
      );
    } catch (error) {
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getAdditionalDrivers", error);
      throw createUserError("getDrivers");
    }
  },

  /**
   * Get all drivers for a booking (primary + additional)
   * Requires authentication and booking ownership
   */
  async getAllDrivers(bookingId: string): Promise<{
    primary: PrimaryDriver | null;
    additional: AdditionalDriver[];
  }> {
    try {
      // Validate input
      const validatedId = uuidSchema.safeParse(bookingId);
      if (!validatedId.success) {
        throw createUserError("invalidId");
      }

      // Verify authentication
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw createUserError("notAuthenticated");
      }

      // Verify ownership ONCE (not in each sub-method)
      const isOwner = await verifyBookingOwnership(validatedId.data);
      if (!isOwner) {
        logError("getAllDrivers - unauthorized access attempt", {
          bookingId: validatedId.data,
          userId: currentUser.id,
        });
        throw createUserError("unauthorized");
      }

      // Fetch both in parallel (no ownership check since we already verified)
      const [primaryResult, additionalResult] = await Promise.all([
        supabase
          .from("primary_drivers")
          .select("*")
          .eq("booking_id", validatedId.data)
          .maybeSingle(),
        supabase
          .from("additional_drivers")
          .select("*")
          .eq("booking_id", validatedId.data)
          .order("created_at", { ascending: true }),
      ]);

      if (primaryResult.error) {
        logError("getAllDrivers - primary", primaryResult.error);
        throw createUserError("getDrivers");
      }

      if (additionalResult.error) {
        logError("getAllDrivers - additional", additionalResult.error);
        throw createUserError("getDrivers");
      }

      const primary = primaryResult.data
        ? mapPrimaryDriverFromDB(primaryResult.data as PrimaryDriverRow)
        : null;

      const additional = (additionalResult.data || []).map((row) =>
        mapAdditionalDriverFromDB(row as AdditionalDriverRow)
      );

      return { primary, additional };
    } catch (error) {
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getAllDrivers", error);
      throw createUserError("getDrivers");
    }
  },

  /**
   * Check if booking has all required driver information
   * Useful for booking validation before pickup
   */
  async hasCompleteDriverInfo(bookingId: string): Promise<{
    isComplete: boolean;
    hasPrimaryDriver: boolean;
    primaryDriverVerified: boolean;
  }> {
    try {
      const { primary } = await this.getAllDrivers(bookingId);

      return {
        isComplete: primary !== null && primary.isVerified,
        hasPrimaryDriver: primary !== null,
        primaryDriverVerified: primary?.isVerified ?? false,
      };
    } catch (error) {
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("hasCompleteDriverInfo", error);
      return {
        isComplete: false,
        hasPrimaryDriver: false,
        primaryDriverVerified: false,
      };
    }
  },
};
