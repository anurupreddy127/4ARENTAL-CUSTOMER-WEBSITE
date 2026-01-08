/* eslint-disable @typescript-eslint/no-unused-vars */
// BookingSuccess.tsx
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import {
  CheckCircle,
  Calendar,
  CreditCard,
  Loader2,
  XCircle,
  MapPin,
  Clock,
  GraduationCap,
  FileText,
  Truck,
} from "lucide-react";
import * as Sentry from "@sentry/react";
import { supabase } from "@/config/supabase";
import { Navbar, Footer } from "@/components/layout";
import {
  PrintButton,
  BookingReceiptPrint,
  BookingReceiptData,
} from "@/components/print";

// ============================================
// TYPES
// ============================================
interface BookingDetails {
  id: string;
  booking_number: string | null;
  user_id: string;
  vehicle_id: string;
  pickup_date: string;
  return_date: string;
  rental_type: "weekly" | "monthly" | "semester";
  rental_days: number;
  pricing_method: "weekly" | "monthly" | "semester";
  daily_rate: string;
  weekly_rate: string;
  monthly_rate: string;
  rental_months: number;
  rental_amount: string;
  security_deposit: string;
  additional_driver_fee: string;
  delivery_fee: string;
  total_price: string;
  pickup_type: "store" | "delivery";
  pickup_location: string;
  delivery_time_slot: string | null;
  is_student_booking: boolean;
  payment_status: string;
  status: string;
  customer_info:
    | string
    | {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
      };
  created_at: string;
}

interface VehicleDetails {
  name: string;
  image: string | string[];
  category: string;
}

