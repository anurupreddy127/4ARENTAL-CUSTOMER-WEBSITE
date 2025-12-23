/* eslint-disable @typescript-eslint/no-unused-vars */
// BookingSuccess.tsx
import React, { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle,
  Calendar,
  CreditCard,
  Loader2,
  XCircle,
} from "lucide-react";
import * as Sentry from "@sentry/react";
import { supabase } from "@/config/supabase";
import { Navbar, Footer } from "@/components/layout";

interface BookingDetails {
  id: string;
  user_id: string;
  vehicle_id: string;
  pickup_location: string;
  pickup_date: string;
  return_date: string;
  rental_months: number;
  rental_amount: string;
  security_deposit: string;
  total_price: string;
  payment_status: string;
  status: string;
}

interface VehicleDetails {
  name: string;
  image: string | string[];
  category: string;
}

// Helper for logging (development only)
const isDev = import.meta.env.DEV;
const log = (message: string, data?: unknown) => {
  if (isDev) {
    console.log(`[BookingSuccess] ${message}`, data ?? "");
  }
};

export const BookingSuccess: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const bookingId = searchParams.get("booking_id");

  const [loading, setLoading] = useState(true);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails | null>(
    null
  );
  const [vehicleDetails, setVehicleDetails] = useState<VehicleDetails | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

