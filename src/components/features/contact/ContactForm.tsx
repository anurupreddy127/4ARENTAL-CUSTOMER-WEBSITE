import React, { useState, useCallback, useMemo } from "react";
import { Send, CheckCircle, AlertCircle } from "lucide-react";
import * as Sentry from "@sentry/react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { contactService } from "@/services/contact/contactService";

// ============================================
// TYPES
// ============================================
type FormStatus = "idle" | "loading" | "success" | "error";

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  message: string;
}

interface FormErrors {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  message?: string;
}

// ============================================
// CONSTANTS
// ============================================
const INITIAL_FORM_DATA: FormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  message: "",
};

const MAX_NAME_LENGTH = 50;
const MIN_PHONE_LENGTH = 5;
const MIN_MESSAGE_LENGTH = 10;
const MAX_MESSAGE_LENGTH = 2000;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Validate form data and return errors object
 */
function validateFormData(formData: FormData): FormErrors {
  const errors: FormErrors = {};

  // First name validation
  if (!formData.firstName.trim()) {
    errors.firstName = "First name is required";
  } else if (formData.firstName.length > MAX_NAME_LENGTH) {
    errors.firstName = `First name must be ${MAX_NAME_LENGTH} characters or less`;
  }

  // Last name validation
  if (!formData.lastName.trim()) {
    errors.lastName = "Last name is required";
  } else if (formData.lastName.length > MAX_NAME_LENGTH) {
    errors.lastName = `Last name must be ${MAX_NAME_LENGTH} characters or less`;
  }

  // Email validation
  if (!formData.email.trim()) {
    errors.email = "Email is required";
  } else if (!EMAIL_REGEX.test(formData.email)) {
    errors.email = "Please enter a valid email address";
  }

  // Phone validation
  if (!formData.phone.trim()) {
    errors.phone = "Phone number is required";
  } else if (formData.phone.length < MIN_PHONE_LENGTH) {
    errors.phone = `Phone number must be at least ${MIN_PHONE_LENGTH} characters`;
  }

  // Message validation
  if (!formData.message.trim()) {
    errors.message = "Message is required";
  } else if (formData.message.length < MIN_MESSAGE_LENGTH) {
    errors.message = `Message must be at least ${MIN_MESSAGE_LENGTH} characters`;
  } else if (formData.message.length > MAX_MESSAGE_LENGTH) {
    errors.message = `Message must be ${MAX_MESSAGE_LENGTH} characters or less`;
  }

  return errors;
}

/**
 * Log error to Sentry in production or console in development
 */
function logError(message: string, error: unknown): void {
  if (import.meta.env.PROD) {
    Sentry.captureException(error, {
      tags: { component: "ContactForm" },
      extra: { message },
    });
  } else {
    console.error(`[ContactForm] ${message}:`, error);
  }
}

