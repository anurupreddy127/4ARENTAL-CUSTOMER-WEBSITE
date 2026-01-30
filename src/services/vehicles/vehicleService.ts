// services/vehicles/vehicleService.ts (CUSTOMER PORTAL - With Redis Caching)
import { supabase } from "@/config/supabase";
import { cachedApi } from "@/config/api";
import { Vehicle } from "@/types";
import { z } from "zod";
import * as Sentry from "@sentry/react";

// ============================================
// INPUT VALIDATION SCHEMAS
// ============================================
const uuidSchema = z.string().uuid("Invalid vehicle ID format");
const categorySchema = z.string().min(1).max(50).trim();
const searchQuerySchema = z.string().min(1).max(100).trim();
const limitSchema = z.number().min(1).max(50);

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Maps database row to Vehicle type
 * Single source of truth for data transformation
 */
function mapVehicleFromDB(vehicle: Record<string, unknown>): Vehicle {
  // Handle image field - can be string or array
  const rawImage = vehicle.image;
  let image: string | string[];
  if (Array.isArray(rawImage)) {
    image = rawImage.length > 0 ? rawImage : "";
  } else {
    image = (rawImage as string) || "";
  }

  return {
    id: vehicle.id as string,
    name: vehicle.name as string,
    category: vehicle.category as "sedan" | "suv" | "electric" | "hybrid",
    price: Number(vehicle.price) || 0,
    priceUnit: "month" as const,
    image,
    features: (vehicle.features as string[]) || [],
    status: vehicle.status as
      | "available"
      | "rented"
      | "maintenance"
      | "reserved"
      | "inspection"
      | "sold"
      | "in-stock",
    specifications: (vehicle.specifications as Vehicle["specifications"]) || {
      seats: 0,
      transmission: "automatic",
      fuelType: "gasoline",
      year: 0,
      brand: "",
      model: "",
      color: "",
      interior: "",
      interiorColor: "",
      driveTrain: "",
      cylinders: 0,
      vin: "",
      engine: "",
      mileage: "",
      stockNumber: "",
      fuelEconomy: "",
    },
    description: vehicle.description as string | undefined,
    location: vehicle.location as string | undefined,

    // Pricing fields
    dailyRate: Number(vehicle.daily_rate) || 0,
    weeklyRate: Number(vehicle.weekly_rate) || 0,
    monthlyRate: Number(vehicle.monthly_rate) || 0,
    semesterRate: Number(vehicle.semester_rate) || 0,

    // Rating fields (cached from reviews)
    averageRating: vehicle.average_rating
      ? Number(vehicle.average_rating)
      : null,
    reviewCount: Number(vehicle.review_count) || 0,

    // Optional fields - convert null to undefined
    stockNumber: (vehicle.stock_number as string | null) ?? undefined,
    licensePlate: (vehicle.license_plate as string | null) ?? undefined,
    vin: (vehicle.vin as string | null) ?? undefined,
    currentMileage: (vehicle.current_mileage as number | null) ?? undefined,
    lastServiceDate: (vehicle.last_service_date as string | null) ?? undefined,
    notes: (vehicle.notes as string | null) ?? undefined,

    // Timestamps
    createdAt: new Date(vehicle.created_at as string),
    updatedAt: new Date(vehicle.updated_at as string),
  };
}

/**
 * Safe error logging
 */
function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[vehicleService] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "vehicleService", context },
    });
  }
}

/**
 * Creates a user-friendly error message
 */
function createUserError(context: string): Error {
  const messages: Record<string, string> = {
    getAllVehicles: "Unable to load vehicles. Please try again.",
    getVehiclesByCategory: "Unable to load vehicles for this category.",
    getVehicle: "Unable to load vehicle details.",
    getCategories: "Unable to load categories.",
    searchVehicles: "Search failed. Please try again.",
    getFeaturedVehicles: "Unable to load featured vehicles.",
    isVehicleAvailable: "Unable to check vehicle availability.",
    getCategoryPricing: "Unable to load pricing information.",
  };
  return new Error(messages[context] || "An unexpected error occurred.");
}

/**
 * Check if error is a user-friendly error
 */
function isUserError(error: unknown): boolean {
  return error instanceof Error && error.message.includes("Unable to");
}

/**
 * Check if error is a rate limit error
 */
function isRateLimitError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.message.includes("Too many") ||
      error.message.includes("Please slow down") ||
      error.message.includes("Please wait"))
  );
}

