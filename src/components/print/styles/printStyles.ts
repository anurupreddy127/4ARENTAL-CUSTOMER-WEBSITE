import React from "react";

// ============================================
// SHARED PRINT STYLES
// ============================================
export const colors = {
  primary: "#1f2937",
  secondary: "#6b7280",
  accent: "#fbbf24",
  accentDark: "#f59e0b",
  background: "#f9fafb",
  border: "#e5e7eb",
  white: "#ffffff",
  success: "#166534",
  successBg: "#dcfce7",
  info: "#1e40af",
  infoBg: "#eff6ff",
  infoBorder: "#bfdbfe",
};

export const baseStyles: Record<string, React.CSSProperties> = {
  // Page container
  page: {
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    maxWidth: "700px",
    margin: "0 auto",
    backgroundColor: colors.white,
    color: colors.primary,
    fontSize: "11px",
    lineHeight: 1.5,
  },

  // Wrapper with border
  wrapper: {
    border: `2px solid ${colors.primary}`,
    borderRadius: "8px",
    overflow: "hidden",
  },

  // Header with gradient
  // In baseStyles object, update the header:
  header: {
    backgroundColor: "#ffffff",
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "2px solid #fbbf24",
  },

  headerLogoSection: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },

  headerLogo: {
    height: "45px",
    width: "auto",
  },

  headerLogoText: {
    fontSize: "28px",
    fontWeight: 700,
    color: colors.primary,
    letterSpacing: "-0.5px",
  },

  headerTagline: {
    fontSize: "10px",
    color: "#374151",
    marginTop: "2px",
  },

  headerTitleSection: {
    textAlign: "right" as const,
  },

  headerTitle: {
    fontSize: "16px",
    fontWeight: 700,
    color: colors.primary,
    letterSpacing: "1px",
    textTransform: "uppercase" as const,
  },

  headerSubtitle: {
    fontSize: "11px",
    color: "#374151",
    marginTop: "4px",
  },

  headerDate: {
    fontSize: "9px",
    color: "#4b5563",
    marginTop: "2px",
  },

  // Body
  body: {
    padding: "20px 24px",
  },

  // Section
  section: {
    marginBottom: "18px",
  },

  sectionLast: {
    marginBottom: 0,
  },

  sectionTitle: {
    fontSize: "11px",
    fontWeight: 700,
    color: colors.secondary,
    textTransform: "uppercase" as const,
    letterSpacing: "1px",
    marginBottom: "10px",
    paddingBottom: "6px",
    borderBottom: `1px solid ${colors.border}`,
  },

  // Grid layouts
  grid2: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "12px",
  },

  grid3: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "12px",
  },

  grid4: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr 1fr",
    gap: "10px",
  },

  // Field box
  field: {
    backgroundColor: colors.background,
    padding: "10px 12px",
    borderRadius: "6px",
    border: `1px solid ${colors.border}`,
  },

  fieldLabel: {
    fontSize: "8px",
    fontWeight: 600,
    color: colors.secondary,
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    marginBottom: "3px",
  },

  fieldValue: {
    fontSize: "11px",
    fontWeight: 500,
    color: colors.primary,
  },

  fieldValueLarge: {
    fontSize: "14px",
    fontWeight: 600,
    color: colors.primary,
  },

  fieldValueMono: {
    fontSize: "11px",
    fontWeight: 500,
    color: colors.primary,
    fontFamily: "monospace",
  },

  // Card/Box
  card: {
    backgroundColor: colors.background,
    padding: "14px",
    borderRadius: "6px",
    border: `1px solid ${colors.border}`,
  },

  // Image box
  imageBox: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
    backgroundColor: colors.background,
    padding: "14px",
    borderRadius: "6px",
    border: `1px solid ${colors.border}`,
  },

  imageLarge: {
    width: "140px",
    height: "95px",
    objectFit: "cover" as const,
    borderRadius: "6px",
  },

  imageMedium: {
    width: "100px",
    height: "70px",
    objectFit: "cover" as const,
    borderRadius: "4px",
  },

  // Table
  table: {
    width: "100%",
    borderCollapse: "collapse" as const,
  },

  tableRow: {
    borderBottom: `1px solid ${colors.border}`,
  },

  tableCell: {
    padding: "10px 0",
    fontSize: "10px",
    color: colors.primary,
  },

  tableCellRight: {
    padding: "10px 0",
    fontSize: "10px",
    color: colors.primary,
    textAlign: "right" as const,
    fontWeight: 500,
  },

  tableTotalRow: {
    borderTop: `2px solid ${colors.primary}`,
    borderBottom: "none",
  },

  tableTotalCell: {
    padding: "12px 0 0 0",
    fontSize: "12px",
    fontWeight: 700,
    color: colors.primary,
  },

  tableTotalCellRight: {
    padding: "12px 0 0 0",
    fontSize: "16px",
    fontWeight: 700,
    color: colors.primary,
    textAlign: "right" as const,
  },

  // Note/Info box
  noteBox: {
    backgroundColor: colors.infoBg,
    border: `1px solid ${colors.infoBorder}`,
    borderRadius: "6px",
    padding: "10px 12px",
    fontSize: "9px",
    color: colors.info,
    marginTop: "12px",
  },

  // Badge
  badge: {
    display: "inline-block",
    padding: "3px 10px",
    fontSize: "9px",
    fontWeight: 600,
    borderRadius: "4px",
  },

  badgeSuccess: {
    backgroundColor: colors.successBg,
    color: colors.success,
  },

  // Status
  statusBadge: {
    display: "inline-block",
    padding: "5px 14px",
    fontSize: "10px",
    fontWeight: 600,
    borderRadius: "20px",
    backgroundColor: colors.successBg,
    color: colors.success,
  },

  // Footer
  footer: {
    backgroundColor: "#f3f4f6",
    padding: "14px 24px",
    borderTop: `1px solid ${colors.border}`,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  footerContact: {
    fontSize: "9px",
    color: "#4b5563",
    lineHeight: 1.6,
  },

  footerRight: {
    textAlign: "right" as const,
  },

  footerThanks: {
    fontSize: "11px",
    color: "#374151",
    fontWeight: 600,
  },

  footerWebsite: {
    fontSize: "9px",
    color: colors.secondary,
    marginTop: "2px",
  },

  // Divider
  divider: {
    borderTop: `1px solid ${colors.border}`,
    margin: "16px 0",
  },

  // Text utilities
  textCenter: {
    textAlign: "center" as const,
  },

  textBold: {
    fontWeight: 700,
  },

  textSmall: {
    fontSize: "9px",
  },

  textMuted: {
    color: colors.secondary,
  },

  // Flex utilities
  flexBetween: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  flexCenter: {
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },

  // Spacing
  mt2: { marginTop: "8px" },
  mt3: { marginTop: "12px" },
  mt4: { marginTop: "16px" },
  mb2: { marginBottom: "8px" },
  mb3: { marginBottom: "12px" },
  gap2: { gap: "8px" },
  gap3: { gap: "12px" },
};

// Company info
export const COMPANY_INFO = {
  name: "4A Rentals",
  tagline: "Freedom on Four Wheels",
  phone: "+1 (469) 403-7094",
  email: "info@4arentals.com",
  address: "123 Rental Street, Denton, TX 76201",
  website: "www.4arentals.com",
  logo: "/4arentals-logo.png",
};
