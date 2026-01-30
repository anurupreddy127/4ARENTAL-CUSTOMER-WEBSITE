// supabase/functions/cancel-terminal-payment/index.ts
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

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
interface CancelTerminalPaymentRequest {
  paymentIntentId: string;
  reason?: string;
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

    console.log(`🚫 Worker ${workerAccount.full_name} canceling terminal payment`);

    // ============================================
    // 2. PARSE & VALIDATE REQUEST
    // ============================================
    let payload: CancelTerminalPaymentRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { paymentIntentId, reason } = payload;

    // Validate payment intent ID format
    if (!paymentIntentId || !paymentIntentId.startsWith("pi_")) {
      return new Response(
        JSON.stringify({ error: "Invalid payment intent ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 3. GET PAYMENT INTENT STATUS
    // ============================================
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    // Check if already in a terminal state
    if (["succeeded", "canceled"].includes(paymentIntent.status)) {
      console.log(`ℹ️ Payment intent already ${paymentIntent.status}`);
      return new Response(
        JSON.stringify({
          success: true,
          alreadyTerminal: true,
          status: paymentIntent.status,
          message: `Payment was already ${paymentIntent.status}`,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 4. CANCEL READER ACTION (if processing)
    // ============================================
    // If the payment is being processed on a reader, we need to cancel the action first
    const { data: posTransaction } = await supabaseAdmin
      .from("pos_transactions")
      .select("reader_id, stripe_reader_id")
      .eq("payment_intent_id", paymentIntentId)
      .single();

    if (posTransaction?.stripe_reader_id) {
      try {
        console.log(`📟 Canceling action on reader: ${posTransaction.stripe_reader_id}`);
        await stripe.terminal.readers.cancelAction(posTransaction.stripe_reader_id);
        console.log(`✅ Reader action canceled`);
      } catch (readerError) {
        // Reader might not have an active action, that's okay
        console.log(`ℹ️ No active reader action to cancel (or already canceled)`);
      }
    }

    // ============================================
    // 5. CANCEL PAYMENT INTENT
    // ============================================
    console.log(`🔄 Canceling payment intent: ${paymentIntentId}`);

    const canceledPaymentIntent = await stripe.paymentIntents.cancel(paymentIntentId, {
      cancellation_reason: "requested_by_customer",
    });

    console.log(`✅ Payment intent canceled`);

    // ============================================
    // 6. UPDATE POS TRANSACTION
    // ============================================
    const { error: updateError } = await supabaseAdmin
      .from("pos_transactions")
      .update({
        status: "canceled",
        failure_reason: reason || "Canceled by worker",
        updated_at: new Date().toISOString(),
      })
      .eq("payment_intent_id", paymentIntentId);

    if (updateError) {
      console.error("⚠️ Failed to update transaction status:", updateError);
      // Don't fail - the payment is already canceled
    }

    // ============================================
    // 7. RETURN RESPONSE
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        paymentIntentId: canceledPaymentIntent.id,
        status: canceledPaymentIntent.status,
        message: "Payment has been canceled",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Cancel terminal payment error:", error);

    // Check for Stripe-specific errors
    if (error instanceof Stripe.errors.StripeError) {
      // Handle specific cancellation errors
      if (error.code === "payment_intent_unexpected_state") {
        return new Response(
          JSON.stringify({
            error: "Payment cannot be canceled in its current state",
            details: error.message,
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Failed to cancel payment",
          details: error.message,
          code: error.code,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Failed to cancel payment" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});