// supabase/functions/_shared/dates.ts
// Shared date helpers for Supabase Edge Functions (uses Luxon)

import { DateTime } from "npm:luxon@3.6.0";

// Read business timezone from env (default UTC)
const BUSINESS_TIMEZONE = Deno.env.get("BUSINESS_TIMEZONE") || "UTC";

export function toBusinessDateString(date: Date = new Date(), timeZone: string = BUSINESS_TIMEZONE): string {
  return DateTime.fromJSDate(date).setZone(timeZone).toISODate();
}

export function businessNow() {
  return DateTime.now().setZone(BUSINESS_TIMEZONE);
}
