// supabase/functions/record-cash-payment/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
interface RecordCashPaymentRequest {
  posSessionId: string;
  amountCents: number;
  cashTenderedCents: number;
  customerName?: string;
  customerEmail?: string;
  description?: string;
  notes?: string;
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

    console.log(`💵 Worker ${workerAccount.full_name} recording cash payment`);

    // ============================================
    // 2. PARSE & VALIDATE REQUEST
    // ============================================
    let payload: RecordCashPaymentRequest;
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
      amountCents, 
      cashTenderedCents, 
      customerName, 
      customerEmail, 
      description, 
      notes 
    } = payload;

    // Validate POS session ID
    if (!posSessionId || typeof posSessionId !== "string") {
      return new Response(
        JSON.stringify({ error: "POS session ID is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amount
    if (!amountCents || typeof amountCents !== "number" || amountCents <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid amount - must be a positive number in cents" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate cash tendered
    if (!cashTenderedCents || typeof cashTenderedCents !== "number" || cashTenderedCents <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid cash tendered - must be a positive number in cents" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate cash tendered is enough
    if (cashTenderedCents < amountCents) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient cash tendered",
          required: amountCents,
          tendered: cashTenderedCents,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate amount is reasonable (max $50,000)
    if (amountCents > 5000000) {
      return new Response(
        JSON.stringify({ error: "Amount exceeds maximum allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Calculate change
    const changeCents = cashTenderedCents - amountCents;

    console.log(`📋 Recording cash payment: $${(amountCents / 100).toFixed(2)}, Tendered: $${(cashTenderedCents / 100).toFixed(2)}, Change: $${(changeCents / 100).toFixed(2)}`);

    // ============================================
    // 3. CREATE POS TRANSACTION RECORD
    // ============================================
    const transactionNotes = [
      description || "Cash payment",
      notes,
      customerName ? `Customer: ${customerName}` : null,
      customerEmail ? `Email: ${customerEmail}` : null,
    ].filter(Boolean).join(" | ");

    const { data: posTransaction, error: dbError } = await supabaseAdmin
      .from("pos_transactions")
      .insert({
        worker_id: workerAccount.id,
        amount_cents: amountCents,
        currency: "usd",
        payment_type: "cash",
        status: "succeeded",
        cash_tendered_cents: cashTenderedCents,
        cash_change_cents: changeCents,
        notes: transactionNotes || null,
        completed_at: new Date().toISOString(),
      })
      .select("id, created_at")
      .single();

    if (dbError) {
      console.error("❌ Database error:", dbError);
      return new Response(
        JSON.stringify({ error: "Failed to record cash payment" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`✅ Cash payment recorded: ${posTransaction.id}`);

    // ============================================
    // 4. RETURN RESPONSE
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        transactionId: posTransaction.id,
        amountCents: amountCents,
        cashTenderedCents: cashTenderedCents,
        changeCents: changeCents,
        status: "succeeded",
        createdAt: posTransaction.created_at,
        message: `Cash payment of $${(amountCents / 100).toFixed(2)} recorded. Change due: $${(changeCents / 100).toFixed(2)}`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Record cash payment error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to record cash payment" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});