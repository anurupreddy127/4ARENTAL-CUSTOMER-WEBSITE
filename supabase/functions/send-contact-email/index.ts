// supabase/functions/send-contact-email/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const ADMIN_EMAIL = Deno.env.get("ADMIN_EMAIL") || "admin@4arentals.com";

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
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// ============================================
// RATE LIMITING (by IP)
// ============================================
interface RateLimitEntry {
  count: number;
  windowStart: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_REQUESTS_PER_HOUR = 5; // 5 contact submissions per hour per IP

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(identifier);

  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimitMap.set(identifier, { count: 1, windowStart: now });
    return true;
  }

  if (entry.count >= MAX_REQUESTS_PER_HOUR) {
    return false;
  }

  entry.count++;
  return true;
}

// ============================================
// INPUT VALIDATION & SANITIZATION
// ============================================
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

function validatePhone(phone: string): boolean {
  // Allow digits, spaces, dashes, parentheses, plus sign
  const phoneRegex = /^[\d\s\-\(\)\+]{7,20}$/;
  return !phone || phoneRegex.test(phone); // Phone is optional
}

function validateName(name: string): boolean {
  return name.length >= 1 && name.length <= 100;
}

function validateMessage(message: string): boolean {
  return message.length >= 10 && message.length <= 5000;
}

// ============================================
// TYPES
// ============================================
interface ContactEmailRequest {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  message: string;
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

  try {
    // Validate API key exists
    if (!RESEND_API_KEY) {
      console.error("RESEND_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Email service unavailable" }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // RATE LIMITING (by IP)
    // ============================================
    const clientIP =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({ error: "Too many requests. Please try again later." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // PARSE & VALIDATE REQUEST
    // ============================================
    let payload: ContactEmailRequest;
    try {
      payload = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid request body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { firstName, lastName, email, phone, message } = payload;

    // Validate required fields
    if (!firstName || !lastName || !email || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate field formats
    if (!validateName(firstName) || !validateName(lastName)) {
      return new Response(
        JSON.stringify({ error: "Invalid name format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateEmail(email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (phone && !validatePhone(phone)) {
      return new Response(
        JSON.stringify({ error: "Invalid phone format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateMessage(message)) {
      return new Response(
        JSON.stringify({ error: "Message must be between 10 and 5000 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // SANITIZE ALL USER INPUT
    // ============================================
    const safeFirstName = sanitizeHtml(firstName.trim());
    const safeLastName = sanitizeHtml(lastName.trim());
    const safeEmail = sanitizeHtml(email.trim().toLowerCase());
    const safePhone = phone ? sanitizeHtml(phone.trim()) : "Not provided";
    const safeMessage = sanitizeHtml(message.trim());

    // ============================================
    // STORE IN DATABASE (optional but recommended)
    // ============================================
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    await supabase.from("contact_messages").insert({
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      email: email.trim().toLowerCase(),
      phone: phone?.trim() || null,
      message: message.trim(),
      ip_address: clientIP,
      user_agent: req.headers.get("user-agent") || "unknown",
    });

    // ============================================
    // SEND ADMIN NOTIFICATION EMAIL
    // ============================================
    const adminEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "4A Rentals <noreply@4arentals.com>",
        to: [ADMIN_EMAIL],
        subject: `New Contact Form: ${safeFirstName} ${safeLastName}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <table style="border-collapse: collapse; width: 100%; max-width: 600px;">
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Name</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safeFirstName} ${safeLastName}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Email</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safeEmail}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">Phone</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${safePhone}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border: 1px solid #ddd; font-weight: bold;">IP Address</td>
              <td style="padding: 10px; border: 1px solid #ddd;">${clientIP}</td>
            </tr>
          </table>
          <h3>Message:</h3>
          <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #333; margin: 10px 0;">
            ${safeMessage.replace(/\n/g, "<br>")}
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Submitted at: ${new Date().toISOString()}
          </p>
        `,
      }),
    });

    if (!adminEmailRes.ok) {
      const errorData = await adminEmailRes.text();
      console.error("Failed to send admin email:", errorData);
      throw new Error("Failed to send notification");
    }

    // ============================================
    // SEND CUSTOMER CONFIRMATION EMAIL
    // ============================================
    const customerEmailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "4A Rentals <noreply@4arentals.com>",
        to: [email.trim().toLowerCase()],
        subject: "We received your message - 4A Rentals",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Thank you for contacting us!</h2>
            <p>Hi ${safeFirstName},</p>
            <p>We've received your message and will get back to you within 24-48 hours.</p>
            <h3>Your message:</h3>
            <div style="background: #f5f5f5; padding: 15px; border-left: 4px solid #333; margin: 10px 0;">
              ${safeMessage.replace(/\n/g, "<br>")}
            </div>
            <p>If you have any urgent questions, feel free to call us directly.</p>
            <p>Best regards,<br><strong>4A Rentals Team</strong></p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
            <p style="color: #999; font-size: 12px;">
              This is an automated response. Please do not reply to this email.
            </p>
          </div>
        `,
      }),
    });

    if (!customerEmailRes.ok) {
      console.error("Failed to send customer confirmation email");
      // Don't fail - admin email was sent
    }

    return new Response(
      JSON.stringify({ success: true, message: "Message sent successfully" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-contact-email:", error);
    return new Response(
      JSON.stringify({ error: "Failed to send message. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});