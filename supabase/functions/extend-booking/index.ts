// supabase/functions/extend-booking/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@13.10.0";
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
const CUSTOMER_PORTAL_URL =
  Deno.env.get("CUSTOMER_PORTAL_URL") || "https://4arentals.com";

// ============================================
// ALLOWED ORIGINS (Production)
// ============================================
const ALLOWED_ORIGINS = [
  "https://4arentals.com",
  "https://www.4arentals.com",
  "http://localhost:5173",
  "http://localhost:5174",
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
// TYPES
// ============================================
interface ExtendBookingPayload {
  bookingId: string;
  newReturnDate: string;
}

// ============================================
// INPUT VALIDATION
// ============================================
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
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

  try {
    // Initialize clients
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const stripe = new Stripe(STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16",
    });

    // ============================================
    // 1. AUTHENTICATION
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
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 2. RATE LIMITING
    // ============================================
    const rateLimitResult = await checkRateLimit("BOOKING_EXTEND", user.id);
    if (!rateLimitResult.success) {
      return rateLimitResponse(
        rateLimitResult,
        corsHeaders,
        "Too many extension requests. Please try again later.",
      );
    }

    // ============================================
    // 3. PARSE & VALIDATE REQUEST
    // ============================================
    let payload: ExtendBookingPayload;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bookingId, newReturnDate } = payload;

    // Validate bookingId format
    if (!bookingId || !isValidUUID(bookingId)) {
      return new Response(JSON.stringify({ error: "Invalid booking ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate newReturnDate format
    if (!newReturnDate || !isValidDate(newReturnDate)) {
      return new Response(JSON.stringify({ error: "Invalid return date" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const parsedNewReturnDate = new Date(newReturnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // New return date must be in the future
    if (parsedNewReturnDate <= today) {
      return new Response(
        JSON.stringify({ error: "New return date must be in the future" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 4. FETCH BOOKING (with ownership check)
    // ============================================
    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .select(
        "*, vehicles(id, name, image, daily_rate, weekly_rate, monthly_rate)",
      )
      .eq("id", bookingId)
      .eq("user_id", user.id) // CRITICAL: Only fetch if user owns the booking
      .single();

    if (bookingError || !booking) {
      return new Response(
        JSON.stringify({ error: "Booking not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 5. BUSINESS VALIDATION
    // ============================================
    // Check booking status
    if (booking.status !== "confirmed" && booking.status !== "active") {
      return new Response(
        JSON.stringify({
          error: "Only confirmed or active bookings can be extended",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check rental type
    if (
      booking.rental_type === "weekly" ||
      booking.rental_type === "semester"
    ) {
      return new Response(
        JSON.stringify({
          error:
            "This rental type cannot be extended online. Please contact support.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check extension limit
    if (booking.extension_count >= 5) {
      return new Response(
        JSON.stringify({
          error:
            "Maximum number of extensions reached. Please contact support.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Ensure new return date is after current return date
    const currentReturnDate = new Date(booking.return_date);
    if (parsedNewReturnDate <= currentReturnDate) {
      return new Response(
        JSON.stringify({
          error: "New return date must be after the current return date",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 6. CHECK FOR CONFLICTS
    // ============================================
    // Get buffer days from config
    const { data: bufferConfig } = await supabase
      .from("system_config")
      .select("value")
      .eq("key", "vehicle_buffer_days")
      .single();

    const bufferDays = parseInt(bufferConfig?.value || "2", 10);

    const { data: conflicts } = await supabase
      .from("bookings")
      .select("id")
      .eq("vehicle_id", booking.vehicle_id)
      .neq("id", bookingId)
      .in("status", ["confirmed", "active", "pending"])
      .lt("pickup_date", newReturnDate)
      .gt("return_date", booking.return_date);

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({
          error: "Vehicle is not available for the requested dates",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 7. CALCULATE EXTENSION PRICE SERVER-SIDE
    // ============================================
    // CRITICAL: Never trust price from frontend!
    const { data: priceData, error: priceError } = await supabase.rpc(
      "calculate_extension_price",
      {
        p_vehicle_id: booking.vehicle_id,
        p_current_return_date: booking.return_date.split("T")[0],
        p_new_return_date: newReturnDate.split("T")[0],
      },
    );

    if (priceError || !priceData || priceData.length === 0) {
      console.error("[extend-booking] Price calculation error:", priceError);
      return new Response(
        JSON.stringify({ error: "Failed to calculate extension price" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const extensionPricing = priceData[0];
    const extensionAmount = extensionPricing.rental_amount;
    const additionalDays = extensionPricing.extension_days;

    // Validate calculated price
    if (extensionAmount <= 0 || additionalDays <= 0) {
      return new Response(
        JSON.stringify({ error: "Invalid extension parameters" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Set minimum charge (prevent $0 payments)
    const MIN_CHARGE_CENTS = 50; // $0.50 minimum
    const chargeAmountCents = Math.max(
      Math.round(extensionAmount * 100),
      MIN_CHARGE_CENTS,
    );

    // ============================================
    // 8. GET CUSTOMER EMAIL
    // ============================================
    let customerEmail = user.email;

    // Try to get from customer_info if user.email is missing
    if (!customerEmail && booking.customer_info) {
      let customerInfo = booking.customer_info;
      if (typeof customerInfo === "string") {
        try {
          customerInfo = JSON.parse(customerInfo);
        } catch {
          customerInfo = {};
        }
      }
      customerEmail = customerInfo?.email;
    }

    if (!customerEmail) {
      return new Response(
        JSON.stringify({ error: "Customer email is required for payment" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 9. CREATE STRIPE CHECKOUT SESSION
    // ============================================
    const vehicleName = booking.vehicles?.name || "Vehicle";
    const vehicleImage = Array.isArray(booking.vehicles?.image)
      ? booking.vehicles.image[0]
      : booking.vehicles?.image || "";

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Rental Extension - ${vehicleName}`,
            description: `Extend rental by ${additionalDays} days (New return: ${parsedNewReturnDate.toLocaleDateString()})`,
            ...(vehicleImage && vehicleImage.startsWith("http")
              ? { images: [vehicleImage] }
              : {}),
          },
          unit_amount: chargeAmountCents,
        },
        quantity: 1,
      },
    ];

    // Use environment variable for redirect URL (not request origin)
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      customer_email: customerEmail,
      client_reference_id: `extension_${bookingId}_${Date.now()}`,
      metadata: {
        type: "booking_extension",
        booking_id: bookingId,
        user_id: user.id,
        new_return_date: newReturnDate,
        additional_days: additionalDays.toString(),
        extension_amount: extensionAmount.toFixed(2),
        original_return_date: booking.return_date,
        pricing_method: extensionPricing.pricing_method,
      },
      line_items: lineItems,
      success_url: `${CUSTOMER_PORTAL_URL}/my-bookings?extension=success&booking_id=${bookingId}`,
      cancel_url: `${CUSTOMER_PORTAL_URL}/my-bookings?extension=cancelled&booking_id=${bookingId}`,
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // Session expires in 30 minutes
    });

    console.log("[extend-booking] Stripe session created:", {
      sessionId: session.id,
      bookingId,
      userId: user.id,
      amount: extensionAmount,
      days: additionalDays,
    });

    // ============================================
    // 10. RETURN SUCCESS
    // ============================================
    return new Response(
      JSON.stringify({
        url: session.url,
        sessionId: session.id,
        amount: extensionAmount,
        days: additionalDays,
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
    console.error("[extend-booking] Unexpected error:", error);

    return new Response(
      JSON.stringify({
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
