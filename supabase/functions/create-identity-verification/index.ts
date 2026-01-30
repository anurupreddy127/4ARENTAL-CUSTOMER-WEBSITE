// supabase/functions/create-identity-verification/index.ts
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const VERIFICATION_FLOW_ID = "vf_1Sq4XHQMoDBKzv4abfxy0Eh9";

// ============================================
// ALLOWED ORIGINS (Workers Portal)
// ============================================
const ALLOWED_ORIGINS = [
  "https://workers.4arentals.com",
  "https://admin.4arentals.com",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
];

// ============================================
// CORS HEADERS HELPER
// ============================================
function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") || "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ============================================
// TYPES
// ============================================
interface CreateVerificationRequest {
  driverType: "primary" | "additional";
  driverId: string;
  bookingId: string;
}

interface DriverInfo {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  date_of_birth: string;
  drivers_license: string;
}

// ============================================
// VALIDATION HELPERS
// ============================================
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
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

  // Only allow POST
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const stripe = new Stripe(STRIPE_SECRET_KEY, { apiVersion: "2024-11-20.acacia" });

  try {
    // ============================================
    // 1. AUTHENTICATION - Must be a worker
    // ============================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is an active worker
    const { data: workerAccount, error: workerError } = await supabaseAdmin
      .from("worker_accounts")
      .select("id, full_name, role, is_active")
      .eq("auth_user_id", user.id)
      .single();

    if (workerError || !workerAccount || !workerAccount.is_active) {
      return new Response(
        JSON.stringify({ error: "Unauthorized - Worker account required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`🔐 Worker ${workerAccount.full_name} initiating verification`);

    // ============================================
    // 2. PARSE & VALIDATE REQUEST
    // ============================================
    let payload: CreateVerificationRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { driverType, driverId, bookingId } = payload;

    // Validate driver type
    if (!driverType || !["primary", "additional"].includes(driverType)) {
      return new Response(
        JSON.stringify({ error: "Invalid driver type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate UUIDs
    if (!driverId || !isValidUUID(driverId)) {
      return new Response(
        JSON.stringify({ error: "Invalid driver ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!bookingId || !isValidUUID(bookingId)) {
      return new Response(
        JSON.stringify({ error: "Invalid booking ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 3. FETCH DRIVER INFORMATION
    // ============================================
    const driverTable = driverType === "primary" ? "primary_drivers" : "additional_drivers";
    
    const { data: driver, error: driverError } = await supabaseAdmin
      .from(driverTable)
      .select("id, first_name, last_name, email, date_of_birth, drivers_license, booking_id")
      .eq("id", driverId)
      .eq("booking_id", bookingId)
      .single();

    if (driverError || !driver) {
      console.error("Driver fetch error:", driverError);
      return new Response(
        JSON.stringify({ error: "Driver not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Verifying ${driverType} driver: ${driver.first_name} ${driver.last_name}`);

    // ============================================
    // 4. CHECK FOR EXISTING VALID VERIFICATION
    // ============================================
    const { data: existingVerification } = await supabaseAdmin
      .rpc("check_existing_verification", {
        p_license_number: driver.drivers_license,
      });

    if (existingVerification && existingVerification.length > 0) {
      const existing = existingVerification[0];
      console.log(`✅ Found existing valid verification for license: ${driver.drivers_license}`);
      
      // Update the driver's verified status
      await supabaseAdmin
        .from(driverTable)
        .update({
          is_verified: true,
          verified_by: workerAccount.id,
          verified_at: new Date().toISOString(),
        })
        .eq("id", driverId);

      return new Response(
        JSON.stringify({
          alreadyVerified: true,
          verification: {
            id: existing.verification_id,
            verifiedFirstName: existing.verified_first_name,
            verifiedLastName: existing.verified_last_name,
            verifiedDob: existing.verified_dob,
            verifiedLicenseNumber: existing.verified_license_number,
            licenseExpirationDate: existing.license_expiration_date,
            verifiedAt: existing.verified_at,
            status: existing.status,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 5. CHECK FOR PENDING VERIFICATION
    // ============================================
    const { data: pendingVerification } = await supabaseAdmin
      .from("driver_verifications")
      .select("id, stripe_session_id, status, document_error_retry_count, technical_error_retry_count")
      .eq(driverType === "primary" ? "primary_driver_id" : "additional_driver_id", driverId)
      .eq("booking_id", bookingId)
      .in("status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If there's a pending session, retrieve its client secret
    if (pendingVerification && pendingVerification.stripe_session_id) {
      try {
        const existingSession = await stripe.identity.verificationSessions.retrieve(
          pendingVerification.stripe_session_id
        );

        // If session is still usable, return it
        if (existingSession.status === "requires_input" && existingSession.client_secret) {
          console.log(`♻️ Reusing existing verification session: ${existingSession.id}`);
          return new Response(
            JSON.stringify({
              clientSecret: existingSession.client_secret,
              verificationId: pendingVerification.id,
              sessionId: existingSession.id,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (err) {
        console.log("Previous session not reusable, creating new one");
      }
    }

    // ============================================
    // 6. CREATE STRIPE VERIFICATION SESSION
    // ============================================
    console.log(`🆕 Creating new Stripe verification session`);

    const verificationSession = await stripe.identity.verificationSessions.create({
      verification_flow: VERIFICATION_FLOW_ID,
      provided_details: {
        email: driver.email,
      },
      metadata: {
        driver_type: driverType,
        driver_id: driverId,
        booking_id: bookingId,
        worker_id: workerAccount.id,
        worker_name: workerAccount.full_name,
        provided_first_name: driver.first_name,
        provided_last_name: driver.last_name,
        provided_license_number: driver.drivers_license,
      },
    });

    console.log(`✅ Stripe session created: ${verificationSession.id}`);

    // ============================================
    // 7. CREATE DATABASE RECORD
    // ============================================
    const verificationRecord = {
      driver_type: driverType,
      primary_driver_id: driverType === "primary" ? driverId : null,
      additional_driver_id: driverType === "additional" ? driverId : null,
      booking_id: bookingId,
      stripe_session_id: verificationSession.id,
      status: "pending",
      provided_first_name: driver.first_name,
      provided_last_name: driver.last_name,
      provided_dob: driver.date_of_birth,
      provided_license_number: driver.drivers_license,
      created_by: workerAccount.id,
    };

    const { data: dbVerification, error: dbError } = await supabaseAdmin
      .from("driver_verifications")
      .insert(verificationRecord)
      .select("id")
      .single();

    if (dbError) {
      console.error("Database insert error:", dbError);
      // Cancel the Stripe session since we couldn't save it
      await stripe.identity.verificationSessions.cancel(verificationSession.id);
      return new Response(
        JSON.stringify({ error: "Failed to create verification record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`💾 Verification record created: ${dbVerification.id}`);

    // ============================================
    // 8. RETURN CLIENT SECRET
    // ============================================
    return new Response(
      JSON.stringify({
        clientSecret: verificationSession.client_secret,
        verificationId: dbVerification.id,
        sessionId: verificationSession.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Verification session error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create verification session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});