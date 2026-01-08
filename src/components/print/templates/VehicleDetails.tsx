import React from "react";
import { PrintLayout } from "../PrintLayout";
import { baseStyles, colors } from "../styles/printStyles";

// ============================================
// TYPES
// ============================================
export interface VehiclePrintData {
  id: string;
  name: string;
  category: string;
  description: string;
  images: string[];

  // Pricing
  dailyRate: number;
  weeklyRate: number;
  monthlyRate: number;
  semesterRate?: number;
  securityDeposit: number;

  // Features
  features: string[];

  // Specs
  specs: {
    seats?: number;
    transmission?: string;
    fuelType?: string;
    mileageLimit?: string;
    year?: number;
    make?: string;
    model?: string;
    color?: string;
  };

  // Availability
  isAvailable: boolean;
}

interface VehicleDetailsPrintProps {
  data: VehiclePrintData;
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

// ============================================
// COMPONENT
// ============================================
export const VehicleDetailsPrint: React.FC<VehicleDetailsPrintProps> = ({
  data,
}) => {
  const mainImage =
    data.images[0] || "https://via.placeholder.com/400x250?text=Vehicle";

  return (
    <PrintLayout
      title="Vehicle Information"
      subtitle={data.name}
      footerMessage="Contact us to book this vehicle!"
    >
      {/* Vehicle Header with Image */}
      <div style={baseStyles.section}>
        <div style={{ display: "flex", gap: "20px", alignItems: "flex-start" }}>
          {/* Main Image */}
          <div style={{ flex: "0 0 220px" }}>
            <img
              src={mainImage}
              alt={data.name}
              style={{
                width: "220px",
                height: "150px",
                objectFit: "cover",
                borderRadius: "8px",
                border: `1px solid ${colors.border}`,
              }}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "https://via.placeholder.com/400x250?text=Vehicle";
              }}
            />
          </div>

          {/* Vehicle Info */}
          <div style={{ flex: 1 }}>
            <h2
              style={{
                fontSize: "22px",
                fontWeight: 700,
                color: colors.primary,
                marginBottom: "4px",
              }}
            >
              {data.name}
            </h2>
            <p
              style={{
                fontSize: "12px",
                color: colors.secondary,
                textTransform: "capitalize",
                marginBottom: "12px",
              }}
            >
              {data.category}
            </p>

            {/* Quick Specs */}
            <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
              {data.specs.year && (
                <span
                  style={{
                    ...baseStyles.badge,
                    backgroundColor: "#e0e7ff",
                    color: "#3730a3",
                  }}
                >
                  {data.specs.year}
                </span>
              )}
              {data.specs.transmission && (
                <span
                  style={{
                    ...baseStyles.badge,
                    backgroundColor: "#dbeafe",
                    color: "#1e40af",
                  }}
                >
                  {data.specs.transmission}
                </span>
              )}
              {data.specs.fuelType && (
                <span
                  style={{
                    ...baseStyles.badge,
                    backgroundColor: "#dcfce7",
                    color: "#166534",
                  }}
                >
                  {data.specs.fuelType}
                </span>
              )}
              {data.specs.seats && (
                <span
                  style={{
                    ...baseStyles.badge,
                    backgroundColor: "#fef3c7",
                    color: "#92400e",
                  }}
                >
                  {data.specs.seats} Seats
                </span>
              )}
            </div>

