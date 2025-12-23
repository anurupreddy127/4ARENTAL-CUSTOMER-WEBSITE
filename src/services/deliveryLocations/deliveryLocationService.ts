// services/deliveryLocationService.ts
import { supabase } from "@/config/supabase";
import { z } from "zod";
import * as Sentry from "@sentry/react";

// ============================================
// TYPES
// ============================================
export interface DeliveryLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  deliveryFee: number;
  isActive: boolean;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

/** For city dropdown in booking form */
export interface CityOption {
  city: string;
  state: string;
  locationCount: number;
  minFee: number;
}

interface DeliveryLocationRow {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip_code: string;
  delivery_fee: string | number | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================
const uuidSchema = z.string().uuid("Invalid location ID format");
const citySchema = z.string().min(1).max(100).trim();

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safe error logging - dev console, prod Sentry
 */
function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[deliveryLocationService] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "deliveryLocationService", context },
    });
  }
}

/**
 * Create user-friendly error
 */
function createUserError(context: string): Error {
  const messages: Record<string, string> = {
    getLocations: "Unable to load delivery locations. Please try again.",
    getCities: "Unable to load delivery cities. Please try again.",
    notFound: "Location not found.",
  };
  return new Error(messages[context] || "An unexpected error occurred.");
}

/**
 * Check if error should be re-thrown as-is
 */
function isPassthroughError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Unable to") ||
      error.message.includes("not found") ||
      error.message.includes("Too many") ||
      error.message.includes("Please wait"))
  );
}

/**
 * Safely parse delivery fee
 */
function parseDeliveryFee(value: string | number | null): number {
  if (value === null || value === undefined) return 0;
  if (typeof value === "number") return value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Map database row to DeliveryLocation
 */
function mapLocationFromDB(row: DeliveryLocationRow): DeliveryLocation {
  return {
    id: row.id,
    name: row.name,
    address: row.address,
    city: row.city,
    state: row.state,
    zipCode: row.zip_code,
    deliveryFee: parseDeliveryFee(row.delivery_fee),
    isActive: row.is_active,
    notes: row.notes || undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ============================================
// DELIVERY LOCATION SERVICE
// ============================================
export const deliveryLocationService = {
  /**
   * Get all cities that have active delivery locations
   * Used for the first dropdown in booking form
   * Returns cities with location count and minimum fee
   */
  async getAvailableCities(): Promise<CityOption[]> {
    try {
      const { data, error } = await supabase
        .from("delivery_locations")
        .select("city, state, delivery_fee")
        .eq("is_active", true)
        .order("city", { ascending: true });

      if (error) {
        logError("getAvailableCities", error);
        throw createUserError("getCities");
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Group by city and calculate stats
      const cityMap = new Map<string, CityOption>();

      for (const row of data) {
        const key = `${row.city}-${row.state}`;
        const fee = parseDeliveryFee(row.delivery_fee);

        if (cityMap.has(key)) {
          const existing = cityMap.get(key)!;
          existing.locationCount++;
          existing.minFee = Math.min(existing.minFee, fee);
        } else {
          cityMap.set(key, {
            city: row.city,
            state: row.state,
            locationCount: 1,
            minFee: fee,
          });
        }
      }

      return Array.from(cityMap.values()).sort((a, b) =>
        a.city.localeCompare(b.city)
      );
    } catch (error) {
      if (isPassthroughError(error)) {
        throw error;
      }
      logError("getAvailableCities", error);
      throw createUserError("getCities");
    }
  },

  /**
   * Get delivery locations for a specific city
   * Used for the second dropdown in booking form (after city selection)
   * Returns locations sorted by delivery fee (cheapest first)
   */
  async getLocationsByCity(city: string): Promise<DeliveryLocation[]> {
    try {
      // Validate input
      const validatedCity = citySchema.safeParse(city);
      if (!validatedCity.success) {
        return [];
      }

      const { data, error } = await supabase
        .from("delivery_locations")
        .select("*")
        .eq("is_active", true)
        .ilike("city", validatedCity.data)
        .order("delivery_fee", { ascending: true });

      if (error) {
        logError("getLocationsByCity", error);
        throw createUserError("getLocations");
      }

      if (!data || data.length === 0) {
        return [];
      }

      return data.map((row) => mapLocationFromDB(row as DeliveryLocationRow));
    } catch (error) {
      if (isPassthroughError(error)) {
        throw error;
      }
      logError("getLocationsByCity", error);
      throw createUserError("getLocations");
    }
  },

  /**
   * Get a single delivery location by ID
   * Used to display selected location details or validate booking
   */
  async getLocation(id: string): Promise<DeliveryLocation | null> {
    try {
      // Validate input
      const validatedId = uuidSchema.safeParse(id);
      if (!validatedId.success) {
        return null;
      }

      const { data, error } = await supabase
        .from("delivery_locations")
        .select("*")
        .eq("id", validatedId.data)
        .eq("is_active", true) // Only return active locations
        .maybeSingle();

      if (error) {
        logError("getLocation", error);
        throw createUserError("getLocations");
      }

      if (!data) {
        return null;
      }

      return mapLocationFromDB(data as DeliveryLocationRow);
    } catch (error) {
      if (isPassthroughError(error)) {
        throw error;
      }
      logError("getLocation", error);
      throw createUserError("getLocations");
    }
  },

  /**
   * Get delivery fee for a location
   * Used during booking price calculation
   * Returns 0 if location not found (fail gracefully)
   */
  async getDeliveryFee(locationId: string): Promise<number> {
    try {
      const location = await this.getLocation(locationId);
      return location?.deliveryFee ?? 0;
    } catch {
      // Fail gracefully - don't block booking flow
      return 0;
    }
  },

  /**
   * Validate that a delivery location exists and is active
   * Used before creating a booking
   */
  async validateLocation(locationId: string): Promise<{
    valid: boolean;
    location: DeliveryLocation | null;
    error?: string;
  }> {
    try {
      const validatedId = uuidSchema.safeParse(locationId);
      if (!validatedId.success) {
        return {
          valid: false,
          location: null,
          error: "Invalid delivery location selected.",
        };
      }

      const location = await this.getLocation(validatedId.data);

      if (!location) {
        return {
          valid: false,
          location: null,
          error: "Selected delivery location is no longer available.",
        };
      }

      return {
        valid: true,
        location,
      };
    } catch {
      return {
        valid: false,
        location: null,
        error: "Unable to verify delivery location.",
      };
    }
  },
};
