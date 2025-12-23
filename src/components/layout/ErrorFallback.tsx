// components/layout/ErrorFallback.tsx
import React, { useEffect, useRef } from "react";
import * as Sentry from "@sentry/react";

interface ErrorFallbackProps {
  error: unknown; // ← Changed from Error to unknown
  resetError: () => void;
  eventId?: string;
}

export const ErrorFallback: React.FC<ErrorFallbackProps> = ({
  error,
  resetError,
  eventId,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Type guards for safe error access
  const errorMessage =
    error instanceof Error ? error.message : "An unexpected error occurred";
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Focus the container for screen readers
  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  // Copy error details for bug reports
  const handleCopyError = () => {
    const errorDetails = `
Error: ${errorMessage}
${eventId ? `Reference ID: ${eventId}` : ""}
Time: ${new Date().toISOString()}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    navigator.clipboard
      .writeText(errorDetails)
      .then(() => {
        alert("Error details copied to clipboard!");
      })
      .catch(() => {
        // Fallback for older browsers
        console.log("Error details:", errorDetails);
      });
  };

  // Report feedback to Sentry
  const handleReportFeedback = () => {
    if (eventId) {
      Sentry.showReportDialog({ eventId });
    }
  };

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      role="alert"
      aria-live="assertive"
      className="min-h-screen flex items-center justify-center bg-gray-100 px-4 outline-none"
    >
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        {/* Error Icon */}
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Oops! Something went wrong
        </h1>
        <p className="text-gray-600 mb-4">
          We're sorry for the inconvenience. Our team has been notified and is
          working on a fix.
        </p>

        {/* Reference ID for support */}
        {eventId && (
          <p className="text-xs text-gray-400 mb-4">
            Reference ID:{" "}
            <code className="bg-gray-100 px-1 rounded">{eventId}</code>
          </p>
        )}

        {/* Error Details (only in development) */}
        {import.meta.env.DEV && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700">
              Technical Details
            </summary>
            <pre className="mt-2 p-3 bg-gray-100 rounded text-xs text-red-600 overflow-auto max-h-32">
              {errorMessage}
              {errorStack && `\n\n${errorStack}`}
            </pre>
            <button
              onClick={handleCopyError}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Copy error details
            </button>
          </details>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={resetError}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
          >
            Try Again
          </button>
          <button
            onClick={() => (window.location.href = "/")}
            className="px-6 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors font-medium focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
          >
            Go Home
          </button>
        </div>

        {/* Report Issue Button (Sentry) */}
        {eventId && !import.meta.env.DEV && (
          <button
            onClick={handleReportFeedback}
            className="mt-4 text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Report this issue
          </button>
        )}

        {/* Support Link */}
        <p className="mt-6 text-sm text-gray-500">
          Need help?{" "}
          <a
            href="/contact"
            className="text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Contact Support
          </a>
        </p>
      </div>
    </div>
  );
};
