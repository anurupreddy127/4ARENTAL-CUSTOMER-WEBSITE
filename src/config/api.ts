// src/config/api.ts
// Utility for calling Edge Functions with caching support

import { supabase } from "./supabase";
import * as Sentry from "@sentry/react";

// ============================================
// CONFIGURATION
// ============================================
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL?.trim();
const CACHED_DATA_BASE = `${SUPABASE_URL}/functions/v1/cached-data`;

// ============================================
// ERROR HANDLING
// ============================================
class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[api] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "api", context },
    });
  }
}

// ============================================
// AUTH HELPER
// ============================================
async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;

  // Use anon key if no session (for public endpoints)
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token || anonKey}`,
    apikey: anonKey || "",
  };
}

// ============================================
// CACHED DATA API
// ============================================

/**
 * Fetch data from the cached-data Edge Function
 * This is for public, cacheable data (vehicles, config, delivery locations)
 */
export async function fetchCachedData<T>(
  endpoint: string,
  options: {
    params?: Record<string, string | number>;
  } = {},
): Promise<T> {
  const { params } = options;

  // Build URL with query params
  let url = `${CACHED_DATA_BASE}${endpoint}`;
  if (params && Object.keys(params).length > 0) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    url += `?${searchParams.toString()}`;
  }

  try {
    const headers = await getAuthHeaders();

    const response = await fetch(url, {
      method: "GET",
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new ApiError(
        errorData.error || `Request failed with status ${response.status}`,
        response.status,
      );
    }

    const data = await response.json();
    return data as T;
  } catch (error) {
    if (error instanceof ApiError) {
      logError(`fetchCachedData ${endpoint}`, error);
      throw error;
    }

    logError(`fetchCachedData ${endpoint}`, error);
    throw new ApiError("Network error. Please check your connection.", 0);
  }
}

/**
 * Type-safe cached data fetchers for common endpoints
 */
export const cachedApi = {
  // Vehicles
  vehicles: {
    list: () => fetchCachedData<unknown[]>("/vehicles"),
    single: (id: string) => fetchCachedData<unknown>(`/vehicles/${id}`),
    byCategory: (category: string) =>
      fetchCachedData<unknown[]>(`/vehicles/category/${category}`),
    search: (query: string) =>
      fetchCachedData<unknown[]>("/vehicles/search", { params: { q: query } }),
    featured: (limit = 6) =>
      fetchCachedData<unknown[]>("/vehicles/featured", { params: { limit } }),
    categories: () => fetchCachedData<string[]>("/vehicles/categories"),
    categoryCounts: () =>
      fetchCachedData<Record<string, number>>("/vehicles/category-counts"),
    categoryPricing: () =>
      fetchCachedData<Record<string, number>>("/vehicles/category-pricing"),
    rates: (id: string) =>
      fetchCachedData<{
        dailyRate: number;
        weeklyRate: number;
        monthlyRate: number;
        semesterRate: number;
      }>(`/vehicles/${id}/rates`),
    reviews: (id: string, limit = 10, offset = 0) =>
      fetchCachedData<unknown[]>(`/vehicles/${id}/reviews`, {
        params: { limit, offset },
      }),
    reviewStats: (id: string) =>
      fetchCachedData<{
        averageRating: number | null;
        reviewCount: number;
      }>(`/vehicles/${id}/review-stats`),
  },

  // Config
  config: {
    all: () => fetchCachedData<Record<string, unknown>>("/config"),
    single: (key: string) => fetchCachedData<unknown>(`/config/${key}`),
    fees: () => fetchCachedData<Record<string, unknown>>("/config/fees"),
    timing: () => fetchCachedData<Record<string, unknown>>("/config/timing"),
    storeHours: () =>
      fetchCachedData<Record<string, unknown>>("/config/store-hours"),
    delivery: () =>
      fetchCachedData<Record<string, unknown>>("/config/delivery"),
    extensions: () =>
      fetchCachedData<Record<string, unknown>>("/config/extensions"),
    drivers: () => fetchCachedData<Record<string, unknown>>("/config/drivers"),
  },

  // Delivery Locations
  deliveryLocations: {
    all: () => fetchCachedData<unknown[]>("/delivery-locations"),
    cities: () =>
      fetchCachedData<{ value: string; label: string }[]>(
        "/delivery-locations/cities",
      ),
    byCity: (city: string) =>
      fetchCachedData<unknown[]>(`/delivery-locations/city/${city}`),
    single: (id: string) =>
      fetchCachedData<unknown>(`/delivery-locations/${id}`),
    fee: (id: string) =>
      fetchCachedData<{ fee: number }>(`/delivery-locations/${id}/fee`),
  },
};
