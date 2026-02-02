// supabase/functions/create-terminal-payment-intent/index.ts
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  checkRateLimit,
  rateLimitResponse,
  rateLimitHeaders,
} from "../_shared/ratelimit.ts";

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;

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
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ============================================
// VALIDATION HELPERS
// ============================================
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

// ============================================
// TYPES
// ============================================
interface CreateTerminalPaymentRequest {
  amountCents: number;
  posSessionId: string;
  customerEmail?: string;
  customerName?: string;
  description?: string;
  metadata?: Record<string, string>;
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
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const stripe = new Stripe(STRIPE_SECRET_KEY, {
    apiVersion: "2024-11-20.acacia",
  });

  try {
    // ============================================
    // 1. AUTHENTICATION - Must be a worker
    // ============================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
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
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `💳 Worker ${workerAccount.full_name} creating terminal payment intent`,
    );

    // ============================================
    // 2. RATE LIMITING
    // ============================================
    const rateLimitResult = await checkRateLimit(
      "POS_TRANSACTION",
      workerAccount.id,
    );
    if (!rateLimitResult.success) {
      return rateLimitResponse(
        rateLimitResult,
        corsHeaders,
        "Too many payment requests. Please wait before creating more payments.",
      );
    }

    // ============================================
    // 3. PARSE & VALIDATE REQUEST
    // ============================================
    let payload: CreateTerminalPaymentRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      amountCents,
      posSessionId,
      customerEmail,
      customerName,
      description,
      metadata,
    } = payload;

    // Validate amount
    if (!amountCents || typeof amountCents !== "number" || amountCents <= 0) {
      return new Response(
        JSON.stringify({
          error: "Invalid amount - must be a positive number in cents",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate POS session ID
    if (!posSessionId || typeof posSessionId !== "string") {
      return new Response(
        JSON.stringify({ error: "POS session ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate amount is reasonable (max $50,000)
    if (amountCents > 5000000) {
      return new Response(
        JSON.stringify({ error: "Amount exceeds maximum allowed" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `📋 Creating payment intent for $${(amountCents / 100).toFixed(2)}`,
    );

    // ============================================
    // 4. CREATE STRIPE PAYMENT INTENT
    // ============================================
    // For Terminal payments, we need specific capture_method and payment_method_types
    const paymentIntentParams: Stripe.PaymentIntentCreateParams = {
      amount: amountCents,
      currency: "usd",
      payment_method_types: ["card_present"],
      capture_method: "automatic",
      description: description || "4A Rentals - POS Transaction",
      metadata: {
        pos_session_id: posSessionId,
        worker_id: workerAccount.id,
        worker_name: workerAccount.full_name,
        payment_source: "terminal",
        ...metadata,
      },
    };

    // Add receipt email if provided
    if (customerEmail) {
      paymentIntentParams.receipt_email = customerEmail;
    }

    // Add statement descriptor
    paymentIntentParams.statement_descriptor = "4A RENTALS";
    paymentIntentParams.statement_descriptor_suffix = "RENTAL";

    const paymentIntent =
      await stripe.paymentIntents.create(paymentIntentParams);

    console.log(`✅ Payment intent created: ${paymentIntent.id}`);

    // ============================================
    // 5. CREATE POS TRANSACTION RECORD
    // ============================================
    const { data: posTransaction, error: dbError } = await supabaseAdmin
      .from("pos_transactions")
      .insert({
        worker_id: workerAccount.id,
        payment_intent_id: paymentIntent.id,
        amount_cents: amountCents,
        currency: "usd",
        payment_type: "terminal",
        status: "pending",
        notes: description || null,
      })
      .select("id")
      .single();

    if (dbError) {
      console.error("❌ Database error:", dbError);
      // Cancel the payment intent since we couldn't record it
      await stripe.paymentIntents.cancel(paymentIntent.id);
      return new Response(
        JSON.stringify({ error: "Failed to create transaction record" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`💾 POS transaction record created: ${posTransaction.id}`);

    // ============================================
    // 6. RETURN PAYMENT INTENT
    // ============================================
    return new Response(
      JSON.stringify({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        transactionId: posTransaction.id,
        amount: amountCents,
        status: paymentIntent.status,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
          ...rateLimitHeaders(rateLimitResult),
        },
      },
    );
  } catch (error) {
    console.error("❌ Create terminal payment intent error:", error);

    // Check for Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      return new Response(
        JSON.stringify({
          error: "Payment processing error",
          details: error.message,
          code: error.code,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ error: "Failed to create payment intent" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