// ============================================
// COMPONENT
// ============================================
export const ContactForm: React.FC = () => {
  // ============================================
  // STATE
  // ============================================
  const [formData, setFormData] = useState<FormData>(INITIAL_FORM_DATA);
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<FormStatus>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FormErrors>({});

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const isLoading = useMemo(() => status === "loading", [status]);
  const isSuccess = useMemo(() => status === "success", [status]);
  const hasError = useMemo(
    () => status === "error" && Boolean(errorMessage),
    [status, errorMessage]
  );

  // ============================================
  // HANDLERS
  // ============================================
  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;

      setFormData((prev) => ({
        ...prev,
        [name]: value,
      }));

      // Clear field error when user starts typing
      setFieldErrors((prev) => {
        if (prev[name as keyof FormErrors]) {
          return { ...prev, [name]: undefined };
        }
        return prev;
      });
    },
    []
  );

  const handleHoneypotChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setHoneypot(e.target.value);
    },
    []
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      // Honeypot check - bots will fill this hidden field
      if (honeypot) {
        // Pretend success to fool bots
        setStatus("success");
        return;
      }

      // Client-side validation
      const errors = validateFormData(formData);
      setFieldErrors(errors);

      if (Object.keys(errors).length > 0) {
        return;
      }

      setStatus("loading");
      setErrorMessage("");

      try {
        const result = await contactService.submitMessage(formData);

        if (result.success) {
          setStatus("success");
          setFormData(INITIAL_FORM_DATA);
          setFieldErrors({});
        } else {
          setStatus("error");
          setErrorMessage(
            result.error || "Something went wrong. Please try again."
          );
        }
      } catch (err) {
        logError("Failed to submit contact form", err);
        setStatus("error");
        setErrorMessage("Unable to send message. Please try again later.");
      }
    },
    [formData, honeypot]
  );

  const handleResetForm = useCallback(() => {
    setStatus("idle");
    setErrorMessage("");
    setFieldErrors({});
  }, []);

  // ============================================
  // RENDER - SUCCESS STATE
  // ============================================
  if (isSuccess) {
    return (
      <section className="py-20 bg-bg-100" aria-labelledby="success-heading">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <Card variant="default" padding="lg">
            <div className="text-center py-12" role="status" aria-live="polite">
              <CheckCircle
                className="w-16 h-16 text-green-500 mx-auto mb-6"
                aria-hidden="true"
              />
              <h3
                id="success-heading"
                className="font-heading text-2xl text-text-100 mb-4"
              >
                Message Sent Successfully!
              </h3>
              <p className="font-body text-text-200 mb-8">
                Thank you for contacting us. We'll get back to you within 24-48
                hours.
              </p>
              <Button variant="secondary" onClick={handleResetForm}>
                Send Another Message
              </Button>
            </div>
          </Card>
        </div>
      </section>
    );
  }

  // ============================================
  // RENDER - FORM STATE
  // ============================================
  const formHeadingId = "contact-form-heading";
  const formDescriptionId = "contact-form-description";

  return (
    <section className="py-20 bg-bg-100" aria-labelledby={formHeadingId}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <header className="text-center mb-12">
          <p className="font-body text-sm uppercase tracking-wider text-text-200 mb-3">
            Contact Form
          </p>
          <h2
            id={formHeadingId}
            className="font-heading text-4xl lg:text-5xl text-text-100 mb-4 uppercase tracking-wide"
          >
            Send Us A Message
          </h2>
          <p id={formDescriptionId} className="font-body text-lg text-text-200">
            Fill out the form below and we'll get back to you as soon as
            possible
          </p>
        </header>

        <Card variant="default" padding="lg">
          <form
            onSubmit={handleSubmit}
            className="space-y-6"
            noValidate
            aria-describedby={formDescriptionId}
          >
            {/* Honeypot field - hidden from real users, bots will fill it */}
            <input
              type="text"
              name="website"
              value={honeypot}
              onChange={handleHoneypotChange}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute left-[-9999px] opacity-0 h-0 w-0"
            />

            {/* Error Banner */}
            {hasError && (
              <div
                role="alert"
                className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg"
              >
                <AlertCircle
                  className="w-5 h-5 text-red-500 flex-shrink-0"
                  aria-hidden="true"
                />
                <p className="font-body text-red-700">{errorMessage}</p>
              </div>
            )}

            {/* Name Fields */}
            <div className="grid sm:grid-cols-2 gap-6">
              {/* First Name */}
              <div>
                <label
                  htmlFor="firstName"
                  className="block font-body text-sm font-semibold text-text-100 mb-2"
                >
                  First Name <span aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="given-name"
                  placeholder="John"
                  aria-invalid={Boolean(fieldErrors.firstName)}
                  aria-describedby={
                    fieldErrors.firstName ? "firstName-error" : undefined
                  }
                  className={`w-full px-4 py-3 border-2 rounded-lg font-body text-text-100 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:border-primary-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    fieldErrors.firstName
                      ? "border-red-400 focus-visible:ring-red-200 focus-visible:border-red-400"
                      : "border-bg-200"
                  }`}
                />
                {fieldErrors.firstName && (
                  <p
                    id="firstName-error"
                    role="alert"
                    className="mt-1 text-sm text-red-600"
                  >
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>

              {/* Last Name */}
              <div>
                <label
                  htmlFor="lastName"
                  className="block font-body text-sm font-semibold text-text-100 mb-2"
                >
                  Last Name <span aria-hidden="true">*</span>
                  <span className="sr-only">(required)</span>
                </label>
                <input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  disabled={isLoading}
                  required
                  maxLength={MAX_NAME_LENGTH}
                  autoComplete="family-name"
                  placeholder="Doe"
                  aria-invalid={Boolean(fieldErrors.lastName)}
                  aria-describedby={
                    fieldErrors.lastName ? "lastName-error" : undefined
                  }
                  className={`w-full px-4 py-3 border-2 rounded-lg font-body text-text-100 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:border-primary-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                    fieldErrors.lastName
                      ? "border-red-400 focus-visible:ring-red-200 focus-visible:border-red-400"
                      : "border-bg-200"
                  }`}
                />
                {fieldErrors.lastName && (
                  <p
                    id="lastName-error"
                    role="alert"
                    className="mt-1 text-sm text-red-600"
                  >
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block font-body text-sm font-semibold text-text-100 mb-2"
              >
                Email <span aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isLoading}
                required
                autoComplete="email"
                placeholder="john.doe@example.com"
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={`w-full px-4 py-3 border-2 rounded-lg font-body text-text-100 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:border-primary-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  fieldErrors.email
                    ? "border-red-400 focus-visible:ring-red-200 focus-visible:border-red-400"
                    : "border-bg-200"
                }`}
              />
              {fieldErrors.email && (
                <p
                  id="email-error"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label
                htmlFor="phone"
                className="block font-body text-sm font-semibold text-text-100 mb-2"
              >
                Phone <span aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData.phone}
                onChange={handleInputChange}
                disabled={isLoading}
                required
                autoComplete="tel"
                placeholder="+1 (555) 123-4567"
                aria-invalid={Boolean(fieldErrors.phone)}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
                className={`w-full px-4 py-3 border-2 rounded-lg font-body text-text-100 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:border-primary-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  fieldErrors.phone
                    ? "border-red-400 focus-visible:ring-red-200 focus-visible:border-red-400"
                    : "border-bg-200"
                }`}
              />
              {fieldErrors.phone && (
                <p
                  id="phone-error"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {fieldErrors.phone}
                </p>
              )}
            </div>

            {/* Message */}
            <div>
              <label
                htmlFor="message"
                className="block font-body text-sm font-semibold text-text-100 mb-2"
              >
                Message <span aria-hidden="true">*</span>
                <span className="sr-only">(required)</span>
              </label>
              <textarea
                id="message"
                name="message"
                rows={6}
                value={formData.message}
                onChange={handleInputChange}
                disabled={isLoading}
                required
                maxLength={MAX_MESSAGE_LENGTH}
                placeholder="Tell us how we can help you..."
                aria-invalid={Boolean(fieldErrors.message)}
                aria-describedby={`message-hint${
                  fieldErrors.message ? " message-error" : ""
                }`}
                className={`w-full px-4 py-3 border-2 rounded-lg resize-none font-body text-text-100 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-200 focus-visible:border-primary-200 disabled:bg-gray-100 disabled:cursor-not-allowed ${
                  fieldErrors.message
                    ? "border-red-400 focus-visible:ring-red-200 focus-visible:border-red-400"
                    : "border-bg-200"
                }`}
              />
              {fieldErrors.message && (
                <p
                  id="message-error"
                  role="alert"
                  className="mt-1 text-sm text-red-600"
                >
                  {fieldErrors.message}
                </p>
              )}
              <p
                id="message-hint"
                className="mt-1 text-xs text-text-200 text-right"
                aria-live="polite"
              >
                {formData.message.length}/{MAX_MESSAGE_LENGTH} characters
              </p>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              fullWidth
              disabled={isLoading}
              loading={isLoading}
              icon={
                isLoading ? undefined : (
                  <Send className="w-4 h-4" aria-hidden="true" />
                )
              }
            >
              {isLoading ? "Sending..." : "Send Message"}
            </Button>
          </form>
        </Card>
      </div>
    </section>
  );
};
