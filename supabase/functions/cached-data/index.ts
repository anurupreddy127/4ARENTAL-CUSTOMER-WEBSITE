// supabase/functions/cached-data/index.ts
// Cached Data API for 4A Rentals Customer Portal
// Serves cached public data: vehicles, config, delivery locations, reviews

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  cacheGetOrSet,
  cacheDel,
  cacheDelPattern,
  generateCacheKey,
  CACHE_TTL,
  CACHE_PREFIX,
} from "../_shared/cache.ts";

// ============================================
// ENVIRONMENT & CLIENTS
// ============================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ============================================
// CORS CONFIGURATION
// ============================================
const ALLOWED_ORIGINS = [
  "https://4arentals.com",
  "https://www.4arentals.com",
  "http://localhost:5173",
  "http://localhost:5174",
];

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

// ============================================
// RESPONSE HELPERS
// ============================================
function jsonResponse(
  data: unknown,
  corsHeaders: Record<string, string>,
  status = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(
  message: string,
  corsHeaders: Record<string, string>,
  status = 500,
): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ============================================
// ROUTE PARSER
// ============================================
interface RouteMatch {
  handler: string;
  params: Record<string, string>;
  query: Record<string, string>;
}

function parseRoute(url: URL): RouteMatch {
  const pathname =
    url.pathname.replace("/cached-data", "").replace(/\/$/, "") || "/";
  const segments = pathname.split("/").filter(Boolean);
  const query: Record<string, string> = {};

  url.searchParams.forEach((value, key) => {
    query[key] = value;
  });

  // Route matching
  // /vehicles
  if (segments.length === 0 || (segments.length === 1 && segments[0] === "")) {
    return { handler: "root", params: {}, query };
  }

  // VEHICLES ROUTES
  if (segments[0] === "vehicles") {
    if (segments.length === 1) {
      return { handler: "vehicles:list", params: {}, query };
    }
    if (segments[1] === "featured") {
      return { handler: "vehicles:featured", params: {}, query };
    }
    if (segments[1] === "categories") {
      return { handler: "vehicles:categories", params: {}, query };
    }
    if (segments[1] === "category-counts") {
      return { handler: "vehicles:categoryCounts", params: {}, query };
    }
    if (segments[1] === "category-pricing") {
      return { handler: "vehicles:categoryPricing", params: {}, query };
    }
    if (segments[1] === "search") {
      return { handler: "vehicles:search", params: {}, query };
    }
    if (segments[1] === "category" && segments[2]) {
      return {
        handler: "vehicles:byCategory",
        params: { category: segments[2] },
        query,
      };
    }
    if (segments[1] === "price-range") {
      return { handler: "vehicles:priceRange", params: {}, query };
    }
    // /vehicles/:id/reviews
    if (segments[2] === "reviews") {
      return {
        handler: "vehicles:reviews",
        params: { id: segments[1] },
        query,
      };
    }
    // /vehicles/:id/review-stats
    if (segments[2] === "review-stats") {
      return {
        handler: "vehicles:reviewStats",
        params: { id: segments[1] },
        query,
      };
    }
    // /vehicles/:id/rates
    if (segments[2] === "rates") {
      return { handler: "vehicles:rates", params: { id: segments[1] }, query };
    }
    // /vehicles/:id
    if (segments.length === 2) {
      return { handler: "vehicles:single", params: { id: segments[1] }, query };
    }
  }

  // CONFIG ROUTES
  if (segments[0] === "config") {
    if (segments.length === 1) {
      return { handler: "config:all", params: {}, query };
    }
    if (segments[1] === "fees") {
      return { handler: "config:fees", params: {}, query };
    }
    if (segments[1] === "timing") {
      return { handler: "config:timing", params: {}, query };
    }
    if (segments[1] === "store-hours") {
      return { handler: "config:storeHours", params: {}, query };
    }
    if (segments[1] === "delivery") {
      return { handler: "config:delivery", params: {}, query };
    }
    if (segments[1] === "extensions") {
      return { handler: "config:extensions", params: {}, query };
    }
    if (segments[1] === "drivers") {
      return { handler: "config:drivers", params: {}, query };
    }
    // /config/:key
    return { handler: "config:single", params: { key: segments[1] }, query };
  }

  // DELIVERY LOCATIONS ROUTES
  if (segments[0] === "delivery-locations") {
    if (segments.length === 1) {
      return { handler: "delivery:all", params: {}, query };
    }
    if (segments[1] === "cities") {
      return { handler: "delivery:cities", params: {}, query };
    }
    if (segments[1] === "city" && segments[2]) {
      return {
        handler: "delivery:byCity",
        params: { city: segments[2] },
        query,
      };
    }
    // /delivery-locations/:id/fee
    if (segments[2] === "fee") {
      return { handler: "delivery:fee", params: { id: segments[1] }, query };
    }
    // /delivery-locations/:id
    return { handler: "delivery:single", params: { id: segments[1] }, query };
  }

  return { handler: "notFound", params: {}, query };
}

// ============================================
// VEHICLE HANDLERS
// ============================================
async function handleVehiclesList(): Promise<unknown> {
  const cacheKey = generateCacheKey(`${CACHE_PREFIX.VEHICLES}:list`);

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .in("status", ["available", "reserved", "rented"])
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    { ttl: CACHE_TTL.VEHICLES_LIST },
  );
}

