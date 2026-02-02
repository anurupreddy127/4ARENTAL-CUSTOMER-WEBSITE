// supabase/functions/change-password/index.ts
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

// ============================================
// ALLOWED ORIGINS (Production)
// ============================================
const ALLOWED_ORIGINS = [
  "https://workers.4arentals.com", // Worker portal production
  "https://admin.4arentals.com", // Admin portal if separate
  "http://localhost:5173", // Local development (remove in strict production)
  "http://localhost:5174", // Local development alternate port
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
interface ChangePasswordRequest {
  new_password: string;
  confirm_password: string;
}

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

// ============================================
// PASSWORD VALIDATION
// ============================================
function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (password.length > 72) {
    errors.push("Password must not exceed 72 characters");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  if (!/[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(password)) {
    errors.push(
      "Password must contain at least one special character (!@#$%^&*()_+-=[]{}|;:,.<>?)",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
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
    success: boolean;
  },
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
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
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
        action: "CHANGE_PASSWORD_FAILED",
        resourceType: "worker_account",
        description:
          "Password change attempt without valid authorization header",
        req,
        success: false,
      });

      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      await logAuditEvent(supabaseAdmin, {
        action: "CHANGE_PASSWORD_FAILED",
        resourceType: "worker_account",
        description: "Password change attempt with invalid or expired token",
        req,
        success: false,
      });

      return new Response(
        JSON.stringify({ success: false, error: "Invalid or expired session" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 2. GET WORKER ACCOUNT
    // ============================================
    const { data: workerAccount, error: workerError } = await supabaseAdmin
      .from("worker_accounts")
      .select(
        "id, professional_email, full_name, role, is_active, must_change_password",
      )
      .eq("auth_user_id", user.id)
      .single();

    if (workerError || !workerAccount) {
      await logAuditEvent(supabaseAdmin, {
        action: "CHANGE_PASSWORD_FAILED",
        resourceType: "worker_account",
        description: `Password change attempt by non-worker user: ${user.email}`,
        req,
        success: false,
      });

      return new Response(
        JSON.stringify({ success: false, error: "Worker account not found" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (!workerAccount.is_active) {
      await logAuditEvent(supabaseAdmin, {
        workerId: workerAccount.id,
        workerEmail: workerAccount.professional_email,
        workerName: workerAccount.full_name,
        action: "CHANGE_PASSWORD_FAILED",
        resourceType: "worker_account",
        resourceId: workerAccount.id,
        description: "Password change attempt by inactive worker account",
        req,
        success: false,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Account is inactive. Please contact your administrator.",
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 3. RATE LIMITING
    // ============================================
    const rateLimitResult = await checkRateLimit("PASSWORD_CHANGE", user.id);
    if (!rateLimitResult.success) {
      await logAuditEvent(supabaseAdmin, {
        workerId: workerAccount.id,
        workerEmail: workerAccount.professional_email,
        workerName: workerAccount.full_name,
        action: "CHANGE_PASSWORD_RATE_LIMITED",
        resourceType: "worker_account",
        resourceId: workerAccount.id,
        description: "Password change rate limit exceeded",
        req,
        success: false,
      });

      return rateLimitResponse(
        rateLimitResult,
        corsHeaders,
        "Rate limit exceeded. Maximum 5 password changes per hour. Please try again later.",
      );
    }

    // ============================================
    // 4. PARSE & VALIDATE REQUEST
    // ============================================
    let requestBody: ChangePasswordRequest;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { new_password, confirm_password } = requestBody;

    if (!new_password || !confirm_password) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: new_password and confirm_password",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (new_password !== confirm_password) {
      return new Response(
        JSON.stringify({ success: false, error: "Passwords do not match" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const validation = validatePassword(new_password);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Password does not meet requirements",
          validation_errors: validation.errors,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 5. UPDATE PASSWORD
    // ============================================
    const { error: updateError } =
      await supabaseAdmin.auth.admin.updateUserById(user.id, {
        password: new_password,
      });

    if (updateError) {
      await logAuditEvent(supabaseAdmin, {
        workerId: workerAccount.id,
        workerEmail: workerAccount.professional_email,
        workerName: workerAccount.full_name,
        action: "CHANGE_PASSWORD_FAILED",
        resourceType: "worker_account",
        resourceId: workerAccount.id,
        description: `Password update failed: ${updateError.message}`,
        req,
        success: false,
      });

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to update password. Please try again.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ============================================
    // 6. CLEAR MUST_CHANGE_PASSWORD FLAG
    // ============================================
    const { error: updateWorkerError } = await supabaseAdmin
      .from("worker_accounts")
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", workerAccount.id);

    if (updateWorkerError) {
      console.error(
        "Failed to update must_change_password flag:",
        updateWorkerError,
      );
    }

    // ============================================
    // 7. LOG SUCCESS TO AUDIT
    // ============================================
    await logAuditEvent(supabaseAdmin, {
      workerId: workerAccount.id,
      workerEmail: workerAccount.professional_email,
      workerName: workerAccount.full_name,
      action: "CHANGE_PASSWORD",
      resourceType: "worker_account",
      resourceId: workerAccount.id,
      description: workerAccount.must_change_password
        ? "Completed mandatory password change on first login"
        : "Changed password successfully",
      oldData: { must_change_password: workerAccount.must_change_password },
      newData: { must_change_password: false },
      req,
      success: true,
    });

    // ============================================
    // 8. RETURN SUCCESS
    // ============================================
    return new Response(
      JSON.stringify({
        success: true,
        message: "Password changed successfully",
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
    console.error("Error in change-password:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred. Please try again.",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
