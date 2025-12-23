// services/contactService.ts
import { supabase } from "@/config/supabase";
import { z } from "zod";
import * as Sentry from "@sentry/react";

// ============================================
// TYPES
// ============================================
export interface ContactMessageInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

export interface ContactMessageResult {
  success: boolean;
  error?: string;
}

// ============================================
// VALIDATION SCHEMAS
// ============================================
const contactMessageSchema = z.object({
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name is too long")
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, "First name contains invalid characters"),
  lastName: z
    .string()
    .min(1, "Last name is required")
    .max(50, "Last name is too long")
    .trim()
    .regex(/^[a-zA-Z\s'-]+$/, "Last name contains invalid characters"),
  email: z
    .string()
    .min(1, "Email is required")
    .max(100, "Email is too long")
    .email("Please enter a valid email address")
    .trim()
    .toLowerCase(),
  phone: z
    .string()
    .min(5, "Phone number is too short")
    .max(20, "Phone number is too long")
    .trim()
    .regex(/^[\d\s()+-]+$/, "Please enter a valid phone number"),
  message: z
    .string()
    .min(10, "Message must be at least 10 characters")
    .max(2000, "Message is too long (max 2000 characters)")
    .trim(),
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Safe error logging - dev console, prod Sentry
 */
function logError(context: string, error: unknown): void {
  if (import.meta.env.DEV) {
    console.error(`[contactService] ${context}:`, error);
  } else {
    Sentry.captureException(error, {
      tags: { service: "contactService", context },
    });
  }
}

/**
 * Basic spam detection
 */
function detectSpam(message: string, email: string): boolean {
  const spamPatterns = [
    /\b(viagra|cialis|casino|lottery|winner|congratulations)\b/i,
    /\b(click here|act now|limited time|free money)\b/i,
    /(http[s]?:\/\/.*){3,}/i,
    /(.)\1{10,}/i,
  ];

  const combinedText = `${message} ${email}`;

  for (const pattern of spamPatterns) {
    if (pattern.test(combinedText)) {
      return true;
    }
  }

  return false;
}

/**
 * Send email notification via Edge Function
 */
async function sendEmailNotification(data: ContactMessageInput): Promise<void> {
  try {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

    const response = await fetch(
      `${supabaseUrl}/functions/v1/send-contact-email`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // No auth needed - function has --no-verify-jwt
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Email notification failed:", errorData);
      // Don't throw - email is nice-to-have, DB save is critical
    }
  } catch (error) {
    // Log but don't fail the form submission
    logError("sendEmailNotification", error);
  }
}

// ============================================
// CONTACT SERVICE
// ============================================
export const contactService = {
  /**
   * Submit a contact message
   * Public - no authentication required
   * Rate limited to prevent spam
   */
  async submitMessage(
    messageData: ContactMessageInput
  ): Promise<ContactMessageResult> {
    try {
      // Validate input
      const validated = contactMessageSchema.safeParse(messageData);
      if (!validated.success) {
        const firstError = validated.error.issues[0];
        return {
          success: false,
          error:
            firstError?.message || "Please check your input and try again.",
        };
      }

      const { firstName, lastName, email, phone, message } = validated.data;

      // Spam detection
      if (detectSpam(message, email)) {
        logError("submitMessage - spam detected", { email });
        // Return success to not reveal detection
        return { success: true };
      }

      // Save to database
      const { error } = await supabase.from("contact_messages").insert({
        first_name: firstName,
        last_name: lastName,
        email: email,
        phone: phone,
        message: message,
        status: "new",
      });

      if (error) {
        logError("submitMessage - db insert", error);
        return {
          success: false,
          error: "Unable to send message. Please try again later.",
        };
      }

      // Send email notification (async, don't wait)
      sendEmailNotification(validated.data).catch((err) => {
        logError("sendEmailNotification - background", err);
      });

      return { success: true };
    } catch (error) {
      // Handle rate limit errors
      if (
        error instanceof Error &&
        (error.message.includes("Too many") ||
          error.message.includes("Please wait"))
      ) {
        return {
          success: false,
          error: error.message,
        };
      }

      logError("submitMessage", error);
      return {
        success: false,
        error: "Unable to send message. Please try again later.",
      };
    }
  },
};
