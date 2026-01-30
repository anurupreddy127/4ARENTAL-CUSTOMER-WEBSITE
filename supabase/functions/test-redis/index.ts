// supabase/functions/test-redis/index.ts
// Test function to verify Redis connection and cache operations

import { cacheGet, cacheSet, cacheDel, CACHE_TTL } from "../_shared/cache.ts";

// ============================================
// CORS HEADERS
// ============================================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// ============================================
// MAIN HANDLER
// ============================================
Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    tests: {},
  };

  try {
    // ============================================
    // TEST 1: Basic SET operation
    // ============================================
    console.log("[TEST] Starting Redis connection test...");

    const testKey = `test:connection:${Date.now()}`;
    const testValue = {
      message: "Hello from 4A Rentals!",
      timestamp: Date.now(),
    };

    const setResult = await cacheSet(testKey, testValue, {
      ttl: 60, // 1 minute TTL for test
    });

    results.tests = {
      ...(results.tests as object),
      "1_set": {
        success: setResult,
        key: testKey,
        value: testValue,
      },
    };

    // ============================================
    // TEST 2: Basic GET operation
    // ============================================
    const getResult = await cacheGet<typeof testValue>(testKey);

    results.tests = {
      ...(results.tests as object),
      "2_get": {
        success: getResult.hit,
        key: getResult.key,
        value: getResult.data,
        cacheHit: getResult.hit,
      },
    };

    // ============================================
    // TEST 3: Verify data integrity
    // ============================================
    const dataMatches =
      getResult.data?.message === testValue.message &&
      getResult.data?.timestamp === testValue.timestamp;

    results.tests = {
      ...(results.tests as object),
      "3_data_integrity": {
        success: dataMatches,
        expected: testValue,
        received: getResult.data,
      },
    };

    // ============================================
    // TEST 4: DELETE operation
    // ============================================
    const delResult = await cacheDel(testKey);

    results.tests = {
      ...(results.tests as object),
      "4_delete": {
        success: delResult,
        key: testKey,
      },
    };

    // ============================================
    // TEST 5: Verify deletion (should be cache miss)
    // ============================================
    const getAfterDelete = await cacheGet<typeof testValue>(testKey);

    results.tests = {
      ...(results.tests as object),
      "5_verify_deletion": {
        success: !getAfterDelete.hit, // Success if NOT found
        cacheHit: getAfterDelete.hit,
        message: getAfterDelete.hit
          ? "FAIL: Key still exists"
          : "PASS: Key was deleted",
      },
    };

    // ============================================
    // SUMMARY
    // ============================================
    const allTests = results.tests as Record<string, { success: boolean }>;
    const allPassed = Object.values(allTests).every((t) => t.success);

    results.summary = {
      allTestsPassed: allPassed,
      totalTests: Object.keys(allTests).length,
      passedTests: Object.values(allTests).filter((t) => t.success).length,
      message: allPassed
        ? "✅ Redis connection is working perfectly!"
        : "❌ Some tests failed. Check individual results.",
    };

    results.cacheConfig = {
      ttlPresets: CACHE_TTL,
      note: "These are the TTL values configured for different data types",
    };

    console.log("[TEST] Redis test completed:", results.summary);

    return new Response(JSON.stringify(results, null, 2), {
      status: allPassed ? 200 : 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[TEST] Redis test failed:", error);

    return new Response(
      JSON.stringify(
        {
          error: "Redis connection test failed",
          message: error instanceof Error ? error.message : "Unknown error",
          hint: "Check that UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set correctly",
          timestamp: new Date().toISOString(),
        },
        null,
        2,
      ),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
