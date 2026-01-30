// supabase/functions/_shared/cache.ts
// Redis Cache Utility Module for 4A Rentals
// Following Supabase Edge Functions coding rules and Upstash Redis best practices

import { Redis } from "npm:@upstash/redis@1.28.0";

// ============================================
// TYPES
// ============================================
interface CacheConfig {
  ttl?: number;
  prefix?: string;
}

interface CacheResult<T> {
  data: T | null;
  hit: boolean;
  key: string;
}

// ============================================
// CONSTANTS
// ============================================
const DEFAULT_TTL = 300; // 5 minutes
const DEFAULT_PREFIX = "4arentals";

// Cache TTL presets (in seconds)
export const CACHE_TTL = {
  // Customer Portal
  VEHICLES_LIST: 300, // 5 min - available vehicles
  VEHICLE_DETAILS: 300, // 5 min - single vehicle
  DELIVERY_LOCATIONS: 3600, // 1 hour - rarely changes
  SYSTEM_CONFIG: 3600, // 1 hour - pricing, settings
  BUSINESS_CALENDAR: 3600, // 1 hour - business hours

  // Workers Portal
  VEHICLE_COUNTS: 30, // 30 sec - sidebar counts
  BOOKING_LIST: 30, // 30 sec - active bookings
  CUSTOMER_LIST: 120, // 2 min - customer directory
  DASHBOARD_STATS: 60, // 1 min - dashboard metrics
} as const;

// Cache key prefixes for organization
export const CACHE_PREFIX = {
  VEHICLES: "vehicles",
  BOOKINGS: "bookings",
  CUSTOMERS: "customers",
  CONFIG: "config",
  STATS: "stats",
} as const;

// ============================================
// REDIS CLIENT SINGLETON
// ============================================
let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    const url = Deno.env.get("UPSTASH_REDIS_REST_URL");
    const token = Deno.env.get("UPSTASH_REDIS_REST_TOKEN");

    if (!url || !token) {
      throw new Error("Redis credentials not configured");
    }

    redis = new Redis({ url, token });
  }
  return redis;
}

// ============================================
// TTL JITTER (Prevents Cache Stampede)
// ============================================
function getTTLWithJitter(baseTTL: number, jitterPercent = 0.1): number {
  const jitter = baseTTL * jitterPercent;
  return Math.floor(baseTTL + Math.random() * jitter * 2 - jitter);
}

// ============================================
// CACHE OPERATIONS
// ============================================

/**
 * Get a value from cache
 */
export async function cacheGet<T>(
  key: string,
  config: CacheConfig = {},
): Promise<CacheResult<T>> {
  const fullKey = `${config.prefix ?? DEFAULT_PREFIX}:${key}`;

  try {
    const data = await getRedis().get<T>(fullKey);
    return { data, hit: data !== null, key: fullKey };
  } catch (error) {
    console.error(`[CACHE] GET error: ${fullKey}`, error);
    return { data: null, hit: false, key: fullKey };
  }
}

/**
 * Set a value in cache with TTL
 */
export async function cacheSet<T>(
  key: string,
  value: T,
  config: CacheConfig = {},
): Promise<boolean> {
  const fullKey = `${config.prefix ?? DEFAULT_PREFIX}:${key}`;
  const ttl = getTTLWithJitter(config.ttl ?? DEFAULT_TTL);

  try {
    await getRedis().set(fullKey, value, { ex: ttl });
    console.log(`[CACHE] SET: ${fullKey} (TTL: ${ttl}s)`);
    return true;
  } catch (error) {
    console.error(`[CACHE] SET error: ${fullKey}`, error);
    return false;
  }
}

/**
 * Cache-aside pattern: Get from cache or fetch and cache
 * This is the main function you'll use most often
 */
export async function cacheGetOrSet<T>(
  key: string,
  fetcher: () => Promise<T>,
  config: CacheConfig = {},
): Promise<T> {
  // Try cache first
  const cached = await cacheGet<T>(key, config);

  if (cached.hit && cached.data !== null) {
    console.log(`[CACHE] HIT: ${cached.key}`);
    return cached.data;
  }

  console.log(`[CACHE] MISS: ${cached.key}`);

  // Fetch fresh data
  const data = await fetcher();

  // Cache in background (don't block response)
  cacheSet(key, data, config).catch((error) => {
    console.error(`[CACHE] Background SET failed:`, error);
  });

  return data;
}

/**
 * Delete a single cache key
 */
export async function cacheDel(
  key: string,
  config: CacheConfig = {},
): Promise<boolean> {
  const fullKey = `${config.prefix ?? DEFAULT_PREFIX}:${key}`;

  try {
    await getRedis().del(fullKey);
    console.log(`[CACHE] DEL: ${fullKey}`);
    return true;
  } catch (error) {
    console.error(`[CACHE] DEL error: ${fullKey}`, error);
    return false;
  }
}

/**
 * Delete multiple cache keys by pattern
 * Use with caution - scans entire keyspace
 */
