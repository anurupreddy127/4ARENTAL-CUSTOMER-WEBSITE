/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import * as Sentry from "@sentry/react";
import {
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  Car,
  AlertCircle,
  CheckCircle,
  XCircle,
  Users,
  Store,
  Truck,
  GraduationCap,
  FileText,
  CreditCard,
  Sun,
  Sunset,
  Moon,
  Upload,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useBookings } from "@/hooks";
import { Booking, RentalType, PaymentStatus, PickupType } from "@/types";
import { Loader } from "@/components/ui/Loader";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Navbar, Footer } from "@/components/layout";
import {
  PrintButton,
  BookingReceiptPrint,
  BookingReceiptData,
} from "@/components/print";
import { InsuranceUploadModal, ExtendRentalModal } from "@/components/modals";

// ============================================
// CONSTANTS
// ============================================
const FILTER_TABS = [
  { value: "all", label: "All Bookings" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "active", label: "Active" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

type FilterValue = (typeof FILTER_TABS)[number]["value"];

// ============================================
// STATUS BADGE CONFIGURATION
// ============================================
interface StatusBadgeConfig {
  bg: string;
  text: string;
  icon: React.ReactNode;
  label: string;
}

const STATUS_BADGES: Record<Booking["status"], StatusBadgeConfig> = {
  pending: {
    bg: "bg-yellow-100",
    text: "text-yellow-800",
    icon: <Clock className="w-4 h-4" aria-hidden="true" />,
    label: "Pending",
  },
  confirmed: {
    bg: "bg-blue-100",
    text: "text-blue-800",
    icon: <CheckCircle className="w-4 h-4" aria-hidden="true" />,
    label: "Confirmed",
  },
  active: {
    bg: "bg-green-100",
    text: "text-green-800",
    icon: <Car className="w-4 h-4" aria-hidden="true" />,
    label: "Active",
  },
  inspection: {
    bg: "bg-purple-100",
    text: "text-purple-800",
    icon: <AlertCircle className="w-4 h-4" aria-hidden="true" />,
    label: "Inspection",
  },
  completed: {
    bg: "bg-gray-100",
    text: "text-gray-800",
    icon: <CheckCircle className="w-4 h-4" aria-hidden="true" />,
    label: "Completed",
  },
  cancelled: {
    bg: "bg-red-100",
    text: "text-red-800",
    icon: <XCircle className="w-4 h-4" aria-hidden="true" />,
    label: "Cancelled",
  },
};

const PAYMENT_STATUS_BADGES: Record<
  PaymentStatus,
  { bg: string; text: string; label: string }
> = {
  unpaid: { bg: "bg-gray-100", text: "text-gray-700", label: "Unpaid" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Pending" },
  paid: { bg: "bg-green-100", text: "text-green-800", label: "Paid" },
  failed: { bg: "bg-red-100", text: "text-red-800", label: "Failed" },
  refunded: { bg: "bg-blue-100", text: "text-blue-800", label: "Refunded" },
  expired: { bg: "bg-gray-100", text: "text-gray-600", label: "Expired" },
};

const RENTAL_TYPE_BADGES: Record<
  RentalType,
  { bg: string; text: string; label: string }
> = {
  weekly: { bg: "bg-blue-100", text: "text-blue-800", label: "Weekly" },
  monthly: { bg: "bg-indigo-100", text: "text-indigo-800", label: "Monthly" },
  semester: { bg: "bg-purple-100", text: "text-purple-800", label: "Semester" },
};

const TIME_SLOT_CONFIG: Record<
  string,
  { icon: React.ReactNode; label: string }
> = {
  morning: {
    icon: <Sun className="w-4 h-4" />,
    label: "Morning (9AM - 12PM)",
  },
  afternoon: {
    icon: <Sunset className="w-4 h-4" />,
    label: "Afternoon (12PM - 5PM)",
  },
  evening: {
    icon: <Moon className="w-4 h-4" />,
    label: "Evening (5PM - 8PM)",
  },
};

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(dateString: string): string {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getDurationText(
  rentalDays: number | null,
  rentalType: RentalType
): string {
  const days = rentalDays || 7;

  if (rentalType === "semester") {
    return `${days} days (Semester)`;
  }

  if (rentalType === "monthly") {
    const months = Math.floor(days / 30);
    const overflow = days % 30;
    if (overflow > 0) {
      return `${days} days (${months}mo + ${overflow}d)`;
    }
    return `${days} days (${months} month${months > 1 ? "s" : ""})`;
  }

  const weeks = Math.floor(days / 7);
  const overflow = days % 7;
  if (overflow > 0) {
    return `${days} days (${weeks}wk + ${overflow}d)`;
  }
  return `${days} days (${weeks} week${weeks > 1 ? "s" : ""})`;
}

function mapBookingToReceiptData(booking: Booking): BookingReceiptData {
  const vehicleImage = booking.vehicle?.image
    ? Array.isArray(booking.vehicle.image)
      ? booking.vehicle.image[0]
      : booking.vehicle.image
    : "https://via.placeholder.com/120x80?text=Vehicle";

  return {
    id: booking.id,
    bookingNumber: booking.bookingNumber,
    createdAt: booking.createdAt.toString(),
    vehicleName: booking.vehicle?.name || "Vehicle",
    vehicleCategory: booking.vehicle?.category || "Unknown",
    vehicleImage,
    pickupDate: booking.pickupDate,
    returnDate: booking.returnDate,
    rentalType: booking.rentalType || "weekly",
    rentalDays: booking.rentalDays || 7,
    pricingMethod: booking.pricingMethod || booking.rentalType || "weekly",
    pickupType: booking.pickupType || "store",
    pickupLocation: booking.pickupLocation || "Denton, Texas",
    customerName: booking.customerInfo
      ? `${booking.customerInfo.firstName} ${booking.customerInfo.lastName}`.trim()
      : "Customer",
    customerEmail: booking.customerInfo?.email || "",
    customerPhone: booking.customerInfo?.phone || "",
    rentalAmount: booking.rentalAmount || 0,
    deliveryFee: booking.deliveryFee || 0,
    additionalDriverFee: booking.additionalDriverFee || 0,
    securityDeposit: booking.securityDeposit || 0,
    totalPrice: booking.totalPrice || 0,
    paymentStatus: booking.paymentStatus || "pending",
    isStudentBooking: booking.isStudentBooking || false,
  };
}

// ============================================
// SUB-COMPONENTS
// ============================================

/** Success Banner Component */
const SuccessBanner: React.FC<{
  message: string;
  onDismiss: () => void;
}> = ({ message, onDismiss }) => (
  <div
    className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center justify-between"
    role="alert"
  >
    <div className="flex items-center gap-3">
      <CheckCircle className="w-5 h-5 text-green-600" aria-hidden="true" />
      <p className="text-green-800 font-medium">{message}</p>
    </div>
    <button
      type="button"
      onClick={onDismiss}
      className="text-green-600 hover:text-green-800 transition-colors"
      aria-label="Dismiss"
    >
      <X className="w-5 h-5" />
    </button>
  </div>
);

/** Booking Status Badge */
const StatusBadge: React.FC<{ status: Booking["status"] }> = ({ status }) => {
  const badge = STATUS_BADGES[status] || STATUS_BADGES.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
    >
      {badge.icon}
      {badge.label}
    </span>
  );
};

/** Payment Status Badge */
const PaymentStatusBadge: React.FC<{ status: PaymentStatus }> = ({
  status,
}) => {
  const badge = PAYMENT_STATUS_BADGES[status] || PAYMENT_STATUS_BADGES.pending;

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
    >
      <CreditCard className="w-3 h-3" aria-hidden="true" />
      {badge.label}
    </span>
  );
};

/** Rental Type Badge */
const RentalTypeBadge: React.FC<{
  rentalType: RentalType;
  isStudent?: boolean;
}> = ({ rentalType, isStudent }) => {
  if (isStudent) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        <GraduationCap className="w-3 h-3" aria-hidden="true" />
        Student
      </span>
    );
  }

  const badge = RENTAL_TYPE_BADGES[rentalType] || RENTAL_TYPE_BADGES.weekly;

  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}
    >
      {badge.label}
    </span>
  );
};

