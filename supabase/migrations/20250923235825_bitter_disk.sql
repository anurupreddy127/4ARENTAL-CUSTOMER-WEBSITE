/*
  # Reset Database - Clean All Tables

  1. Drop all existing tables
    - Remove all previously created tables and their dependencies
    - Clean slate for proper database structure

  2. Drop all functions and triggers
    - Remove any custom functions
    - Remove triggers that might interfere

  This migration will completely reset the database to start fresh.
*/

-- Drop all existing tables if they exist
DROP TABLE IF EXISTS contact_messages CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS offers CASCADE;
DROP TABLE IF EXISTS user_profiles CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;

-- Drop any existing functions
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS handle_new_user() CASCADE;

-- Drop any existing triggers
-- (These will be dropped automatically with the tables)