async function handleVehicleSingle(id: string): Promise<unknown> {
  const cacheKey = generateCacheKey(`${CACHE_PREFIX.VEHICLES}:single`, { id });

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data;
    },
    { ttl: CACHE_TTL.VEHICLE_DETAILS },
  );
}

async function handleVehiclesByCategory(category: string): Promise<unknown> {
  const cacheKey = generateCacheKey(`${CACHE_PREFIX.VEHICLES}:category`, {
    category,
  });

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .in("status", ["available", "reserved", "rented"])
        .eq("category", category)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    { ttl: CACHE_TTL.VEHICLES_LIST },
  );
}

async function handleVehiclesSearch(query: string): Promise<unknown> {
  if (!query || query.length < 1) {
    return [];
  }

  const cacheKey = generateCacheKey(`${CACHE_PREFIX.VEHICLES}:search`, {
    q: query.toLowerCase(),
  });

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const escapedQuery = query.replace(/[%_]/g, "\\$&");

      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .in("status", ["available", "reserved", "rented"])
        .or(`name.ilike.%${escapedQuery}%,category.ilike.%${escapedQuery}%`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;
      return data || [];
    },
    { ttl: CACHE_TTL.VEHICLES_LIST },
  );
}

async function handleVehiclesFeatured(limit: number = 6): Promise<unknown> {
  const safeLimit = Math.min(Math.max(1, limit), 20);
  const cacheKey = generateCacheKey(`${CACHE_PREFIX.VEHICLES}:featured`, {
    limit: safeLimit,
  });

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .in("status", ["available", "reserved", "rented"])
        .order("created_at", { ascending: false })
        .limit(safeLimit);

      if (error) throw error;
      return data || [];
    },
    { ttl: CACHE_TTL.VEHICLES_LIST },
  );
}

async function handleVehiclesCategories(): Promise<unknown> {
  const cacheKey = `${CACHE_PREFIX.VEHICLES}:categories`;

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("category")
        .in("status", ["available", "reserved", "rented"]);

      if (error) throw error;

      const categories = [
        ...new Set(
          (data || []).map((v) => v.category as string).filter(Boolean),
        ),
      ].sort();

      return categories;
    },
    { ttl: CACHE_TTL.VEHICLES_LIST },
  );
}

async function handleVehiclesCategoryCounts(): Promise<unknown> {
  const cacheKey = `${CACHE_PREFIX.VEHICLES}:category-counts`;

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("category")
        .in("status", ["available", "reserved", "rented"]);

      if (error) throw error;

      const counts: Record<string, number> = {};
      (data || []).forEach((vehicle) => {
        const category = vehicle.category as string;
        if (category) {
          counts[category] = (counts[category] || 0) + 1;
        }
      });

      return counts;
    },
    { ttl: CACHE_TTL.VEHICLES_LIST },
  );
}

