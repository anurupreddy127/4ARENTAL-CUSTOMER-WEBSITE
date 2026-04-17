/*
  # Fix RLS policies and storage bucket security

  1. audit_logs table
    - Drops the overly permissive INSERT policy that allowed any authenticated
      user to create audit logs (WITH CHECK = true)
    - Replaces with a restrictive policy that only allows staff members
      (workers, managers, admins) to insert audit logs
    - Note: Edge functions using the service role key bypass RLS entirely,
      so this does not affect those code paths

  2. contact_messages table
    - Drops the overly permissive INSERT policy that allowed anyone to
      insert with no restrictions (WITH CHECK = true)
    - Replaces with a policy that validates the inserted data has required
      fields (first_name, email, message must be non-empty), preventing
      empty/spam submissions at the database level
    - Remains accessible to unauthenticated users (public contact form)

  3. Storage bucket policies
    - Drops broad SELECT policies on `car images` and `rental-documents`
      buckets that allowed listing all files
    - Public buckets already allow direct URL access to objects; the SELECT
      policies were unnecessary and exposed file listing capability

  4. account_deletion_logs table
    - Adds RLS policies: only admins can view and insert deletion logs
    - This table contains sensitive account deletion audit data

  5. Important Notes
    - All changes are additive/safe - no data is modified or deleted
    - Service role operations are unaffected by RLS changes
*/

-- 1. Fix audit_logs INSERT policy
DROP POLICY IF EXISTS "Authenticated can create audit logs" ON public.audit_logs;

CREATE POLICY "Staff can create audit logs"
  ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff_member() = true);

-- 2. Fix contact_messages INSERT policy
DROP POLICY IF EXISTS "Anyone can create contact messages" ON public.contact_messages;

CREATE POLICY "Public can submit contact messages with required fields"
  ON public.contact_messages
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    first_name IS NOT NULL AND first_name <> '' AND
    email IS NOT NULL AND email <> '' AND
    message IS NOT NULL AND message <> ''
  );

-- 3. Drop broad SELECT policies on storage buckets
DROP POLICY IF EXISTS "Anyone can view car images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public to view rental documents" ON storage.objects;

-- 4. Add RLS policies to account_deletion_logs
CREATE POLICY "Admins can view account deletion logs"
  ON public.account_deletion_logs
  FOR SELECT
  TO authenticated
  USING (public.is_admin() = true);

CREATE POLICY "Admins can insert account deletion logs"
  ON public.account_deletion_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin() = true);
