import { supabase } from "@/config/supabase";

// ============================================
// TYPES
// ============================================
export interface InsuranceUploadData {
  bookingId: string;
  userId: string;
  file: File;
  insuranceCompany: string;
  policyNumber: string;
}

export interface InsuranceUploadResult {
  success: boolean;
  url?: string;
  error?: string;
}

// ============================================
// CONSTANTS
// ============================================
const BUCKET_NAME = "insurance-documents";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

// ============================================
// HELPER FUNCTIONS
// ============================================
function log(message: string, data?: unknown): void {
  if (import.meta.env.DEV) {
    console.log(`[InsuranceService] ${message}`, data ?? "");
  }
}

function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit. Your file is ${(
        file.size /
        1024 /
        1024
      ).toFixed(2)}MB`,
    };
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Please upload a PDF, JPEG, PNG, or WebP file.",
    };
  }

  return { valid: true };
}

function generateFileName(
  userId: string,
  bookingId: string,
  originalName: string
): string {
  const extension = originalName.split(".").pop()?.toLowerCase() || "pdf";
  const timestamp = Date.now();
  return `${userId}/${bookingId}_${timestamp}.${extension}`;
}

// ============================================
// SERVICE
// ============================================
export const insuranceService = {
  /**
   * Upload insurance document and update booking
   */
  async uploadInsurance(
    data: InsuranceUploadData
  ): Promise<InsuranceUploadResult> {
    const { bookingId, userId, file, insuranceCompany, policyNumber } = data;

    log("Starting insurance upload", { bookingId, fileName: file.name });

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) {
      return { success: false, error: validation.error };
    }

    try {
      // Generate unique file path
      const filePath = generateFileName(userId, bookingId, file.name);
      log("Generated file path", filePath);

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) {
        log("Upload error", uploadError);
        return {
          success: false,
          error: `Failed to upload file: ${uploadError.message}`,
        };
      }

      log("File uploaded successfully", uploadData);

      // Get public URL (or signed URL for private bucket)
      const { data: urlData } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(filePath);

      // For private bucket, use createSignedUrl instead:
      // const { data: urlData, error: urlError } = await supabase.storage
      //   .from(BUCKET_NAME)
      //   .createSignedUrl(filePath, 60 * 60 * 24 * 365); // 1 year

      const insuranceUrl = urlData?.publicUrl || filePath;

      // Update booking record
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          insurance_uploaded: true,
          insurance_uploaded_at: new Date().toISOString(),
          insurance_url: insuranceUrl,
          insurance_company: insuranceCompany,
          insurance_policy_number: policyNumber,
          insurance_verified: false, // Will be verified by worker
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("user_id", userId); // Ensure user owns this booking

      if (updateError) {
        log("Booking update error", updateError);
        // Try to delete uploaded file on failure
        await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        return {
          success: false,
          error: `Failed to update booking: ${updateError.message}`,
        };
      }

      log("Insurance upload completed successfully");
      return { success: true, url: insuranceUrl };
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Unknown error occurred";
      log("Insurance upload failed", err);
      return { success: false, error: message };
    }
  },

  /**
   * Get signed URL for viewing insurance document (for private bucket)
   */
  async getInsuranceUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .createSignedUrl(filePath, 60 * 60); // 1 hour expiry

      if (error) {
        log("Failed to get signed URL", error);
        return null;
      }

      return data.signedUrl;
    } catch (err) {
      log("Error getting insurance URL", err);
      return null;
    }
  },

  /**
   * Delete insurance document
   */
  async deleteInsurance(
    bookingId: string,
    userId: string,
    filePath: string
  ): Promise<boolean> {
    try {
      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);

      if (deleteError) {
        log("Failed to delete file", deleteError);
        return false;
      }

      // Update booking record
      const { error: updateError } = await supabase
        .from("bookings")
        .update({
          insurance_uploaded: false,
          insurance_uploaded_at: null,
          insurance_url: null,
          insurance_company: null,
          insurance_policy_number: null,
          insurance_verified: false,
          insurance_verified_by: null,
          insurance_verified_at: null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", bookingId)
        .eq("user_id", userId);

      if (updateError) {
        log("Failed to update booking after delete", updateError);
        return false;
      }

      return true;
    } catch (err) {
      log("Error deleting insurance", err);
      return false;
    }
  },
};

export default insuranceService;