async function handleVehiclesCategoryPricing(): Promise<unknown> {
  const cacheKey = `${CACHE_PREFIX.VEHICLES}:category-pricing`;

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("category, price, monthly_rate")
        .in("status", ["available", "rented", "reserved"]);

      if (error) throw error;

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
    },
    { ttl: CACHE_TTL.VEHICLES_LIST },
  );
}

async function handleVehiclesPriceRange(
  minPrice: number,
  maxPrice: number,
): Promise<unknown> {
  const cacheKey = generateCacheKey(`${CACHE_PREFIX.VEHICLES}:price-range`, {
    min: minPrice,
    max: maxPrice,
  });

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .in("status", ["available", "reserved", "rented"])
        .gte("price", minPrice)
        .lte("price", maxPrice)
        .order("price", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    { ttl: CACHE_TTL.VEHICLES_LIST },
  );
}

async function handleVehicleRates(vehicleId: string): Promise<unknown> {
  const cacheKey = generateCacheKey(`${CACHE_PREFIX.VEHICLES}:rates`, {
    id: vehicleId,
  });

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("daily_rate, weekly_rate, monthly_rate, semester_rate")
        .eq("id", vehicleId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return {
        dailyRate: Number(data.daily_rate) || 0,
        weeklyRate: Number(data.weekly_rate) || 0,
        monthlyRate: Number(data.monthly_rate) || 0,
        semesterRate: Number(data.semester_rate) || 0,
      };
    },
    { ttl: CACHE_TTL.VEHICLE_DETAILS },
  );
}

// ============================================
// REVIEWS HANDLERS
// ============================================
async function handleVehicleReviews(
  vehicleId: string,
  limit: number = 10,
  offset: number = 0,
): Promise<unknown> {
  const cacheKey = generateCacheKey(`${CACHE_PREFIX.VEHICLES}:reviews`, {
    id: vehicleId,
    limit,
    offset,
  });

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    },
    { ttl: CACHE_TTL.VEHICLES_LIST },
  );
}

async function handleVehicleReviewStats(vehicleId: string): Promise<unknown> {
  const cacheKey = generateCacheKey(`${CACHE_PREFIX.VEHICLES}:review-stats`, {
    id: vehicleId,
  });

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("vehicles")
        .select("average_rating, review_count")
        .eq("id", vehicleId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return {
        averageRating: data.average_rating ? Number(data.average_rating) : null,
        reviewCount: Number(data.review_count) || 0,
      };
    },
    { ttl: CACHE_TTL.VEHICLES_LIST },
  );
}

// ============================================
// CONFIG HANDLERS
// ============================================
async function handleConfigAll(): Promise<unknown> {
  const cacheKey = `${CACHE_PREFIX.CONFIG}:all`;

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase.from("system_config").select("*");

      if (error) throw error;

      // Convert to key-value map
      const configMap: Record<string, unknown> = {};
      (data || []).forEach((item) => {
        configMap[item.key] = item.value;
      });

      return configMap;
    },
    { ttl: CACHE_TTL.SYSTEM_CONFIG },
  );
}

async function handleConfigSingle(key: string): Promise<unknown> {
  const cacheKey = generateCacheKey(`${CACHE_PREFIX.CONFIG}:single`, { key });

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("value")
        .eq("key", key)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }

      return data?.value;
    },
    { ttl: CACHE_TTL.SYSTEM_CONFIG },
  );
}

async function handleConfigByPrefix(prefix: string): Promise<unknown> {
  const cacheKey = generateCacheKey(`${CACHE_PREFIX.CONFIG}:prefix`, {
    prefix,
  });

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("system_config")
        .select("*")
        .ilike("key", `${prefix}%`);

      if (error) throw error;

      const configMap: Record<string, unknown> = {};
      (data || []).forEach((item) => {
        configMap[item.key] = item.value;
      });

      return configMap;
    },
    { ttl: CACHE_TTL.SYSTEM_CONFIG },
  );
}

