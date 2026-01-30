// supabase/functions/stripe-webhook/index.ts
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const STRIPE_SECRET_KEY = Deno.env.get("STRIPE_SECRET_KEY")!;
const STRIPE_WEBHOOK_SECRET = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// Initialize clients
const stripe = new Stripe(STRIPE_SECRET_KEY, {
  apiVersion: "2024-11-20.acacia",
  httpClient: Stripe.createFetchHttpClient(),
});

const cryptoProvider = Stripe.createSubtleCryptoProvider();

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

console.log("🎣 Stripe Webhook Handler initialized");

// ============================================
// DOCUMENT ERROR CODES (Category A - Customer's fault)
// ============================================
const DOCUMENT_ERROR_CODES = [
  "document_expired",
  "document_unverified_other",
  "document_type_not_supported",
  "selfie_face_mismatch",
  "selfie_manipulated",
  "selfie_document_missing_photo",
  "selfie_unverified_other",
  "consent_declined",
  "under_supported_age",
  "country_not_supported",
  "id_number_mismatch",
  "id_number_unverified_other",
  "id_number_insufficient_document_data",
];

// ============================================
// HELPER FUNCTIONS
// ============================================
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

function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeString(str: string | null | undefined): string {
  if (!str) return "";
  return str.toLowerCase().trim().replace(/\s+/g, " ");
}

function compareNames(provided: string | null, verified: string | null): boolean {
  const normalizedProvided = normalizeString(provided);
  const normalizedVerified = normalizeString(verified);
  
  if (!normalizedProvided || !normalizedVerified) return false;
  
  // Exact match
  if (normalizedProvided === normalizedVerified) return true;
  
  // Check if one contains the other (handles "John" vs "John Smith")
  if (normalizedProvided.includes(normalizedVerified) || normalizedVerified.includes(normalizedProvided)) {
    return true;
  }
  
  return false;
}

function compareDates(provided: string | null, verified: string | null): boolean {
  if (!provided || !verified) return false;
  
  const providedDate = new Date(provided).toISOString().split("T")[0];
  const verifiedDate = new Date(verified).toISOString().split("T")[0];
  
  return providedDate === verifiedDate;
}

function compareLicenseNumbers(provided: string | null, verified: string | null): boolean {
  if (!provided || !verified) return false;
  
  // Normalize: remove spaces, dashes, convert to uppercase
  const normalizedProvided = provided.replace(/[\s\-]/g, "").toUpperCase();
  const normalizedVerified = verified.replace(/[\s\-]/g, "").toUpperCase();
  
  return normalizedProvided === normalizedVerified;
}

// ============================================
// CHECK IF POS VERIFICATION
// ============================================
function isPOSVerification(metadata: Record<string, string> | null): boolean {
  return metadata?.is_pos_verification === "true";
}

