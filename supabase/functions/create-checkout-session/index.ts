// supabase/functions/create-checkout-session/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import Stripe from "npm:stripe@14.21.0";

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const CUSTOMER_PORTAL_URL = Deno.env.get("CUSTOMER_PORTAL_URL") || "https://4arentals.com";

// ============================================
// ALLOWED ORIGINS
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
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, baggage, sentry-trace",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ============================================
// RATE LIMITING
// ============================================
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_HOUR = 10;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(userId, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_HOUR) {
    return false;
  }

  entry.count++;
  return true;
}

// ============================================
// VALIDATION HELPERS
// ============================================
function isValidUUID(str: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidDate(dateStr: string): boolean {
  const date = new Date(dateStr);
  return date instanceof Date && !isNaN(date.getTime());
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\(\)\+]{7,20}$/;
  return phoneRegex.test(phone);
}

function sanitizeString(str: string, maxLength: number = 200): string {
  return str.slice(0, maxLength).trim();
}

// ============================================
// FORMATTING HELPERS
// ============================================
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatRentalType(rentalType: string, rentalDays: number): string {
  switch (rentalType) {
    case "semester":
      return `Semester Rental (${rentalDays} days)`;
    case "monthly":
      const months = Math.floor(rentalDays / 30);
      const monthOverflow = rentalDays % 30;
      if (monthOverflow > 0) {
        return `${months} month${months > 1 ? "s" : ""} + ${monthOverflow} day${monthOverflow > 1 ? "s" : ""} (${rentalDays} days)`;
      }
      return `${months} month${months > 1 ? "s" : ""} (${rentalDays} days)`;
    case "weekly":
    default:
      const weeks = Math.floor(rentalDays / 7);
      const weekOverflow = rentalDays % 7;
      if (weekOverflow > 0) {
        return `${weeks} week${weeks > 1 ? "s" : ""} + ${weekOverflow} day${weekOverflow > 1 ? "s" : ""} (${rentalDays} days)`;
      }
      return `${weeks} week${weeks > 1 ? "s" : ""} (${rentalDays} days)`;
  }
}

function getRentalTypeEmoji(rentalType: string): string {
  switch (rentalType) {
    case "semester":
      return "🎓";
    case "monthly":
      return "📅";
    case "weekly":
    default:
      return "📆";
  }
}

// ============================================
// TYPES
// ============================================
interface PrimaryDriverInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driversLicenseNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
  isAccountHolder?: boolean;
}

interface AdditionalDriverInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  driversLicenseNumber: string;
  dateOfBirth: string;
  streetAddress: string;
  city: string;
  state: string;
  zipCode: string;
}

interface CreateCheckoutRequest {
  vehicleId: string;
  pickupType: "store" | "delivery";
  pickupLocation: string;
  deliveryLocationId?: string;
  deliveryTimeSlot?: string;
  pickupDate: string;
  returnDate: string;
  isStudentBooking?: boolean;
  studentIdUrl?: string;
  primaryDriver: PrimaryDriverInput;
  additionalDrivers?: AdditionalDriverInput[];
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

  let createdBookingId: string | null = null;
  let createdPrimaryDriverId: string | null = null;

