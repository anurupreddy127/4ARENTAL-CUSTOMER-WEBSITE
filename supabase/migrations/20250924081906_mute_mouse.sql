/*
  # Fix Function Search Path Security Warnings

  This migration fixes the security warnings about mutable search_path in database functions.
  
  ## Changes Made:
  1. **update_updated_at_column function** - Set secure search_path
  2. **handle_new_user function** - Set secure search_path
  
  ## Security Enhancement:
  - Functions now have immutable search_path set to 'public'
  - Prevents potential SQL injection through search_path manipulation
  - Follows Supabase security best practices
*/

-- Fix update_updated_at_column function with secure search_path
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

-- Fix handle_new_user function with secure search_path
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email);
  
  INSERT INTO public.user_profiles (id)
  VALUES (NEW.id);
  
  RETURN NEW;
END;
$$;