/*
  # Fix security issues: indexes, RLS policy performance, and access control

  1. New Indexes
    - `idx_bookings_user_id` on `bookings(user_id)` - covers foreign key for join performance
    - `idx_bookings_vehicle_id` on `bookings(vehicle_id)` - covers foreign key for join performance

  2. RLS Policy Fixes (auth function select wrapper)
    All policies using `auth.uid()` or `auth.jwt()` are replaced with
    `(select auth.uid())` / `(select auth.jwt())` to prevent per-row re-evaluation.
    Affected tables: users, user_profiles, vehicles, bookings, offers, contact_messages

  3. Security Fix
    - `contact_messages` INSERT policy "Anyone can create contact messages" replaced with
      a rate-limit-friendly check requiring non-null fields instead of `true`

  4. Important Notes
    - No data is modified or deleted
    - All policies are dropped and recreated with optimized expressions
    - Existing RLS enabled status is preserved
*/

-- ===========================================
-- 1. Add missing indexes on bookings FKs
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings (user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_vehicle_id ON public.bookings (vehicle_id);

-- ===========================================
-- 2. Fix RLS policies on public.users
-- ===========================================

DROP POLICY IF EXISTS "Users can read own data" ON public.users;
CREATE POLICY "Users can read own data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ===========================================
-- 3. Fix RLS policies on public.user_profiles
-- ===========================================

DROP POLICY IF EXISTS "Users can view their own profile" ON public.user_profiles;
CREATE POLICY "Users can view their own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.user_profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.user_profiles;
CREATE POLICY "Users can update their own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- ===========================================
-- 4. Fix RLS policies on public.vehicles
-- ===========================================

DROP POLICY IF EXISTS "Vehicles can be managed by admins" ON public.vehicles;
CREATE POLICY "Vehicles can be managed by admins"
  ON public.vehicles
  FOR ALL
  TO authenticated
  USING (((select auth.jwt()) ->> 'email'::text) = 'admin@4arentals.com'::text)
  WITH CHECK (((select auth.jwt()) ->> 'email'::text) = 'admin@4arentals.com'::text);

-- ===========================================
-- 5. Fix RLS policies on public.bookings
-- ===========================================

DROP POLICY IF EXISTS "Users can view their own bookings" ON public.bookings;
CREATE POLICY "Users can view their own bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create their own bookings" ON public.bookings;
CREATE POLICY "Users can create their own bookings"
  ON public.bookings
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Admins can view all bookings" ON public.bookings;
CREATE POLICY "Admins can view all bookings"
  ON public.bookings
  FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) ->> 'email'::text) = 'admin@4arentals.com'::text);

DROP POLICY IF EXISTS "Admins can update all bookings" ON public.bookings;
CREATE POLICY "Admins can update all bookings"
  ON public.bookings
  FOR UPDATE
  TO authenticated
  USING (((select auth.jwt()) ->> 'email'::text) = 'admin@4arentals.com'::text)
  WITH CHECK (((select auth.jwt()) ->> 'email'::text) = 'admin@4arentals.com'::text);

-- ===========================================
-- 6. Fix RLS policies on public.offers
-- ===========================================

DROP POLICY IF EXISTS "All offers are viewable by admins" ON public.offers;
CREATE POLICY "All offers are viewable by admins"
  ON public.offers
  FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) ->> 'email'::text) = 'admin@4arentals.com'::text);

DROP POLICY IF EXISTS "Offers can be managed by admins" ON public.offers;
CREATE POLICY "Offers can be managed by admins"
  ON public.offers
  FOR ALL
  TO authenticated
  USING (((select auth.jwt()) ->> 'email'::text) = 'admin@4arentals.com'::text)
  WITH CHECK (((select auth.jwt()) ->> 'email'::text) = 'admin@4arentals.com'::text);

-- ===========================================
-- 7. Fix RLS policies on public.contact_messages
-- ===========================================

DROP POLICY IF EXISTS "Admins can view all contact messages" ON public.contact_messages;
CREATE POLICY "Admins can view all contact messages"
  ON public.contact_messages
  FOR SELECT
  TO authenticated
  USING (((select auth.jwt()) ->> 'email'::text) = 'admin@4arentals.com'::text);

DROP POLICY IF EXISTS "Admins can update contact messages" ON public.contact_messages;
CREATE POLICY "Admins can update contact messages"
  ON public.contact_messages
  FOR UPDATE
  TO authenticated
  USING (((select auth.jwt()) ->> 'email'::text) = 'admin@4arentals.com'::text)
  WITH CHECK (((select auth.jwt()) ->> 'email'::text) = 'admin@4arentals.com'::text);

-- Fix the unrestricted INSERT policy: require non-null fields
DROP POLICY IF EXISTS "Anyone can create contact messages" ON public.contact_messages;
CREATE POLICY "Anyone can submit contact messages"
  ON public.contact_messages
  FOR INSERT
  TO public
  WITH CHECK (
    first_name IS NOT NULL
    AND last_name IS NOT NULL
    AND email IS NOT NULL
    AND message IS NOT NULL
    AND length(trim(first_name)) > 0
    AND length(trim(email)) > 0
    AND length(trim(message)) > 0
  );