// ============================================
// DELIVERY LOCATIONS HANDLERS
// ============================================
async function handleDeliveryAll(): Promise<unknown> {
  const cacheKey = `${CACHE_PREFIX.CONFIG}:delivery-locations:all`;

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("delivery_locations")
        .select("*")
        .eq("is_active", true)
        .order("city", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    { ttl: CACHE_TTL.DELIVERY_LOCATIONS },
  );
}

async function handleDeliveryCities(): Promise<unknown> {
  const cacheKey = `${CACHE_PREFIX.CONFIG}:delivery-locations:cities`;

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("delivery_locations")
        .select("city")
        .eq("is_active", true);

      if (error) throw error;

      // Extract unique cities and sort them
      const citySet = new Set<string>();
      (data || []).forEach((d) => {
        if (d.city && typeof d.city === "string") {
          citySet.add(d.city);
        }
      });

      const cities = Array.from(citySet).sort();

      return cities.map((city) => ({
        value: city.toLowerCase().replace(/\s+/g, "-"),
        label: city,
      }));
    },
    { ttl: CACHE_TTL.DELIVERY_LOCATIONS },
  );
}

async function handleDeliveryByCity(city: string): Promise<unknown> {
  const cacheKey = generateCacheKey(
    `${CACHE_PREFIX.CONFIG}:delivery-locations:city`,
    { city },
  );

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("delivery_locations")
        .select("*")
        .eq("is_active", true)
        .ilike("city", city.replace(/-/g, " "))
        .order("name", { ascending: true });

      if (error) throw error;
      return data || [];
    },
    { ttl: CACHE_TTL.DELIVERY_LOCATIONS },
  );
}

async function handleDeliverySingle(id: string): Promise<unknown> {
  const cacheKey = generateCacheKey(
    `${CACHE_PREFIX.CONFIG}:delivery-locations:single`,
    { id },
  );

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("delivery_locations")
        .select("*")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null;
        throw error;
      }
      return data;
    },
    { ttl: CACHE_TTL.DELIVERY_LOCATIONS },
  );
}

async function handleDeliveryFee(id: string): Promise<unknown> {
  const cacheKey = generateCacheKey(
    `${CACHE_PREFIX.CONFIG}:delivery-locations:fee`,
    { id },
  );

  return cacheGetOrSet(
    cacheKey,
    async () => {
      const { data, error } = await supabase
        .from("delivery_locations")
        .select("fee")
        .eq("id", id)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === "PGRST116") return { fee: 0 };
        throw error;
      }
      return { fee: Number(data?.fee) || 0 };
    },
    { ttl: CACHE_TTL.DELIVERY_LOCATIONS },
  );
}

// ============================================
// CACHE INVALIDATION ENDPOINT (Internal Use)
// ============================================
async function handleInvalidate(
  target: string,
  corsHeaders: Record<string, string>,
): Promise<Response> {
  try {
    switch (target) {
      case "vehicles":
        await cacheDelPattern(`${CACHE_PREFIX.VEHICLES}:*`);
        break;
      case "config":
        await cacheDelPattern(`${CACHE_PREFIX.CONFIG}:*`);
        break;
      case "all":
        await cacheDelPattern("*");
        break;
      default:
        await cacheDel(target);
    }

    return jsonResponse({ success: true, invalidated: target }, corsHeaders);
  } catch (error) {
    console.error("[INVALIDATE] Error:", error);
    return errorResponse("Failed to invalidate cache", corsHeaders);
  }
}

