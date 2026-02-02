// supabase/functions/complete-pos-booking/index.ts
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
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

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
// TYPES
// ============================================
interface CustomerData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  driversLicense: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  isStudent?: boolean;
}

interface AdditionalDriverData {
  pendingVerificationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  driversLicense: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  relationship?: string;
}

interface PricingData {
  rentalType: "weekly" | "monthly" | "semester";
  rentalDays: number;
  dailyRate?: number;
  weeklyRate?: number;
  monthlyRate?: number;
  rentalAmount: number;
  securityDeposit: number;
  deliveryFee: number;
  additionalDriverFee: number;
  totalPrice: number;
  pricingMethod?: string;
}

interface PaymentData {
  method: "terminal" | "cash" | "split";
  terminalTransactionId?: string;
  terminalAmountCents?: number;
  cashAmountCents?: number;
  cashTenderedCents?: number;
  cashChangeCents?: number;
  totalAmountCents: number;
}

interface CompletePOSBookingRequest {
  posSessionId: string;
  customerData: CustomerData;
  primaryVerificationId: string;
  vehicleId: string;
  pickupDate: string;
  returnDate: string;
  pickupType: "store" | "delivery";
  deliveryLocationId?: string;
  deliveryTimeSlot?: string;
  pricingData: PricingData;
  paymentData: PaymentData;
  signatureData: string;
  additionalDrivers?: AdditionalDriverData[];
  adminNotes?: string;
}

// ============================================
// VALIDATION HELPERS
// ============================================
function isValidUUID(str: string): boolean {
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function generateBookingNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `4A-${timestamp}-${random}`;
}

