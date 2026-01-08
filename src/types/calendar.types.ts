// types/calendar.types.ts
/**
 * Business calendar type definitions
 */

// ============================================
// DATE TYPE
// ============================================

export type CalendarDateType =
  | "holiday" // Store completely closed
  | "modified_hours" // Different open/close times
  | "delivery_blackout" // Open but no delivery
  | "special_event"; // Normal hours with notes

// ============================================
// BUSINESS CALENDAR ENTRY
// ============================================

export interface BusinessCalendarEntry {
  id: string;
  calendarDate: string; // ISO date string (YYYY-MM-DD)
  dateType: CalendarDateType;
  title: string;
  description: string | null;
  openTime: string | null; // HH:MM format
  closeTime: string | null; // HH:MM format
  deliveryAvailable: boolean;
  customDeliverySlots: string[] | null; // Array of time strings
  isRecurring: boolean;
  workerNote: string | null;
  customerNote: string | null;
  createdBy: string | null;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// STORE HOURS RESULT
// ============================================

export interface StoreHours {
  openTime: string | null;
  closeTime: string | null;
  isClosed: boolean;
  note: string | null;
}

// ============================================
// BLOCKED DATE (for date picker)
// ============================================

export interface BlockedDate {
  date: string; // ISO date string
  reason: string;
}

// ============================================
// UNAVAILABLE DATE RANGE (for calendar display)
// ============================================

export interface UnavailableDateRange {
  bookingId: string;
  unavailableFrom: string;
  unavailableTo: string;
  reason: string;
}

// ============================================
// DELIVERY TIME SLOT
// ============================================

export interface DeliveryTimeSlot {
  time: string; // HH:MM format
  label: string; // Display label like "10:00 AM"
  available: boolean;
}
