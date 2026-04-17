/*
  # Move btree_gist extension out of public schema

  1. Changes
    - Moves `btree_gist` extension from public schema to extensions schema

  2. Security
    - Extensions in the public schema can be a vector for privilege escalation
    - Moving them to a dedicated `extensions` schema isolates them from
      user-defined objects

  3. Important Notes
    - The `extensions` schema already exists in this database
    - `pg_net` does not support SET SCHEMA (Postgres limitation) and cannot
      be moved; this is a known Supabase platform constraint
*/

ALTER EXTENSION btree_gist SET SCHEMA extensions;
