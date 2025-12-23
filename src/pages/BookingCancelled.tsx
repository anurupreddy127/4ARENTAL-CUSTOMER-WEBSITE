/* eslint-disable @typescript-eslint/no-unused-vars */
// BookingCancelled.tsx
import React, { useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { XCircle, ArrowLeft, Home } from "lucide-react";
import { Navbar, Footer } from "@/components/layout";

export const BookingCancelled: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const bookingId = searchParams.get("booking_id");

  // Stable handler references
  const handleAuthModalOpen = useCallback((_mode: "login" | "register") => {
    // Auth modal not typically needed on cancelled page
  }, []);

  const handleBrowseVehicles = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handleGoBack = useCallback(() => {
    navigate(-1);
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Payment Cancelled</title>
        <meta
          name="description"
          content="Your payment was cancelled. No charges were made to your account."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <Navbar onAuthModalOpen={handleAuthModalOpen} />

      <main id="main-content" className="max-w-2xl mx-auto px-4 py-16">
        <div className="bg-white rounded-2xl shadow-sm p-8">
          {/* Icon */}
          <div
            className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6"
            aria-hidden="true"
          >
            <XCircle className="w-12 h-12 text-yellow-600" />
          </div>

          {/* Content */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-3">
              Payment Cancelled
            </h1>
            <p className="text-lg text-gray-600 mb-2">
              You cancelled the payment process. No charges were made.
            </p>
            <p className="text-gray-500">
              Your booking request is still pending but requires payment to be
              confirmed.
            </p>
          </div>

          {/* Info Box */}
          <div
            className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-8"
            role="status"
          >
            <h2 className="font-semibold text-yellow-900 mb-2">
              What Happened?
            </h2>
            <p className="text-sm text-yellow-800">
              The payment was not completed. If you'd like to complete your
              booking, please try again or choose a different vehicle.
            </p>
            {bookingId && (
              <p className="text-xs text-yellow-700 mt-2">
                Booking Reference:{" "}
                <span className="font-mono">{bookingId}</span>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="space-y-3">
            <button
              onClick={handleBrowseVehicles}
              className="w-full bg-gray-900 text-white py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <Home className="w-5 h-5" aria-hidden="true" />
              Browse Vehicles
            </button>
            <button
              onClick={handleGoBack}
              className="w-full bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
              Go Back
            </button>
          </div>

          {/* Help Text */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-600">
              Need help? Contact us at{" "}
              <a
                href="mailto:support@4arentals.com"
                className="text-gray-900 font-medium hover:underline"
              >
                support@4arentals.com
              </a>
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