const fetchBookingDetails = async () => {
  log("Fetching booking details", { bookingId, sessionId });

  if (!bookingId && !sessionId) {
    setError("No booking information found");
    setLoading(false);
    return;
  }

  try {
    // ✅ Get current user FIRST
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !currentUser) {
      log("Auth error or no user", authError);
      throw new Error("Please log in to view your booking");
    }

    log("Current user:", currentUser.id);

    // ✅ Build query WITH user_id filter (required by RLS)
    let query = supabase
      .from("bookings")
      .select("*")
      .eq("user_id", currentUser.id); // ← ADD THIS

    if (bookingId) {
      query = query.eq("id", bookingId);
    } else if (sessionId) {
      query = query.eq("stripe_session_id", sessionId);
    }

    const { data: bookings, error: bookingError } = await query.single();

    if (bookingError) {
      log("Error fetching booking", bookingError);

      // Log to Sentry in production
      if (import.meta.env.PROD) {
        Sentry.captureException(bookingError, {
          extra: { bookingId, sessionId, userId: currentUser.id },
        });
      }

      throw new Error(
        "Could not find your booking. Please check your email for confirmation details."
      );
    }

    log("Booking found", bookings.id);
    setBookingDetails(bookings);

    // Fetch vehicle details
    if (bookings.vehicle_id) {
      const { data: vehicle, error: vehicleError } = await supabase
        .from("vehicles")
        .select("name, image, category")
        .eq("id", bookings.vehicle_id)
        .single();

      if (!vehicleError && vehicle) {
        log("Vehicle found", vehicle.name);
        setVehicleDetails(vehicle);
      }
    }
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to load booking details. Please contact support.";
    setError(message);

    if (import.meta.env.PROD) {
      Sentry.captureException(err, {
        extra: { bookingId, sessionId },
      });
    }
  } finally {
    setLoading(false);
  }
};

    fetchBookingDetails();
  }, [bookingId, sessionId]);

  // Stable handler references
  const handleReturnHome = useCallback(() => {
    navigate("/");
  }, [navigate]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleAuthModalOpen = useCallback((_mode: "login" | "register") => {
    // Auth modal not typically needed on success page, but keeping for Navbar compatibility
  }, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Helmet>
          <title>Loading Booking...</title>
        </Helmet>
        <div className="text-center" role="status" aria-live="polite">
          <Loader2
            className="w-12 h-12 text-gray-900 animate-spin mx-auto mb-4"
            aria-hidden="true"
          />
          <p className="text-gray-600">Loading booking details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !bookingDetails) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Helmet>
          <title>Booking Error</title>
          <meta name="robots" content="noindex" />
        </Helmet>

        <Navbar onAuthModalOpen={handleAuthModalOpen} />

        <main id="main-content" className="max-w-2xl mx-auto px-4 py-16">
          <div
            className="bg-white rounded-2xl shadow-sm p-8 text-center"
            role="alert"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" aria-hidden="true" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Error Loading Booking
            </h1>
            <p className="text-gray-600 mb-6">
              {error || "Could not find booking details"}
            </p>
            <button
              onClick={handleReturnHome}
              className="bg-gray-900 text-white px-6 py-3 rounded-xl hover:bg-gray-800 transition-colors"
            >
              Return Home
            </button>
          </div>
        </main>

        <Footer />
      </div>
    );
  }

  const pickupDate = new Date(bookingDetails.pickup_date);
  const returnDate = new Date(bookingDetails.return_date);

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>Booking Confirmed</title>
        <meta
          name="description"
          content="Your car rental booking has been confirmed. View your booking details and next steps."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <Navbar onAuthModalOpen={handleAuthModalOpen} />

      <main id="main-content" className="max-w-3xl mx-auto px-4 py-16">
        {/* Success Header */}
        <section className="text-center mb-8" aria-labelledby="success-heading">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle
              className="w-12 h-12 text-green-600"
              aria-hidden="true"
            />
          </div>
          <h1
            id="success-heading"
            className="text-3xl font-bold text-gray-900 mb-2"
          >
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600">
            Your booking has been confirmed. A confirmation email has been sent.
          </p>
        </section>

        {/* Booking Details Card */}
        <div className="bg-white rounded-2xl shadow-sm overflow-hidden mb-6">
          {/* Vehicle Info */}
          {vehicleDetails && (
            <div className="p-6 bg-gray-50 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <img
                  src={
                    Array.isArray(vehicleDetails.image)
                      ? vehicleDetails.image[0]
                      : vehicleDetails.image
                  }
                  alt={vehicleDetails.name}
                  className="w-24 h-20 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/400x300?text=Vehicle";
                  }}
                />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {vehicleDetails.name}
                  </h2>
                  <p className="text-gray-600 capitalize">
                    {vehicleDetails.category}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Booking Information */}
          <div className="p-6 space-y-6">
            <section aria-labelledby="rental-period-heading">
              <h3
                id="rental-period-heading"
                className="font-semibold text-gray-900 mb-4 flex items-center gap-2"
              >
                <Calendar className="w-5 h-5" aria-hidden="true" />
                Rental Period
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600 mb-1">Pickup Date</p>
                  <p className="font-medium text-gray-900">
                    {pickupDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-gray-600">
                    {pickupDate.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 mb-1">Return Date</p>
                  <p className="font-medium text-gray-900">
                    {returnDate.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <p className="text-gray-600">
                    {returnDate.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-sm text-gray-600">
                  <strong>Duration:</strong> {bookingDetails.rental_months}{" "}
                  {bookingDetails.rental_months === 1 ? "month" : "months"} (
                  {bookingDetails.rental_months * 30} days)
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Pickup Location:</strong>{" "}
                  {bookingDetails.pickup_location}
                </p>
              </div>
            </section>

            {/* Payment Summary */}
            <section
              className="border-t border-gray-100 pt-6"
              aria-labelledby="payment-summary-heading"
            >
              <h3
                id="payment-summary-heading"
                className="font-semibold text-gray-900 mb-4 flex items-center gap-2"
              >
                <CreditCard className="w-5 h-5" aria-hidden="true" />
                Payment Summary
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Rental Fee ({bookingDetails.rental_months} months):
                  </span>
                  <span className="font-medium text-gray-900">
                    ${bookingDetails.rental_amount}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">
                    Security Deposit (Refundable):
                  </span>
                  <span className="font-medium text-gray-900">
                    ${bookingDetails.security_deposit}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-200">
                  <span className="font-semibold text-gray-900">
                    Total Paid:
                  </span>
                  <span className="text-xl font-bold text-gray-900">
                    ${bookingDetails.total_price}
                  </span>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Security Deposit:</strong> Your $
                  {bookingDetails.security_deposit}
                  security deposit will be fully refunded within 5-7 business
                  days after the vehicle is returned in good condition.
                </p>
              </div>
            </section>

            {/* Booking Reference */}
            <section className="border-t border-gray-100 pt-6">
              <p className="text-sm text-gray-600">
                <strong>Booking Reference:</strong>{" "}
                <span className="font-mono text-gray-900">
                  {bookingDetails.id}
                </span>
              </p>
              <p className="text-sm text-gray-600">
                <strong>Payment Status:</strong>{" "}
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                  Paid
                </span>
              </p>
            </section>
          </div>
        </div>

        {/* Next Steps */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle
                className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                We'll contact you within 24 hours to confirm pickup details
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle
                className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                Please bring a valid driver's license and proof of insurance
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle
                className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5"
                aria-hidden="true"
              />
              <span>
                Check your email for complete booking details and documents
              </span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleReturnHome}
            className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors font-medium text-center"
          >
            Return Home
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors font-medium text-center"
          >
            Print Confirmation
          </button>
        </div>
      </main>

      <Footer />
    </div>
  );
};