// ============================================
// POS VERIFICATION HANDLERS
// ============================================
async function handlePOSVerificationVerified(
  verificationSession: Stripe.Identity.VerificationSession
): Promise<void> {
  console.log("✅ Processing POS verification verified:", verificationSession.id);

  const metadata = verificationSession.metadata || {};
  const posSessionId = metadata.pos_session_id;

  if (!posSessionId) {
    console.error("❌ Missing pos_session_id in metadata");
    return;
  }

  // Get the pending verification record
  const { data: pendingVerification, error: fetchError } = await supabaseAdmin
    .from("pending_pos_verifications")
    .select("*")
    .eq("stripe_verification_session_id", verificationSession.id)
    .single();

  if (fetchError || !pendingVerification) {
    console.error("❌ Pending POS verification not found:", fetchError);
    return;
  }

  // Extract verified data from Stripe
  const verifiedOutputs = verificationSession.verified_outputs;
  const document = verifiedOutputs?.document;
  const idNumber = verifiedOutputs?.id_number;

  const verifiedFirstName = document?.first_name || verifiedOutputs?.first_name || null;
  const verifiedLastName = document?.last_name || verifiedOutputs?.last_name || null;
  const verifiedDob = document?.dob
    ? `${document.dob.year}-${String(document.dob.month).padStart(2, "0")}-${String(document.dob.day).padStart(2, "0")}`
    : null;
  const verifiedLicenseNumber = idNumber?.id_number || document?.document_number || null;
  const licenseExpirationDate = document?.expiration_date
    ? `${document.expiration_date.year}-${String(document.expiration_date.month).padStart(2, "0")}-${String(document.expiration_date.day).padStart(2, "0")}`
    : null;
  const licenseIssuingCountry = document?.issuing_country || null;
  const documentType = document?.type || null;

  const address = verifiedOutputs?.address;
  const verifiedAddressLine1 = address?.line1 || null;
  const verifiedAddressCity = address?.city || null;
  const verifiedAddressState = address?.state || null;
  const verifiedAddressPostalCode = address?.postal_code || null;

  // Compare with provided data
  const fullProvidedName = `${pendingVerification.provided_first_name} ${pendingVerification.provided_last_name}`;
  const fullVerifiedName = `${verifiedFirstName || ""} ${verifiedLastName || ""}`.trim();

  const nameMatch = compareNames(fullProvidedName, fullVerifiedName);
  const dobMatch = compareDates(pendingVerification.provided_dob, verifiedDob);
  const licenseNumberMatch = compareLicenseNumbers(
    pendingVerification.provided_license_number,
    verifiedLicenseNumber
  );

  // Build match warnings
  const matchWarnings: Array<{ field: string; provided: string; verified: string }> = [];

  if (!nameMatch) {
    matchWarnings.push({
      field: "name",
      provided: fullProvidedName,
      verified: fullVerifiedName || "Not extracted",
    });
  }

  if (!dobMatch) {
    matchWarnings.push({
      field: "date_of_birth",
      provided: pendingVerification.provided_dob || "Not provided",
      verified: verifiedDob || "Not extracted",
    });
  }

  if (!licenseNumberMatch) {
    matchWarnings.push({
      field: "license_number",
      provided: pendingVerification.provided_license_number || "Not provided",
      verified: verifiedLicenseNumber || "Not extracted",
    });
  }

  console.log(`📊 POS Match results - Name: ${nameMatch}, DOB: ${dobMatch}, License: ${licenseNumberMatch}`);

  // Update pending verification record
  const { error: updateError } = await supabaseAdmin
    .from("pending_pos_verifications")
    .update({
      verification_status: "verified",
      verified_first_name: verifiedFirstName,
      verified_last_name: verifiedLastName,
      verified_dob: verifiedDob,
      verified_license_number: verifiedLicenseNumber,
      verified_address_line1: verifiedAddressLine1,
      verified_address_city: verifiedAddressCity,
      verified_address_state: verifiedAddressState,
      verified_address_postal_code: verifiedAddressPostalCode,
      license_expiration_date: licenseExpirationDate,
      license_issuing_country: licenseIssuingCountry,
      document_type: documentType,
      name_match: nameMatch,
      dob_match: dobMatch,
      license_number_match: licenseNumberMatch,
      match_warnings: matchWarnings,
      verified_at: new Date().toISOString(),
      error_code: null,
      error_reason: null,
    })
    .eq("id", pendingVerification.id);

  if (updateError) {
    console.error("❌ Failed to update pending POS verification:", updateError);
    return;
  }

  console.log(`✅ POS verification completed for ${pendingVerification.driver_role} driver`);
}

async function handlePOSVerificationFailed(
  verificationSession: Stripe.Identity.VerificationSession
): Promise<void> {
  console.log("❌ Processing POS verification failed:", verificationSession.id);

  const lastError = verificationSession.last_error;
  const errorCode = lastError?.code || "unknown_error";
  const errorReason = lastError?.reason || "Verification could not be completed";

  const { error: updateError } = await supabaseAdmin
    .from("pending_pos_verifications")
    .update({
      verification_status: "failed",
      error_code: errorCode,
      error_reason: errorReason,
    })
    .eq("stripe_verification_session_id", verificationSession.id);

  if (updateError) {
    console.error("❌ Failed to update pending POS verification:", updateError);
    return;
  }

  console.log(`📝 POS verification failure recorded`);
}