            {/* Availability */}
            <div style={{ marginTop: "12px" }}>
              <span
                style={{
                  ...baseStyles.badge,
                  backgroundColor: data.isAvailable ? "#dcfce7" : "#fee2e2",
                  color: data.isAvailable ? "#166534" : "#991b1b",
                  fontSize: "10px",
                  padding: "4px 12px",
                }}
              >
                {data.isAvailable ? "✓ Available Now" : "Currently Unavailable"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {data.description && (
        <div style={baseStyles.section}>
          <div style={baseStyles.sectionTitle}>About This Vehicle</div>
          <p
            style={{ fontSize: "10px", color: colors.primary, lineHeight: 1.6 }}
          >
            {data.description}
          </p>
        </div>
      )}

      {/* Pricing */}
      <div style={baseStyles.section}>
        <div style={baseStyles.sectionTitle}>Rental Rates</div>
        <div style={baseStyles.grid4}>
          <div style={{ ...baseStyles.field, textAlign: "center" }}>
            <div style={baseStyles.fieldLabel}>Daily Rate</div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: colors.primary,
                marginTop: "4px",
              }}
            >
              {formatCurrency(data.dailyRate)}
            </div>
            <div style={{ fontSize: "8px", color: colors.secondary }}>/day</div>
          </div>
          <div style={{ ...baseStyles.field, textAlign: "center" }}>
            <div style={baseStyles.fieldLabel}>Weekly Rate</div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: colors.primary,
                marginTop: "4px",
              }}
            >
              {formatCurrency(data.weeklyRate)}
            </div>
            <div style={{ fontSize: "8px", color: colors.secondary }}>
              /week
            </div>
          </div>
          <div style={{ ...baseStyles.field, textAlign: "center" }}>
            <div style={baseStyles.fieldLabel}>Monthly Rate</div>
            <div
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: colors.primary,
                marginTop: "4px",
              }}
            >
              {formatCurrency(data.monthlyRate)}
            </div>
            <div style={{ fontSize: "8px", color: colors.secondary }}>
              /month
            </div>
          </div>
          {data.semesterRate && (
            <div
              style={{
                ...baseStyles.field,
                textAlign: "center",
                backgroundColor: "#faf5ff",
                borderColor: "#e9d5ff",
              }}
            >
              <div style={{ ...baseStyles.fieldLabel, color: "#6b21a8" }}>
                🎓 Semester
              </div>
              <div
                style={{
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#6b21a8",
                  marginTop: "4px",
                }}
              >
                {formatCurrency(data.semesterRate)}
              </div>
              <div style={{ fontSize: "8px", color: "#7c3aed" }}>/semester</div>
            </div>
          )}
        </div>

        {/* Security Deposit */}
        <div style={{ ...baseStyles.noteBox, marginTop: "12px" }}>
          <strong>Security Deposit:</strong>{" "}
          {formatCurrency(data.securityDeposit)} (fully refundable)
        </div>
      </div>

      {/* Specifications */}
      <div style={baseStyles.section}>
        <div style={baseStyles.sectionTitle}>Specifications</div>
        <div style={baseStyles.grid3}>
          {data.specs.make && (
            <div style={baseStyles.field}>
              <div style={baseStyles.fieldLabel}>Make</div>
              <div style={baseStyles.fieldValue}>{data.specs.make}</div>
            </div>
          )}
          {data.specs.model && (
            <div style={baseStyles.field}>
              <div style={baseStyles.fieldLabel}>Model</div>
              <div style={baseStyles.fieldValue}>{data.specs.model}</div>
            </div>
          )}
          {data.specs.year && (
            <div style={baseStyles.field}>
              <div style={baseStyles.fieldLabel}>Year</div>
              <div style={baseStyles.fieldValue}>{data.specs.year}</div>
            </div>
          )}
          {data.specs.color && (
            <div style={baseStyles.field}>
              <div style={baseStyles.fieldLabel}>Color</div>
              <div style={baseStyles.fieldValue}>{data.specs.color}</div>
            </div>
          )}
          {data.specs.transmission && (
            <div style={baseStyles.field}>
              <div style={baseStyles.fieldLabel}>Transmission</div>
              <div style={baseStyles.fieldValue}>{data.specs.transmission}</div>
            </div>
          )}
          {data.specs.fuelType && (
            <div style={baseStyles.field}>
              <div style={baseStyles.fieldLabel}>Fuel Type</div>
              <div style={baseStyles.fieldValue}>{data.specs.fuelType}</div>
            </div>
          )}
          {data.specs.seats && (
            <div style={baseStyles.field}>
              <div style={baseStyles.fieldLabel}>Seating Capacity</div>
              <div style={baseStyles.fieldValue}>
                {data.specs.seats} passengers
              </div>
            </div>
          )}
          {data.specs.mileageLimit && (
            <div style={baseStyles.field}>
              <div style={baseStyles.fieldLabel}>Mileage Limit</div>
              <div style={baseStyles.fieldValue}>{data.specs.mileageLimit}</div>
            </div>
          )}
        </div>
      </div>

      {/* Features */}
      {data.features && data.features.length > 0 && (
        <div style={{ ...baseStyles.section, marginBottom: 0 }}>
          <div style={baseStyles.sectionTitle}>Features & Amenities</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
            {data.features.map((feature, index) => (
              <span
                key={index}
                style={{
                  ...baseStyles.badge,
                  backgroundColor: colors.background,
                  color: colors.primary,
                  border: `1px solid ${colors.border}`,
                }}
              >
                ✓ {feature}
              </span>
            ))}
          </div>
        </div>
      )}
    </PrintLayout>
  );
};

export default VehicleDetailsPrint;
