/* eslint-disable @typescript-eslint/no-explicit-any */
// services/vehicleService.ts (CUSTOMER PORTAL - Production Ready)
import { supabase } from "@/config/supabase";
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
    specifications: (vehicle.specifications as any) || {
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
 * - Development: Full error details in console
 * - Production: Send to Sentry, minimal console output
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
 * Never expose internal error details to users
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
 * Check if error is a user-friendly error (already processed)
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
// VEHICLE SERVICE (READ-ONLY FOR CUSTOMERS)
// ============================================
export const vehicleService = {
  /**
   * Get all available vehicles for rental
   * Public access - no authentication required
   * Rate limit: 60 requests per minute
   */
  async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .in("status", ["available", "reserved", "rented"])
        .order("created_at", { ascending: false });

      if (error) {
        logError("getAllVehicles", error);
        throw createUserError("getAllVehicles");
      }

      return (data || []).map(mapVehicleFromDB);
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
   * Public access - no authentication required
   * Rate limit: 60 requests per minute
   */
  async getVehiclesByCategory(category: string): Promise<Vehicle[]> {
    try {
      const sanitizedCategory = categorySchema.parse(category);

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .in("status", ["available", "reserved", "rented"])
        .eq("category", sanitizedCategory)
        .order("created_at", { ascending: false });

      if (error) {
        logError("getVehiclesByCategory", error);
        throw createUserError("getVehiclesByCategory");
      }

      return (data || []).map(mapVehicleFromDB);
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
   * Public access - no authentication required
   * Rate limit: 60 requests per minute
   */
  async getVehicle(id: string): Promise<Vehicle | null> {
    try {
      const validatedId = uuidSchema.parse(id);

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", validatedId)
        .single();

      if (error) {
        if (error.code === "PGRST116") {
          return null;
        }
        logError("getVehicle", error);
        throw createUserError("getVehicle");
      }

      return data ? mapVehicleFromDB(data) : null;
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
   * Public access - no authentication required
   * Rate limit: 60 requests per minute
   */
  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("category")
        .in("status", ["available", "reserved", "rented"]);

      if (error) {
        logError("getCategories", error);
        throw createUserError("getCategories");
      }

      const categories = [
        ...new Set(
          (data || []).map((v) => v.category as string).filter(Boolean),
        ),
      ].sort();

      return categories;
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
   * Public access - no authentication required
   * Rate limit: 30 requests per minute
   */
  async searchVehicles(query: string): Promise<Vehicle[]> {
    try {
      const sanitizedQuery = searchQuerySchema.parse(query);
      const escapedQuery = sanitizedQuery.replace(/[%_]/g, "\\$&");

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .in("status", ["available", "reserved", "rented"])
        .or(`name.ilike.%${escapedQuery}%,category.ilike.%${escapedQuery}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        logError("searchVehicles", error);
        throw createUserError("searchVehicles");
      }

      return (data || []).map(mapVehicleFromDB);
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
   * Public access - no authentication required
   * Rate limit: 60 requests per minute
   */
  async getFeaturedVehicles(limit: number = 6): Promise<Vehicle[]> {
    try {
      const validatedLimit = limitSchema.parse(limit);

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .in("status", ["available", "reserved", "rented"])
        .order("created_at", { ascending: false })
        .limit(validatedLimit);

      if (error) {
        logError("getFeaturedVehicles", error);
        throw createUserError("getFeaturedVehicles");
      }

      return (data || []).map(mapVehicleFromDB);
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
   * Useful before starting booking process
   * Rate limit: 60 requests per minute
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
   * Public access - no authentication required
   * Rate limit: 60 requests per minute
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

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .in("status", ["available", "reserved", "rented"])
        .gte("price", validatedMin)
        .lte("price", validatedMax)
        .order("price", { ascending: true });

      if (error) {
        logError("getVehiclesByPriceRange", error);
        throw createUserError("getAllVehicles");
      }

      return (data || []).map(mapVehicleFromDB);
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
   * Useful for showing category filters with counts
   * Rate limit: 60 requests per minute
   */
  async getCategoryCounts(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("category")
        .in("status", ["available", "reserved", "rented"]);

      if (error) {
        logError("getCategoryCounts", error);
        throw createUserError("getCategories");
      }

      const counts: Record<string, number> = {};
      (data || []).forEach((vehicle) => {
        const category = vehicle.category as string;
        if (category) {
          counts[category] = (counts[category] || 0) + 1;
        }
      });

      return counts;
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
   * Returns monthly starting prices per category
   * Includes available, rented, and reserved vehicles for accurate pricing display
   * Public access - no authentication required
   */
  async getCategoryPricing(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("category, price, monthly_rate")
        .in("status", ["available", "rented", "reserved"]);

      if (error) {
        logError("getCategoryPricing", error);
        throw createUserError("getCategoryPricing");
      }

      const pricing: Record<string, number> = {};

      (data || []).forEach((vehicle) => {
        const category = vehicle.category as string;
        const monthlyPrice =
          Number(vehicle.monthly_rate) || Number(vehicle.price) || 0;

        if (!category || monthlyPrice === 0) return;

        if (!pricing[category] || monthlyPrice < pricing[category]) {
          pricing[category] = monthlyPrice;
        }
      });

      return pricing;
    } catch (error) {
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getCategoryPricing", error);
      throw createUserError("getCategoryPricing");
    }
  },
};