async function handlePOSVerificationCanceled(
  verificationSession: Stripe.Identity.VerificationSession
): Promise<void> {
  console.log("🚫 Processing POS verification canceled:", verificationSession.id);

  const { error: updateError } = await supabaseAdmin
    .from("pending_pos_verifications")
    .update({
      verification_status: "canceled",
      error_code: "user_canceled",
      error_reason: "Verification was canceled",
    })
    .eq("stripe_verification_session_id", verificationSession.id);

  if (updateError) {
    console.error("❌ Failed to update canceled POS verification:", updateError);
    return;
  }

  console.log("✅ POS verification marked as canceled");
}

// ============================================
// TERMINAL PAYMENT HANDLERS
// ============================================
async function handleTerminalPaymentSucceeded(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  console.log("✅ Terminal payment succeeded:", paymentIntent.id);

  const charges = paymentIntent.charges?.data || [];
  const charge = charges[0];

  // Extract card details
  const cardDetails = charge?.payment_method_details?.card_present;
  const cardBrand = cardDetails?.brand || null;
  const cardLast4 = cardDetails?.last4 || null;
  const receiptUrl = charge?.receipt_url || null;

  // Update POS transaction
  const { error: updateError } = await supabaseAdmin
    .from("pos_transactions")
    .update({
      status: "succeeded",
      card_brand: cardBrand,
      card_last4: cardLast4,
      receipt_url: receiptUrl,
      completed_at: new Date().toISOString(),
    })
    .eq("payment_intent_id", paymentIntent.id);

  if (updateError) {
    console.error("⚠️ Failed to update POS transaction:", updateError);
  }

  console.log(`✅ POS transaction updated - Card: ${cardBrand} ****${cardLast4}`);
}

async function handleTerminalPaymentFailed(
  paymentIntent: Stripe.PaymentIntent
): Promise<void> {
  console.log("❌ Terminal payment failed:", paymentIntent.id);

  const lastError = paymentIntent.last_payment_error;
  const failureReason = lastError?.message || "Payment failed";

  const { error: updateError } = await supabaseAdmin
    .from("pos_transactions")
    .update({
      status: "failed",
      failure_reason: failureReason,
    })
    .eq("payment_intent_id", paymentIntent.id);

  if (updateError) {
    console.error("⚠️ Failed to update POS transaction:", updateError);
  }

  console.log(`📝 POS transaction marked as failed: ${failureReason}`);
}
// ============================================
// IDEMPOTENCY CHECK
// ============================================
async function isEventProcessed(eventId: string): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from("processed_webhook_events")
    .select("id")
    .eq("stripe_event_id", eventId)
    .single();

  return !!data;
}

async function markEventProcessed(eventId: string, eventType: string): Promise<void> {
  await supabaseAdmin.from("processed_webhook_events").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    processed_at: new Date().toISOString(),
  });
}

