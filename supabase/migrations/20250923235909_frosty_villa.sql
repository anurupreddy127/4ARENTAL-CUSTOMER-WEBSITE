/*
  # Seed Initial Data

  1. Sample Vehicles
    - Economy cars for budget-conscious customers
    - SUVs for families and groups
    - Luxury vehicles for premium experience

  2. Sample Offers
    - Student discounts
    - Early bird specials
    - Weekend deals

  This provides initial data for the application to work with.
*/

-- Insert sample vehicles
INSERT INTO vehicles (name, category, price, price_unit, image, features, specifications) VALUES
(
    'Toyota Camry',
    'economy',
    60,
    'day',
    'https://images.pexels.com/photos/3802508/pexels-photo-3802508.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
    ARRAY['Fuel Efficient', 'Apple CarPlay', 'Safety Sense', 'Comfortable Interior', 'Backup Camera'],
    '{"seats": 5, "transmission": "automatic", "fuelType": "hybrid", "year": 2024, "brand": "Toyota", "model": "Camry"}'::jsonb
),
(
    'Honda CR-V',
    'suv',
    80,
    'day',
    'https://images.pexels.com/photos/3802508/pexels-photo-3802508.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
    ARRAY['Spacious Cargo', 'All-Weather Capable', 'Honda Sensing', 'Versatile Seating', 'Panoramic Sunroof'],
    '{"seats": 5, "transmission": "automatic", "fuelType": "gasoline", "year": 2024, "brand": "Honda", "model": "CR-V"}'::jsonb
),
(
    'Mercedes S-Class',
    'luxury',
    150,
    'day',
    'https://images.pexels.com/photos/3802508/pexels-photo-3802508.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
    ARRAY['Leather Seats', 'GPS Navigation', 'Bluetooth', 'Premium Sound System', 'Massage Seats'],
    '{"seats": 5, "transmission": "automatic", "fuelType": "gasoline", "year": 2024, "brand": "Mercedes", "model": "S-Class"}'::jsonb
),
(
    'Nissan Altima',
    'economy',
    55,
    'day',
    'https://images.pexels.com/photos/3802508/pexels-photo-3802508.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
    ARRAY['Student Friendly', 'Great MPG', 'Modern Tech', 'Reliable Performance', 'Spacious Interior'],
    '{"seats": 5, "transmission": "automatic", "fuelType": "gasoline", "year": 2024, "brand": "Nissan", "model": "Altima"}'::jsonb
),
(
    'BMW X7',
    'luxury',
    180,
    'day',
    'https://images.pexels.com/photos/3802508/pexels-photo-3802508.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
    ARRAY['All-Wheel Drive', 'Third Row Seating', 'Panoramic Sunroof', 'Advanced Safety', 'Premium Audio'],
    '{"seats": 7, "transmission": "automatic", "fuelType": "gasoline", "year": 2024, "brand": "BMW", "model": "X7"}'::jsonb
),
(
    'Ford Explorer',
    'suv',
    90,
    'day',
    'https://images.pexels.com/photos/3802508/pexels-photo-3802508.jpeg?auto=compress&cs=tinysrgb&w=600&h=400',
    ARRAY['Family Friendly', 'Towing Capacity', 'SYNC Technology', 'Spacious Interior', 'Safety Features'],
    '{"seats": 7, "transmission": "automatic", "fuelType": "gasoline", "year": 2024, "brand": "Ford", "model": "Explorer"}'::jsonb
);

-- Insert sample offers
INSERT INTO offers (title, description, discount, icon, icon_color, button_text, active) VALUES
(
    'Student Special',
    'Show your student ID and save on your rental. Perfect for campus trips and weekend adventures.',
    '25% OFF',
    'Users',
    'text-blue-600',
    'Claim Student Discount',
    true
),
(
    'Early Bird Deal',
    'Book 7 days in advance and enjoy significant savings on all vehicle categories.',
    '$50 OFF',
    'Clock',
    'text-green-600',
    'Book Early & Save',
    true
),
(
    'Weekend Warrior',
    'Special rates for weekend rentals. Friday pickup, Monday return for the price of 2 days.',
    '2 Days FREE',
    'Calendar',
    'text-purple-600',
    'Get Weekend Deal',
    true
);