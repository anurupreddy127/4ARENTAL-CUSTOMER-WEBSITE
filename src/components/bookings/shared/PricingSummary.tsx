import React, { useMemo, useId } from "react";
import { Info } from "lucide-react";
import { Vehicle } from "@/types";
import { Card } from "@/components/ui";

// ============================================
// TYPES
// ============================================
interface PricingSummaryProps {
  vehicle: Vehicle;
  months: number;
  deliveryFee: number;
  additionalDriverCount: number;
  showDeposit?: boolean;
}

interface LineItemProps {
  label: string;
  value: string;
  isTotal?: boolean;
}

// ============================================
// CONSTANTS
// ============================================
const ADDITIONAL_DRIVER_FEE = 50;
const DAYS_PER_MONTH = 30;

// ============================================
// HELPER FUNCTIONS
// ============================================
function formatCurrency(amount: number, showPlus = false): string {
  const formatted = `$${amount.toLocaleString()}`;
  return showPlus && amount > 0 ? `+${formatted}` : formatted;
}

function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}

// ============================================
// SUB-COMPONENTS
// ============================================
const LineItem: React.FC<LineItemProps> = ({ label, value, isTotal = false }) => (
  <div
    className={`flex justify-between ${
      isTotal ? "pt-2 border-t border-gray-300" : ""
    }`}
  >
    <dt
      className={
        isTotal ? "font-semibold text-gray-900" : "text-gray-600"
      }
    >
      {label}
    </dt>
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

const DepositInfoBox: React.FC<{ depositAmount: number }> = ({ depositAmount }) => {
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
          An additional security deposit of{" "}
          <strong>{formatCurrency(depositAmount)}</strong> (one month's rent) is
          required and will be <strong>fully refunded</strong> after the vehicle
          is returned in good condition.
        </p>
      </div>
    </div>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================
export const PricingSummary: React.FC<PricingSummaryProps> = ({
  vehicle,
  months,
  deliveryFee,
  additionalDriverCount,
  showDeposit = true,
}) => {
  const headingId = useId();

  // ============================================
  // MEMOIZED CALCULATIONS
  // ============================================
  const calculations = useMemo(() => {
    const rentalTotal = months * vehicle.price;
    const additionalDriverFee = additionalDriverCount * ADDITIONAL_DRIVER_FEE;
    const securityDeposit = vehicle.price;
    const totalWithoutDeposit = rentalTotal + deliveryFee + additionalDriverFee;
    const totalWithDeposit = totalWithoutDeposit + securityDeposit;
    const totalDays = months * DAYS_PER_MONTH;

    return {
      rentalTotal,
      additionalDriverFee,
      securityDeposit,
      totalWithoutDeposit,
      totalWithDeposit,
      totalDays,
    };
  }, [months, vehicle.price, deliveryFee, additionalDriverCount]);

  const durationText = useMemo(() => {
    const monthText = pluralize(months, "Month", "Months");
    return `${months} ${monthText} (${calculations.totalDays} days)`;
  }, [months, calculations.totalDays]);

  const totalDue = useMemo(() => {
    return showDeposit
      ? calculations.totalWithDeposit
      : calculations.totalWithoutDeposit;
  }, [showDeposit, calculations.totalWithDeposit, calculations.totalWithoutDeposit]);

  return (
    <Card variant="default" padding="md">
      <h4 id={headingId} className="font-medium text-gray-900 mb-3">
        Rental Summary
      </h4>

      <dl
        className="space-y-2 text-sm"
        aria-labelledby={headingId}
      >
        <LineItem label="Duration:" value={durationText} />

        <LineItem
          label="Monthly Rate:"
          value={`${formatCurrency(vehicle.price)}/month`}
        />

        <LineItem
          label="Rental Total:"
          value={formatCurrency(calculations.rentalTotal)}
        />

        {deliveryFee > 0 && (
          <LineItem
            label="Delivery Fee:"
            value={formatCurrency(deliveryFee, true)}
          />
        )}

        {additionalDriverCount > 0 && (
          <LineItem
            label={`Additional Drivers (${additionalDriverCount}):`}
            value={formatCurrency(calculations.additionalDriverFee, true)}
          />
        )}

        {showDeposit && (
          <LineItem
            label="Security Deposit:"
            value={formatCurrency(calculations.securityDeposit, true)}
          />
        )}

        <LineItem
          label="Total Due Now:"
          value={formatCurrency(totalDue)}
          isTotal
        />
      </dl>

      {showDeposit && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <DepositInfoBox depositAmount={calculations.securityDeposit} />
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3" aria-hidden="true">
        * Pricing is calculated per month ({DAYS_PER_MONTH} days)
      </p>
    </Card>
  );
};