  try {
    // ============================================
    // 1. AUTHENTICATION (REQUIRED!)
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
        JSON.stringify({ error: "Invalid or expired session. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("📝 Creating checkout for authenticated user:", user.id);

    // ============================================
    // 2. RATE LIMITING
    // ============================================
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: "Too many booking attempts. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 3. PARSE & VALIDATE REQUEST
    // ============================================
    let payload: CreateCheckoutRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const {
      vehicleId,
      pickupType,
      pickupLocation,
      deliveryLocationId,
      deliveryTimeSlot,
      pickupDate,
      returnDate,
      isStudentBooking,
      studentIdUrl,
      primaryDriver,
      additionalDrivers,
    } = payload;

    // Validate vehicleId
    if (!vehicleId || !isValidUUID(vehicleId)) {
      return new Response(
        JSON.stringify({ error: "Invalid vehicle ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate dates
    if (!pickupDate || !returnDate || !isValidDate(pickupDate) || !isValidDate(returnDate)) {
      return new Response(
        JSON.stringify({ error: "Invalid pickup or return date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const parsedPickupDate = new Date(pickupDate);
    const parsedReturnDate = new Date(returnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (parsedPickupDate < today) {
      return new Response(
        JSON.stringify({ error: "Pickup date cannot be in the past" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (parsedReturnDate <= parsedPickupDate) {
      return new Response(
        JSON.stringify({ error: "Return date must be after pickup date" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate pickup type
    if (!["store", "delivery"].includes(pickupType)) {
      return new Response(
        JSON.stringify({ error: "Invalid pickup type" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate delivery location if delivery
    if (pickupType === "delivery" && deliveryLocationId && !isValidUUID(deliveryLocationId)) {
      return new Response(
        JSON.stringify({ error: "Invalid delivery location" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate primary driver
    if (!primaryDriver) {
      return new Response(
        JSON.stringify({ error: "Primary driver information is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!primaryDriver.firstName || !primaryDriver.lastName) {
      return new Response(
        JSON.stringify({ error: "Primary driver name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!primaryDriver.email || !isValidEmail(primaryDriver.email)) {
      return new Response(
        JSON.stringify({ error: "Valid primary driver email is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!primaryDriver.phone || !isValidPhone(primaryDriver.phone)) {
      return new Response(
        JSON.stringify({ error: "Valid primary driver phone is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate additional drivers (limit to 3)
    if (additionalDrivers && additionalDrivers.length > 3) {
      return new Response(
        JSON.stringify({ error: "Maximum 3 additional drivers allowed" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 4. FETCH VEHICLE & VERIFY AVAILABILITY
    // ============================================
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from("vehicles")
      .select("*")
      .eq("id", vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return new Response(
        JSON.stringify({ error: "Vehicle not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (vehicle.status !== "available") {
      return new Response(
        JSON.stringify({ error: "Vehicle is not available for booking" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check for conflicting bookings
    const { data: conflicts } = await supabaseAdmin
      .from("bookings")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .in("status", ["pending", "confirmed", "active"])
      .or(`and(pickup_date.lte.${returnDate},return_date.gte.${pickupDate})`);

    if (conflicts && conflicts.length > 0) {
      return new Response(
        JSON.stringify({ error: "Vehicle is not available for the selected dates" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 5. CALCULATE PRICE SERVER-SIDE (CRITICAL!)
    // ============================================
    // NEVER trust prices from frontend!
    const { data: pricingData, error: pricingError } = await supabaseAdmin.rpc(
      "calculate_booking_total",
      {
        p_vehicle_id: vehicleId,
        p_pickup_date: pickupDate.split("T")[0],
        p_return_date: returnDate.split("T")[0],
        p_is_student: isStudentBooking || false,
        p_delivery_fee: 0, // Will calculate separately
        p_additional_drivers: additionalDrivers?.length || 0,
      }
    );

    if (pricingError || !pricingData || pricingData.length === 0) {
      console.error("Pricing calculation error:", pricingError);
      return new Response(
        JSON.stringify({ error: "Failed to calculate booking price" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pricing = pricingData[0];
    console.log("📊 Server-calculated pricing:", pricing);

    // Calculate delivery fee if applicable
    let deliveryFee = 0;
    if (pickupType === "delivery" && deliveryLocationId) {
      const { data: deliveryLocation } = await supabaseAdmin
        .from("delivery_locations")
        .select("fee")
        .eq("id", deliveryLocationId)
        .eq("is_active", true)
        .single();

      if (deliveryLocation) {
        deliveryFee = deliveryLocation.fee || 0;
      }
    }

    // Final amounts (all server-calculated)
    const rentalAmount = pricing.rental_amount;
    const securityDeposit = pricing.security_deposit;
    const additionalDriverFee = pricing.additional_driver_fee;
    const totalAmount = rentalAmount + securityDeposit + deliveryFee + additionalDriverFee;

    // Minimum charge validation
    if (totalAmount < 1) {
      return new Response(
        JSON.stringify({ error: "Invalid booking amount" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("💰 Final pricing:", {
      rentalAmount,
      securityDeposit,
      deliveryFee,
      additionalDriverFee,
      totalAmount,
    });

    // ============================================
    // 6. CREATE BOOKING IN DATABASE
    // ============================================
    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        user_id: user.id, // Use authenticated user ID, NOT from payload!
        vehicle_id: vehicleId,
        pickup_location: sanitizeString(pickupLocation || "Store Pickup"),
        pickup_date: pickupDate,
        return_date: returnDate,
        pickup_type: pickupType,
        delivery_location_id: deliveryLocationId || null,
        delivery_fee: deliveryFee,
        delivery_time_slot: deliveryTimeSlot || null,
        rental_type: pricing.rental_type,
        rental_days: pricing.rental_days,
        pricing_method: pricing.pricing_method,
        daily_rate: pricing.daily_rate,
        weekly_rate: pricing.weekly_rate,
        monthly_rate: pricing.monthly_rate,
        rental_amount: rentalAmount.toString(),
        security_deposit: securityDeposit.toString(),
        additional_driver_fee: additionalDriverFee.toString(),
        total_price: totalAmount.toString(),
        is_student_booking: isStudentBooking || false,
        student_id_url: studentIdUrl || null,
        student_verified: false,
        status: "pending",
        payment_status: "pending",
        parent_booking_id: null,
        extension_number: 0,
        extension_count: 0,
        insurance_uploaded: false,
        insurance_verified: false,
        customer_info: JSON.stringify({
          firstName: sanitizeString(primaryDriver.firstName),
          lastName: sanitizeString(primaryDriver.lastName),
          email: primaryDriver.email.toLowerCase(),
          phone: primaryDriver.phone,
        }),
      })
      .select()
      .single();

    if (bookingError) {
      console.error("Booking creation error:", bookingError);
      return new Response(
        JSON.stringify({ error: "Failed to create booking" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    createdBookingId = booking.id;
    console.log("✅ Booking created:", booking.id, "Number:", booking.booking_number);

    // ============================================
    // 7. CREATE PRIMARY DRIVER RECORD
    // ============================================
    const { data: primaryDriverRecord, error: primaryDriverError } = await supabaseAdmin
      .from("primary_drivers")
      .insert({
        booking_id: booking.id,
        user_id: primaryDriver.isAccountHolder ? user.id : null,
        first_name: sanitizeString(primaryDriver.firstName),
        last_name: sanitizeString(primaryDriver.lastName),
        email: primaryDriver.email.toLowerCase(),
        phone: primaryDriver.phone,
        drivers_license: sanitizeString(primaryDriver.driversLicenseNumber),
        date_of_birth: primaryDriver.dateOfBirth,
        street_address: sanitizeString(primaryDriver.streetAddress),
        city: sanitizeString(primaryDriver.city),
        state: sanitizeString(primaryDriver.state),
        zip_code: sanitizeString(primaryDriver.zipCode),
        is_account_holder: primaryDriver.isAccountHolder || false,
        is_verified: false,
      })
      .select()
      .single();

    if (primaryDriverError) {
      console.error("Primary driver creation error:", primaryDriverError);
      // Rollback booking
      await supabaseAdmin.from("bookings").delete().eq("id", booking.id);
      return new Response(
        JSON.stringify({ error: "Failed to save driver information" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    createdPrimaryDriverId = primaryDriverRecord.id;

    // ============================================
    // 8. CREATE ADDITIONAL DRIVER RECORDS
    // ============================================
    if (additionalDrivers && additionalDrivers.length > 0) {
      const additionalDriverRecords = additionalDrivers.map((driver) => ({
        booking_id: booking.id,
        user_id: null,
        first_name: sanitizeString(driver.firstName),
        last_name: sanitizeString(driver.lastName),
        email: driver.email.toLowerCase(),
        phone: driver.phone,
        drivers_license: sanitizeString(driver.driversLicenseNumber),
        date_of_birth: driver.dateOfBirth,
        street_address: sanitizeString(driver.streetAddress),
        city: sanitizeString(driver.city),
        state: sanitizeString(driver.state),
        zip_code: sanitizeString(driver.zipCode),
        is_verified: false,
      }));

      const { error: additionalDriversError } = await supabaseAdmin
        .from("additional_drivers")
        .insert(additionalDriverRecords);

      if (additionalDriversError) {
        console.error("Additional drivers creation error:", additionalDriversError);
        // Rollback
        await supabaseAdmin.from("primary_drivers").delete().eq("id", primaryDriverRecord.id);
        await supabaseAdmin.from("bookings").delete().eq("id", booking.id);
        return new Response(
          JSON.stringify({ error: "Failed to save additional driver information" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // ============================================
    // 9. BUILD STRIPE LINE ITEMS
    // ============================================
    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = [];

    const rentalTypeEmoji = getRentalTypeEmoji(pricing.rental_type);
    const durationText = formatRentalType(pricing.rental_type, pricing.rental_days);
    const pickupLocationText = pickupType === "delivery" 
      ? "Delivery to your location" 
      : `Pick up at ${pickupLocation}`;

    const rentalDescription = [
      `${rentalTypeEmoji} ${durationText}`,
      `📅 ${formatDate(pickupDate)} - ${formatDate(returnDate)}`,
      `📍 ${pickupLocationText}`,
      isStudentBooking ? "🎓 Student pricing applied" : "",
    ].filter(Boolean).join("\n");

    const vehicleImage = Array.isArray(vehicle.image) ? vehicle.image[0] : vehicle.image;

    lineItems.push({
      price_data: {
        currency: "usd",
        product_data: {
          name: `${vehicle.name} - ${pricing.rental_type === "semester" ? "Semester" : pricing.rental_type === "monthly" ? "Monthly" : "Weekly"} Rental`,
          description: rentalDescription,
          images: vehicleImage && vehicleImage.startsWith("http") ? [vehicleImage] : [],
        },
        unit_amount: Math.round(rentalAmount * 100),
      },
      quantity: 1,
    });

    if (securityDeposit > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "🔒 Security Deposit",
            description: "Refundable upon vehicle return in good condition",
          },
          unit_amount: Math.round(securityDeposit * 100),
        },
        quantity: 1,
      });
    }

    if (deliveryFee > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: "🚚 Delivery Fee",
            description: deliveryTimeSlot ? `Delivery at ${deliveryTimeSlot}` : "Vehicle delivery",
          },
          unit_amount: Math.round(deliveryFee * 100),
        },
        quantity: 1,
      });
    }

    if (additionalDriverFee > 0 && additionalDrivers && additionalDrivers.length > 0) {
      lineItems.push({
        price_data: {
          currency: "usd",
          product_data: {
            name: `👥 Additional Driver${additionalDrivers.length > 1 ? "s" : ""} (${additionalDrivers.length})`,
            description: `Additional authorized drivers`,
          },
          unit_amount: Math.round(additionalDriverFee * 100),
        },
        quantity: 1,
      });
    }

    // ============================================
    // 10. CREATE STRIPE CHECKOUT SESSION
    // ============================================
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${CUSTOMER_PORTAL_URL}/booking-success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
      cancel_url: `${CUSTOMER_PORTAL_URL}/vehicles/${vehicleId}?canceled=true`,
      customer_email: primaryDriver.email.toLowerCase(),
      billing_address_collection: "auto",
      phone_number_collection: { enabled: true },
      expires_at: Math.floor(Date.now() / 1000) + 30 * 60, // 30 minutes
      metadata: {
        bookingId: booking.id,
        bookingNumber: booking.booking_number || "",
        vehicleId: vehicleId,
        vehicleName: vehicle.name,
        userId: user.id,
        primaryDriverId: primaryDriverRecord.id,
        primaryDriverName: `${primaryDriver.firstName} ${primaryDriver.lastName}`,
        additionalDriversCount: (additionalDrivers?.length || 0).toString(),
        rentalType: pricing.rental_type,
        rentalDays: pricing.rental_days.toString(),
        pricingMethod: pricing.pricing_method,
        isStudentBooking: isStudentBooking ? "true" : "false",
        pickupDate: pickupDate,
        returnDate: returnDate,
        pickupLocation: pickupLocation || "Store",
        pickupType: pickupType,
        // Store server-calculated amounts for webhook verification
        serverRentalAmount: rentalAmount.toString(),
        serverSecurityDeposit: securityDeposit.toString(),
        serverTotalAmount: totalAmount.toString(),
      },
      custom_text: {
        submit: {
          message: isStudentBooking
            ? "Your booking will be confirmed after payment. Please bring a valid student ID at pickup."
            : "Your booking will be confirmed immediately after payment.",
        },
      },
    });

    // Update booking with stripe session ID
    await supabaseAdmin
      .from("bookings")
      .update({ stripe_session_id: session.id })
      .eq("id", booking.id);

    console.log("✅ Checkout session created:", session.id);

    // ============================================
    // 11. RETURN SUCCESS
    // ============================================
    return new Response(
      JSON.stringify({
        url: session.url,
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Checkout error:", error);

    // Cleanup on error
    if (createdPrimaryDriverId) {
      await supabaseAdmin.from("primary_drivers").delete().eq("id", createdPrimaryDriverId);
    }
    if (createdBookingId) {
      await supabaseAdmin.from("bookings").delete().eq("id", createdBookingId);
    }

    return new Response(
      JSON.stringify({ error: "Failed to create checkout session. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});