// ============================================
// EMAIL FUNCTIONS
// ============================================
async function sendBookingReceivedEmail(
  customerEmail: string,
  customerName: string,
  vehicleName: string,
  pickupDate: string,
  returnDate: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not configured, skipping email");
    return;
  }

  const safeCustomerName = sanitizeHtml(customerName);
  const safeVehicleName = sanitizeHtml(vehicleName);

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #D4AF37; border-bottom: 3px solid #D4AF37; padding-bottom: 10px;">
        Thank You for Your Reservation!
      </h2>
      
      <p>Hi ${safeCustomerName},</p>
      
      <p>We have received your reservation request and payment for:</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>🚗 Vehicle:</strong> ${safeVehicleName}</p>
        <p style="margin: 5px 0;"><strong>📅 Pickup Date:</strong> ${formatDate(pickupDate)}</p>
        <p style="margin: 5px 0;"><strong>📅 Return Date:</strong> ${formatDate(returnDate)}</p>
      </div>
      
      <div style="background: #fff9e6; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>⏰ What happens next?</strong></p>
        <p style="margin: 10px 0 0 0;">Our team is reviewing your reservation. We will get back to you within <strong>24 hours</strong> with confirmation.</p>
      </div>
      
      <p style="margin-top: 30px;">Thank you for choosing 4A Rentals!</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px;">
        Best regards,<br>
        <strong>4A Rentals Team</strong>
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
        subject: "🚗 Reservation Received - Under Review",
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      console.error("❌ Failed to send email:", await response.text());
    } else {
      console.log("✅ Booking received email sent to:", customerEmail);
    }
  } catch (error) {
    console.error("❌ Email error:", error);
  }
}

async function sendExtensionConfirmationEmail(
  customerEmail: string,
  customerName: string,
  vehicleName: string,
  originalReturnDate: string,
  newReturnDate: string,
  additionalDays: number,
  extensionAmount: number
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("⚠️ RESEND_API_KEY not configured, skipping email");
    return;
  }

  const safeCustomerName = sanitizeHtml(customerName);
  const safeVehicleName = sanitizeHtml(vehicleName);

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #D4AF37; border-bottom: 3px solid #D4AF37; padding-bottom: 10px;">
        🎉 Rental Extension Confirmed!
      </h2>
      
      <p>Hi ${safeCustomerName},</p>
      
      <p>Great news! Your rental extension has been confirmed.</p>
      
      <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 5px 0;"><strong>🚗 Vehicle:</strong> ${safeVehicleName}</p>
        <p style="margin: 5px 0;"><strong>📅 Original Return:</strong> ${formatDate(originalReturnDate)}</p>
        <p style="margin: 5px 0;"><strong>📅 New Return:</strong> <span style="color: #22c55e; font-weight: bold;">${formatDate(newReturnDate)}</span></p>
        <p style="margin: 5px 0;"><strong>➕ Additional Days:</strong> ${additionalDays}</p>
      </div>
      
      <div style="background: #e8f5e9; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>💳 Payment Received:</strong> ${formatCurrency(extensionAmount)}</p>
      </div>
      
      <p>Please return the vehicle by the new return date.</p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px;">
        Best regards,<br>
        <strong>4A Rentals Team</strong>
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
        subject: `✅ Rental Extension Confirmed - ${safeVehicleName}`,
        html: emailHtml,
      }),
    });

    if (!response.ok) {
      console.error("❌ Failed to send extension email:", await response.text());
    } else {
      console.log("✅ Extension email sent to:", customerEmail);
    }
  } catch (error) {
    console.error("❌ Extension email error:", error);
  }
}

