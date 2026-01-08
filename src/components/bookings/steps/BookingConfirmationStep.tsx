import React, { useMemo, useCallback, useId } from "react";
import { CreditCard, Info, CheckCircle, GraduationCap } from "lucide-react";
import { Vehicle, BookingTotal } from "@/types";
import { Button, Card } from "@/components/ui";
import { PrimaryDriverData, AdditionalDriverData } from "../forms";

// ============================================
// TYPES
// ============================================
interface BookingConfirmationStepProps {
  vehicle: Vehicle;
  pickupDate: string;
  returnDate: string;
  pickupType: "store" | "delivery";
  pickupLocation: string;
  isStudent: boolean;
  pricing: BookingTotal;
  primaryDriver: PrimaryDriverData;
  additionalDrivers: AdditionalDriverData[];
  loading: boolean;
  onSubmit: () => void;
}

interface InfoBoxProps {
  variant: "info" | "success" | "student";
  title: string;
  children: React.ReactNode;
}

interface SummaryLineItemProps {
  label: string;
  value: string;
  description?: string;
  isTotal?: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const REFUND_BUSINESS_DAYS = "5-7";

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatCurrency(amount: number, showPlus = false): string {
  const formatted = `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return showPlus && amount > 0 ? `+${formatted}` : formatted;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

function formatPickupType(type: "store" | "delivery"): string {
  return type === "store" ? "Store Pickup" : "Delivery";
}

function formatAddress(driver: PrimaryDriverData): string {
  return `${driver.streetAddress}, ${driver.city}, ${driver.state} ${driver.zipCode}`;
}

function formatDateTime(dateString: string): string {
  if (!dateString) return "";
  return new Date(dateString).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getRentalTypeLabel(rentalType: string): string {
  switch (rentalType) {
    case "semester":
      return "Semester";
    case "monthly":
      return "Monthly";
    case "weekly":
    default:
      return "Weekly";
  }
}

function getDurationDescription(pricing: BookingTotal): string {
  const { rentalDays, rentalType, pricingMethod } = pricing;

  if (rentalType === "semester") {
    return `${rentalDays} days (Semester rate)`;
  }

  if (pricingMethod === "monthly") {
    const fullMonths = Math.floor(rentalDays / 30);
    const overflowDays = rentalDays % 30;
    if (overflowDays > 0) {
      return `${fullMonths} ${pluralize(
        fullMonths,
        "month",
        "months"
      )} + ${overflowDays} ${pluralize(
        overflowDays,
        "day",
        "days"
      )} (${rentalDays} days total)`;
    }
    return `${fullMonths} ${pluralize(
      fullMonths,
      "month",
      "months"
    )} (${rentalDays} days)`;
  }

  // Weekly
  const fullWeeks = Math.floor(rentalDays / 7);
  const overflowDays = rentalDays % 7;
  if (overflowDays > 0) {
    return `${fullWeeks} ${pluralize(
      fullWeeks,
      "week",
      "weeks"
    )} + ${overflowDays} ${pluralize(
      overflowDays,
      "day",
      "days"
    )} (${rentalDays} days total)`;
  }
  return `${fullWeeks} ${pluralize(
    fullWeeks,
    "week",
    "weeks"
  )} (${rentalDays} days)`;
}

// ============================================
// SUB-COMPONENTS
// ============================================
const InfoBox: React.FC<InfoBoxProps> = ({ variant, title, children }) => {
  const baseId = useId();
  const titleId = `${baseId}-title`;

  const styles = {
    info: {
      container: "bg-blue-50 border-blue-200",
      icon: "text-blue-600",
      text: "text-blue-800",
    },
    success: {
      container: "bg-green-50 border-green-200",
      icon: "text-green-600",
      text: "text-green-800",
    },
    student: {
      container: "bg-purple-50 border-purple-200",
      icon: "text-purple-600",
      text: "text-purple-800",
    },
  };

  const iconMap = {
    info: Info,
    success: CheckCircle,
    student: GraduationCap,
  };

  const Icon = iconMap[variant];
  const style = styles[variant];

  return (
    <div
      className={`${style.container} border p-4 rounded-xl`}
      role="note"
      aria-labelledby={titleId}
    >
      <div className="flex items-start gap-2">
        <Icon
          className={`w-5 h-5 ${style.icon} flex-shrink-0 mt-0.5`}
          aria-hidden="true"
        />
        <div className={`text-sm ${style.text}`}>
          <p id={titleId} className="font-semibold mb-1">
            {title}
          </p>
          {children}
        </div>
      </div>
    </div>
  );
};

const SummaryLineItem: React.FC<SummaryLineItemProps> = ({
  label,
  value,
  description,
  isTotal = false,
}) => (
  <div
    className={`flex justify-between items-start ${
      isTotal ? "pt-3 border-t border-gray-300" : ""
    }`}
  >
    <div className="flex-1">
      <dt className={isTotal ? "font-semibold text-gray-900" : "text-gray-600"}>
        {label}
      </dt>
      {description && <dd className="text-xs text-gray-500">{description}</dd>}
    </div>
    <dd
      className={
        isTotal
          ? "text-xl font-bold text-gray-900"
          : "font-medium text-gray-900"
      }
    >
      {value}
    </dd>
  </div>
);

const DetailSection: React.FC<{
  title: string;
  titleId: string;
  children: React.ReactNode;
}> = ({ title, titleId, children }) => (
  <section aria-labelledby={titleId}>
    <h4 id={titleId} className="font-medium text-gray-900 mb-2">
      {title}
    </h4>
    <dl className="text-sm text-gray-600 space-y-1">{children}</dl>
  </section>
);

const DetailItem: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="flex flex-wrap gap-1">
    <dt className="font-medium">{label}:</dt>
    <dd>{value}</dd>
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================
export const BookingConfirmationStep: React.FC<
  BookingConfirmationStepProps
> = ({
  vehicle,
  pickupDate,
  returnDate,
  pickupType,
  pickupLocation,
  isStudent,
  pricing,
  primaryDriver,
  additionalDrivers,
  loading,
  onSubmit,
}) => {
  const baseId = useId();

  // ============================================
  // MEMOIZED VALUES
  // ============================================
  const formattedPickupDate = useMemo(() => {
    return formatDateTime(pickupDate);
  }, [pickupDate]);

  const formattedReturnDate = useMemo(() => {
    return formatDateTime(returnDate);
  }, [returnDate]);

  const durationText = useMemo(() => {
    return getDurationDescription(pricing);
  }, [pricing]);

  const primaryDriverAddress = useMemo(() => {
    return formatAddress(primaryDriver);
  }, [primaryDriver]);

  const rentalTypeLabel = useMemo(() => {
    return getRentalTypeLabel(pricing.rentalType);
  }, [pricing.rentalType]);

  // ============================================
  // HANDLERS
  // ============================================
  const handleSubmit = useCallback(() => {
    onSubmit();
  }, [onSubmit]);

  // ============================================
  // SECTION IDS
  // ============================================
  const sectionIds = useMemo(
    () => ({
      rental: `${baseId}-rental`,
      primary: `${baseId}-primary`,
      additional: `${baseId}-additional`,
      pricing: `${baseId}-pricing`,
    }),
    [baseId]
  );

  return (
    <div className="space-y-6">
      <header>
        <h3 className="text-lg font-semibold text-gray-900">
          Confirm Your Booking
        </h3>
      </header>

      {/* Student Notice */}
      {isStudent && pricing.rentalType === "semester" && (
        <InfoBox variant="student" title="Student Pricing Applied">
          <p>
            You've selected student pricing. Please bring a valid student ID
            when picking up your vehicle. Your student status will be verified
            at pickup.
          </p>
        </InfoBox>
      )}

      {/* Booking Details Card */}
      <Card variant="default" padding="lg" className="space-y-6">
        {/* Rental Details */}
        <DetailSection title="Rental Details" titleId={sectionIds.rental}>
          <DetailItem label="Vehicle" value={vehicle.name} />
          <DetailItem label="Rental Type" value={rentalTypeLabel} />
          <DetailItem
            label="Pickup Type"
            value={formatPickupType(pickupType)}
          />
          <DetailItem label="Pickup" value={formattedPickupDate} />
          <DetailItem label="Return" value={formattedReturnDate} />
          <DetailItem label="Duration" value={durationText} />
          <DetailItem label="Location" value={pickupLocation} />
        </DetailSection>

        {/* Primary Driver */}
        <DetailSection title="Primary Driver" titleId={sectionIds.primary}>
          <DetailItem
            label="Name"
            value={`${primaryDriver.firstName} ${primaryDriver.lastName}`}
          />
          <DetailItem label="Email" value={primaryDriver.email} />
          <DetailItem label="Phone" value={primaryDriver.phone} />
          <DetailItem label="Date of Birth" value={primaryDriver.dateOfBirth} />
          <DetailItem
            label="License"
            value={primaryDriver.driversLicenseNumber}
          />
          <DetailItem label="Address" value={primaryDriverAddress} />
        </DetailSection>

        {/* Additional Drivers */}
        {additionalDrivers.length > 0 && (
          <section aria-labelledby={sectionIds.additional}>
            <h4
              id={sectionIds.additional}
              className="font-medium text-gray-900 mb-2"
            >
              Additional Drivers ({additionalDrivers.length})
            </h4>
            <ul className="text-sm text-gray-600 space-y-3" role="list">
              {additionalDrivers.map((driver, index) => (
                <li
                  key={`additional-driver-${index}`}
                  className="pb-2 border-b border-gray-200 last:border-0 last:pb-0"
                >
                  <dl className="space-y-0.5">
                    <div>
                      <dt className="sr-only">Name</dt>
                      <dd className="font-medium">
                        {driver.firstName} {driver.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="sr-only">Email</dt>
                      <dd>{driver.email}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt>License:</dt>
                      <dd>{driver.driversLicenseNumber}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Pricing Summary */}
        <section
          className="border-t border-gray-200 pt-4"
          aria-labelledby={sectionIds.pricing}
        >
          <h4 id={sectionIds.pricing} className="sr-only">
            Pricing Summary
          </h4>
          <dl className="space-y-2 text-sm">
            {/* Rate info based on pricing method */}
            {pricing.rentalType === "semester" ? (
              <SummaryLineItem
                label="Semester Rate:"
                value={formatCurrency(pricing.rentalAmount)}
              />
            ) : pricing.pricingMethod === "monthly" ? (
              <SummaryLineItem
                label="Monthly Rate:"
                value={`${formatCurrency(pricing.monthlyRate)}/month`}
                description={
                  pricing.dailyRate > 0
                    ? `Daily rate: ${formatCurrency(pricing.dailyRate)}/day`
                    : undefined
                }
              />
            ) : (
              <SummaryLineItem
                label="Weekly Rate:"
                value={`${formatCurrency(pricing.weeklyRate)}/week`}
                description={
                  pricing.dailyRate > 0
                    ? `Daily rate: ${formatCurrency(pricing.dailyRate)}/day`
                    : undefined
                }
              />
            )}

            <SummaryLineItem
              label="Duration:"
              value={`${pricing.rentalDays} days`}
            />

            <SummaryLineItem
              label="Rental Total:"
              value={formatCurrency(pricing.rentalAmount)}
            />

            {pricing.deliveryFee > 0 && (
              <SummaryLineItem
                label="Delivery Fee:"
                value={formatCurrency(pricing.deliveryFee, true)}
              />
            )}

            {pricing.additionalDriverFee > 0 && (
              <SummaryLineItem
                label={`Additional Drivers (${additionalDrivers.length}):`}
                value={formatCurrency(pricing.additionalDriverFee, true)}
              />
            )}

            <SummaryLineItem
              label="Security Deposit (Refundable):"
              value={formatCurrency(pricing.securityDeposit, true)}
              description={
                pricing.rentalType === "weekly"
                  ? "Fixed weekly deposit"
                  : "One month's rent"
              }
            />

            <SummaryLineItem
              label="Total Due Now:"
              value={formatCurrency(pricing.totalDueNow)}
              isTotal
            />
          </dl>
        </section>
      </Card>

      {/* Payment Information */}
      <InfoBox variant="info" title="Important Payment Information">
        <p className="mb-2">Your total payment includes:</p>
        <ul className="list-disc list-inside space-y-1 ml-2">
          <li>
            <strong>Rental Fee:</strong> {formatCurrency(pricing.rentalAmount)}{" "}
            ({pricing.rentalDays} days)
          </li>
          {pricing.deliveryFee > 0 && (
            <li>
              <strong>Delivery Fee:</strong>{" "}
              {formatCurrency(pricing.deliveryFee)}
            </li>
          )}
          {pricing.additionalDriverFee > 0 && (
            <li>
              <strong>Additional Drivers:</strong>{" "}
              {formatCurrency(pricing.additionalDriverFee)}
            </li>
          )}
          <li>
            <strong>Security Deposit:</strong>{" "}
            {formatCurrency(pricing.securityDeposit)} (refundable)
          </li>
        </ul>
        <p className="mt-2">
          The security deposit will be <strong>fully refunded</strong> within{" "}
          {REFUND_BUSINESS_DAYS} business days after the vehicle is returned in
          good condition.
        </p>
      </InfoBox>

      {/* Secure Payment Notice */}
      <InfoBox variant="success" title="Secure Payment">
        <p>
          After clicking "Proceed to Payment", you'll be redirected to Stripe's
          secure checkout page to complete your payment with a credit or debit
          card.
        </p>
      </InfoBox>

      {/* Submit Button */}
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={loading}
        loading={loading}
        icon={
          !loading ? (
            <CreditCard className="w-4 h-4" aria-hidden="true" />
          ) : undefined
        }
        fullWidth
        aria-describedby={loading ? undefined : `${baseId}-payment-note`}
      >
        {loading ? "Submitting..." : "Proceed to Payment"}
      </Button>

      <p id={`${baseId}-payment-note`} className="sr-only">
        You will be redirected to a secure payment page
      </p>
    </div>
  );
};
