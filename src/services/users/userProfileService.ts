// services/userProfileService.ts
import { supabase } from "@/config/supabase";
import { z } from "zod";
import * as Sentry from "@sentry/react";

// ============================================
// TYPES
// ============================================
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  dateOfBirth: string;
  driversLicenseNumber: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  createdAt: Date;
  updatedAt: Date;
}

interface ProfileRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  drivers_license_number: string | null;
  street_address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================
const uuidSchema = z.string().uuid("Invalid ID format");

const profileUpdateSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name is too long")
    .trim()
    .optional(),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name is too long")
    .trim()
    .optional(),
  phone: z
    .string()
    .min(5, "Phone number is too short")
    .max(20, "Phone number is too long")
    .trim()
    .optional(),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)")
    .optional()
    .or(z.literal("")),
  driversLicenseNumber: z
    .string()
    .max(50, "License number is too long")
    .trim()
    .optional(),
  streetAddress: z.string().max(200, "Address is too long").trim().optional(),
  city: z.string().max(100, "City name is too long").trim().optional(),
  state: z.string().max(50, "State name is too long").trim().optional(),
  zipCode: z.string().max(20, "ZIP code is too long").trim().optional(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safe error logging
 */
function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[userProfileService] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "userProfileService", context },
    });
  }
}

/**
 * Create user-friendly error
 */
function createUserError(context: string): Error {
  const messages: Record<string, string> = {
    getProfile: "Unable to load profile. Please try again.",
    updateProfile: "Unable to save profile. Please try again.",
    unauthorized: "You can only access your own profile.",
    notAuthenticated: "Please log in to continue.",
    notFound: "Profile not found.",
  };
  return new Error(messages[context] || "An unexpected error occurred.");
}

/**
 * Check if error is user-friendly
 */
function isUserError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Unable to") ||
      error.message.includes("only access") ||
      error.message.includes("Please log in") ||
      error.message.includes("not found"))
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
async function getCurrentUser(): Promise<{ id: string; email: string } | null> {
  try {
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return null;
    }

    return {
      id: user.id,
      email: user.email || "",
    };
  } catch {
    return null;
  }
}

/**
 * Map database row to UserProfile
 */