// ============================================
// PAYMENT HANDLERS
// ============================================
async function handleNewBookingPayment(session: Stripe.Checkout.Session): Promise<void> {
  console.log("💰 Processing new booking payment:", session.id);

  const bookingId = session.metadata?.bookingId;
  const vehicleId = session.metadata?.vehicleId;

  if (!bookingId || !vehicleId) {
    console.error("❌ Missing metadata");
    return;
  }

  // Verify booking exists and hasn't been paid
  const { data: existingBooking } = await supabaseAdmin
    .from("bookings")
    .select("id, payment_status")
    .eq("id", bookingId)
    .single();

  if (!existingBooking) {
    console.error("❌ Booking not found:", bookingId);
    return;
  }

  if (existingBooking.payment_status === "paid") {
    console.log("ℹ️ Booking already marked as paid, skipping");
    return;
  }

  // Update booking
  const { data: booking, error: bookingError } = await supabaseAdmin
    .from("bookings")
    .update({
      payment_status: "paid",
      stripe_payment_intent_id: session.payment_intent,
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId)
    .select("*, customer_info")
    .single();

  if (bookingError) {
    console.error("❌ Booking update error:", bookingError);
    throw bookingError;
  }

  console.log("✅ Booking marked as paid");

  // Update vehicle status
  const { error: vehicleError } = await supabaseAdmin
    .from("vehicles")
    .update({
      status: "reserved",
      updated_at: new Date().toISOString(),
    })
    .eq("id", vehicleId);

  if (vehicleError) {
    console.error("❌ Vehicle update error:", vehicleError);
  } else {
    console.log("✅ Vehicle status: reserved");
  }

  // Send email
  try {
    const customerInfo =
      typeof booking.customer_info === "string"
        ? JSON.parse(booking.customer_info)
        : booking.customer_info;

    const customerName = `${customerInfo.firstName || ""} ${customerInfo.lastName || ""}`.trim() || "Valued Customer";
    const customerEmail = customerInfo.email || session.customer_email;
    const vehicleName = session.metadata?.vehicleName || "Vehicle";

    await sendBookingReceivedEmail(
      customerEmail,
      customerName,
      vehicleName,
      session.metadata?.pickupDate || "",
      session.metadata?.returnDate || ""
    );
  } catch (emailError) {
    console.error("❌ Email failed:", emailError);
  }
}

async function handleExtensionPayment(session: Stripe.Checkout.Session): Promise<void> {
  console.log("📅 Processing extension payment:", session.id);

  const bookingId = session.metadata?.booking_id;
  const newReturnDate = session.metadata?.new_return_date;
  const additionalDays = parseInt(session.metadata?.additional_days || "0", 10);
  const extensionAmount = parseFloat(session.metadata?.extension_amount || "0");
  const originalReturnDate = session.metadata?.original_return_date;

  if (!bookingId || !newReturnDate || !additionalDays) {
    console.error("❌ Missing extension metadata");
    return;
  }

  // Get current booking
  const { data: booking, error: fetchError } = await supabaseAdmin
    .from("bookings")
    .select("*, customer_info, vehicles(name)")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    console.error("❌ Booking fetch error:", fetchError);
    throw fetchError;
  }

  // Calculate new totals
  const newRentalDays = (booking.rental_days || 0) + additionalDays;
  const newRentalAmount = (parseFloat(booking.rental_amount) || 0) + extensionAmount;
  const newTotalPrice = (parseFloat(booking.total_price) || 0) + extensionAmount;
  const newExtensionCount = (booking.extension_count || 0) + 1;

  // Update booking
  const { error: updateError } = await supabaseAdmin
    .from("bookings")
    .update({
      return_date: newReturnDate,
      rental_days: newRentalDays,
      rental_amount: newRentalAmount.toString(),
      total_price: newTotalPrice.toString(),
      extension_count: newExtensionCount,
      updated_at: new Date().toISOString(),
    })
    .eq("id", bookingId);

  if (updateError) {
    console.error("❌ Extension update error:", updateError);
    throw updateError;
  }

  console.log("✅ Booking extended:", { bookingId, newReturnDate, additionalDays });

  // Send email
  try {
    const customerInfo =
      typeof booking.customer_info === "string"
        ? JSON.parse(booking.customer_info)
        : booking.customer_info;

    const customerName = `${customerInfo.firstName || ""} ${customerInfo.lastName || ""}`.trim() || "Valued Customer";
    const customerEmail = customerInfo.email || session.customer_email;
    const vehicleName = booking.vehicles?.name || "Vehicle";

    await sendExtensionConfirmationEmail(
      customerEmail,
      customerName,
      vehicleName,
      originalReturnDate || booking.return_date,
      newReturnDate,
      additionalDays,
      extensionAmount
    );
  } catch (emailError) {
    console.error("❌ Extension email failed:", emailError);
  }
}

