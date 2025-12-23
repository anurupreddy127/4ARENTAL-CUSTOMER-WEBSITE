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
  return {
    id: vehicle.id as string,
    name: vehicle.name as string,
    category: vehicle.category as string as "economy" | "suv" | "luxury",
    price: vehicle.price as number,
    priceUnit: "month" as const,
    image: (vehicle.image as string) || "",
    features: (vehicle.features as string[]) || [],
    status: vehicle.status as string as
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
    // Convert null to undefined for these fields
    stockNumber: (vehicle.stock_number as string | null) ?? undefined,
    licensePlate: (vehicle.license_plate as string | null) ?? undefined,
    vin: (vehicle.vin as string | null) ?? undefined,
    currentMileage: (vehicle.current_mileage as number | null) ?? undefined,
    lastServiceDate: (vehicle.last_service_date as string | null) ?? undefined,
    notes: (vehicle.notes as string | null) ?? undefined,
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
        .eq("status", "available")
        .order("created_at", { ascending: false });

      if (error) {
        logError("getAllVehicles", error);
        throw createUserError("getAllVehicles");
      }

      return (data || []).map(mapVehicleFromDB);
    } catch (error) {
      // Re-throw rate limit and user-friendly errors
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
      // Validate and sanitize input
      const sanitizedCategory = categorySchema.parse(category);

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("status", "available")
        .eq("category", sanitizedCategory)
        .order("created_at", { ascending: false });

      if (error) {
        logError("getVehiclesByCategory", error);
        throw createUserError("getVehiclesByCategory");
      }

      return (data || []).map(mapVehicleFromDB);
    } catch (error) {
      // Handle validation errors - return empty array
      if (error instanceof z.ZodError) {
        logError("getVehiclesByCategory - invalid category", error);
        return [];
      }
      // Re-throw rate limit and user-friendly errors
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
      // Validate UUID format
      const validatedId = uuidSchema.parse(id);

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", validatedId)
        .single();

      if (error) {
        // PGRST116 = No rows returned (not found)
        if (error.code === "PGRST116") {
          return null;
        }
        logError("getVehicle", error);
        throw createUserError("getVehicle");
      }

      return data ? mapVehicleFromDB(data) : null;
    } catch (error) {
      // Handle validation errors - return null for invalid ID
      if (error instanceof z.ZodError) {
        logError("getVehicle - invalid ID format", error);
        return null;
      }
      // Re-throw rate limit and user-friendly errors
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
        .eq("status", "available");

      if (error) {
        logError("getCategories", error);
        throw createUserError("getCategories");
      }

      // Extract unique categories and sort alphabetically
      const categories = [
        ...new Set(
          (data || []).map((v) => v.category as string).filter(Boolean)
        ),
      ].sort();

      return categories;
    } catch (error) {
      // Re-throw rate limit and user-friendly errors
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getCategories", error);
      throw createUserError("getCategories");
    }
  },

  /**
   * Search vehicles by name or category
   * Public access - no authentication required
   * Rate limit: 30 requests per minute
   */
  async searchVehicles(query: string): Promise<Vehicle[]> {
    try {
      // Validate and sanitize search query
      const sanitizedQuery = searchQuerySchema.parse(query);

      // Escape special characters for ILIKE pattern
      const escapedQuery = sanitizedQuery.replace(/[%_]/g, "\\$&");

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("status", "available")
        .or(`name.ilike.%${escapedQuery}%,category.ilike.%${escapedQuery}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) {
        logError("searchVehicles", error);
        throw createUserError("searchVehicles");
      }

      return (data || []).map(mapVehicleFromDB);
    } catch (error) {
      // Handle validation errors - return empty results
      if (error instanceof z.ZodError) {
        return [];
      }
      // Re-throw rate limit and user-friendly errors
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
      // Validate limit
      const validatedLimit = limitSchema.parse(limit);

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("status", "available")
        .order("created_at", { ascending: false })
        .limit(validatedLimit);

      if (error) {
        logError("getFeaturedVehicles", error);
        throw createUserError("getFeaturedVehicles");
      }

      return (data || []).map(mapVehicleFromDB);
    } catch (error) {
      // Handle validation errors - use default limit
      if (error instanceof z.ZodError) {
        logError("getFeaturedVehicles - invalid limit, using default", error);
        return this.getFeaturedVehicles(6);
      }
      // Re-throw rate limit and user-friendly errors
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
      // Validate UUID format
      const validatedId = uuidSchema.parse(id);

      const { data, error } = await supabase
        .from("vehicles")
        .select("status")
        .eq("id", validatedId)
        .single();

      if (error) {
        // Vehicle not found
        if (error.code === "PGRST116") {
          return false;
        }
        logError("isVehicleAvailable", error);
        return false;
      }

      return data?.status === "available";
    } catch (error) {
      // Handle validation errors - return false for invalid ID
      if (error instanceof z.ZodError) {
        return false;
      }
      // For rate limit errors, re-throw so UI can show message
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
    maxPrice: number
  ): Promise<Vehicle[]> {
    try {
      // Validate price range
      const validatedMin = z.number().min(0).parse(minPrice);
      const validatedMax = z.number().min(0).parse(maxPrice);

      if (validatedMin > validatedMax) {
        return [];
      }

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("status", "available")
        .gte("price", validatedMin)
        .lte("price", validatedMax)
        .order("price", { ascending: true });

      if (error) {
        logError("getVehiclesByPriceRange", error);
        throw createUserError("getAllVehicles");
      }

      return (data || []).map(mapVehicleFromDB);
    } catch (error) {
      // Handle validation errors - return empty array
      if (error instanceof z.ZodError) {
        return [];
      }
      // Re-throw rate limit and user-friendly errors
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
        .eq("status", "available");

      if (error) {
        logError("getCategoryCounts", error);
        throw createUserError("getCategories");
      }

      // Count vehicles per category
      const counts: Record<string, number> = {};
      (data || []).forEach((vehicle) => {
        const category = vehicle.category as string;
        if (category) {
          counts[category] = (counts[category] || 0) + 1;
        }
      });

      return counts;
    } catch (error) {
      // Re-throw rate limit and user-friendly errors
      if (isRateLimitError(error) || isUserError(error)) {
        throw error;
      }
      logError("getCategoryCounts", error);
      throw createUserError("getCategories");
    }
  },
};
