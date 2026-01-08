import React from "react";
import { PrintLayout } from "../PrintLayout";
import { baseStyles, colors } from "../styles/printStyles";

// ============================================
// TYPES
// ============================================
export interface BookingReceiptData {
  id: string;
  bookingNumber: string | null;
  createdAt: string;

  // Vehicle
  vehicleName: string;
  vehicleCategory: string;
  vehicleImage: string;

  // Dates
  pickupDate: string;
  returnDate: string;

  // Rental details
  rentalType: "weekly" | "monthly" | "semester";
  rentalDays: number;
  pricingMethod: "weekly" | "monthly" | "semester";

  // Pickup
  pickupType: "store" | "delivery";
  pickupLocation: string;

  // Customer
  customerName: string;
  customerEmail: string;
  customerPhone: string;

  // Amounts
  rentalAmount: number;
  deliveryFee: number;
  additionalDriverFee: number;
  securityDeposit: number;
  totalPrice: number;

  // Status
  paymentStatus: string;
  isStudentBooking: boolean;
}

interface BookingReceiptProps {
  data: BookingReceiptData;
}

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatCurrency(amount: number): string {
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatShortDate(dateString: string): string {
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

function getDurationText(
  rentalDays: number,
  rentalType: string,
  pricingMethod: string
): string {
  if (rentalType === "semester") {
    return `${rentalDays} days (Semester)`;
  }

  if (pricingMethod === "monthly") {
    const months = Math.floor(rentalDays / 30);
    const overflow = rentalDays % 30;
    if (overflow > 0) {
      return `${months}mo + ${overflow}d (${rentalDays} days)`;
    }
    return `${months} month${months > 1 ? "s" : ""} (${rentalDays} days)`;
  }

  const weeks = Math.floor(rentalDays / 7);
  const overflow = rentalDays % 7;
  if (overflow > 0) {
    return `${weeks}wk + ${overflow}d (${rentalDays} days)`;
  }
  return `${weeks} week${weeks > 1 ? "s" : ""} (${rentalDays} days)`;
}

function getBadgeStyle(
  rentalType: string,
  isStudent: boolean
): React.CSSProperties {
  if (isStudent) {
    return { backgroundColor: "#f3e8ff", color: "#6b21a8" };
  }
  switch (rentalType) {
    case "semester":
      return { backgroundColor: "#f3e8ff", color: "#6b21a8" };
    case "monthly":
      return { backgroundColor: "#e0e7ff", color: "#3730a3" };
    default:
      return { backgroundColor: "#dbeafe", color: "#1e40af" };
  }
}

// ============================================
// COMPONENT
// ============================================
export const BookingReceiptPrint: React.FC<BookingReceiptProps> = ({
  data,
}) => {
  const durationText = getDurationText(
    data.rentalDays,
    data.rentalType,
    data.pricingMethod
  );
  const badgeStyle = getBadgeStyle(data.rentalType, data.isStudentBooking);
  const badgeText = data.isStudentBooking
    ? "🎓 Student Semester"
    : `${getRentalTypeLabel(data.rentalType)} Rate`;

  return (
    <PrintLayout
      title="Booking Confirmation"
      subtitle={data.bookingNumber || `#${data.id.slice(0, 8).toUpperCase()}`}
      date={formatShortDate(data.createdAt)}
      footerMessage="Thank you for your business!"
    >
      {/* Vehicle Section */}
      <div style={baseStyles.section}>
        <div style={baseStyles.sectionTitle}>Vehicle</div>
        <div style={baseStyles.imageBox}>
          <img
            src={data.vehicleImage}
            alt={data.vehicleName}
            style={baseStyles.imageMedium}
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                "https://via.placeholder.com/120x80?text=Vehicle";
            }}
          />
          <div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: colors.primary,
              }}
            >
              {data.vehicleName}
            </div>
            <div
              style={{
                fontSize: "10px",
                color: colors.secondary,
                textTransform: "capitalize",
              }}
            >
              {data.vehicleCategory}
            </div>
            <span
              style={{ ...baseStyles.badge, ...badgeStyle, marginTop: "6px" }}
            >
              {badgeText}
            </span>
          </div>
        </div>
      </div>

      {/* Rental Period */}
      <div style={baseStyles.section}>
        <div style={baseStyles.sectionTitle}>Rental Period</div>
        <div style={baseStyles.grid2}>
          <div style={baseStyles.field}>
            <div style={baseStyles.fieldLabel}>Pickup Date & Time</div>
            <div style={baseStyles.fieldValue}>
              {formatShortDate(data.pickupDate)} at{" "}
              {formatTime(data.pickupDate)}
            </div>
          </div>
          <div style={baseStyles.field}>
            <div style={baseStyles.fieldLabel}>Return Date & Time</div>
            <div style={baseStyles.fieldValue}>
              {formatShortDate(data.returnDate)} at{" "}
              {formatTime(data.returnDate)}
            </div>
          </div>
          <div style={baseStyles.field}>
            <div style={baseStyles.fieldLabel}>Duration</div>
            <div style={baseStyles.fieldValue}>{durationText}</div>
          </div>
          <div style={baseStyles.field}>
            <div style={baseStyles.fieldLabel}>
              {data.pickupType === "delivery"
                ? "Delivery Location"
                : "Pickup Location"}
            </div>
            <div style={baseStyles.fieldValue}>{data.pickupLocation}</div>
          </div>
        </div>
      </div>

      {/* Customer Details */}
      <div style={baseStyles.section}>
        <div style={baseStyles.sectionTitle}>Customer Information</div>
        <div style={baseStyles.grid2}>
          <div style={baseStyles.field}>
            <div style={baseStyles.fieldLabel}>Name</div>
            <div style={baseStyles.fieldValue}>{data.customerName}</div>
          </div>
          <div style={baseStyles.field}>
            <div style={baseStyles.fieldLabel}>Email</div>
            <div style={baseStyles.fieldValue}>{data.customerEmail}</div>
          </div>
          <div style={baseStyles.field}>
            <div style={baseStyles.fieldLabel}>Phone</div>
            <div style={baseStyles.fieldValue}>{data.customerPhone}</div>
          </div>
          <div style={baseStyles.field}>
            <div style={baseStyles.fieldLabel}>Booking Reference</div>
            <div style={baseStyles.fieldValueMono}>
              {data.bookingNumber || data.id.slice(0, 8).toUpperCase()}
            </div>
          </div>
        </div>
      </div>

      {/* Student Notice */}
      {data.isStudentBooking && (
        <div style={baseStyles.section}>
          <div
            style={{
              backgroundColor: "#faf5ff",
              border: "1px solid #e9d5ff",
              borderRadius: "6px",
              padding: "10px 12px",
              fontSize: "9px",
              color: "#6b21a8",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <span>🎓</span>
            <span>
              <strong>Student Pricing Applied</strong> — Please bring a valid
              student ID at pickup for verification.
            </span>
          </div>
        </div>
      )}

      {/* Payment Summary */}
      <div style={baseStyles.section}>
        <div style={baseStyles.sectionTitle}>Payment Summary</div>
        <table style={baseStyles.table}>
          <tbody>
            <tr style={baseStyles.tableRow}>
              <td style={baseStyles.tableCell}>
                Rental ({data.rentalDays} days)
              </td>
              <td style={baseStyles.tableCellRight}>
                {formatCurrency(data.rentalAmount)}
              </td>
            </tr>
            {data.deliveryFee > 0 && (
              <tr style={baseStyles.tableRow}>
                <td style={baseStyles.tableCell}>Delivery Fee</td>
                <td style={baseStyles.tableCellRight}>
                  {formatCurrency(data.deliveryFee)}
                </td>
              </tr>
            )}
            {data.additionalDriverFee > 0 && (
              <tr style={baseStyles.tableRow}>
                <td style={baseStyles.tableCell}>Additional Drivers</td>
                <td style={baseStyles.tableCellRight}>
                  {formatCurrency(data.additionalDriverFee)}
                </td>
              </tr>
            )}
            <tr style={baseStyles.tableRow}>
              <td style={baseStyles.tableCell}>
                Security Deposit (Refundable)
              </td>
              <td style={baseStyles.tableCellRight}>
                {formatCurrency(data.securityDeposit)}
              </td>
            </tr>
            <tr style={baseStyles.tableTotalRow}>
              <td style={baseStyles.tableTotalCell}>Total Paid</td>
              <td style={baseStyles.tableTotalCellRight}>
                {formatCurrency(data.totalPrice)}
              </td>
            </tr>
          </tbody>
        </table>
        <div style={baseStyles.noteBox}>
          <strong>Note:</strong> Your security deposit of{" "}
          {formatCurrency(data.securityDeposit)} will be fully refunded within
          5-7 business days after the vehicle is returned in good condition.
        </div>
      </div>

      {/* Payment Status */}
      <div
        style={{
          ...baseStyles.section,
          textAlign: "center",
          paddingTop: "8px",
          marginBottom: 0,
        }}
      >
        <span style={baseStyles.statusBadge}>✓ Payment Confirmed</span>
      </div>
    </PrintLayout>
  );
};

export default BookingReceiptPrint;