function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// ============================================
// EMAIL FUNCTION
// ============================================
async function sendPOSBookingConfirmationEmail(
  customerEmail: string,
  customerName: string,
  bookingNumber: string,
  vehicleName: string,
  pickupDate: string,
  returnDate: string,
  totalPrice: number,
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not configured, skipping email");
    return;
  }

  const safeCustomerName = sanitizeHtml(customerName);
  const safeVehicleName = sanitizeHtml(vehicleName);
  const safeBookingNumber = sanitizeHtml(bookingNumber);

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #D4AF37; border-bottom: 3px solid #D4AF37; padding-bottom: 10px;">
        🚗 Your Rental is Confirmed!
      </h2>
      
      <p>Hi ${safeCustomerName},</p>
      
      <p>Thank you for choosing 4A Rentals! Your rental has been confirmed and is now active.</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>📋 Booking Number:</strong> ${safeBookingNumber}</p>
        <p style="margin: 5px 0;"><strong>🚗 Vehicle:</strong> ${safeVehicleName}</p>
        <p style="margin: 5px 0;"><strong>📅 Pickup Date:</strong> ${formatDate(pickupDate)}</p>
        <p style="margin: 5px 0;"><strong>📅 Return Date:</strong> ${formatDate(returnDate)}</p>
        <p style="margin: 5px 0;"><strong>💰 Total Paid:</strong> ${formatCurrency(totalPrice)}</p>
      </div>
      
      <div style="background: #fff9e6; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>📄 Insurance Reminder</strong></p>
        <p style="margin: 10px 0 0 0;">Please remember to upload your insurance documents if you haven't already. You can do this through your account portal.</p>
      </div>
      
      <p style="margin-top: 30px;">Enjoy your rental!</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px;">
        Best regards,<br>
        <strong>4A Rentals Team</strong><br>
        Questions? Contact us at support@4arentals.com
      </p>
    </div>
  `;

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "4A Rentals <bookings@4arentals.com>",
        to: [customerEmail],
        subject: `✅ Rental Confirmed - ${safeBookingNumber}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      console.error("❌ Failed to send email:", await response.text());
    } else {
      console.log("✅ Confirmation email sent to:", customerEmail);
    }
  } catch (error) {
    console.error("❌ Email error:", error);
  }
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

    console.log(`📝 Worker ${workerAccount.full_name} completing POS booking`);

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
        "Too many booking requests. Please wait before completing more bookings.",
      );
    }

    // ============================================
    // 3. PARSE & VALIDATE REQUEST
    // ============================================
    let payload: CompletePOSBookingRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request body" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const {
      posSessionId,
      customerData,
      primaryVerificationId,
      vehicleId,
      pickupDate,
      returnDate,
      pickupType,
      deliveryLocationId,
      deliveryTimeSlot,
      pricingData,
      paymentData,
      signatureData,
      additionalDrivers,
      adminNotes,
    } = payload;

    // Validate required fields
    if (!posSessionId) {
      return new Response(
        JSON.stringify({ error: "POS session ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (
      !customerData ||
      !customerData.email ||
      !isValidEmail(customerData.email)
    ) {
      return new Response(
        JSON.stringify({ error: "Valid customer data with email is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!primaryVerificationId || !isValidUUID(primaryVerificationId)) {
      return new Response(
        JSON.stringify({ error: "Valid primary verification ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!vehicleId || !isValidUUID(vehicleId)) {
      return new Response(
        JSON.stringify({ error: "Valid vehicle ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!pickupDate || !returnDate) {
      return new Response(
        JSON.stringify({ error: "Pickup and return dates are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!pricingData || !paymentData) {
      return new Response(
        JSON.stringify({ error: "Pricing and payment data are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!signatureData) {
      return new Response(
        JSON.stringify({ error: "Customer signature is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 4. VERIFY PRIMARY DRIVER VERIFICATION
    // ============================================
    const { data: primaryVerification, error: verificationError } =
      await supabaseAdmin
        .from("pending_pos_verifications")
        .select("*")
        .eq("id", primaryVerificationId)
        .eq("pos_session_id", posSessionId)
        .eq("driver_role", "primary")
        .single();

    if (verificationError || !primaryVerification) {
      console.error("❌ Primary verification not found:", verificationError);
      return new Response(
        JSON.stringify({ error: "Primary driver verification not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Check verification status
    if (
      !["verified", "overridden"].includes(
        primaryVerification.verification_status,
      )
    ) {
      return new Response(
        JSON.stringify({
          error: "Primary driver verification is not complete",
          status: primaryVerification.verification_status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`✅ Primary verification valid: ${primaryVerification.id}`);

    // ============================================
    // 5. VERIFY VEHICLE AVAILABILITY
    // ============================================
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from("vehicles")
      .select("id, name, status, category")
      .eq("id", vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return new Response(JSON.stringify({ error: "Vehicle not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (vehicle.status !== "available") {
      return new Response(
        JSON.stringify({
          error: "Vehicle is not available",
          currentStatus: vehicle.status,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(`✅ Vehicle available: ${vehicle.name}`);

    // ============================================
    // 6. FIND OR CREATE USER
    // ============================================
    let userId: string | null = null;

    // Check if user exists with this email
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      (u) => u.email?.toLowerCase() === customerData.email.toLowerCase(),
    );

    if (existingUser) {
      userId = existingUser.id;
      console.log(`👤 Found existing user: ${userId}`);

      // Update user profile with latest info
      await supabaseAdmin.from("user_profiles").upsert({
        id: userId,
        first_name: customerData.firstName,
        last_name: customerData.lastName,
        phone: customerData.phone,
        date_of_birth: customerData.dateOfBirth,
        drivers_license_number: customerData.driversLicense,
        street_address: customerData.streetAddress || null,
        city: customerData.city || null,
        state: customerData.state || null,
        zip_code: customerData.zipCode || null,
        updated_at: new Date().toISOString(),
      });
    } else {
      // Create new user (without password - they can reset later)
      const tempPassword = crypto.randomUUID();
      const { data: newUser, error: createUserError } =
        await supabaseAdmin.auth.admin.createUser({
          email: customerData.email,
          password: tempPassword,
          email_confirm: true,
          user_metadata: {
            first_name: customerData.firstName,
            last_name: customerData.lastName,
            created_via: "pos_walk_in",
          },
        });

      if (createUserError) {
        console.error("❌ Failed to create user:", createUserError);
        // Continue without user - booking can still be created
      } else {
        userId = newUser.user.id;
        console.log(`👤 Created new user: ${userId}`);

        // Create user profile
        await supabaseAdmin.from("user_profiles").insert({
          id: userId,
          first_name: customerData.firstName,
          last_name: customerData.lastName,
          phone: customerData.phone,
          date_of_birth: customerData.dateOfBirth,
          drivers_license_number: customerData.driversLicense,
          street_address: customerData.streetAddress || null,
          city: customerData.city || null,
          state: customerData.state || null,
          zip_code: customerData.zipCode || null,
        });
      }
    }

    // ============================================
    // 7. CREATE BOOKING
    // ============================================
    const bookingNumber = generateBookingNumber();

    const customerInfo = {
      firstName: customerData.firstName,
      lastName: customerData.lastName,
      email: customerData.email,
      phone: customerData.phone,
      dateOfBirth: customerData.dateOfBirth,
      driversLicense: customerData.driversLicense,
      address: customerData.streetAddress
        ? {
            street: customerData.streetAddress,
            city: customerData.city,
            state: customerData.state,
            zipCode: customerData.zipCode,
          }
        : null,
      isStudent: customerData.isStudent || false,
    };

    const bookingData = {
      user_id: userId,
      vehicle_id: vehicleId,
      booking_number: bookingNumber,
      pickup_location: "4A Rentals Store",
      pickup_date: pickupDate,
      return_date: returnDate,
      pickup_type: pickupType,
      delivery_location_id: deliveryLocationId || null,
      delivery_time_slot: deliveryTimeSlot || null,
      delivery_fee: pricingData.deliveryFee || 0,
      status: "active", // Walk-in bookings are immediately active
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      customer_info: customerInfo,
      rental_type: pricingData.rentalType,
      rental_days: pricingData.rentalDays,
      daily_rate: pricingData.dailyRate || null,
      weekly_rate: pricingData.weeklyRate || null,
      monthly_rate: pricingData.monthlyRate || null,
      pricing_method: pricingData.pricingMethod || null,
      rental_amount: pricingData.rentalAmount,
      security_deposit: pricingData.securityDeposit,
      additional_driver_fee: pricingData.additionalDriverFee || 0,
      total_price: pricingData.totalPrice,
      is_student_booking: customerData.isStudent || false,
      is_walk_in: true,
      created_by_worker_id: workerAccount.id,
      payment_method: paymentData.method,
      admin_notes:
        adminNotes || `Walk-in booking created by ${workerAccount.full_name}`,
      actual_pickup_date: new Date().toISOString(),
    };

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert(bookingData)
      .select("id, booking_number")
      .single();

    if (bookingError) {
      console.error("❌ Failed to create booking:", bookingError);
      return new Response(
        JSON.stringify({
          error: "Failed to create booking",
          details: bookingError.message,
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    console.log(
      `✅ Booking created: ${booking.id} (${booking.booking_number})`,
    );

    // ============================================
    // 8. CREATE PRIMARY DRIVER RECORD
    // ============================================
    const { data: primaryDriver, error: primaryDriverError } =
      await supabaseAdmin
        .from("primary_drivers")
        .insert({
          booking_id: booking.id,
          user_id: userId,
          first_name: customerData.firstName,
          last_name: customerData.lastName,
          email: customerData.email,
          phone: customerData.phone,
          drivers_license: customerData.driversLicense,
          date_of_birth: customerData.dateOfBirth,
          street_address: customerData.streetAddress || null,
          city: customerData.city || null,
          state: customerData.state || null,
          zip_code: customerData.zipCode || null,
          is_account_holder: !!userId,
          is_verified: true,
          verified_by: workerAccount.id,
          verified_at: new Date().toISOString(),
        })
        .select("id")
        .single();

    if (primaryDriverError) {
      console.error("❌ Failed to create primary driver:", primaryDriverError);
      // Don't fail - booking is created
    } else {
      console.log(`✅ Primary driver created: ${primaryDriver.id}`);
    }

    // ============================================
    // 9. CREATE DRIVER VERIFICATION RECORD
    // ============================================
    if (primaryDriver) {
      const { error: verificationRecordError } = await supabaseAdmin
        .from("driver_verifications")
        .insert({
          driver_type: "primary",
          primary_driver_id: primaryDriver.id,
          booking_id: booking.id,
          stripe_session_id: primaryVerification.stripe_verification_session_id,
          status: primaryVerification.verification_status,
          provided_first_name: primaryVerification.provided_first_name,
          provided_last_name: primaryVerification.provided_last_name,
          provided_dob: primaryVerification.provided_dob,
          provided_license_number: primaryVerification.provided_license_number,
          verified_first_name: primaryVerification.verified_first_name,
          verified_last_name: primaryVerification.verified_last_name,
          verified_dob: primaryVerification.verified_dob,
          verified_license_number: primaryVerification.verified_license_number,
          verified_address_line1: primaryVerification.verified_address_line1,
          verified_address_city: primaryVerification.verified_address_city,
          verified_address_state: primaryVerification.verified_address_state,
          verified_address_postal_code:
            primaryVerification.verified_address_postal_code,
          license_expiration_date: primaryVerification.license_expiration_date,
          name_match: primaryVerification.name_match,
          dob_match: primaryVerification.dob_match,
          license_number_match: primaryVerification.license_number_match,
          match_warnings: primaryVerification.match_warnings,
          is_overridden: primaryVerification.is_overridden,
          override_reason: primaryVerification.override_reason,
          overridden_by: primaryVerification.overridden_by,
          overridden_at: primaryVerification.overridden_at,
          verified_at: primaryVerification.verified_at,
          created_by: workerAccount.id,
        });

      if (verificationRecordError) {
        console.error(
          "⚠️ Failed to create verification record:",
          verificationRecordError,
        );
      }

      // Update pending verification with booking link
      await supabaseAdmin
        .from("pending_pos_verifications")
        .update({
          booking_id: booking.id,
          linked_driver_id: primaryDriver.id,
          is_used: true,
          used_at: new Date().toISOString(),
        })
        .eq("id", primaryVerificationId);
    }

    // ============================================
    // 10. CREATE ADDITIONAL DRIVERS
    // ============================================
    if (additionalDrivers && additionalDrivers.length > 0) {
      for (const additionalDriver of additionalDrivers) {
        // Get the pending verification
        const { data: additionalVerification } = await supabaseAdmin
          .from("pending_pos_verifications")
          .select("*")
          .eq("id", additionalDriver.pendingVerificationId)
          .eq("pos_session_id", posSessionId)
          .single();

        if (!additionalVerification) {
          console.warn(
            `⚠️ Additional driver verification not found: ${additionalDriver.pendingVerificationId}`,
          );
          continue;
        }

        // Create additional driver record
        const { data: addDriver, error: addDriverError } = await supabaseAdmin
          .from("additional_drivers")
          .insert({
            booking_id: booking.id,
            first_name: additionalDriver.firstName,
            last_name: additionalDriver.lastName,
            email: additionalDriver.email,
            phone: additionalDriver.phone,
            drivers_license: additionalDriver.driversLicense,
            date_of_birth: additionalDriver.dateOfBirth,
            street_address: additionalDriver.streetAddress || null,
            city: additionalDriver.city || null,
            state: additionalDriver.state || null,
            zip_code: additionalDriver.zipCode || null,
            relationship: additionalDriver.relationship || null,
            is_verified: true,
            verified_by: workerAccount.id,
            verified_at: new Date().toISOString(),
          })
          .select("id")
          .single();

        if (addDriverError) {
          console.error(
            "⚠️ Failed to create additional driver:",
            addDriverError,
          );
          continue;
        }

        console.log(`✅ Additional driver created: ${addDriver.id}`);

        // Create verification record for additional driver
        await supabaseAdmin.from("driver_verifications").insert({
          driver_type: "additional",
          additional_driver_id: addDriver.id,
          booking_id: booking.id,
          stripe_session_id:
            additionalVerification.stripe_verification_session_id,
          status: additionalVerification.verification_status,
          provided_first_name: additionalVerification.provided_first_name,
          provided_last_name: additionalVerification.provided_last_name,
          provided_dob: additionalVerification.provided_dob,
          provided_license_number:
            additionalVerification.provided_license_number,
          verified_first_name: additionalVerification.verified_first_name,
          verified_last_name: additionalVerification.verified_last_name,
          verified_dob: additionalVerification.verified_dob,
          verified_license_number:
            additionalVerification.verified_license_number,
          verified_address_line1: additionalVerification.verified_address_line1,
          verified_address_city: additionalVerification.verified_address_city,
          verified_address_state: additionalVerification.verified_address_state,
          verified_address_postal_code:
            additionalVerification.verified_address_postal_code,
          license_expiration_date:
            additionalVerification.license_expiration_date,
          name_match: additionalVerification.name_match,
          dob_match: additionalVerification.dob_match,
          license_number_match: additionalVerification.license_number_match,
          match_warnings: additionalVerification.match_warnings,
          is_overridden: additionalVerification.is_overridden,
          override_reason: additionalVerification.override_reason,
          overridden_by: additionalVerification.overridden_by,
          overridden_at: additionalVerification.overridden_at,
          verified_at: additionalVerification.verified_at,
          created_by: workerAccount.id,
        });

        // Update pending verification
        await supabaseAdmin
          .from("pending_pos_verifications")
          .update({
            booking_id: booking.id,
            linked_driver_id: addDriver.id,
            is_used: true,
            used_at: new Date().toISOString(),
          })
          .eq("id", additionalDriver.pendingVerificationId);
      }
    }

    // ============================================
    // 11. UPDATE PAYMENT RECORDS
    // ============================================
    if (
      paymentData.method === "terminal" &&
      paymentData.terminalTransactionId
    ) {
      await supabaseAdmin
        .from("pos_transactions")
        .update({
          booking_id: booking.id,
          status: "succeeded",
          completed_at: new Date().toISOString(),
        })
        .eq("id", paymentData.terminalTransactionId);
    }

    // For split payments, record the cash portion
    if (paymentData.method === "split" && paymentData.cashAmountCents) {
      await supabaseAdmin.from("pos_transactions").insert({
        booking_id: booking.id,
        worker_id: workerAccount.id,
        amount_cents: paymentData.cashAmountCents,
        currency: "usd",
        payment_type: "cash",
        status: "succeeded",
        cash_tendered_cents: paymentData.cashTenderedCents,
        cash_change_cents: paymentData.cashChangeCents,
        notes: "Split payment - cash portion",
        completed_at: new Date().toISOString(),
      });
    }

    // ============================================
    // 12. UPDATE VEHICLE STATUS
    // ============================================
    await supabaseAdmin
      .from("vehicles")
      .update({
        status: "rented",
        updated_at: new Date().toISOString(),
      })
      .eq("id", vehicleId);

    console.log(`✅ Vehicle status updated to rented`);

    // ============================================
    // 13. SEND CONFIRMATION EMAIL
    // ============================================
    try {
      await sendPOSBookingConfirmationEmail(
        customerData.email,
        `${customerData.firstName} ${customerData.lastName}`,
        bookingNumber,
        vehicle.name,
        pickupDate,
        returnDate,
        pricingData.totalPrice,
      );
    } catch (emailError) {
      console.error("⚠️ Email sending failed:", emailError);
      // Don't fail the booking
    }

    // ============================================
    // 14. RETURN SUCCESS RESPONSE
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        bookingId: booking.id,
        bookingNumber: booking.booking_number,
        customerId: userId,
        vehicleName: vehicle.name,
        pickupDate,
        returnDate,
        totalPrice: pricingData.totalPrice,
        paymentMethod: paymentData.method,
        status: "active",
        message: "Booking completed successfully",
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
    console.error("❌ Complete POS booking error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to complete booking" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
