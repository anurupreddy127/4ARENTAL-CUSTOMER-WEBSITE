// src/utils/dates.ts
// Shared date helpers for frontend using Luxon

import { DateTime } from "luxon";

const FRONTEND_BUSINESS_TIMEZONE = import.meta.env.VITE_BUSINESS_TIMEZONE || "UTC";

export function toBusinessDateString(date: Date = new Date(), timeZone: string = FRONTEND_BUSINESS_TIMEZONE): string {
  return DateTime.fromJSDate(date).setZone(timeZone).toISODate();
}

export function businessNow(timeZone: string = FRONTEND_BUSINESS_TIMEZONE) {
  return DateTime.now().setZone(timeZone);
}
