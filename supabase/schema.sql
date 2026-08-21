-- ============================================
-- Cloakroom Database Schema for Supabase
-- Run this entire script in the Supabase SQL Editor
-- ============================================

-- 1. Categories (costume groupings)
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Inventory Items (individual costumes in stock)
CREATE TABLE inventory_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  size TEXT NOT NULL DEFAULT 'M',
  quantity INTEGER NOT NULL DEFAULT 0,
  rental_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  photo_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Rentals (customer rental records)
CREATE TABLE rentals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_number TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT,
  date_given DATE NOT NULL,
  expected_return_date DATE NOT NULL,
  actual_return_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('pre-booked', 'active', 'returned')),
  is_pre_booking BOOLEAN DEFAULT FALSE,
  pre_booking_paid NUMERIC(10,2) DEFAULT 0,
  rental_charge NUMERIC(10,2) NOT NULL DEFAULT 0,
  advance_amount NUMERIC(10,2) NOT NULL DEFAULT 0,
  advance_returned BOOLEAN DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Rental Line Items (costumes within a rental — normalized from Rental.items[])
CREATE TABLE rental_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  item_id UUID REFERENCES inventory_items(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  category_name TEXT NOT NULL DEFAULT 'Costumes',
  size TEXT NOT NULL DEFAULT 'M',
  quantity INTEGER NOT NULL DEFAULT 1,
  rental_price NUMERIC(10,2) NOT NULL DEFAULT 0
);

-- 5. Additional Accessories (free-text add-on items — normalized from Rental.additionalItems[])
CREATE TABLE additional_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1
);

-- 6. Rental Photos (handover & return condition photos — normalized from handoverPhotos[] / returnPhotos[])
CREATE TABLE rental_photos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  photo_path TEXT NOT NULL,
  photo_type TEXT NOT NULL CHECK (photo_type IN ('handover', 'return')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- Row Level Security (RLS) Policies
-- Only authenticated shop staff can access data
-- ============================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE additional_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE rental_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated full access on categories"
  ON categories FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on inventory_items"
  ON inventory_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on rentals"
  ON rentals FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on rental_items"
  ON rental_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on additional_items"
  ON additional_items FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

CREATE POLICY "Authenticated full access on rental_photos"
  ON rental_photos FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================
-- Indexes for query performance
-- ============================================

CREATE INDEX idx_inventory_items_category ON inventory_items(category_id);
CREATE INDEX idx_rental_items_rental ON rental_items(rental_id);
CREATE INDEX idx_additional_items_rental ON additional_items(rental_id);
CREATE INDEX idx_rental_photos_rental ON rental_photos(rental_id);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_rentals_booking_number ON rentals(booking_number);

-- ============================================
-- Utility: Truncate all data (used by backup restore & reset)
-- ============================================

CREATE OR REPLACE FUNCTION clear_all_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM rental_photos;
  DELETE FROM additional_items;
  DELETE FROM rental_items;
  DELETE FROM rentals;
  DELETE FROM inventory_items;
  DELETE FROM categories;
END;
$$;