// ============================================
// IDENTITY VERIFICATION HANDLERS
// ============================================
async function handleVerificationVerified(
  verificationSession: Stripe.Identity.VerificationSession
): Promise<void> {
  console.log("✅ Processing verified identity:", verificationSession.id);

  const metadata = verificationSession.metadata || {};
  const driverType = metadata.driver_type;
  const driverId = metadata.driver_id;
  const bookingId = metadata.booking_id;

  if (!driverType || !driverId || !bookingId) {
    console.error("❌ Missing identity verification metadata");
    return;
  }

  // Get the verification record
  const { data: verificationRecord, error: fetchError } = await supabaseAdmin
    .from("driver_verifications")
    .select("*")
    .eq("stripe_session_id", verificationSession.id)
    .single();

  if (fetchError || !verificationRecord) {
    console.error("❌ Verification record not found:", fetchError);
    return;
  }

  // Extract verified data from Stripe
  const verifiedOutputs = verificationSession.verified_outputs;
  const document = verifiedOutputs?.document;
  const idNumber = verifiedOutputs?.id_number;

  // Extract document data
  const verifiedFirstName = document?.first_name || verifiedOutputs?.first_name || null;
  const verifiedLastName = document?.last_name || verifiedOutputs?.last_name || null;
  const verifiedDob = document?.dob 
    ? `${document.dob.year}-${String(document.dob.month).padStart(2, "0")}-${String(document.dob.day).padStart(2, "0")}`
    : null;
  const verifiedLicenseNumber = idNumber?.id_number || document?.document_number || null;
  const licenseExpirationDate = document?.expiration_date
    ? `${document.expiration_date.year}-${String(document.expiration_date.month).padStart(2, "0")}-${String(document.expiration_date.day).padStart(2, "0")}`
    : null;
  const licenseIssuingCountry = document?.issuing_country || null;
  const documentType = document?.type || null;

  // Extract address if available
  const address = verifiedOutputs?.address;
  const verifiedAddressLine1 = address?.line1 || null;
  const verifiedAddressCity = address?.city || null;
  const verifiedAddressState = address?.state || null;
  const verifiedAddressPostalCode = address?.postal_code || null;

  // Compare with provided data
  const fullProvidedName = `${verificationRecord.provided_first_name} ${verificationRecord.provided_last_name}`;
  const fullVerifiedName = `${verifiedFirstName || ""} ${verifiedLastName || ""}`.trim();
  
  const nameMatch = compareNames(fullProvidedName, fullVerifiedName);
  const dobMatch = compareDates(verificationRecord.provided_dob, verifiedDob);
  const licenseNumberMatch = compareLicenseNumbers(
    verificationRecord.provided_license_number,
    verifiedLicenseNumber
  );

  // Build match warnings
  const matchWarnings: Array<{ field: string; provided: string; verified: string }> = [];
  
  if (!nameMatch) {
    matchWarnings.push({
      field: "name",
      provided: fullProvidedName,
      verified: fullVerifiedName || "Not extracted",
    });
  }
  
  if (!dobMatch) {
    matchWarnings.push({
      field: "date_of_birth",
      provided: verificationRecord.provided_dob || "Not provided",
      verified: verifiedDob || "Not extracted",
    });
  }
  
  if (!licenseNumberMatch) {
    matchWarnings.push({
      field: "license_number",
      provided: verificationRecord.provided_license_number || "Not provided",
      verified: verifiedLicenseNumber || "Not extracted",
    });
  }

  console.log(`📊 Match results - Name: ${nameMatch}, DOB: ${dobMatch}, License: ${licenseNumberMatch}`);

  // Update verification record
  const { error: updateError } = await supabaseAdmin
    .from("driver_verifications")
    .update({
      status: "verified",
      verified_first_name: verifiedFirstName,
      verified_last_name: verifiedLastName,
      verified_dob: verifiedDob,
      verified_license_number: verifiedLicenseNumber,
      verified_address_line1: verifiedAddressLine1,
      verified_address_city: verifiedAddressCity,
      verified_address_state: verifiedAddressState,
      verified_address_postal_code: verifiedAddressPostalCode,
      license_expiration_date: licenseExpirationDate,
      license_issuing_country: licenseIssuingCountry,
      document_type: documentType,
      name_match: nameMatch,
      dob_match: dobMatch,
      license_number_match: licenseNumberMatch,
      match_warnings: matchWarnings,
      verified_at: new Date().toISOString(),
      error_code: null,
      error_reason: null,
    })
    .eq("id", verificationRecord.id);

  if (updateError) {
    console.error("❌ Failed to update verification record:", updateError);
    return;
  }

  // Update the driver's verified status (only if all matches or no critical mismatches)
  // Workers will still see warnings and can approve mismatches in the UI
  const driverTable = driverType === "primary" ? "primary_drivers" : "additional_drivers";
  
  await supabaseAdmin
    .from(driverTable)
    .update({
      is_verified: true,
      verified_at: new Date().toISOString(),
    })
    .eq("id", driverId);

  console.log(`✅ Identity verification completed for ${driverType} driver: ${driverId}`);
}

