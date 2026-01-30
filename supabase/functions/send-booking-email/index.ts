// supabase/functions/send-booking-email/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

// ============================================
// ALLOWED ORIGINS (Internal portals only)
// ============================================
const ALLOWED_ORIGINS = [
  "https://workers.4arentals.com",
  "https://4arentals.com",
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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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
const MAX_REQUESTS_PER_HOUR = 50; // Workers may send many emails

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
// EMAIL TEMPLATES (Pre-defined, secure)
// ============================================
type EmailTemplate =
  | "booking_confirmation"
  | "booking_reminder"
  | "booking_cancelled"
  | "payment_received"
  | "extension_confirmed"
  | "return_reminder"
  | "custom"; // Only for workers with specific use cases

interface EmailTemplateData {
  customerName: string;
  bookingNumber?: string;
  vehicleName?: string;
  pickupDate?: string;
  returnDate?: string;
  totalAmount?: string;
  customMessage?: string;
}

function generateEmailHtml(template: EmailTemplate, data: EmailTemplateData): string {
  const { customerName, bookingNumber, vehicleName, pickupDate, returnDate, totalAmount, customMessage } = data;

  const baseStyles = `
    <style>
      body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 20px; }
      .header { border-bottom: 3px solid #FFD700; padding-bottom: 10px; margin-bottom: 20px; }
      .info-box { background: #f5f5f5; padding: 15px; border-radius: 8px; margin: 15px 0; }
      .footer { color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; }
    </style>
  `;

  switch (template) {
    case "booking_confirmation":
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>Booking Confirmed! 🎉</h2>
          </div>
          <p>Hi ${sanitizeHtml(customerName)},</p>
          <p>Your booking has been confirmed. Here are your details:</p>
          <div class="info-box">
            <p><strong>Booking #:</strong> ${sanitizeHtml(bookingNumber || "N/A")}</p>
            <p><strong>Vehicle:</strong> ${sanitizeHtml(vehicleName || "N/A")}</p>
            <p><strong>Pickup:</strong> ${sanitizeHtml(pickupDate || "N/A")}</p>
            <p><strong>Return:</strong> ${sanitizeHtml(returnDate || "N/A")}</p>
            <p><strong>Total:</strong> ${sanitizeHtml(totalAmount || "N/A")}</p>
          </div>
          <p>Please bring a valid driver's license and the payment card used for booking.</p>
          <div class="footer">
            <p>Best regards,<br><strong>4A Rentals Team</strong></p>
          </div>
        </div>
      `;

    case "booking_reminder":
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>Pickup Reminder 🚗</h2>
          </div>
          <p>Hi ${sanitizeHtml(customerName)},</p>
          <p>This is a reminder that your vehicle pickup is coming up!</p>
          <div class="info-box">
            <p><strong>Booking #:</strong> ${sanitizeHtml(bookingNumber || "N/A")}</p>
            <p><strong>Vehicle:</strong> ${sanitizeHtml(vehicleName || "N/A")}</p>
            <p><strong>Pickup Date:</strong> ${sanitizeHtml(pickupDate || "N/A")}</p>
          </div>
          <p>Don't forget to bring your driver's license!</p>
          <div class="footer">
            <p>Best regards,<br><strong>4A Rentals Team</strong></p>
          </div>
        </div>
      `;

    case "return_reminder":
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>Return Reminder ⏰</h2>
          </div>
          <p>Hi ${sanitizeHtml(customerName)},</p>
          <p>Your rental is due for return soon!</p>
          <div class="info-box">
            <p><strong>Booking #:</strong> ${sanitizeHtml(bookingNumber || "N/A")}</p>
            <p><strong>Vehicle:</strong> ${sanitizeHtml(vehicleName || "N/A")}</p>
            <p><strong>Return Date:</strong> ${sanitizeHtml(returnDate || "N/A")}</p>
          </div>
          <p>Need more time? You can extend your rental from your account.</p>
          <div class="footer">
            <p>Best regards,<br><strong>4A Rentals Team</strong></p>
          </div>
        </div>
      `;

    case "custom":
      // Only allow pre-sanitized custom messages from workers
      return `
        ${baseStyles}
        <div class="container">
          <div class="header">
            <h2>Message from 4A Rentals</h2>
          </div>
          <p>Hi ${sanitizeHtml(customerName)},</p>
          <div class="info-box">
            ${sanitizeHtml(customMessage || "").replace(/\n/g, "<br>")}
          </div>
          <div class="footer">
            <p>Best regards,<br><strong>4A Rentals Team</strong></p>
          </div>
        </div>
      `;

    default:
      throw new Error("Invalid email template");
  }
}

function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

// ============================================
// TYPES
// ============================================
interface SendBookingEmailRequest {
  to: string;
  template: EmailTemplate;
  subject: string;
  data: EmailTemplateData;
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

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ============================================
    // 1. CHECK API KEY CONFIGURATION
    // ============================================
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 2. AUTHENTICATION (REQUIRED!)
    // ============================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired session" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 3. AUTHORIZATION - Workers/Service only
    // ============================================
    // Check if user is a worker OR if this is a service-level call
    const { data: workerAccount } = await supabase
      .from("worker_accounts")
      .select("id, role, is_active, full_name")
      .eq("auth_user_id", user.id)
      .single();

    // If not a worker, check if this is a customer sending to themselves
    // (e.g., booking confirmation triggered by their own action)
    const isWorker = workerAccount?.is_active;
    const isCustomerSelfEmail = !isWorker; // Will validate recipient below

    // ============================================
    // 4. RATE LIMITING
    // ============================================
    if (!checkRateLimit(user.id)) {
      return new Response(
        JSON.stringify({ error: "Too many email requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 5. PARSE & VALIDATE REQUEST
    // ============================================
    let payload: SendBookingEmailRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { to, template, subject, data } = payload;

    // Validate required fields
    if (!to || !template || !subject || !data) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, template, subject, data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    if (!validateEmail(to)) {
      return new Response(
        JSON.stringify({ error: "Invalid recipient email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate template
    const validTemplates: EmailTemplate[] = [
      "booking_confirmation",
      "booking_reminder",
      "booking_cancelled",
      "payment_received",
      "extension_confirmed",
      "return_reminder",
      "custom",
    ];

    if (!validTemplates.includes(template)) {
      return new Response(
        JSON.stringify({ error: "Invalid email template" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Custom template only allowed for workers
    if (template === "custom" && !isWorker) {
      return new Response(
        JSON.stringify({ error: "Custom emails require worker authorization" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If customer is triggering, they can only send to themselves
    if (isCustomerSelfEmail && to.toLowerCase() !== user.email?.toLowerCase()) {
      return new Response(
        JSON.stringify({ error: "You can only send booking emails to your own email" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate customerName is provided
    if (!data.customerName || data.customerName.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Customer name is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate subject length
    if (subject.length > 200) {
      return new Response(
        JSON.stringify({ error: "Subject too long" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 6. GENERATE EMAIL HTML FROM TEMPLATE
    // ============================================
    let emailHtml: string;
    try {
      emailHtml = generateEmailHtml(template, data);
    } catch (error) {
      return new Response(
        JSON.stringify({ error: "Failed to generate email" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 7. SEND EMAIL
    // ============================================
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "4A Rentals <bookings@4arentals.com>",
        to: [to.toLowerCase()],
        subject: sanitizeHtml(subject),
        html: emailHtml,
      }),
    });

    const responseData = await response.json();

    if (!response.ok) {
      console.error("Failed to send email:", responseData);
      return new Response(
        JSON.stringify({ error: "Failed to send email" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 8. LOG EMAIL SENT (for audit)
    // ============================================
    if (isWorker && workerAccount) {
      await supabase.from("audit_logs").insert({
        worker_id: workerAccount.id,
        worker_name: workerAccount.full_name,
        action: "SEND_EMAIL",
        resource_type: "email",
        description: `Sent ${template} email to ${to}`,
        new_data: {
          template,
          recipient: to,
          subject,
        },
        ip_address:
          req.headers.get("x-forwarded-for") ||
          req.headers.get("cf-connecting-ip") ||
          "unknown",
      });
    }

    console.log(`Email sent successfully: ${template} to ${to}`);

    return new Response(
      JSON.stringify({ success: true, messageId: responseData.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-booking-email:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send email" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});