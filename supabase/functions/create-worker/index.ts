// supabase/functions/create-worker/index.ts
import { createClient } from "npm:@supabase/supabase-js@2";
import { randomBytes } from "node:crypto";

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const WORKERS_PORTAL_URL = Deno.env.get("WORKERS_PORTAL_URL") || "https://workers.4arentals.com";

// ============================================
// ALLOWED ORIGINS (Production)
// ============================================
const ALLOWED_ORIGINS = [
  "https://workers.4arentals.com",
  "https://admin.4arentals.com",
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
// TYPES
// ============================================
interface CreateWorkerRequest {
  personal_email: string;
  professional_email: string;
  full_name: string;
  role: "admin" | "manager" | "worker";
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
}

// ============================================
// RATE LIMITING (In-memory sliding window)
// ============================================
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
// UTILITY FUNCTIONS
// ============================================
function generateSecurePassword(length: number = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+-=";
  const bytes = randomBytes(length);
  let password = "";

  for (let i = 0; i < length; i++) {
    password += chars[bytes[i] % chars.length];
  }

  return password;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
}

function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || name.trim().length === 0) {
    return { valid: false, error: "Name is required" };
  }
  if (name.length > 100) {
    return { valid: false, error: "Name must not exceed 100 characters" };
  }
  if (name.length < 2) {
    return { valid: false, error: "Name must be at least 2 characters" };
  }
  // Only allow letters, spaces, hyphens, apostrophes, and periods
  if (!/^[a-zA-Z\s\-'.]+$/.test(name)) {
    return { valid: false, error: "Name contains invalid characters" };
  }
  return { valid: true };
}

// Sanitize string for HTML to prevent XSS
function sanitizeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================
// AUDIT LOGGING HELPER
// ============================================
async function logAuditEvent(
  supabaseAdmin: ReturnType<typeof createClient>,
  params: {
    workerId?: string;
    workerEmail?: string;
    workerName?: string;
    action: string;
    resourceType: string;
    resourceId?: string;
    description: string;
    oldData?: Record<string, unknown>;
    newData?: Record<string, unknown>;
    req: Request;
  }
) {
  try {
    await supabaseAdmin.from("audit_logs").insert({
      worker_id: params.workerId,
      worker_email: params.workerEmail,
      worker_name: params.workerName,
      action: params.action,
      resource_type: params.resourceType,
      resource_id: params.resourceId,
      description: params.description,
      old_data: params.oldData,
      new_data: params.newData,
      ip_address:
        params.req.headers.get("x-forwarded-for") ||
        params.req.headers.get("cf-connecting-ip") ||
        "unknown",
      user_agent: params.req.headers.get("user-agent") || "unknown",
    });
  } catch (error) {
    console.error("Failed to log audit event:", error);
  }
}

