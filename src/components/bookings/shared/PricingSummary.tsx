import React, { useId } from "react";
import { Info, AlertCircle } from "lucide-react";
import { BookingTotal } from "@/types";
import { Card } from "@/components/ui";
import { Loader } from "@/components/ui/Loader";

// ============================================
// TYPES
// ============================================
interface PricingSummaryProps {
  pricing: BookingTotal | null;
  loading: boolean;
  isStudent?: boolean;
  showDeposit?: boolean;
}

interface LineItemProps {
  label: string;
  value: string;
  description?: string;
  isTotal?: boolean;
  isDeposit?: boolean;
}

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

function getPricingMethodLabel(method: string, rentalType: string): string {
  if (rentalType === "semester") return "Semester Rate";
  if (method === "monthly") return "Monthly Rate";
  return "Weekly Rate";
}

function getRentalDescription(pricing: BookingTotal): string {
  const { rentalDays, rentalType, pricingMethod } = pricing;

  if (rentalType === "semester") {
    return `${rentalDays} days - Semester pricing`;
  }

  if (pricingMethod === "monthly") {
    const fullMonths = Math.floor(rentalDays / 30);
    const overflowDays = rentalDays % 30;
    if (overflowDays > 0) {
      return `${fullMonths} month${
        fullMonths > 1 ? "s" : ""
      } + ${overflowDays} day${overflowDays > 1 ? "s" : ""}`;
    }
    return `${fullMonths} month${fullMonths > 1 ? "s" : ""}`;
  }

  // Weekly
  const fullWeeks = Math.floor(rentalDays / 7);
  const overflowDays = rentalDays % 7;
  if (overflowDays > 0) {
    return `${fullWeeks} week${fullWeeks > 1 ? "s" : ""} + ${overflowDays} day${
      overflowDays > 1 ? "s" : ""
    }`;
  }
  return `${fullWeeks} week${fullWeeks > 1 ? "s" : ""}`;
}

function getDepositDescription(rentalType: string): string {
  if (rentalType === "weekly") {
    return "Fixed weekly deposit (refundable)";
  }
  return "1 month's rent (refundable)";
}

// ============================================
// SUB-COMPONENTS
// ============================================
const LineItem: React.FC<LineItemProps> = ({
  label,
  value,
  description,
  isTotal = false,
  isDeposit = false,
}) => (
  <div
    className={`flex justify-between items-start ${
      isTotal ? "pt-3 border-t border-gray-300" : ""
    }`}
  >
    <div className="flex-1">
      <dt
        className={
          isTotal
            ? "font-semibold text-gray-900"
            : isDeposit
            ? "text-gray-600 flex items-center gap-1"
            : "text-gray-600"
        }
      >
        {label}
      </dt>
      {description && (
        <dd className="text-xs text-gray-500 mt-0.5">{description}</dd>
      )}
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

const DepositInfoBox: React.FC<{
  depositAmount: number;
  rentalType: string;
}> = ({ depositAmount, rentalType }) => {
  const infoId = useId();

  return (
    <div
      className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg"
      role="note"
      aria-labelledby={infoId}
    >
      <Info
        className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
        aria-hidden="true"
      />
      <div className="text-xs text-blue-800">
        <p id={infoId} className="font-semibold mb-1">
          Security Deposit Information
        </p>
        <p>
          {rentalType === "weekly" ? (
            <>
              A security deposit of{" "}
              <strong>{formatCurrency(depositAmount)}</strong> is required and
              will be <strong>fully refunded</strong> after the vehicle is
              returned in good condition.
            </>
          ) : (
            <>
              A security deposit of{" "}
              <strong>{formatCurrency(depositAmount)}</strong> (one month's
              rent) is required and will be <strong>fully refunded</strong>{" "}
              after the vehicle is returned in good condition.
            </>
          )}
        </p>
      </div>
    </div>
  );
};

const StudentDiscountBadge: React.FC = () => (
  <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-2 rounded-lg text-sm">
    <span className="font-medium">🎓 Student Pricing Applied</span>
  </div>
);

const LoadingPricing: React.FC = () => (
  <Card variant="default" padding="md">
    <div className="flex items-center justify-center py-8" role="status">
      <Loader />
      <span className="ml-3 text-gray-600">Calculating price...</span>
    </div>
  </Card>
);

const PricingError: React.FC = () => (
  <Card variant="default" padding="md">
    <div className="flex items-center gap-2 text-amber-600" role="alert">
      <AlertCircle className="w-5 h-5" />
      <span className="text-sm">
        Unable to calculate pricing. Please check your dates.
      </span>
    </div>
  </Card>
);

// ============================================
// MAIN COMPONENT
// ============================================
export const PricingSummary: React.FC<PricingSummaryProps> = ({
  pricing,
  loading,
  isStudent = false,
  showDeposit = true,
}) => {
  const headingId = useId();

  // Loading state
  if (loading) {
    return <LoadingPricing />;
  }

  // No pricing available
  if (!pricing) {
    return <PricingError />;
  }

  const rentalDescription = getRentalDescription(pricing);
  const pricingMethodLabel = getPricingMethodLabel(
    pricing.pricingMethod,
    pricing.rentalType
  );

  return (
    <Card variant="default" padding="md">
      <h4 id={headingId} className="font-medium text-gray-900 mb-3">
        Rental Summary
      </h4>

      {/* Student discount badge */}
      {isStudent && pricing.rentalType === "semester" && (
        <div className="mb-3">
          <StudentDiscountBadge />
        </div>
      )}

      <dl className="space-y-3 text-sm" aria-labelledby={headingId}>
        {/* Duration */}
        <LineItem
          label="Duration"
          value={`${pricing.rentalDays} days`}
          description={rentalDescription}
        />

        {/* Rate info */}
        <LineItem
          label={pricingMethodLabel}
          value={
            pricing.rentalType === "semester"
              ? formatCurrency(pricing.rentalAmount)
              : pricing.pricingMethod === "monthly"
              ? `${formatCurrency(pricing.monthlyRate)}/month`
              : `${formatCurrency(pricing.weeklyRate)}/week`
          }
          description={
            pricing.rentalType !== "semester" && pricing.dailyRate > 0
              ? `Daily overflow rate: ${formatCurrency(pricing.dailyRate)}/day`
              : undefined
          }
        />

        {/* Rental total */}
        <LineItem
          label="Rental Total"
          value={formatCurrency(pricing.rentalAmount)}
        />

        {/* Delivery fee */}
        {pricing.deliveryFee > 0 && (
          <LineItem
            label="Delivery Fee"
            value={formatCurrency(pricing.deliveryFee, true)}
          />
        )}

        {/* Additional drivers */}
        {pricing.additionalDriverFee > 0 && (
          <LineItem
            label="Additional Drivers"
            value={formatCurrency(pricing.additionalDriverFee, true)}
            description={`$50 per driver`}
          />
        )}

        {/* Subtotal */}
        <LineItem label="Subtotal" value={formatCurrency(pricing.subtotal)} />

        {/* Security deposit */}
        {showDeposit && (
          <LineItem
            label="Security Deposit"
            value={formatCurrency(pricing.securityDeposit, true)}
            description={getDepositDescription(pricing.rentalType)}
            isDeposit
          />
        )}

        {/* Total */}
        <LineItem
          label="Total Due Now"
          value={formatCurrency(pricing.totalDueNow)}
          isTotal
        />
      </dl>

      {/* Deposit info box */}
      {showDeposit && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <DepositInfoBox
            depositAmount={pricing.securityDeposit}
            rentalType={pricing.rentalType}
          />
        </div>
      )}
    </Card>
  );
};