// ============================================
// MAIN HANDLER
// ============================================
Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow GET requests (and POST for invalidation)
  if (req.method !== "GET" && req.method !== "POST") {
    return errorResponse("Method not allowed", corsHeaders, 405);
  }

  const url = new URL(req.url);
  const route = parseRoute(url);

  console.log(
    `[CACHED-DATA] ${req.method} ${url.pathname} -> ${route.handler}`,
  );

  try {
    let data: unknown;

    switch (route.handler) {
      // Root
      case "root":
        return jsonResponse(
          {
            service: "4A Rentals Cached Data API",
            version: "1.0.0",
            endpoints: [
              "GET /vehicles",
              "GET /vehicles/:id",
              "GET /vehicles/category/:category",
              "GET /vehicles/search?q=query",
              "GET /vehicles/featured?limit=6",
              "GET /vehicles/categories",
              "GET /vehicles/category-counts",
              "GET /vehicles/category-pricing",
              "GET /vehicles/:id/rates",
              "GET /vehicles/:id/reviews",
              "GET /vehicles/:id/review-stats",
              "GET /config",
              "GET /config/:key",
              "GET /config/fees",
              "GET /config/timing",
              "GET /config/store-hours",
              "GET /config/delivery",
              "GET /delivery-locations",
              "GET /delivery-locations/cities",
              "GET /delivery-locations/city/:city",
              "GET /delivery-locations/:id",
              "GET /delivery-locations/:id/fee",
            ],
          },
          corsHeaders,
        );

      // Vehicles
      case "vehicles:list":
        data = await handleVehiclesList();
        break;
      case "vehicles:single":
        data = await handleVehicleSingle(route.params.id);
        if (data === null) {
          return errorResponse("Vehicle not found", corsHeaders, 404);
        }
        break;
      case "vehicles:byCategory":
        data = await handleVehiclesByCategory(route.params.category);
        break;
      case "vehicles:search":
        data = await handleVehiclesSearch(route.query.q || "");
        break;
      case "vehicles:featured":
        data = await handleVehiclesFeatured(Number(route.query.limit) || 6);
        break;
      case "vehicles:categories":
        data = await handleVehiclesCategories();
        break;
      case "vehicles:categoryCounts":
        data = await handleVehiclesCategoryCounts();
        break;
      case "vehicles:categoryPricing":
        data = await handleVehiclesCategoryPricing();
        break;
      case "vehicles:priceRange":
        data = await handleVehiclesPriceRange(
          Number(route.query.min) || 0,
          Number(route.query.max) || 999999,
        );
        break;
      case "vehicles:rates":
        data = await handleVehicleRates(route.params.id);
        if (data === null) {
          return errorResponse("Vehicle not found", corsHeaders, 404);
        }
        break;
      case "vehicles:reviews":
        data = await handleVehicleReviews(
          route.params.id,
          Number(route.query.limit) || 10,
          Number(route.query.offset) || 0,
        );
        break;
      case "vehicles:reviewStats":
        data = await handleVehicleReviewStats(route.params.id);
        if (data === null) {
          return errorResponse("Vehicle not found", corsHeaders, 404);
        }
        break;

      // Config
      case "config:all":
        data = await handleConfigAll();
        break;
      case "config:single":
        data = await handleConfigSingle(route.params.key);
        break;
      case "config:fees":
        data = await handleConfigByPrefix("fee_");
        break;
      case "config:timing":
        data = await handleConfigByPrefix("timing_");
        break;
      case "config:storeHours":
        data = await handleConfigByPrefix("store_");
        break;
      case "config:delivery":
        data = await handleConfigByPrefix("delivery_");
        break;
      case "config:extensions":
        data = await handleConfigByPrefix("extension_");
        break;
      case "config:drivers":
        data = await handleConfigByPrefix("driver_");
        break;

      // Delivery Locations
      case "delivery:all":
        data = await handleDeliveryAll();
        break;
      case "delivery:cities":
        data = await handleDeliveryCities();
        break;
      case "delivery:byCity":
        data = await handleDeliveryByCity(route.params.city);
        break;
      case "delivery:single":
        data = await handleDeliverySingle(route.params.id);
        if (data === null) {
          return errorResponse("Location not found", corsHeaders, 404);
        }
        break;
      case "delivery:fee":
        data = await handleDeliveryFee(route.params.id);
        break;

      // Invalidation (POST only)
      case "invalidate": {
        if (req.method !== "POST") {
          return errorResponse("Method not allowed", corsHeaders, 405);
        }
        const body = await req.json();
        return handleInvalidate(body.target || "all", corsHeaders);
      }

      // Not Found
      case "notFound":
      default:
        return errorResponse("Endpoint not found", corsHeaders, 404);
    }

    return jsonResponse(data, corsHeaders);
  } catch (error) {
    console.error("[CACHED-DATA] Error:", error);
    return errorResponse("Internal server error", corsHeaders, 500);
  }
});