/** Pickup Type Display */
const PickupTypeDisplay: React.FC<{
  pickupType: PickupType;
  location: string;
  timeSlot?: string | null;
}> = ({ pickupType, location, timeSlot }) => {
  const isDelivery = pickupType === "delivery";
  const timeSlotInfo = timeSlot ? TIME_SLOT_CONFIG[timeSlot] : null;

  return (
    <div className="flex items-start gap-3 text-sm">
      <div
        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
          isDelivery ? "bg-blue-100" : "bg-gray-100"
        }`}
      >
        {isDelivery ? (
          <Truck className="w-4 h-4 text-blue-600" aria-hidden="true" />
        ) : (
          <Store className="w-4 h-4 text-gray-600" aria-hidden="true" />
        )}
      </div>
      <div>
        <p className="font-medium text-gray-900">
          {isDelivery ? "Delivery" : "Store Pickup"}
        </p>
        <p className="text-gray-600 text-xs">{location}</p>
        {isDelivery && timeSlotInfo && (
          <p className="text-gray-500 text-xs mt-1 flex items-center gap-1">
            {timeSlotInfo.icon}
            {timeSlotInfo.label}
          </p>
        )}
      </div>
    </div>
  );
};

/** Insurance Status Display */
const InsuranceStatus: React.FC<{
  uploaded: boolean;
  verified: boolean;
  status: Booking["status"];
  onUploadClick: () => void;
}> = ({ uploaded, verified, status, onUploadClick }) => {
  // Don't show for completed/cancelled
  if (status === "completed" || status === "cancelled") return null;

  if (verified) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
        <CheckCircle className="w-4 h-4" aria-hidden="true" />
        <span>Insurance Verified</span>
      </div>
    );
  }

  if (uploaded) {
    return (
      <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
        <Clock className="w-4 h-4" aria-hidden="true" />
        <span>Insurance Under Review</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2 text-sm text-amber-700 bg-amber-50 px-3 py-2 rounded-lg">
      <div className="flex items-center gap-2">
        <AlertCircle className="w-4 h-4" aria-hidden="true" />
        <span>Insurance Required</span>
      </div>
      <button
        type="button"
        onClick={onUploadClick}
        className="text-xs font-medium text-amber-800 hover:text-amber-900 underline"
      >
        Upload Now
      </button>
    </div>
  );
};

/** Payment Summary Section */
const PaymentSummary: React.FC<{
  booking: Booking;
}> = ({ booking }) => {
  const hasDeliveryFee = booking.deliveryFee > 0;
  const hasAdditionalDriverFee = booking.additionalDriverFee > 0;

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <DollarSign className="w-4 h-4 text-gray-600" aria-hidden="true" />
        Payment Summary
      </h4>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">
            Rental ({booking.rentalDays || "-"} days)
          </span>
          <span className="text-gray-900">
            {formatCurrency(booking.rentalAmount)}
          </span>
        </div>
        {hasDeliveryFee && (
          <div className="flex justify-between">
            <span className="text-gray-600">Delivery Fee</span>
            <span className="text-gray-900">
              {formatCurrency(booking.deliveryFee)}
            </span>
          </div>
        )}
        {hasAdditionalDriverFee && (
          <div className="flex justify-between">
            <span className="text-gray-600">Additional Drivers</span>
            <span className="text-gray-900">
              {formatCurrency(booking.additionalDriverFee)}
            </span>
          </div>
        )}
        <div className="flex justify-between">
          <span className="text-gray-600">Security Deposit</span>
          <span className="text-gray-900">
            {formatCurrency(booking.securityDeposit)}
          </span>
        </div>
        <div className="flex justify-between pt-2 border-t border-gray-200">
          <span className="font-semibold text-gray-900">Total Paid</span>
          <span className="font-bold text-gray-900 text-base">
            {formatCurrency(booking.totalPrice)}
          </span>
        </div>
      </div>
      {booking.status === "completed" && (
        <div className="mt-3 pt-3 border-t border-gray-200">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Security Deposit Refund</span>
            <span
              className={
                booking.securityDepositReturned
                  ? "text-green-600"
                  : "text-amber-600"
              }
            >
              {booking.securityDepositReturned
                ? `Refunded ${formatCurrency(
                    booking.securityDepositAmountReturned
                  )}`
                : "Pending"}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

/** Status message component */
const StatusMessage: React.FC<{ status: Booking["status"] }> = ({ status }) => {
  const messages: Partial<
    Record<
      Booking["status"],
      { bg: string; border: string; text: string; content: React.ReactNode }
    >
  > = {
    pending: {
      bg: "bg-yellow-50",
      border: "border-yellow-200",
      text: "text-yellow-800",
      content: (
        <>
          <strong>Pending Confirmation:</strong> We'll contact you within 24
          hours to confirm your reservation.
        </>
      ),
    },
    confirmed: {
      bg: "bg-blue-50",
      border: "border-blue-200",
      text: "text-blue-800",
      content: (
        <>
          <strong>Confirmed:</strong> Your booking is confirmed! We'll contact
          you before pickup with further instructions.
        </>
      ),
    },
    active: {
      bg: "bg-green-50",
      border: "border-green-200",
      text: "text-green-800",
      content: (
        <>
          <strong>Active Rental:</strong> You currently have this vehicle.
          Please return it by the scheduled date.
        </>
      ),
    },
  };

  const message = messages[status];
  if (!message) return null;

  return (
    <div className={`${message.bg} border ${message.border} rounded-lg p-3`}>
      <p className={`text-sm ${message.text}`}>{message.content}</p>
    </div>
  );
};

// ============================================
// BOOKING CARD COMPONENT
// ============================================
interface BookingCardProps {
  booking: Booking;
  onRefresh?: () => void;
}

const BookingCard: React.FC<BookingCardProps> = ({ booking, onRefresh }) => {
  const [showInsuranceModal, setShowInsuranceModal] = useState(false);
  const [showExtendModal, setShowExtendModal] = useState(false);

  const vehicle = booking.vehicle;
  const durationText = getDurationText(booking.rentalDays, booking.rentalType);

  // Print receipt data
  const receiptData = useMemo(
    () => mapBookingToReceiptData(booking),
    [booking]
  );

  const handleInsuranceUploadClick = useCallback(() => {
    setShowInsuranceModal(true);
  }, []);

  const handleInsuranceModalClose = useCallback(() => {
    setShowInsuranceModal(false);
  }, []);

  const handleExtendClick = useCallback(() => {
    setShowExtendModal(true);
  }, []);

  const handleExtendModalClose = useCallback(() => {
    setShowExtendModal(false);
  }, []);

  const handleInsuranceSuccess = useCallback(() => {
    setShowInsuranceModal(false);
    onRefresh?.();
  }, [onRefresh]);

  // Check if extension is allowed
  const canExtend = useMemo(() => {
    return (
      (booking.status === "confirmed" || booking.status === "active") &&
      booking.rentalType === "monthly" &&
      (booking.extensionCount || 0) < 5
    );
  }, [booking]);

  return (
    <>
      <Card variant="default" padding="none" className="overflow-hidden">
        {/* Card Header with Booking Number */}
        <div className="bg-gray-50 border-b border-gray-100 px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <FileText className="w-5 h-5 text-gray-400" aria-hidden="true" />
              <div>
                <p className="text-xs text-gray-500 uppercase tracking-wide">
                  Booking Number
                </p>
                <p className="font-mono font-semibold text-gray-900">
                  {booking.bookingNumber ||
                    booking.id.slice(0, 8).toUpperCase()}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge status={booking.status} />
              <PaymentStatusBadge status={booking.paymentStatus} />
            </div>
          </div>
        </div>

        <div className="p-6">
          <article className="flex flex-col lg:flex-row gap-6">
            {/* Vehicle Image */}
            <div className="lg:w-56 flex-shrink-0">
              {vehicle ? (
                <img
                  src={
                    Array.isArray(vehicle.image)
                      ? vehicle.image[0]
                      : vehicle.image
                  }
                  alt={vehicle.name}
                  className="w-full h-40 lg:h-full object-cover rounded-xl"
                  loading="lazy"
                />
              ) : (
                <div
                  className="w-full h-40 lg:h-full bg-gray-200 rounded-xl flex items-center justify-center"
                  aria-label="Vehicle image not available"
                >
                  <Car className="w-12 h-12 text-gray-300" aria-hidden="true" />
                </div>
              )}
            </div>

            {/* Booking Details */}
            <div className="flex-1 space-y-4">
              {/* Vehicle Info */}
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">
                      {vehicle ? vehicle.name : "Vehicle Details Unavailable"}
                    </h3>
                    {vehicle && (
                      <p className="text-gray-500 text-sm capitalize">
                        {vehicle.specifications?.seats || "-"} seats •{" "}
                        {vehicle.specifications?.transmission || "Automatic"} •{" "}
                        {vehicle.specifications?.fuelType || "Gasoline"}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <RentalTypeBadge
                      rentalType={booking.rentalType}
                      isStudent={booking.isStudentBooking}
                    />
                    {booking.isStudentBooking && (
                      <RentalTypeBadge rentalType={booking.rentalType} />
                    )}
                  </div>
                </div>
              </div>

              {/* Dates Grid */}
              <div className="grid grid-cols-3 gap-4 bg-gray-50 rounded-lg p-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Pickup
                  </p>
                  <p className="font-medium text-gray-900">
                    {formatDate(booking.pickupDate)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTime(booking.pickupDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Return
                  </p>
                  <p className="font-medium text-gray-900">
                    {formatDate(booking.returnDate)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {formatTime(booking.returnDate)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                    Duration
                  </p>
                  <p className="font-medium text-gray-900">{durationText}</p>
                </div>
              </div>

              {/* Pickup Location */}
              <PickupTypeDisplay
                pickupType={booking.pickupType}
                location={booking.pickupLocation}
                timeSlot={booking.deliveryTimeSlot}
              />

              {/* Student Notice */}
              {booking.isStudentBooking && (
                <div className="flex items-center gap-2 text-sm text-purple-700 bg-purple-50 px-3 py-2 rounded-lg">
                  <GraduationCap className="w-4 h-4" aria-hidden="true" />
                  <span>
                    {booking.studentVerified
                      ? "Student discount verified"
                      : "Student ID verification required at pickup"}
                  </span>
                </div>
              )}

              {/* Insurance Status */}
              <InsuranceStatus
                uploaded={booking.insuranceUploaded}
                verified={booking.insuranceVerified}
                status={booking.status}
                onUploadClick={handleInsuranceUploadClick}
              />

              {/* Payment Summary */}
              <PaymentSummary booking={booking} />

              {/* Status Message */}
              <StatusMessage status={booking.status} />

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <PrintButton
                  content={<BookingReceiptPrint data={receiptData} />}
                  title={`Booking ${
                    booking.bookingNumber || booking.id.slice(0, 8)
                  }`}
                  variant="secondary"
                  size="sm"
                  label="Print Receipt"
                  showPreview={true}
                />

                {/* Upload Insurance Button (if not uploaded) */}
                {!booking.insuranceUploaded &&
                  booking.status !== "completed" &&
                  booking.status !== "cancelled" && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleInsuranceUploadClick}
                    >
                      <Upload className="w-4 h-4 mr-1" />
                      Upload Insurance
                    </Button>
                  )}

                {/* Extend Rental Button */}
                {canExtend && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExtendClick}
                  >
                    <Calendar className="w-4 h-4 mr-1" />
                    Extend Rental
                  </Button>
                )}
              </div>
            </div>
          </article>
        </div>
      </Card>

      {/* Insurance Upload Modal */}
      <InsuranceUploadModal
        isOpen={showInsuranceModal}
        onClose={handleInsuranceModalClose}
        bookingId={booking.id}
        userId={booking.userId}
        bookingNumber={booking.bookingNumber}
        onSuccess={handleInsuranceSuccess}
      />

      {/* Extend Rental Modal */}
      <ExtendRentalModal
        isOpen={showExtendModal}
        onClose={handleExtendModalClose}
        booking={booking}
      />
    </>
  );
};

// ============================================
// LOADING SCREEN COMPONENT
// ============================================
interface LoadingScreenProps {
  title: string;
  message: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ title, message }) => (
  <div className="min-h-screen bg-gray-50 flex items-center justify-center">
    <Helmet>
      <title>{title}</title>
      <meta name="robots" content="noindex" />
    </Helmet>
    <div className="text-center" role="status" aria-live="polite">
      <div className="flex justify-center mb-4">
        <Loader />
      </div>
      <p className="text-gray-600">{message}</p>
    </div>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
export const MyBookings: React.FC = () => {
  const { currentUser, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filter, setFilter] = useState<FilterValue>("all");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { bookings, loading: bookingsLoading, error, refetch } = useBookings();

  // Handle extension success/cancel from URL params
  useEffect(() => {
    const extensionStatus = searchParams.get("extension");
    const bookingId = searchParams.get("booking_id");

    if (extensionStatus === "success" && bookingId) {
      console.log("[MyBookings] Extension successful for booking:", bookingId);
      setSuccessMessage("Your rental has been extended successfully!");

      // Clear the URL params
      setSearchParams({});

      // Refetch bookings to get updated data
      refetch();
    } else if (extensionStatus === "cancelled") {
      console.log("[MyBookings] Extension cancelled");
      // Clear the URL params
      setSearchParams({});
    }
  }, [searchParams, setSearchParams, refetch]);

  // Redirect when not logged in
  useEffect(() => {
    if (!authLoading && !currentUser) {
      navigate("/");
    }
  }, [currentUser, authLoading, navigate]);

  // Log errors to Sentry
  useEffect(() => {
    if (error) {
      if (import.meta.env.PROD) {
        Sentry.captureException(new Error(error), {
          tags: {
            component: "MyBookings",
            userId: currentUser?.id,
          },
          extra: {
            filter,
            bookingsCount: bookings.length,
          },
        });
      } else {
        console.error("[MyBookings] Error loading bookings:", error);
      }
    }
  }, [error, currentUser?.id, filter, bookings.length]);

  const handleAuthModalOpen = useCallback((_mode: "login" | "register") => {
    // User is already logged in
  }, []);

  const handleFilterChange = useCallback((value: FilterValue) => {
    setFilter(value);
  }, []);

  const handleDismissSuccess = useCallback(() => {
    setSuccessMessage(null);
  }, []);

  // Filtered bookings
  const filteredBookings = useMemo(() => {
    if (filter === "all") return bookings;
    return bookings.filter((b) => b.status === filter);
  }, [bookings, filter]);

  // Booking counts
  const bookingCounts = useMemo(() => {
    const counts: Record<string, number> = { all: bookings.length };
    FILTER_TABS.forEach((tab) => {
      if (tab.value !== "all") {
        counts[tab.value] = bookings.filter(
          (b) => b.status === tab.value
        ).length;
      }
    });
    return counts;
  }, [bookings]);

  if (authLoading) {
    return (
      <LoadingScreen title="Loading..." message="Checking authentication..." />
    );
  }

  if (bookingsLoading) {
    return (
      <LoadingScreen
        title="Loading Bookings..."
        message="Loading your bookings..."
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Helmet>
        <title>My Bookings | 4A Rentals</title>
        <meta
          name="description"
          content="View and manage your vehicle rental bookings with 4A Rentals."
        />
        <meta name="robots" content="noindex" />
      </Helmet>

      <Navbar onAuthModalOpen={handleAuthModalOpen} />

      <main id="main-content">
        <div className="pt-32 pb-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Page Header */}
            <header className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                My Bookings
              </h1>
              <p className="text-gray-600">
                View and manage your vehicle rental bookings
              </p>
            </header>

            {/* Success Banner */}
            {successMessage && (
              <SuccessBanner
                message={successMessage}
                onDismiss={handleDismissSuccess}
              />
            )}

            {/* Error Message */}
            {error && (
              <div
                className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6"
                role="alert"
              >
                Unable to load your bookings. Please try again later.
              </div>
            )}

            {/* Filter Tabs */}
            <nav className="mb-8 overflow-x-auto" aria-label="Filter bookings">
              <div
                className="flex gap-2 min-w-max"
                role="group"
                aria-label="Booking status filters"
              >
                {FILTER_TABS.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => handleFilterChange(tab.value)}
                    aria-pressed={filter === tab.value}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      filter === tab.value
                        ? "bg-gray-900 text-white"
                        : "bg-white text-gray-600 hover:text-gray-900 border border-gray-200"
                    }`}
                  >
                    {tab.label} ({bookingCounts[tab.value]})
                  </button>
                ))}
              </div>
            </nav>

            {/* Bookings List */}
            {filteredBookings.length === 0 ? (
              <Card
                variant="default"
                padding="lg"
                className="text-center py-12"
              >
                <div
                  className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4"
                  aria-hidden="true"
                >
                  <Calendar className="w-8 h-8 text-gray-400" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {filter === "all"
                    ? "No bookings yet"
                    : `No ${filter} bookings`}
                </h2>
                <p className="text-gray-600 mb-6">
                  {filter === "all"
                    ? "You haven't made any bookings yet. Browse our fleet to get started!"
                    : `You don't have any ${filter} bookings.`}
                </p>
                <Link to="/fleet">
                  <Button variant="primary">
                    <Car className="w-4 h-4 mr-2" aria-hidden="true" />
                    Browse Vehicles
                  </Button>
                </Link>
              </Card>
            ) : (
              <section aria-label="Bookings list">
                <div className="space-y-6">
                  {filteredBookings.map((booking) => (
                    <BookingCard
                      key={booking.id}
                      booking={booking}
                      onRefresh={refetch}
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