function mapProfileFromDB(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    firstName: row.first_name || "",
    lastName: row.last_name || "",
    phone: row.phone || "",
    dateOfBirth: row.date_of_birth || "",
    driversLicenseNumber: row.drivers_license_number || "",
    streetAddress: row.street_address || "",
    city: row.city || "",
    state: row.state || "",
    zipCode: row.zip_code || "",
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ============================================
// USER PROFILE SERVICE
// ============================================
export const userProfileService = {
  /**
   * Get current user's profile
   * Requires authentication
   */
  async getMyProfile(): Promise<UserProfile | null> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw createUserError("notAuthenticated");
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", currentUser.id)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null; // Profile doesn't exist yet
        }
        logError("getMyProfile", error);
        throw createUserError("getProfile");
      }

      if (!data) {
        return null;
      }

      return mapProfileFromDB(data as ProfileRow);
    } catch (error) {
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getMyProfile", error);
      throw createUserError("getProfile");
    }
  },

  /**
   * Get a profile by ID (for internal use or authorized access)
   * Verifies the requesting user owns this profile
   */
  async getProfile(userId: string): Promise<UserProfile | null> {
    try {
      // Validate ID format
      const validatedId = uuidSchema.parse(userId);

      // Verify user is authenticated
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw createUserError("notAuthenticated");
      }

      // Verify user is accessing their own profile
      if (currentUser.id !== validatedId) {
        logError("getProfile - unauthorized access attempt", {
          requestedId: validatedId,
          currentUserId: currentUser.id,
        });
        throw createUserError("unauthorized");
      }

      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("id", validatedId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        logError("getProfile", error);
        throw createUserError("getProfile");
      }

      if (!data) {
        return null;
      }

      return mapProfileFromDB(data as ProfileRow);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return null;
      }
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getProfile", error);
      throw createUserError("getProfile");
    }
  },

  /**
   * Update current user's profile
   * Requires authentication
   */
  async updateMyProfile(updates: Partial<UserProfile>): Promise<void> {
    try {
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw createUserError("notAuthenticated");
      }

      // Validate update data
      const validated = profileUpdateSchema.parse(updates);

      // Build update payload (only include provided fields)
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };

      if (validated.firstName !== undefined) {
        payload.first_name = validated.firstName;
      }
      if (validated.lastName !== undefined) {
        payload.last_name = validated.lastName;
      }
      if (validated.phone !== undefined) {
        payload.phone = validated.phone;
      }
      if (validated.dateOfBirth !== undefined) {
        payload.date_of_birth = validated.dateOfBirth || null;
      }
      if (validated.driversLicenseNumber !== undefined) {
        payload.drivers_license_number = validated.driversLicenseNumber;
      }
      if (validated.streetAddress !== undefined) {
        payload.street_address = validated.streetAddress;
      }
      if (validated.city !== undefined) {
        payload.city = validated.city;
      }
      if (validated.state !== undefined) {
        payload.state = validated.state;
      }
      if (validated.zipCode !== undefined) {
        payload.zip_code = validated.zipCode;
      }

      const { error } = await supabase
        .from("user_profiles")
        .update(payload)
        .eq("id", currentUser.id);

      if (error) {
        logError("updateMyProfile", error);

        if (error.code === "42501") {
          throw createUserError("unauthorized");
        }
        throw createUserError("updateProfile");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.issues[0]?.message || "Invalid profile data");
      }
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("updateMyProfile", error);
      throw createUserError("updateProfile");
    }
  },

  /**
   * Upsert profile (update or create)
   * Used primarily for initial profile creation
   * @deprecated Use updateMyProfile for updates
   */
  async upsertProfile(
    userId: string,
    profile: Partial<UserProfile>
  ): Promise<void> {
    try {
      // Validate ID
      const validatedId = uuidSchema.parse(userId);

      // Verify user is authenticated and owns this profile
      const currentUser = await getCurrentUser();
      if (!currentUser) {
        throw createUserError("notAuthenticated");
      }

      if (currentUser.id !== validatedId) {
        logError("upsertProfile - unauthorized", {
          requestedId: validatedId,
          currentUserId: currentUser.id,
        });
        throw createUserError("unauthorized");
      }

      // Validate profile data
      const validated = profileUpdateSchema.parse(profile);

      const payload = {
        id: validatedId,
        first_name: validated.firstName,
        last_name: validated.lastName,
        phone: validated.phone,
        date_of_birth: validated.dateOfBirth || null,
        drivers_license_number: validated.driversLicenseNumber,
        street_address: validated.streetAddress,
        city: validated.city,
        state: validated.state,
        zip_code: validated.zipCode,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase.from("user_profiles").upsert(payload);

      if (error) {
        logError("upsertProfile", error);

        if (error.code === "42501") {
          throw createUserError("unauthorized");
        }
        throw createUserError("updateProfile");
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(error.issues[0]?.message || "Invalid profile data");
      }
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("upsertProfile", error);
      throw createUserError("updateProfile");
    }
  },

  /**
   * Check if current user has a complete profile
   * Returns list of missing required fields
   */
  async getProfileCompleteness(): Promise<{
    isComplete: boolean;
    missingFields: string[];
    completionPercentage: number;
  }> {
    try {
      const profile = await this.getMyProfile();

      if (!profile) {
        return {
          isComplete: false,
          missingFields: ["profile"],
          completionPercentage: 0,
        };
      }

      const requiredFields: (keyof UserProfile)[] = [
        "firstName",
        "lastName",
        "phone",
      ];

      const optionalFields: (keyof UserProfile)[] = [
        "dateOfBirth",
        "driversLicenseNumber",
        "streetAddress",
        "city",
        "state",
        "zipCode",
      ];

      const allFields = [...requiredFields, ...optionalFields];
      const missingRequired: string[] = [];
      let filledCount = 0;

      for (const field of requiredFields) {
        if (!profile[field]) {
          missingRequired.push(field);
        } else {
          filledCount++;
        }
      }

      for (const field of optionalFields) {
        if (profile[field]) {
          filledCount++;
        }
      }

      const completionPercentage = Math.round(
        (filledCount / allFields.length) * 100
      );

      return {
        isComplete: missingRequired.length === 0,
        missingFields: missingRequired,
        completionPercentage,
      };
    } catch (error) {
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getProfileCompleteness", error);
      return {
        isComplete: false,
        missingFields: ["unknown"],
        completionPercentage: 0,
      };
    }
  },
};