async function handleVerificationRequiresInput(
  verificationSession: Stripe.Identity.VerificationSession
): Promise<void> {
  console.log("⚠️ Processing verification requires_input:", verificationSession.id);

  const lastError = verificationSession.last_error;
  const errorCode = lastError?.code || "unknown_error";
  const errorReason = lastError?.reason || "Verification could not be completed";

  // Determine if this is a document error (Category A) or technical error (Category B)
  const isDocumentError = DOCUMENT_ERROR_CODES.includes(errorCode);
  const isTechnicalError = !isDocumentError;

  console.log(`❌ Verification failed - Code: ${errorCode}, Document Error: ${isDocumentError}`);

  // Get the verification record
  const { data: verificationRecord, error: fetchError } = await supabaseAdmin
    .from("driver_verifications")
    .select("*")
    .eq("stripe_session_id", verificationSession.id)
    .single();

  if (fetchError || !verificationRecord) {
    console.error("❌ Verification record not found:", fetchError);
    return;
  }

  // Calculate new retry counts
  const newDocumentRetryCount = isDocumentError
    ? (verificationRecord.document_error_retry_count || 0) + 1
    : verificationRecord.document_error_retry_count || 0;
  
  const newTechnicalRetryCount = isTechnicalError
    ? (verificationRecord.technical_error_retry_count || 0) + 1
    : verificationRecord.technical_error_retry_count || 0;

  // Update verification record
  const { error: updateError } = await supabaseAdmin
    .from("driver_verifications")
    .update({
      status: "failed",
      error_code: errorCode,
      error_reason: errorReason,
      is_document_error: isDocumentError,
      is_technical_error: isTechnicalError,
      document_error_retry_count: newDocumentRetryCount,
      technical_error_retry_count: newTechnicalRetryCount,
    })
    .eq("id", verificationRecord.id);

  if (updateError) {
    console.error("❌ Failed to update verification record:", updateError);
    return;
  }

  console.log(`📝 Verification failure recorded - Document retries: ${newDocumentRetryCount}, Technical retries: ${newTechnicalRetryCount}`);
}

async function handleVerificationCanceled(
  verificationSession: Stripe.Identity.VerificationSession
): Promise<void> {
  console.log("🚫 Processing verification canceled:", verificationSession.id);

  // Update verification record status
  const { error: updateError } = await supabaseAdmin
    .from("driver_verifications")
    .update({
      status: "canceled",
      error_code: "user_canceled",
      error_reason: "Verification was canceled by the user",
    })
    .eq("stripe_session_id", verificationSession.id);

  if (updateError) {
    console.error("❌ Failed to update canceled verification:", updateError);
    return;
  }

  console.log("✅ Verification marked as canceled");
}

