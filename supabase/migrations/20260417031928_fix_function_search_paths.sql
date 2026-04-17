/*
  # Fix mutable search_path on all public functions

  1. Security Changes
    - Sets `search_path = ''` on all user-defined functions in the public schema
      that currently have a mutable (unset) search_path
    - This prevents search_path hijacking attacks where a malicious schema
      could shadow trusted functions/tables

  2. Affected Functions (46 total)
    - Pricing: get_rental_price, calculate_rental_price, calculate_booking_total,
      calculate_extension_price, calculate_early_return_refund
    - Config: get_config, get_config_int, get_config_bool, get_config_decimal,
      get_all_configs, get_configs_by_category, capture_config_snapshot
    - Availability: is_vehicle_available, check_vehicle_availability_detailed,
      get_next_available_date, get_vehicle_unavailable_dates, get_blocked_dates,
      is_delivery_available, get_delivery_blackout_dates
    - Bookings: generate_booking_number, mark_booking_picked_up (both overloads),
      process_vehicle_return, flag_overdue_bookings, restrict_customer_booking_updates,
      get_booking_pending_total, get_booking_processed_total
    - Vehicles: update_vehicle_rating, get_overdue_vehicles, get_overdue_vehicles_count
    - Customers: get_customers_with_stats
    - Calendar: get_store_hours, is_holiday, update_business_calendar_updated_at
    - Cache: invalidate_cache, trigger_invalidate_bookings_cache,
      trigger_invalidate_customers_cache, trigger_invalidate_config_cache,
      trigger_invalidate_vehicles_cache, trigger_invalidate_delivery_locations_cache
    - Triggers: update_updated_at_column, update_system_config_updated_at,
      update_driver_verifications_updated_at, update_pending_charges_updated_at,
      send_welcome_email, check_existing_verification

  3. Important Notes
    - Functions that already have search_path set (e.g. approve_pending_charge,
      is_admin, get_user_role, etc.) are not modified
    - Extension-provided functions (gbt_*, etc.) are not modified
*/

ALTER FUNCTION public.get_rental_price(uuid, date, date, boolean) SET search_path = '';
ALTER FUNCTION public.get_customers_with_stats(text, integer, integer) SET search_path = '';
ALTER FUNCTION public.get_config_int(text) SET search_path = '';
ALTER FUNCTION public.invalidate_cache(text) SET search_path = '';
ALTER FUNCTION public.update_business_calendar_updated_at() SET search_path = '';
ALTER FUNCTION public.get_config(text) SET search_path = '';
ALTER FUNCTION public.mark_booking_picked_up(uuid, timestamp with time zone, integer, text) SET search_path = '';
ALTER FUNCTION public.is_delivery_available(date) SET search_path = '';
ALTER FUNCTION public.send_welcome_email() SET search_path = '';
ALTER FUNCTION public.get_next_available_date(uuid, date) SET search_path = '';
ALTER FUNCTION public.update_system_config_updated_at() SET search_path = '';
ALTER FUNCTION public.get_delivery_blackout_dates(date, date) SET search_path = '';
ALTER FUNCTION public.get_store_hours(date) SET search_path = '';
ALTER FUNCTION public.calculate_rental_price(uuid, date, date, boolean) SET search_path = '';
ALTER FUNCTION public.calculate_booking_total(uuid, date, date, boolean, numeric, integer) SET search_path = '';
ALTER FUNCTION public.get_config_bool(text) SET search_path = '';
ALTER FUNCTION public.get_booking_processed_total(uuid) SET search_path = '';
ALTER FUNCTION public.capture_config_snapshot() SET search_path = '';
ALTER FUNCTION public.flag_overdue_bookings() SET search_path = '';
ALTER FUNCTION public.process_vehicle_return(uuid, integer, text, text, text, text, boolean, text, uuid, jsonb) SET search_path = '';
ALTER FUNCTION public.get_blocked_dates(date, date) SET search_path = '';
ALTER FUNCTION public.get_configs_by_category(text) SET search_path = '';
ALTER FUNCTION public.get_overdue_vehicles() SET search_path = '';
ALTER FUNCTION public.is_holiday(date) SET search_path = '';
ALTER FUNCTION public.update_vehicle_rating() SET search_path = '';
ALTER FUNCTION public.get_config_decimal(text) SET search_path = '';
ALTER FUNCTION public.trigger_invalidate_bookings_cache() SET search_path = '';
ALTER FUNCTION public.get_overdue_vehicles_count() SET search_path = '';
ALTER FUNCTION public.trigger_invalidate_customers_cache() SET search_path = '';
ALTER FUNCTION public.cleanup_old_webhook_events() SET search_path = '';
ALTER FUNCTION public.get_booking_pending_total(uuid) SET search_path = '';
ALTER FUNCTION public.check_vehicle_availability_detailed(uuid, timestamp with time zone, timestamp with time zone) SET search_path = '';
ALTER FUNCTION public.generate_booking_number() SET search_path = '';
ALTER FUNCTION public.trigger_invalidate_config_cache() SET search_path = '';
ALTER FUNCTION public.trigger_invalidate_vehicles_cache() SET search_path = '';
ALTER FUNCTION public.check_existing_verification(text) SET search_path = '';
ALTER FUNCTION public.update_driver_verifications_updated_at() SET search_path = '';
ALTER FUNCTION public.is_vehicle_available(uuid, timestamp with time zone, timestamp with time zone, uuid, uuid) SET search_path = '';
ALTER FUNCTION public.calculate_early_return_refund(uuid, date) SET search_path = '';
ALTER FUNCTION public.get_vehicle_unavailable_dates(uuid, date, date) SET search_path = '';
ALTER FUNCTION public.trigger_invalidate_delivery_locations_cache() SET search_path = '';
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.update_pending_charges_updated_at() SET search_path = '';
ALTER FUNCTION public.calculate_extension_price(uuid, date, date) SET search_path = '';
ALTER FUNCTION public.get_all_configs() SET search_path = '';
ALTER FUNCTION public.mark_booking_picked_up(uuid, text, integer, text, text, uuid, jsonb) SET search_path = '';
ALTER FUNCTION public.restrict_customer_booking_updates() SET search_path = '';
