import React from "react";
import { baseStyles, COMPANY_INFO } from "./styles/printStyles";

// ============================================
// TYPES
// ============================================
interface PrintLayoutProps {
  title: string;
  subtitle?: string;
  date?: string;
  children: React.ReactNode;
  showFooter?: boolean;
  footerMessage?: string;
}

// ============================================
// COMPONENT
// ============================================
export const PrintLayout: React.FC<PrintLayoutProps> = ({
  title,
  subtitle,
  date,
  children,
  showFooter = true,
  footerMessage = "Thank you for choosing us!",
}) => {
  const formattedDate =
    date ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div style={baseStyles.page}>
      <div style={baseStyles.wrapper}>
        {/* Header - Clean white background with logo */}
        <div
          style={{
            backgroundColor: "#ffffff",
            padding: "16px 24px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "2px solid #fbbf24",
          }}
        >
          {/* Logo Only - No duplicate text */}
          <div>
            <img
              src={COMPANY_INFO.logo}
              alt={COMPANY_INFO.name}
              style={{
                height: "50px",
                width: "auto",
              }}
              onError={(e) => {
                // Fallback to text if logo fails
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const parent = target.parentElement;
                if (parent) {
                  parent.innerHTML = `
                    <div style="font-size: 24px; font-weight: 700; color: #1f2937;">
                      ${COMPANY_INFO.name}
                    </div>
                    <div style="font-size: 10px; color: #6b7280;">
                      ${COMPANY_INFO.tagline}
                    </div>
                  `;
                }
              }}
            />
          </div>

          {/* Title Section */}
          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "#1f2937",
                letterSpacing: "1px",
                textTransform: "uppercase",
              }}
            >
              {title}
            </div>
            {subtitle && (
              <div
                style={{
                  fontSize: "11px",
                  color: "#374151",
                  marginTop: "4px",
                  fontFamily: "monospace",
                }}
              >
                {subtitle}
              </div>
            )}
            <div
              style={{
                fontSize: "9px",
                color: "#6b7280",
                marginTop: "2px",
              }}
            >
              Generated: {formattedDate}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={baseStyles.body}>{children}</div>

        {/* Footer */}
        {showFooter && (
          <div style={baseStyles.footer}>
            <div style={baseStyles.footerContact}>
              <div style={{ fontWeight: 600 }}>{COMPANY_INFO.name}</div>
              <div>
                {COMPANY_INFO.phone} | {COMPANY_INFO.email}
              </div>
              <div>{COMPANY_INFO.address}</div>
            </div>
            <div style={baseStyles.footerRight}>
              <div style={baseStyles.footerThanks}>{footerMessage}</div>
              <div style={baseStyles.footerWebsite}>{COMPANY_INFO.website}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrintLayout;