// ============================================
// SEND WELCOME EMAIL
// ============================================
async function sendWelcomeEmail(
  personalEmail: string,
  professionalEmail: string,
  fullName: string,
  temporaryPassword: string
): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn("RESEND_API_KEY not configured, skipping email");
    return;
  }

  // Sanitize all user inputs used in HTML
  const safeName = sanitizeHtml(fullName);
  const safeProfessionalEmail = sanitizeHtml(professionalEmail);
  const safePassword = sanitizeHtml(temporaryPassword);

  const emailHtml = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h2 style="color: #333; border-bottom: 3px solid #FFD700; padding-bottom: 10px;">
        Welcome to 4A Rentals Workers Portal
      </h2>
      
      <p>Hi ${safeName},</p>
      
      <p>Your worker account has been created for the 4A Rentals Workers Portal.</p>
      
      <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
        <h3 style="margin-top: 0; color: #333;">Login Credentials</h3>
        <table style="width: 100%;">
          <tr>
            <td style="padding: 8px 0;"><strong>📧 Email:</strong></td>
            <td style="padding: 8px 0;"><code style="background: #fff; padding: 4px 8px; border-radius: 4px;">${safeProfessionalEmail}</code></td>
          </tr>
          <tr>
            <td style="padding: 8px 0;"><strong>🔑 Temporary Password:</strong></td>
            <td style="padding: 8px 0;"><code style="background: #fff; padding: 4px 8px; border-radius: 4px;">${safePassword}</code></td>
          </tr>
        </table>
      </div>
      
      <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
        <p style="margin: 0;"><strong>🔒 IMPORTANT:</strong> You must change your password when you first log in for security reasons.</p>
      </div>
      
      <p>
        <a href="${WORKERS_PORTAL_URL}" 
           style="display: inline-block; background: #FFD700; color: #000; padding: 12px 24px; text-decoration: none; border-radius: 4px; font-weight: bold;">
          Login to Workers Portal
        </a>
      </p>
      
      <p style="color: #666; font-size: 14px; margin-top: 30px;">
        If you have any questions, please contact your administrator.
      </p>
      
      <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
      
      <p style="color: #999; font-size: 12px;">
        Best regards,<br>
        <strong>4A Rentals Team</strong>
      </p>
    </div>
  `;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "4A Rentals <noreply@4arentals.com>",
      to: [personalEmail],
      subject: "Welcome to 4A Rentals - Your Worker Account",
      html: emailHtml,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error("Failed to send welcome email:", errorText);
    throw new Error("Failed to send welcome email");
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
    return new Response(
      JSON.stringify({ success: false, error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  try {
    // ============================================
    // 1. AUTHENTICATION
    // ============================================
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      await logAuditEvent(supabaseAdmin, {
        action: "CREATE_WORKER_FAILED",
        resourceType: "worker_account",
        description: "Worker creation attempt without valid authorization header",
        req,
      });

      return new Response(
        JSON.stringify({ success: false, error: "Authentication required. Please log in." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      await logAuditEvent(supabaseAdmin, {
        action: "CREATE_WORKER_FAILED",
        resourceType: "worker_account",
        description: "Worker creation attempt with invalid or expired token",
        req,
      });

      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired session. Please log in again." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 2. AUTHORIZATION CHECK
    // ============================================
    const { data: workerAccount, error: workerError } = await supabaseAdmin
      .from("worker_accounts")
      .select("id, professional_email, full_name, role, is_active")
      .eq("auth_user_id", user.id)
      .single();

    if (workerError || !workerAccount) {
      await logAuditEvent(supabaseAdmin, {
        action: "CREATE_WORKER_FAILED",
        resourceType: "worker_account",
        description: `Worker creation attempt by non-worker user: ${user.email}`,
        req,
      });

      return new Response(
        JSON.stringify({ success: false, error: "Worker account not found. Please contact support." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!workerAccount.is_active) {
      await logAuditEvent(supabaseAdmin, {
        workerId: workerAccount.id,
        workerEmail: workerAccount.professional_email,
        workerName: workerAccount.full_name,
        action: "CREATE_WORKER_FAILED",
        resourceType: "worker_account",
        description: "Worker creation attempt by inactive account",
        req,
      });

      return new Response(
        JSON.stringify({ success: false, error: "Your account is inactive. Please contact an administrator." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["admin", "manager"].includes(workerAccount.role)) {
      await logAuditEvent(supabaseAdmin, {
        workerId: workerAccount.id,
        workerEmail: workerAccount.professional_email,
        workerName: workerAccount.full_name,
        action: "CREATE_WORKER_UNAUTHORIZED",
        resourceType: "worker_account",
        description: `Unauthorized worker creation attempt by ${workerAccount.role}`,
        req,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "You don't have permission to create workers. Only admins and managers can create workers.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 3. RATE LIMITING
    // ============================================
    if (!checkRateLimit(workerAccount.id)) {
      await logAuditEvent(supabaseAdmin, {
        workerId: workerAccount.id,
        workerEmail: workerAccount.professional_email,
        workerName: workerAccount.full_name,
        action: "CREATE_WORKER_RATE_LIMITED",
        resourceType: "worker_account",
        description: "Worker creation rate limit exceeded",
        req,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Rate limit exceeded. You can create a maximum of 10 workers per hour. Please try again later.",
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 4. PARSE & VALIDATE REQUEST
    // ============================================
    let requestBody: CreateWorkerRequest;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { personal_email, professional_email, full_name, role } = requestBody;

    // Validate required fields
    if (!personal_email || !professional_email || !full_name || !role) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields. Please provide: personal email, professional email, full name, and role.",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate name
    const nameValidation = validateName(full_name);
    if (!nameValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, error: nameValidation.error }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email formats
    if (!validateEmail(personal_email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid personal email format. Please enter a valid email address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!validateEmail(professional_email)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid professional email format. Please enter a valid email address." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate role
    const validRoles = ["admin", "worker", "manager"] as const;
    if (!validRoles.includes(role as typeof validRoles[number])) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid role. Role must be: admin, manager, or worker." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // CRITICAL: Managers cannot create admins or managers
    if (workerAccount.role === "manager" && role !== "worker") {
      await logAuditEvent(supabaseAdmin, {
        workerId: workerAccount.id,
        workerEmail: workerAccount.professional_email,
        workerName: workerAccount.full_name,
        action: "CREATE_WORKER_PRIVILEGE_ESCALATION_ATTEMPT",
        resourceType: "worker_account",
        description: `Manager attempted to create ${role} account for ${professional_email}`,
        newData: { attempted_role: role, target_email: professional_email },
        req,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Managers can only create worker accounts. To create a manager or admin, please contact an administrator.",
        }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 5. CHECK FOR DUPLICATE EMAIL
    // ============================================
    const { data: existingWorker } = await supabaseAdmin
      .from("worker_accounts")
      .select("id")
      .eq("professional_email", professional_email.toLowerCase())
      .single();

    if (existingWorker) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `A worker account with this email already exists. Please use a different email address.`,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 6. GENERATE SECURE PASSWORD
    // ============================================
    const temporaryPassword = generateSecurePassword(12);

    // ============================================
    // 7. CREATE AUTH USER
    // ============================================
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: professional_email.toLowerCase(),
      password: temporaryPassword,
      email_confirm: true,
    });

    if (createError) {
      console.error("Auth user creation error:", createError);

      if (createError.message?.includes("already registered")) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `This email is already registered in the authentication system. Please use a different email.`,
          }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: "Failed to create authentication account. Please try again." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 8. CREATE WORKER ACCOUNT
    // ============================================
    const { data: newWorker, error: insertError } = await supabaseAdmin
      .from("worker_accounts")
      .insert({
        auth_user_id: newUser.user.id,
        professional_email: professional_email.toLowerCase(),
        personal_email: personal_email.toLowerCase(),
        full_name: full_name.trim(),
        role,
        created_by: workerAccount.id,
        is_active: true,
        must_change_password: true,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Worker account creation error:", insertError);

      // Rollback: delete auth user if worker creation fails
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create worker account. Please try again.",
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ============================================
    // 9. LOG TO AUDIT
    // ============================================
    await logAuditEvent(supabaseAdmin, {
      workerId: workerAccount.id,
      workerEmail: workerAccount.professional_email,
      workerName: workerAccount.full_name,
      action: "CREATE_WORKER",
      resourceType: "worker_account",
      resourceId: newWorker.id,
      description: `Created new ${role} account for ${professional_email}`,
      newData: {
        professional_email: professional_email.toLowerCase(),
        personal_email: personal_email.toLowerCase(),
        full_name: full_name.trim(),
        role,
      },
      req,
    });

    // ============================================
    // 10. SEND WELCOME EMAIL
    // ============================================
    try {
      await sendWelcomeEmail(personal_email, professional_email, full_name.trim(), temporaryPassword);
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError);
      // Don't fail the entire operation if email fails
    }

    // ============================================
    // 11. RETURN SUCCESS
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        worker: {
          id: newWorker.id,
          professional_email: newWorker.professional_email,
          full_name: newWorker.full_name,
          role: newWorker.role,
        },
        temporary_password: temporaryPassword,
        message: "Worker account created successfully. Welcome email has been sent.",
      }),
      { status: 201, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error in create-worker:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred. Please try again or contact support.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});