interface CustomerInfo {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// ============================================
// CONSTANTS
// ============================================
const isDev = import.meta.env.DEV;

// ============================================
// HELPER FUNCTIONS
// ============================================
const log = (message: string, data?: unknown) => {
  if (isDev) {
    console.log(`[BookingSuccess] ${message}`, data ?? "");
  }
};

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `$${num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getRentalTypeLabel(rentalType: string): string {
  switch (rentalType) {
    case "semester":
      return "Semester";
    case "monthly":
      return "Monthly";
    default:
      return "Weekly";
  }
}

function getDurationText(booking: BookingDetails): string {
  const { rental_days, rental_type, pricing_method } = booking;
  const days = rental_days || 7;

  if (rental_type === "semester") {
    return `${days} days (Semester)`;
  }

  if (pricing_method === "monthly") {
    const months = Math.floor(days / 30);
    const overflow = days % 30;
    if (overflow > 0) {
      return `${months}mo + ${overflow}d (${days} days)`;
    }
    return `${months} month${months > 1 ? "s" : ""} (${days} days)`;
  }

  const weeks = Math.floor(days / 7);
  const overflow = days % 7;
  if (overflow > 0) {
    return `${weeks}wk + ${overflow}d (${days} days)`;
  }
  return `${weeks} week${weeks > 1 ? "s" : ""} (${days} days)`;
}

function getCustomerInfo(booking: BookingDetails): CustomerInfo | null {
  if (!booking.customer_info) return null;
  if (typeof booking.customer_info === "string") {
    try {
      return JSON.parse(booking.customer_info);
    } catch {
      return null;
    }
  }
  return booking.customer_info;
}

// Map booking data to print receipt format
function mapToReceiptData(
  booking: BookingDetails,
  vehicle: VehicleDetails | null,
  customer: CustomerInfo | null
): BookingReceiptData {
  const vehicleImage = vehicle?.image
    ? Array.isArray(vehicle.image)
      ? vehicle.image[0]
      : vehicle.image
    : "https://via.placeholder.com/120x80?text=Vehicle";

  return {
    id: booking.id,
    bookingNumber: booking.booking_number,
    createdAt: booking.created_at,
    vehicleName: vehicle?.name || "Vehicle",
    vehicleCategory: vehicle?.category || "Unknown",
    vehicleImage,
    pickupDate: booking.pickup_date,
    returnDate: booking.return_date,
    rentalType: booking.rental_type || "weekly",
    rentalDays: booking.rental_days || booking.rental_months * 30 || 7,
    pricingMethod: booking.pricing_method || booking.rental_type || "weekly",
    pickupType: booking.pickup_type || "store",
    pickupLocation: booking.pickup_location || "Denton, Texas",
    customerName: customer
      ? `${customer.firstName} ${customer.lastName}`.trim()
      : "Customer",
    customerEmail: customer?.email || "",
    customerPhone: customer?.phone || "",
    rentalAmount: parseFloat(booking.rental_amount) || 0,
    deliveryFee: parseFloat(booking.delivery_fee) || 0,
    additionalDriverFee: parseFloat(booking.additional_driver_fee) || 0,
    securityDeposit: parseFloat(booking.security_deposit) || 0,
    totalPrice: parseFloat(booking.total_price) || 0,
    paymentStatus: booking.payment_status || "pending",
    isStudentBooking: booking.is_student_booking || false,
  };
}

// ============================================
// SUB-COMPONENTS (Screen Display)
// ============================================
const InfoRow: React.FC<{
  label: string;
  value: string | React.ReactNode;
  isTotal?: boolean;
}> = ({ label, value, isTotal = false }) => (
  <div
    className={`flex justify-between ${
      isTotal ? "pt-3 border-t border-gray-200" : ""
    }`}
  >
    <span className={isTotal ? "font-semibold text-gray-900" : "text-gray-600"}>
      {label}
    </span>
    <span
      className={
        isTotal
          ? "text-xl font-bold text-gray-900"
          : "font-medium text-gray-900"
      }
    >
      {value}
    </span>
  </div>
);

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const styles: Record<string, string> = {
    paid: "bg-green-100 text-green-800",
    pending: "bg-yellow-100 text-yellow-800",
    failed: "bg-red-100 text-red-800",
    refunded: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[status] || "bg-gray-100 text-gray-800"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
};

const RentalTypeBadge: React.FC<{ type: string; isStudent?: boolean }> = ({
  type,
  isStudent,
}) => {
  if (isStudent) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        <GraduationCap className="w-3 h-3" />
        Student Semester
      </span>
    );
  }

  const styles: Record<string, string> = {
    weekly: "bg-blue-100 text-blue-800",
    monthly: "bg-indigo-100 text-indigo-800",
    semester: "bg-purple-100 text-purple-800",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${
        styles[type] || "bg-gray-100 text-gray-800"
      }`}
    >
      {getRentalTypeLabel(type)} Rate
    </span>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
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

  // Memoized values
  const customerInfo = useMemo(
    () => (bookingDetails ? getCustomerInfo(bookingDetails) : null),
    [bookingDetails]
  );

  const pageTitle = useMemo(() => {
    if (bookingDetails?.booking_number) {
      return `Booking ${bookingDetails.booking_number}`;
    }
    return "Booking Confirmation";
  }, [bookingDetails?.booking_number]);

  // Memoized receipt data for printing
  const receiptData = useMemo(() => {
    if (!bookingDetails) return null;
    return mapToReceiptData(bookingDetails, vehicleDetails, customerInfo);
  }, [bookingDetails, vehicleDetails, customerInfo]);

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
        const {
          data: { user: currentUser },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !currentUser) {
          throw new Error("Please log in to view your booking");
        }

        let query = supabase
          .from("bookings")
          .select("*")
          .eq("user_id", currentUser.id);

        if (bookingId) {
          query = query.eq("id", bookingId);
        } else if (sessionId) {
          query = query.eq("stripe_session_id", sessionId);
        }

        const { data: bookings, error: bookingError } = await query.single();

        if (bookingError) {
          if (import.meta.env.PROD) {
            Sentry.captureException(bookingError, {
              extra: { bookingId, sessionId, userId: currentUser.id },
            });
          }
          throw new Error(
            "Could not find your booking. Please check your email for confirmation details."
          );
        }

        setBookingDetails(bookings);

        if (bookings.vehicle_id) {
          const { data: vehicle } = await supabase
            .from("vehicles")
            .select("name, image, category")
            .eq("id", bookings.vehicle_id)
            .single();

          if (vehicle) {
            setVehicleDetails(vehicle);
          }
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to load booking details.";
        setError(message);

        if (import.meta.env.PROD) {
          Sentry.captureException(err, { extra: { bookingId, sessionId } });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchBookingDetails();
  }, [bookingId, sessionId]);

  const handleReturnHome = useCallback(() => navigate("/"), [navigate]);
  const handleViewBookings = useCallback(
    () => navigate("/my-bookings"),
    [navigate]
  );
  const handleAuthModalOpen = useCallback(() => {}, []);

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Helmet>
          <title>Loading... | 4A Rentals</title>
        </Helmet>
        <div className="text-center" role="status">
          <Loader2 className="w-12 h-12 text-gray-900 animate-spin mx-auto mb-4" />
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
          <title>Booking Error | 4A Rentals</title>
        </Helmet>
        <Navbar onAuthModalOpen={handleAuthModalOpen} />
        <main className="max-w-2xl mx-auto px-4 pt-32 pb-16">
          <div
            className="bg-white rounded-2xl shadow-sm p-8 text-center"
            role="alert"
          >
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
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

  // Success state
  const durationText = getDurationText(bookingDetails);
  const hasDeliveryFee = parseFloat(bookingDetails.delivery_fee || "0") > 0;
  const hasAdditionalDriverFee =
    parseFloat(bookingDetails.additional_driver_fee || "0") > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>{pageTitle} | 4A Rentals</title>
        <meta name="robots" content="noindex" />
      </Helmet>

      <Navbar onAuthModalOpen={handleAuthModalOpen} />

      <main className="max-w-3xl mx-auto px-4 pt-32 pb-16">
        {/* Success Header */}
        <section className="text-center mb-8">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-green-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Payment Successful!
          </h1>
          <p className="text-lg text-gray-600 mb-3">
            Your booking has been confirmed. A confirmation email has been sent.
          </p>
          {bookingDetails.booking_number && (
            <div className="inline-flex items-center gap-2 bg-gray-100 px-4 py-2 rounded-full">
              <FileText className="w-4 h-4 text-gray-600" />
              <span className="text-sm text-gray-600">Booking Number:</span>
              <span className="font-mono font-semibold text-gray-900">
                {bookingDetails.booking_number}
              </span>
            </div>
          )}
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
                  className="w-28 h-20 object-cover rounded-lg"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://via.placeholder.com/400x300?text=Vehicle";
                  }}
                />
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {vehicleDetails.name}
                  </h2>
                  <p className="text-gray-600 capitalize mb-2">
                    {vehicleDetails.category}
                  </p>
                  <RentalTypeBadge
                    type={bookingDetails.rental_type}
                    isStudent={bookingDetails.is_student_booking}
                  />
                </div>
              </div>
            </div>
          )}

          <div className="p-6 space-y-6">
            {/* Rental Period */}
            <section>
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-gray-600" />
                Rental Period
              </h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                    Pickup
                  </p>
                  <p className="font-medium text-gray-900">
                    {formatDate(bookingDetails.pickup_date)}
                  </p>
                  <p className="text-gray-600 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(bookingDetails.pickup_date)}
                  </p>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                    Return
                  </p>
                  <p className="font-medium text-gray-900">
                    {formatDate(bookingDetails.return_date)}
                  </p>
                  <p className="text-gray-600 flex items-center gap-1 mt-1">
                    <Clock className="w-3.5 h-3.5" />
                    {formatTime(bookingDetails.return_date)}
                  </p>
                </div>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  <span>
                    <strong>Duration:</strong> {durationText}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  {bookingDetails.pickup_type === "delivery" ? (
                    <Truck className="w-4 h-4 flex-shrink-0" />
                  ) : (
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                  )}
                  <span>
                    <strong>
                      {bookingDetails.pickup_type === "delivery"
                        ? "Delivery to:"
                        : "Pickup at:"}
                    </strong>{" "}
                    {bookingDetails.pickup_location}
                  </span>
                </div>
              </div>
            </section>

            {/* Student Notice */}
            {bookingDetails.is_student_booking && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <GraduationCap className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-purple-900">
                      Student Pricing Applied
                    </p>
                    <p className="text-sm text-purple-700 mt-1">
                      Please bring a valid student ID when picking up your
                      vehicle.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Payment Summary */}
            <section className="border-t border-gray-100 pt-6">
              <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-gray-600" />
                Payment Summary
              </h3>
              <div className="space-y-2 text-sm">
                <InfoRow
                  label={`Rental (${
                    bookingDetails.rental_days ||
                    bookingDetails.rental_months * 30
                  } days)`}
                  value={formatCurrency(bookingDetails.rental_amount)}
                />
                {hasDeliveryFee && (
                  <InfoRow
                    label="Delivery Fee"
                    value={formatCurrency(bookingDetails.delivery_fee)}
                  />
                )}
                {hasAdditionalDriverFee && (
                  <InfoRow
                    label="Additional Drivers"
                    value={formatCurrency(bookingDetails.additional_driver_fee)}
                  />
                )}
                <InfoRow
                  label="Security Deposit (Refundable)"
                  value={formatCurrency(bookingDetails.security_deposit)}
                />
                <InfoRow
                  label="Total Paid"
                  value={formatCurrency(bookingDetails.total_price)}
                  isTotal
                />
              </div>
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-800">
                  <strong>Security Deposit:</strong> Your{" "}
                  {formatCurrency(bookingDetails.security_deposit)} deposit will
                  be fully refunded within 5-7 business days after the vehicle
                  is returned in good condition.
                </p>
              </div>
            </section>

            {/* Booking Reference */}
            <section className="border-t border-gray-100 pt-6">
              <div className="grid sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                    Booking Number
                  </p>
                  <p className="font-mono font-medium text-gray-900">
                    {bookingDetails.booking_number ||
                      bookingDetails.id.slice(0, 8)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                    Payment Status
                  </p>
                  <StatusBadge status={bookingDetails.payment_status} />
                </div>
                {customerInfo && (
                  <>
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                        Customer
                      </p>
                      <p className="font-medium text-gray-900">
                        {customerInfo.firstName} {customerInfo.lastName}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 text-xs uppercase tracking-wide mb-1">
                        Email
                      </p>
                      <p className="text-gray-900">{customerInfo.email}</p>
                    </div>
                  </>
                )}
              </div>
            </section>
          </div>
        </div>

        {/* What's Next */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">What's Next?</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                We'll contact you within 24 hours to confirm pickup details
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                Please bring a valid driver's license
                {bookingDetails.is_student_booking
                  ? " and student ID"
                  : ""}{" "}
                when picking up
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>
                Upload your insurance within 24 hours of pickup (from My
                Bookings)
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <span>Check your email for complete booking details</span>
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-4">
          <button
            onClick={handleViewBookings}
            className="flex-1 bg-gray-900 text-white py-3 px-6 rounded-xl hover:bg-gray-800 transition-colors font-medium text-center"
          >
            View My Bookings
          </button>
          <button
            onClick={handleReturnHome}
            className="flex-1 bg-white border border-gray-300 text-gray-700 py-3 px-6 rounded-xl hover:bg-gray-50 transition-colors font-medium text-center"
          >
            Return Home
          </button>
          {receiptData && (
            <PrintButton
              content={<BookingReceiptPrint data={receiptData} />}
              title={`Booking ${
                bookingDetails.booking_number || bookingDetails.id.slice(0, 8)
              }`}
              variant="secondary"
              label="Print"
              showPreview={true}
            />
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};
