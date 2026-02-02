// supabase/functions/process-terminal-payment/index.ts
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
interface ProcessTerminalPaymentRequest {
  paymentIntentId: string;
  readerId: string; // Our database UUID
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
      `📟 Worker ${workerAccount.full_name} processing terminal payment`,
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
        "Too many POS transactions. Please wait before processing more payments.",
      );
    }

    // ============================================
    // 3. PARSE & VALIDATE REQUEST
    // ============================================
    let payload: ProcessTerminalPaymentRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { paymentIntentId, readerId } = payload;

    // Validate payment intent ID format (starts with pi_)
    if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
      return new Response(
        JSON.stringify({ error: "Invalid payment intent ID" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Validate reader ID
    if (!readerId || !isValidUUID(readerId)) {
      return new Response(JSON.stringify({ error: "Invalid reader ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ============================================
    // 4. GET READER FROM DATABASE
    // ============================================
    const { data: reader, error: readerError } = await supabaseAdmin
      .from("terminal_readers")
      .select("id, stripe_reader_id, label, status")
      .eq("id", readerId)
      .single();

    if (readerError || !reader) {
      console.error("❌ Reader not found:", readerError);
      return new Response(JSON.stringify({ error: "Reader not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (reader.status === "maintenance") {
      return new Response(
        JSON.stringify({ error: "Reader is under maintenance" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `📟 Using reader: ${reader.label} (${reader.stripe_reader_id})`,
    );

    // ============================================
    // 5. VERIFY PAYMENT INTENT STATUS
    // ============================================
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    if (paymentIntent.status !== "requires_payment_method") {
      console.error(
        `❌ Invalid payment intent status: ${paymentIntent.status}`,
      );
      return new Response(
        JSON.stringify({
          error: "Payment intent is not ready for processing",
          currentStatus: paymentIntent.status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 6. PROCESS PAYMENT ON READER
    // ============================================
    console.log(`🔄 Sending payment to reader...`);

    // For server-driven integration, we use process_payment_intent
    const readerAction = await stripe.terminal.readers.processPaymentIntent(
      reader.stripe_reader_id,
      {
        payment_intent: paymentIntentId,
      },
    );

    console.log(
      `✅ Payment sent to reader, action: ${readerAction.action?.type}`,
    );

    // ============================================
    // 7. UPDATE POS TRANSACTION STATUS
    // ============================================
    const { error: updateError } = await supabaseAdmin
      .from("pos_transactions")
      .update({
        status: "processing",
        reader_id: reader.id,
        stripe_reader_id: reader.stripe_reader_id,
        updated_at: new Date().toISOString(),
      })
      .eq("payment_intent_id", paymentIntentId);

    if (updateError) {
      console.error("⚠️ Failed to update transaction status:", updateError);
      // Don't fail the request, the payment is already processing
    }

    // ============================================
    // 8. UPDATE READER LAST SEEN
    // ============================================
    await supabaseAdmin
      .from("terminal_readers")
      .update({
        status: "online",
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", reader.id);

    // ============================================
    // 9. RETURN RESPONSE
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        readerId: reader.id,
        readerLabel: reader.label,
        paymentIntentId: paymentIntentId,
        actionType: readerAction.action?.type,
        actionStatus: readerAction.action?.status,
        message: "Payment is being processed on the reader",
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
    console.error("❌ Process terminal payment error:", error);

    // Check for Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      // Handle reader-specific errors
      if (error.code === "terminal_reader_offline") {
        return new Response(
          JSON.stringify({
            error: "Reader is offline",
            code: "reader_offline",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      if (error.code === "terminal_reader_busy") {
        return new Response(
          JSON.stringify({
            error: "Reader is busy with another transaction",
            code: "reader_busy",
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      return new Response(
        JSON.stringify({
          error: "Terminal processing error",
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
      JSON.stringify({ error: "Failed to process payment on reader" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