// ============================================
// MAIN WEBHOOK HANDLER
// ============================================
Deno.serve(async (req: Request) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    console.error("❌ Missing stripe-signature header");
    return new Response(
      JSON.stringify({ error: "Missing signature" }),
      { status: 400 }
    );
  }

  if (!STRIPE_WEBHOOK_SECRET) {
    console.error("❌ STRIPE_WEBHOOK_SECRET not configured");
    return new Response(
      JSON.stringify({ error: "Webhook not configured" }),
      { status: 500 }
    );
  }

  try {
    // Get raw body for signature verification
    const body = await req.text();

    // Verify webhook signature
    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(
        body,
        signature,
        STRIPE_WEBHOOK_SECRET,
        undefined,
        cryptoProvider
      );
    } catch (err) {
      console.error("❌ Signature verification failed:", err.message);
      return new Response(
        JSON.stringify({ error: "Invalid signature" }),
        { status: 400 }
      );
    }

    console.log("✅ Webhook verified:", event.type, "| ID:", event.id);

    // Idempotency check
    if (await isEventProcessed(event.id)) {
      console.log("ℹ️ Event already processed:", event.id);
      return new Response(
        JSON.stringify({ received: true, status: "already_processed" }),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    }

    // Handle events
    switch (event.type) {
      // ============================================
      // PAYMENT EVENTS
      // ============================================
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.metadata?.type === "booking_extension") {
          await handleExtensionPayment(session);
        } else {
          await handleNewBookingPayment(session);
        }
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log("⏰ Checkout expired:", session.id);

        if (session.metadata?.type === "booking_extension") {
          console.log("ℹ️ Extension checkout expired - no changes");
          break;
        }

        const bookingId = session.metadata?.bookingId;
        if (bookingId) {
          await supabaseAdmin
            .from("bookings")
            .update({
              payment_status: "expired",
              updated_at: new Date().toISOString(),
            })
            .eq("id", bookingId);
          console.log("✅ Booking marked as expired");
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log("❌ Payment failed:", paymentIntent.id);
        break;
      }

      // ============================================
      // IDENTITY VERIFICATION EVENTS
      // ============================================
      case "identity.verification_session.verified": {
        const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
        
        // Check if this is a POS verification
        if (isPOSVerification(verificationSession.metadata)) {
          await handlePOSVerificationVerified(verificationSession);
        } else {
          await handleVerificationVerified(verificationSession);
        }
        break;
      }

      case "identity.verification_session.requires_input": {
        const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
        
        // Check if this is a POS verification
        if (isPOSVerification(verificationSession.metadata)) {
          await handlePOSVerificationFailed(verificationSession);
        } else {
          await handleVerificationRequiresInput(verificationSession);
        }
        break;
      }

      case "identity.verification_session.canceled": {
        const verificationSession = event.data.object as Stripe.Identity.VerificationSession;
        
        // Check if this is a POS verification
        if (isPOSVerification(verificationSession.metadata)) {
          await handlePOSVerificationCanceled(verificationSession);
        } else {
          await handleVerificationCanceled(verificationSession);
        }
        break;
      }

      // ============================================
      // TERMINAL PAYMENT EVENTS (NEW)
      // ============================================
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Check if this is a terminal payment
        if (paymentIntent.payment_method_types?.includes("card_present")) {
          await handleTerminalPaymentSucceeded(paymentIntent);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        
        // Check if this is a terminal payment
        if (paymentIntent.payment_method_types?.includes("card_present")) {
          await handleTerminalPaymentFailed(paymentIntent);
        } else {
          console.log("❌ Payment failed:", paymentIntent.id);
        }
        break;
      }

      default:
        console.log("ℹ️ Unhandled event:", event.type);
    }

    // Mark event as processed
    await markEventProcessed(event.id, event.type);

    return new Response(
      JSON.stringify({ received: true, eventType: event.type }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("❌ Webhook error:", error);
    return new Response(
      JSON.stringify({ error: "Webhook handler failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});