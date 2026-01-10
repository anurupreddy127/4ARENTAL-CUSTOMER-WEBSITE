/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useCallback, useRef } from "react";
import {
  X,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Loader2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { insuranceService } from "@/services/insurance/insuranceService";

// ============================================
// TYPES
// ============================================
interface InsuranceUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingId: string;
  userId: string;
  bookingNumber: string | null;
  onSuccess: () => void;
}

interface FormData {
  insuranceCompany: string;
  policyNumber: string;
  file: File | null;
}

// ============================================
// CONSTANTS
// ============================================
const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_FILE_TYPES = ".pdf,.jpg,.jpeg,.png,.webp";

// ============================================
// COMPONENT
// ============================================
export const InsuranceUploadModal: React.FC<InsuranceUploadModalProps> = ({
  isOpen,
  onClose,
  bookingId,
  userId,
  bookingNumber,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    insuranceCompany: "",
    policyNumber: "",
    file: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  // ============================================
  // HANDLERS
  // ============================================
  const handleClose = useCallback(() => {
    if (loading) return;
    setFormData({ insuranceCompany: "", policyNumber: "", file: null });
    setError(null);
    setSuccess(false);
    onClose();
  }, [loading, onClose]);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const { name, value } = e.target;
      setFormData((prev) => ({ ...prev, [name]: value }));
      setError(null);
    },
    []
  );

  const handleFileSelect = useCallback((file: File | null) => {
    if (!file) return;

    // Validate file size
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File size must be less than ${MAX_FILE_SIZE_MB}MB`);
      return;
    }

    // Validate file type
    const validTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "image/webp",
    ];
    if (!validTypes.includes(file.type)) {
      setError("Please upload a PDF, JPEG, PNG, or WebP file");
      return;
    }

    setFormData((prev) => ({ ...prev, file }));
    setError(null);
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0] || null;
      handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);

      const file = e.dataTransfer.files?.[0] || null;
      handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const handleDrag = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleRemoveFile = useCallback(() => {
    setFormData((prev) => ({ ...prev, file: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const { insuranceCompany, policyNumber, file } = formData;

      // Validation
      if (!insuranceCompany.trim()) {
        setError("Please enter your insurance company name");
        return;
      }
      if (!policyNumber.trim()) {
        setError("Please enter your policy number");
        return;
      }
      if (!file) {
        setError("Please upload your insurance document");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const result = await insuranceService.uploadInsurance({
          bookingId,
          userId,
          file,
          insuranceCompany: insuranceCompany.trim(),
          policyNumber: policyNumber.trim(),
        });

        if (result.success) {
          setSuccess(true);
          setTimeout(() => {
            onSuccess();
            handleClose();
          }, 1500);
        } else {
          setError(result.error || "Failed to upload insurance");
        }
      } catch (err) {
        setError("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [formData, bookingId, userId, onSuccess, handleClose]
  );

  // ============================================
  // KEYBOARD HANDLER
  // ============================================
  React.useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, loading, handleClose]);

  // Prevent body scroll
  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isFormValid =
    formData.insuranceCompany.trim() &&
    formData.policyNumber.trim() &&
    formData.file;

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      role="presentation"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="insurance-modal-title"
        className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div>
            <h2
              id="insurance-modal-title"
              className="text-xl font-semibold text-gray-900"
            >
              Upload Insurance
            </h2>
            {bookingNumber && (
              <p className="text-sm text-gray-500 mt-1">
                Booking: {bookingNumber}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-gray-900"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success State */}
        {success ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Insurance Uploaded Successfully!
            </h3>
            <p className="text-gray-600 text-sm">
              Our team will verify your insurance within 24 hours.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Error Display */}
            {error && (
              <div
                role="alert"
                className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-start gap-2"
              >
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Insurance Company */}
            <div>
              <label
                htmlFor="insuranceCompany"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Insurance Company <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="insuranceCompany"
                name="insuranceCompany"
                value={formData.insuranceCompany}
                onChange={handleInputChange}
                placeholder="e.g., State Farm, GEICO, Progressive"
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            {/* Policy Number */}
            <div>
              <label
                htmlFor="policyNumber"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                Policy Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="policyNumber"
                name="policyNumber"
                value={formData.policyNumber}
                onChange={handleInputChange}
                placeholder="Enter your policy number"
                disabled={loading}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent disabled:bg-gray-100"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Insurance Document <span className="text-red-500">*</span>
              </label>

              {formData.file ? (
                /* File Selected */
                <div className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm truncate max-w-[200px]">
                          {formData.file.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {(formData.file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveFile}
                      disabled={loading}
                      className="text-gray-400 hover:text-red-500 transition-colors p-1"
                      aria-label="Remove file"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ) : (
                /* Drop Zone */
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                    dragActive
                      ? "border-gray-900 bg-gray-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPTED_FILE_TYPES}
                    onChange={handleFileInputChange}
                    disabled={loading}
                    className="hidden"
                    id="insurance-file-input"
                  />
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <Upload className="w-6 h-6 text-gray-400" />
                  </div>
                  <p className="text-gray-600 mb-2">
                    Drag & drop your insurance document here, or{" "}
                    <label
                      htmlFor="insurance-file-input"
                      className="text-gray-900 font-medium cursor-pointer hover:underline"
                    >
                      browse
                    </label>
                  </p>
                  <p className="text-xs text-gray-500">
                    PDF, JPEG, PNG, or WebP (max {MAX_FILE_SIZE_MB}MB)
                  </p>
                </div>
              )}
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>Required:</strong> Please upload a copy of your valid
                auto insurance card or declaration page showing coverage dates
                and policy limits.
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={loading || !isFormValid}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Insurance
                </>
              )}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
};

export default InsuranceUploadModal;
