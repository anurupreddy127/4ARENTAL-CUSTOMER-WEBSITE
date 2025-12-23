/*
  # Setup Row Level Security

  1. Enable RLS on all tables
  2. Create policies for each table based on user roles
  3. Admin access for admin@4arentals.com
  4. User access for authenticated users
  5. Public access where appropriate

  Security Rules:
  - Users can only access their own data
  - Admin can access all data
  - Public can view vehicles and offers
  - Contact messages can be created by anyone
*/

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;

-- Users table policies
CREATE POLICY "Users can read own data"
    ON users
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own data"
    ON users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- User profiles table policies
CREATE POLICY "Users can view their own profile"
    ON user_profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON user_profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id);

-- Vehicles table policies
CREATE POLICY "Vehicles are viewable by everyone"
    ON vehicles
    FOR SELECT
    TO public
    USING (true);

CREATE POLICY "Vehicles can be managed by admins"
    ON vehicles
    FOR ALL
    TO authenticated
    USING ((auth.jwt() ->> 'email') = 'admin@4arentals.com');

-- Bookings table policies
CREATE POLICY "Users can view their own bookings"
    ON bookings
    FOR SELECT
    TO authenticated
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own bookings"
    ON bookings
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all bookings"
    ON bookings
    FOR SELECT
    TO authenticated
    USING ((auth.jwt() ->> 'email') = 'admin@4arentals.com');

CREATE POLICY "Admins can update all bookings"
    ON bookings
    FOR UPDATE
    TO authenticated
    USING ((auth.jwt() ->> 'email') = 'admin@4arentals.com');

-- Offers table policies
CREATE POLICY "Active offers are viewable by everyone"
    ON offers
    FOR SELECT
    TO public
    USING (active = true);

CREATE POLICY "All offers are viewable by admins"
    ON offers
    FOR SELECT
    TO authenticated
    USING ((auth.jwt() ->> 'email') = 'admin@4arentals.com');

CREATE POLICY "Offers can be managed by admins"
    ON offers
    FOR ALL
    TO authenticated
    USING ((auth.jwt() ->> 'email') = 'admin@4arentals.com');

-- Contact messages table policies
CREATE POLICY "Anyone can create contact messages"
    ON contact_messages
    FOR INSERT
    TO public
    WITH CHECK (true);

CREATE POLICY "Admins can view all contact messages"
    ON contact_messages
    FOR SELECT
    TO authenticated
    USING ((auth.jwt() ->> 'email') = 'admin@4arentals.com');

CREATE POLICY "Admins can update contact messages"
    ON contact_messages
    FOR UPDATE
    TO authenticated
    USING ((auth.jwt() ->> 'email') = 'admin@4arentals.com');