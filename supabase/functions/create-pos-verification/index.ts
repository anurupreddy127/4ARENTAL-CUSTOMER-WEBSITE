// supabase/functions/create-pos-verification/index.ts
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
interface CreatePOSVerificationRequest {
  posSessionId: string;
  driverRole: "primary" | "additional";
  driverSequence?: number;
  providedFirstName: string;
  providedLastName: string;
  providedEmail: string;
  providedPhone?: string;
  providedDob: string;
  providedLicenseNumber: string;
  providedAddressLine1?: string;
  providedAddressCity?: string;
  providedAddressState?: string;
  providedAddressPostalCode?: string;
}

// ============================================
// VALIDATION HELPERS
// ============================================
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function isValidDate(dateString: string): boolean {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
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

    console.log(`🔐 Worker ${workerAccount.full_name} creating POS verification`);

    // ============================================
    // 2. PARSE & VALIDATE REQUEST
    // ============================================
    let payload: CreatePOSVerificationRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      posSessionId,
      driverRole,
      driverSequence,
      providedFirstName,
      providedLastName,
      providedEmail,
      providedPhone,
      providedDob,
      providedLicenseNumber,
      providedAddressLine1,
      providedAddressCity,
      providedAddressState,
      providedAddressPostalCode,
    } = payload;

    // Validate required fields
    if (!posSessionId || typeof posSessionId !== "string") {
      return new Response(
        JSON.stringify({ error: "POS session ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!driverRole || !["primary", "additional"].includes(driverRole)) {
      return new Response(
        JSON.stringify({ error: "Invalid driver role - must be 'primary' or 'additional'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!providedFirstName || !providedLastName) {
      return new Response(
        JSON.stringify({ error: "First name and last name are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!providedEmail || !isValidEmail(providedEmail)) {
      return new Response(
        JSON.stringify({ error: "Valid email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!providedDob || !isValidDate(providedDob)) {
      return new Response(
        JSON.stringify({ error: "Valid date of birth is required (YYYY-MM-DD)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!providedLicenseNumber || providedLicenseNumber.trim().length < 4) {
      return new Response(
        JSON.stringify({ error: "Valid driver's license number is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`📋 Creating verification for ${driverRole} driver: ${providedFirstName} ${providedLastName}`);

    // ============================================
    // 3. CHECK FOR EXISTING VALID VERIFICATION
    // ============================================
    const { data: existingVerification } = await supabaseAdmin
      .rpc("check_existing_verification", {
        p_license_number: providedLicenseNumber,
      });

    if (existingVerification && existingVerification.length > 0) {
      const existing = existingVerification[0];
      console.log(`✅ Found existing valid verification for license: ${providedLicenseNumber}`);

      // Create a pending_pos_verification record linked to existing verification
      const { data: pendingRecord, error: pendingError } = await supabaseAdmin
        .from("pending_pos_verifications")
        .insert({
          pos_session_id: posSessionId,
          worker_id: workerAccount.id,
          driver_role: driverRole,
          driver_sequence: driverSequence || (driverRole === "primary" ? 1 : 2),
          provided_first_name: providedFirstName,
          provided_last_name: providedLastName,
          provided_email: providedEmail,
          provided_phone: providedPhone || null,
          provided_dob: providedDob,
          provided_license_number: providedLicenseNumber,
          provided_address_line1: providedAddressLine1 || null,
          provided_address_city: providedAddressCity || null,
          provided_address_state: providedAddressState || null,
          provided_address_postal_code: providedAddressPostalCode || null,
          // Copy verified data from existing verification
          verified_first_name: existing.verified_first_name,
          verified_last_name: existing.verified_last_name,
          verified_dob: existing.verified_dob,
          verified_license_number: existing.verified_license_number,
          license_expiration_date: existing.license_expiration_date,
          verification_status: "verified",
          verified_at: existing.verified_at,
        })
        .select("id")
        .single();

      if (pendingError) {
        console.error("❌ Failed to create pending record:", pendingError);
        return new Response(
          JSON.stringify({ error: "Failed to create verification record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          alreadyVerified: true,
          pendingVerificationId: pendingRecord.id,
          verification: {
            verifiedFirstName: existing.verified_first_name,
            verifiedLastName: existing.verified_last_name,
            verifiedDob: existing.verified_dob,
            verifiedLicenseNumber: existing.verified_license_number,
            licenseExpirationDate: existing.license_expiration_date,
            verifiedAt: existing.verified_at,
            status: "verified",
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 4. CHECK FOR PENDING VERIFICATION IN SAME SESSION
    // ============================================
    const { data: existingPending } = await supabaseAdmin
      .from("pending_pos_verifications")
      .select("id, stripe_verification_session_id, verification_status")
      .eq("pos_session_id", posSessionId)
      .eq("driver_role", driverRole)
      .eq("provided_license_number", providedLicenseNumber)
      .in("verification_status", ["pending", "processing"])
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    // If there's a pending session, try to retrieve it
    if (existingPending && existingPending.stripe_verification_session_id) {
      try {
        const existingSession = await stripe.identity.verificationSessions.retrieve(
          existingPending.stripe_verification_session_id
        );

        // If session is still usable, return it
        if (existingSession.status === "requires_input" && existingSession.client_secret) {
          console.log(`♻️ Reusing existing verification session: ${existingSession.id}`);
          return new Response(
            JSON.stringify({
              clientSecret: existingSession.client_secret,
              pendingVerificationId: existingPending.id,
              sessionId: existingSession.id,
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (err) {
        console.log("ℹ️ Previous session not reusable, creating new one");
      }
    }

    // ============================================
    // 5. CREATE STRIPE VERIFICATION SESSION
    // ============================================
    console.log(`🆕 Creating new Stripe verification session`);

    const verificationSession = await stripe.identity.verificationSessions.create({
      verification_flow: VERIFICATION_FLOW_ID,
      provided_details: {
        email: providedEmail,
      },
      metadata: {
        pos_session_id: posSessionId,
        driver_role: driverRole,
        worker_id: workerAccount.id,
        worker_name: workerAccount.full_name,
        provided_first_name: providedFirstName,
        provided_last_name: providedLastName,
        provided_license_number: providedLicenseNumber,
        is_pos_verification: "true",
      },
    });

    console.log(`✅ Stripe session created: ${verificationSession.id}`);

    // ============================================
    // 6. CREATE PENDING VERIFICATION RECORD
    // ============================================
    const { data: pendingVerification, error: dbError } = await supabaseAdmin
      .from("pending_pos_verifications")
      .insert({
        pos_session_id: posSessionId,
        worker_id: workerAccount.id,
        driver_role: driverRole,
        driver_sequence: driverSequence || (driverRole === "primary" ? 1 : 2),
        provided_first_name: providedFirstName,
        provided_last_name: providedLastName,
        provided_email: providedEmail,
        provided_phone: providedPhone || null,
        provided_dob: providedDob,
        provided_license_number: providedLicenseNumber,
        provided_address_line1: providedAddressLine1 || null,
        provided_address_city: providedAddressCity || null,
        provided_address_state: providedAddressState || null,
        provided_address_postal_code: providedAddressPostalCode || null,
        stripe_verification_session_id: verificationSession.id,
        verification_status: "pending",
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("❌ Database insert error:", dbError);
      // Cancel the Stripe session since we couldn't save it
      await stripe.identity.verificationSessions.cancel(verificationSession.id);
      return new Response(
        JSON.stringify({ error: "Failed to create verification record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`💾 Pending verification record created: ${pendingVerification.id}`);

    // ============================================
    // 7. RETURN CLIENT SECRET
    // ============================================
    return new Response(
      JSON.stringify({
        clientSecret: verificationSession.client_secret,
        pendingVerificationId: pendingVerification.id,
        sessionId: verificationSession.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ POS verification error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to create verification session" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});