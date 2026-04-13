import { supabase } from "@/config/supabase";
import { Vehicle } from "@/types";
import { z } from "zod";
import * as Sentry from "@sentry/react";

const uuidSchema = z.string().uuid("Invalid vehicle ID format");
const categorySchema = z.string().min(1).max(50).trim();
const searchQuerySchema = z.string().min(1).max(100).trim();
const limitSchema = z.number().min(1).max(50);

function mapVehicleFromDB(vehicle: Record<string, unknown>): Vehicle {
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
    category: vehicle.category as Vehicle["category"],
    price: Number(vehicle.price) || 0,
    priceUnit: "month" as const,
    image,
    features: (vehicle.features as string[]) || [],
    status: (vehicle.status as Vehicle["status"]) || "available",
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
    dailyRate: Number(vehicle.daily_rate) || 0,
    weeklyRate: Number(vehicle.weekly_rate) || 0,
    monthlyRate: Number(vehicle.monthly_rate) || 0,
    semesterRate: Number(vehicle.semester_rate) || 0,
    averageRating: vehicle.average_rating
      ? Number(vehicle.average_rating)
      : null,
    reviewCount: Number(vehicle.review_count) || 0,
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

function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[vehicleService] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "vehicleService", context },
    });
  }
}

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

export const vehicleService = {
  async getAllVehicles(): Promise<Vehicle[]> {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("name");

      if (error) {
        logError("getAllVehicles", error);
        throw createUserError("getAllVehicles");
      }

      return (data || []).map((v) =>
        mapVehicleFromDB(v as Record<string, unknown>),
      );
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Unable to")
      ) {
        throw error;
      }
      logError("getAllVehicles", error);
      throw createUserError("getAllVehicles");
    }
  },

  async getVehiclesByCategory(category: string): Promise<Vehicle[]> {
    try {
      const sanitizedCategory = categorySchema.parse(category);

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("category", sanitizedCategory)
        .order("name");

      if (error) {
        logError("getVehiclesByCategory", error);
        throw createUserError("getVehiclesByCategory");
      }

      return (data || []).map((v) =>
        mapVehicleFromDB(v as Record<string, unknown>),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        logError("getVehiclesByCategory - invalid category", error);
        return [];
      }
      if (
        error instanceof Error &&
        error.message.includes("Unable to")
      ) {
        throw error;
      }
      logError("getVehiclesByCategory", error);
      throw createUserError("getVehiclesByCategory");
    }
  },

  async getVehicle(id: string): Promise<Vehicle | null> {
    try {
      const validatedId = uuidSchema.parse(id);

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", validatedId)
        .maybeSingle();

      if (error) {
        logError("getVehicle", error);
        throw createUserError("getVehicle");
      }

      return data
        ? mapVehicleFromDB(data as Record<string, unknown>)
        : null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logError("getVehicle - invalid ID format", error);
        return null;
      }
      if (
        error instanceof Error &&
        error.message.includes("Unable to")
      ) {
        throw error;
      }
      logError("getVehicle", error);
      throw createUserError("getVehicle");
    }
  },

  async getCategories(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("category");

      if (error) {
        logError("getCategories", error);
        throw createUserError("getCategories");
      }

      const categories = [
        ...new Set((data || []).map((v) => v.category as string)),
      ];
      return categories.sort();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Unable to")
      ) {
        throw error;
      }
      logError("getCategories", error);
      throw createUserError("getCategories");
    }
  },

  async searchVehicles(query: string): Promise<Vehicle[]> {
    try {
      const sanitizedQuery = searchQuerySchema.parse(query);

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .or(
          `name.ilike.%${sanitizedQuery}%,category.ilike.%${sanitizedQuery}%`,
        )
        .order("name");

      if (error) {
        logError("searchVehicles", error);
        throw createUserError("searchVehicles");
      }

      return (data || []).map((v) =>
        mapVehicleFromDB(v as Record<string, unknown>),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return [];
      }
      if (
        error instanceof Error &&
        error.message.includes("Unable to")
      ) {
        throw error;
      }
      logError("searchVehicles", error);
      throw createUserError("searchVehicles");
    }
  },

  async getFeaturedVehicles(limit: number = 6): Promise<Vehicle[]> {
    try {
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

      return (data || []).map((v) =>
        mapVehicleFromDB(v as Record<string, unknown>),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        logError("getFeaturedVehicles - invalid limit, using default", error);
        return this.getFeaturedVehicles(6);
      }
      if (
        error instanceof Error &&
        error.message.includes("Unable to")
      ) {
        throw error;
      }
      logError("getFeaturedVehicles", error);
      throw createUserError("getFeaturedVehicles");
    }
  },

  async isVehicleAvailable(id: string): Promise<boolean> {
    try {
      const validatedId = uuidSchema.parse(id);

      const { data, error } = await supabase
        .from("vehicles")
        .select("status")
        .eq("id", validatedId)
        .maybeSingle();

      if (error) {
        logError("isVehicleAvailable", error);
        return false;
      }

      return data?.status === "available";
    } catch (error) {
      if (error instanceof z.ZodError) {
        return false;
      }
      logError("isVehicleAvailable", error);
      return false;
    }
  },

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
        .gte("price", validatedMin)
        .lte("price", validatedMax)
        .order("price");

      if (error) {
        logError("getVehiclesByPriceRange", error);
        throw createUserError("getAllVehicles");
      }

      return (data || []).map((v) =>
        mapVehicleFromDB(v as Record<string, unknown>),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return [];
      }
      if (
        error instanceof Error &&
        error.message.includes("Unable to")
      ) {
        throw error;
      }
      logError("getVehiclesByPriceRange", error);
      throw createUserError("getAllVehicles");
    }
  },

  async getCategoryCounts(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("category");

      if (error) {
        logError("getCategoryCounts", error);
        throw createUserError("getCategories");
      }

      const counts: Record<string, number> = {};
      for (const v of data || []) {
        const cat = v.category as string;
        counts[cat] = (counts[cat] || 0) + 1;
      }
      return counts;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Unable to")
      ) {
        throw error;
      }
      logError("getCategoryCounts", error);
      throw createUserError("getCategories");
    }
  },

  async getCategoryPricing(): Promise<Record<string, number>> {
    try {
      const { data, error } = await supabase
        .from("vehicles")
        .select("category, price");

      if (error) {
        logError("getCategoryPricing", error);
        throw createUserError("getCategoryPricing");
      }

      const pricing: Record<string, number> = {};
      for (const v of data || []) {
        const cat = v.category as string;
        const price = Number(v.price) || 0;
        if (!(cat in pricing) || price < pricing[cat]) {
          pricing[cat] = price;
        }
      }
      return pricing;
    } catch (error) {
      if (
        error instanceof Error &&
        error.message.includes("Unable to")
      ) {
        throw error;
      }
      logError("getCategoryPricing", error);
      throw createUserError("getCategoryPricing");
    }
  },
};