// ============================================
// VEHICLE SERVICE (WITH REDIS CACHING)
// ============================================
export const vehicleService = {
  /**
   * Get all available vehicles for rental
   * ✅ CACHED (5 min TTL)
   */
  async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const data = await cachedApi.vehicles.list();
      return (data || []).map((v) =>
        mapVehicleFromDB(v as Record<string, unknown>),
      );
    } catch (error) {
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getAllVehicles", error);
      throw createUserError("getAllVehicles");
    }
  },

  /**
   * Get vehicles filtered by category
   * ✅ CACHED (5 min TTL)
   */
  async getVehiclesByCategory(category: string): Promise<Vehicle[]> {
    try {
      const sanitizedCategory = categorySchema.parse(category);
      const data = await cachedApi.vehicles.byCategory(sanitizedCategory);
      return (data || []).map((v) =>
        mapVehicleFromDB(v as Record<string, unknown>),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        logError("getVehiclesByCategory - invalid category", error);
        return [];
      }
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getVehiclesByCategory", error);
      throw createUserError("getVehiclesByCategory");
    }
  },

  /**
   * Get single vehicle details by ID
   * ✅ CACHED (5 min TTL)
   */
  async getVehicle(id: string): Promise<Vehicle | null> {
    try {
      const validatedId = uuidSchema.parse(id);
      const data = await cachedApi.vehicles.single(validatedId);
      return data ? mapVehicleFromDB(data as Record<string, unknown>) : null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logError("getVehicle - invalid ID format", error);
        return null;
      }
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getVehicle", error);
      throw createUserError("getVehicle");
    }
  },

  /**
   * Get all available vehicle categories
   * ✅ CACHED (5 min TTL)
   */
  async getCategories(): Promise<string[]> {
    try {
      const categories = await cachedApi.vehicles.categories();
      return categories || [];
    } catch (error) {
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getCategories", error);
      throw createUserError("getCategories");
    }
  },

  /**
   * Search vehicles by name, brand, or model
   * ✅ CACHED (5 min TTL per query)
   */
  async searchVehicles(query: string): Promise<Vehicle[]> {
    try {
      const sanitizedQuery = searchQuerySchema.parse(query);
      const data = await cachedApi.vehicles.search(sanitizedQuery);
      return (data || []).map((v) =>
        mapVehicleFromDB(v as Record<string, unknown>),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return [];
      }
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("searchVehicles", error);
      throw createUserError("searchVehicles");
    }
  },

  /**
   * Get featured vehicles (for homepage)
   * ✅ CACHED (5 min TTL)
   */
  async getFeaturedVehicles(limit: number = 6): Promise<Vehicle[]> {
    try {
      const validatedLimit = limitSchema.parse(limit);
      const data = await cachedApi.vehicles.featured(validatedLimit);
      return (data || []).map((v) =>
        mapVehicleFromDB(v as Record<string, unknown>),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        logError("getFeaturedVehicles - invalid limit, using default", error);
        return this.getFeaturedVehicles(6);
      }
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getFeaturedVehicles", error);
      throw createUserError("getFeaturedVehicles");
    }
  },

  /**
   * Check if a vehicle is available
   * ❌ NOT CACHED - Needs real-time accuracy for booking flow
   */
  async isVehicleAvailable(id: string): Promise<boolean> {
    try {
      const validatedId = uuidSchema.parse(id);

      const { data, error } = await supabase
        .from("vehicles")
        .select("status")
        .eq("id", validatedId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return false;
        }
        logError("isVehicleAvailable", error);
        return false;
      }

      return data?.status === "available";
    } catch (error) {
      if (error instanceof z.ZodError) {
        return false;
      }
      if (isRateLimitError(error)) {
        throw error;
      }
      logError("isVehicleAvailable", error);
      return false;
    }
  },

  /**
   * Get vehicles by price range
   * ✅ CACHED (5 min TTL)
   */
  async getVehiclesByPriceRange(
    minPrice: number,
    maxPrice: number,
  ): Promise<Vehicle[]> {
    try {
      const validatedMin = z.number().min(0).parse(minPrice);
      const validatedMax = z.number().min(0).parse(maxPrice);

      if (validatedMin > validatedMax) {
        return [];
      }

      // Use cached endpoint with query params
      const data = await cachedApi.vehicles.list();

      // Filter by price range (filtering cached data)
      const filtered = (data || []).filter((v) => {
        const vehicle = v as Record<string, unknown>;
        const price = Number(vehicle.price) || 0;
        return price >= validatedMin && price <= validatedMax;
      });

      return filtered
        .map((v) => mapVehicleFromDB(v as Record<string, unknown>))
        .sort((a, b) => a.price - b.price);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return [];
      }
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getVehiclesByPriceRange", error);
      throw createUserError("getAllVehicles");
    }
  },

  /**
   * Get vehicle count by category
   * ✅ CACHED (5 min TTL)
   */
  async getCategoryCounts(): Promise<Record<string, number>> {
    try {
      const counts = await cachedApi.vehicles.categoryCounts();
      return counts || {};
    } catch (error) {
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getCategoryCounts", error);
      throw createUserError("getCategories");
    }
  },

  /**
   * Get minimum monthly pricing for each category
   * ✅ CACHED (5 min TTL)
   */
  async getCategoryPricing(): Promise<Record<string, number>> {
    try {
      const pricing = await cachedApi.vehicles.categoryPricing();
      return pricing || {};
    } catch (error) {
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getCategoryPricing", error);
      throw createUserError("getCategoryPricing");
    }
  },
};
