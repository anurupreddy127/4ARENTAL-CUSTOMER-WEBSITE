/*
  # Create 4A Rentals Database Schema

  1. New Tables
    - `vehicles`
      - `id` (uuid, primary key)
      - `name` (text)
      - `category` (text)
      - `price` (numeric)
      - `price_unit` (text)
      - `image` (text)
      - `features` (text array)
      - `available` (boolean)
      - `status` (text)
      - `manual_status` (text, nullable)
      - `specifications` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `bookings`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `vehicle_id` (uuid, references vehicles)
      - `pickup_location` (text)
      - `pickup_date` (timestamp)
      - `return_date` (timestamp)
      - `total_price` (numeric)
      - `status` (text)
      - `customer_info` (jsonb)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `offers`
      - `id` (uuid, primary key)
      - `title` (text)
      - `description` (text)
      - `discount` (text)
      - `icon` (text)
      - `icon_color` (text)
      - `button_text` (text)
      - `active` (boolean)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `contact_messages`
      - `id` (uuid, primary key)
      - `first_name` (text)
      - `last_name` (text)
      - `email` (text)
      - `phone` (text)
      - `message` (text)
      - `status` (text)
      - `created_at` (timestamp)
    
    - `user_profiles`
      - `id` (uuid, primary key, references auth.users)
      - `first_name` (text)
      - `last_name` (text)
      - `phone` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
    - Add admin policies for management
*/

-- Create vehicles table
CREATE TABLE IF NOT EXISTS vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('economy', 'suv', 'luxury')),
  price numeric NOT NULL,
  price_unit text NOT NULL CHECK (price_unit IN ('day', 'hour')),
  image text NOT NULL,
  features text[] DEFAULT '{}',
  available boolean DEFAULT true,
  status text DEFAULT 'available' CHECK (status IN ('available', 'reserved', 'not-available')),
  manual_status text CHECK (manual_status IN ('available', 'reserved', 'not-available')),
  specifications jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create bookings table
CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  vehicle_id uuid REFERENCES vehicles(id) ON DELETE CASCADE,
  pickup_location text NOT NULL,
  pickup_date timestamptz NOT NULL,
  return_date timestamptz NOT NULL,
  total_price numeric NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled')),
  customer_info jsonb NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create offers table
CREATE TABLE IF NOT EXISTS offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  discount text NOT NULL,
  icon text NOT NULL,
  icon_color text NOT NULL,
  button_text text NOT NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create contact_messages table
CREATE TABLE IF NOT EXISTS contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  phone text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'new' CHECK (status IN ('new', 'read', 'responded')),
  created_at timestamptz DEFAULT now()
);

-- Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name text,
  last_name text,
  phone text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Vehicles policies
CREATE POLICY "Vehicles are viewable by everyone"
  ON vehicles
  FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Vehicles can be managed by admins"
  ON vehicles
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@4arentals.com');

-- Bookings policies
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
  USING (auth.jwt() ->> 'email' = 'admin@4arentals.com');

CREATE POLICY "Admins can update all bookings"
  ON bookings
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@4arentals.com');

-- Offers policies
CREATE POLICY "Active offers are viewable by everyone"
  ON offers
  FOR SELECT
  TO public
  USING (active = true);

CREATE POLICY "All offers are viewable by admins"
  ON offers
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@4arentals.com');

CREATE POLICY "Offers can be managed by admins"
  ON offers
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@4arentals.com');

-- Contact messages policies
CREATE POLICY "Anyone can create contact messages"
  ON contact_messages
  FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Admins can view all contact messages"
  ON contact_messages
  FOR SELECT
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@4arentals.com');

CREATE POLICY "Admins can update contact messages"
  ON contact_messages
  FOR UPDATE
  TO authenticated
  USING (auth.jwt() ->> 'email' = 'admin@4arentals.com');

-- User profiles policies
CREATE POLICY "Users can view their own profile"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Insert sample data
INSERT INTO vehicles (name, category, price, price_unit, image, features, specifications) VALUES
('Toyota Camry', 'economy', 45, 'day', 'https://images.pexels.com/photos/116675/pexels-photo-116675.jpeg?auto=compress&cs=tinysrgb&w=800', 
 ARRAY['Air Conditioning', 'Bluetooth', 'Backup Camera', 'USB Charging'],
 '{"seats": 5, "transmission": "automatic", "fuelType": "gasoline", "year": 2023, "brand": "Toyota", "model": "Camry"}'::jsonb),

('Honda CR-V', 'suv', 65, 'day', 'https://images.pexels.com/photos/1007410/pexels-photo-1007410.jpeg?auto=compress&cs=tinysrgb&w=800',
 ARRAY['All-Wheel Drive', 'Heated Seats', 'Navigation', 'Apple CarPlay'],
 '{"seats": 5, "transmission": "automatic", "fuelType": "gasoline", "year": 2023, "brand": "Honda", "model": "CR-V"}'::jsonb),

('BMW 3 Series', 'luxury', 95, 'day', 'https://images.pexels.com/photos/244206/pexels-photo-244206.jpeg?auto=compress&cs=tinysrgb&w=800',
 ARRAY['Leather Seats', 'Premium Sound', 'Sunroof', 'Sport Mode'],
 '{"seats": 5, "transmission": "automatic", "fuelType": "gasoline", "year": 2023, "brand": "BMW", "model": "3 Series"}'::jsonb);

INSERT INTO offers (title, description, discount, icon, icon_color, button_text, active) VALUES
('Early Bird Special', 'Book 7 days in advance and save big on your rental', '25% OFF', 'Clock', 'text-blue-600', 'Claim Offer', true),
('Weekend Getaway', 'Perfect for weekend trips with friends and family', '$50 OFF', 'Calendar', 'text-green-600', 'Book Weekend', true);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_offers_updated_at BEFORE UPDATE ON offers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();