export async function cacheDelPattern(
  pattern: string,
  config: CacheConfig = {},
): Promise<number> {
  const fullPattern = `${config.prefix ?? DEFAULT_PREFIX}:${pattern}`;
  let cursor = 0;
  let deleted = 0;

  try {
    do {
      const result = await getRedis().scan(cursor, {
        match: fullPattern,
        count: 100,
      });
      cursor = result[0];
      const keys = result[1];

      if (keys.length > 0) {
        deleted += await getRedis().del(...keys);
      }
    } while (cursor !== 0);

    console.log(`[CACHE] DEL PATTERN: ${fullPattern} (deleted: ${deleted})`);
    return deleted;
  } catch (error) {
    console.error(`[CACHE] DEL PATTERN error: ${fullPattern}`, error);
    return 0;
  }
}

/**
 * Batch GET multiple keys
 */
export async function cacheGetMany<T>(
  keys: string[],
  config: CacheConfig = {},
): Promise<Map<string, T | null>> {
  const prefix = config.prefix ?? DEFAULT_PREFIX;
  const fullKeys = keys.map((k) => `${prefix}:${k}`);

  try {
    const values = await getRedis().mget<(T | null)[]>(...fullKeys);
    const result = new Map<string, T | null>();
    keys.forEach((key, i) => result.set(key, values[i]));
    return result;
  } catch (error) {
    console.error(`[CACHE] MGET error`, error);
    return new Map(keys.map((k) => [k, null]));
  }
}

/**
 * Batch SET multiple keys
 */
export async function cacheSetMany<T>(
  entries: Record<string, T>,
  config: CacheConfig = {},
): Promise<boolean> {
  const prefix = config.prefix ?? DEFAULT_PREFIX;
  const ttl = getTTLWithJitter(config.ttl ?? DEFAULT_TTL);

  try {
    const pipeline = getRedis().pipeline();
    for (const [key, value] of Object.entries(entries)) {
      pipeline.set(`${prefix}:${key}`, value, { ex: ttl });
    }
    await pipeline.exec();
    console.log(`[CACHE] SETMANY: ${Object.keys(entries).length} keys`);
    return true;
  } catch (error) {
    console.error(`[CACHE] SETMANY error`, error);
    return false;
  }
}

// ============================================
// CACHE KEY GENERATORS
// ============================================

/**
 * Generate a cache key from query parameters
 * Ensures consistent key ordering
 */
export function generateCacheKey(
  base: string,
  params: Record<string, unknown> = {},
): string {
  const sortedParams = Object.keys(params)
    .filter((k) => params[k] !== undefined && params[k] !== null)
    .sort()
    .map((k) => `${k}=${JSON.stringify(params[k])}`)
    .join(":");

  return sortedParams ? `${base}:${sortedParams}` : base;
}

// ============================================
// INVALIDATION HELPERS
// ============================================

/**
 * Invalidate all vehicle-related caches
 * Call this when vehicles are added/updated/deleted
 */
export async function invalidateVehicleCaches(
  vehicleId?: string,
): Promise<void> {
  try {
    if (vehicleId) {
      await cacheDel(`${CACHE_PREFIX.VEHICLES}:${vehicleId}`);
    }
    await cacheDelPattern(`${CACHE_PREFIX.VEHICLES}:list:*`);
    await cacheDelPattern(`${CACHE_PREFIX.STATS}:vehicles:*`);
    console.log("[CACHE] Vehicle caches invalidated");
  } catch (error) {
    console.error("[CACHE] Vehicle invalidation error:", error);
  }
}

/**
 * Invalidate all booking-related caches
 * Call this when bookings are created/updated/cancelled
 */
export async function invalidateBookingCaches(
  bookingId?: string,
): Promise<void> {
  try {
    if (bookingId) {
      await cacheDel(`${CACHE_PREFIX.BOOKINGS}:${bookingId}`);
    }
    await cacheDelPattern(`${CACHE_PREFIX.BOOKINGS}:list:*`);
    await cacheDelPattern(`${CACHE_PREFIX.STATS}:bookings:*`);
    await cacheDelPattern(`${CACHE_PREFIX.STATS}:dashboard:*`);
    console.log("[CACHE] Booking caches invalidated");
  } catch (error) {
    console.error("[CACHE] Booking invalidation error:", error);
  }
}

/**
 * Invalidate customer-related caches
 */
export async function invalidateCustomerCaches(
  customerId?: string,
): Promise<void> {
  try {
    if (customerId) {
      await cacheDel(`${CACHE_PREFIX.CUSTOMERS}:${customerId}`);
    }
    await cacheDelPattern(`${CACHE_PREFIX.CUSTOMERS}:list:*`);
    console.log("[CACHE] Customer caches invalidated");
  } catch (error) {
    console.error("[CACHE] Customer invalidation error:", error);
  }
}

/**
 * Invalidate config caches (pricing, settings, etc.)
 */
export async function invalidateConfigCaches(): Promise<void> {
  try {
    await cacheDelPattern(`${CACHE_PREFIX.CONFIG}:*`);
    console.log("[CACHE] Config caches invalidated");
  } catch (error) {
    console.error("[CACHE] Config invalidation error:", error);
  }
}
