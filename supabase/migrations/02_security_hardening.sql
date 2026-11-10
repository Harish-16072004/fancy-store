-- ============================================
-- Migration 02: Security Hardening & RBAC
-- Ariya Thangam Fancy Store
-- ============================================

-- 1. Create staff allowlist & role table
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('staff', 'admin')),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;

-- Helper functions to verify active staff and admin status
CREATE OR REPLACE FUNCTION public.is_active_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles
    WHERE user_id = auth.uid()
      AND is_active = TRUE
  );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_staff()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.staff_profiles
    WHERE user_id = auth.uid()
      AND role = 'admin'
      AND is_active = TRUE
  );
$$;

REVOKE EXECUTE ON FUNCTION public.is_active_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_staff() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_admin_staff() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin_staff() TO authenticated;

-- Allow authenticated staff to view their own profile
DROP POLICY IF EXISTS "Staff can view own profile" ON public.staff_profiles;
CREATE POLICY "Staff can view own profile"
  ON public.staff_profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Allow active admin staff to manage all staff profiles
DROP POLICY IF EXISTS "Admins can manage staff profiles" ON public.staff_profiles;
CREATE POLICY "Admins can manage staff profiles"
  ON public.staff_profiles FOR ALL TO authenticated
  USING (public.is_admin_staff())
  WITH CHECK (public.is_admin_staff());

-- 2. Harden clear_all_data() to require active admin privileges
CREATE OR REPLACE FUNCTION public.clear_all_data()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() <> 'authenticated' OR NOT public.is_admin_staff() THEN
    RAISE EXCEPTION 'Forbidden: Only active administrators can clear database records.';
  END IF;

  DELETE FROM public.rental_photos;
  DELETE FROM public.additional_items;
  DELETE FROM public.rental_items;
  DELETE FROM public.rentals;
  DELETE FROM public.inventory_items;
  DELETE FROM public.categories;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.clear_all_data() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_all_data() TO authenticated;

-- 3. Replace overly permissive RLS policies with active staff verification
DROP POLICY IF EXISTS "Authenticated full access on categories" ON public.categories;
DROP POLICY IF EXISTS "Authenticated full access on inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Authenticated full access on rentals" ON public.rentals;
DROP POLICY IF EXISTS "Authenticated full access on rental_items" ON public.rental_items;
DROP POLICY IF EXISTS "Authenticated full access on additional_items" ON public.additional_items;
DROP POLICY IF EXISTS "Authenticated full access on rental_photos" ON public.rental_photos;

DROP POLICY IF EXISTS "Active staff full access on categories" ON public.categories;
CREATE POLICY "Active staff full access on categories"
  ON public.categories FOR ALL TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Active staff full access on inventory_items" ON public.inventory_items;
CREATE POLICY "Active staff full access on inventory_items"
  ON public.inventory_items FOR ALL TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Active staff full access on rentals" ON public.rentals;
CREATE POLICY "Active staff full access on rentals"
  ON public.rentals FOR ALL TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Active staff full access on rental_items" ON public.rental_items;
CREATE POLICY "Active staff full access on rental_items"
  ON public.rental_items FOR ALL TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Active staff full access on additional_items" ON public.additional_items;
CREATE POLICY "Active staff full access on additional_items"
  ON public.additional_items FOR ALL TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

DROP POLICY IF EXISTS "Active staff full access on rental_photos" ON public.rental_photos;
CREATE POLICY "Active staff full access on rental_photos"
  ON public.rental_photos FOR ALL TO authenticated
  USING (public.is_active_staff())
  WITH CHECK (public.is_active_staff());

-- 4. Add non-negative integrity constraints
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_inventory_non_negative'
  ) THEN
    ALTER TABLE public.inventory_items
      ADD CONSTRAINT chk_inventory_non_negative CHECK (quantity >= 0 AND rental_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_rentals_dates'
  ) THEN
    ALTER TABLE public.rentals
      ADD CONSTRAINT chk_rentals_dates CHECK (expected_return_date >= date_given);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_rentals_amounts_non_negative'
  ) THEN
    ALTER TABLE public.rentals
      ADD CONSTRAINT chk_rentals_amounts_non_negative CHECK (
        rental_charge >= 0 AND advance_amount >= 0 AND COALESCE(pre_booking_paid, 0) >= 0
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_rental_items_non_negative'
  ) THEN
    ALTER TABLE public.rental_items
      ADD CONSTRAINT chk_rental_items_non_negative CHECK (quantity > 0 AND rental_price >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_additional_items_positive'
  ) THEN
    ALTER TABLE public.additional_items
      ADD CONSTRAINT chk_additional_items_positive CHECK (quantity > 0);
  END IF;
END $$;

-- 5. Atomic server-side backup restore function
CREATE OR REPLACE FUNCTION public.restore_backup_json(backup JSONB)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Enforce admin authorization
  IF auth.role() <> 'authenticated' OR NOT public.is_admin_staff() THEN
    RAISE EXCEPTION 'Forbidden: Only active administrators can restore database backups.';
  END IF;

  -- 2. Validate required top-level arrays
  IF backup IS NULL
     OR jsonb_typeof(backup->'categories') <> 'array'
     OR jsonb_typeof(backup->'inventory_items') <> 'array'
     OR jsonb_typeof(backup->'rentals') <> 'array' THEN
    RAISE EXCEPTION 'Invalid backup payload structure.';
  END IF;

  -- 3. Delete existing records (automatically rolled back if any subsequent insert fails)
  DELETE FROM public.rental_photos;
  DELETE FROM public.additional_items;
  DELETE FROM public.rental_items;
  DELETE FROM public.rentals;
  DELETE FROM public.inventory_items;
  DELETE FROM public.categories;

  -- 4. Re-insert in foreign-key order using jsonb_populate_recordset
  IF jsonb_array_length(backup->'categories') > 0 THEN
    INSERT INTO public.categories
    SELECT * FROM jsonb_populate_recordset(NULL::public.categories, backup->'categories');
  END IF;

  IF jsonb_array_length(backup->'inventory_items') > 0 THEN
    INSERT INTO public.inventory_items
    SELECT * FROM jsonb_populate_recordset(NULL::public.inventory_items, backup->'inventory_items');
  END IF;

  IF jsonb_array_length(backup->'rentals') > 0 THEN
    INSERT INTO public.rentals
    SELECT * FROM jsonb_populate_recordset(NULL::public.rentals, backup->'rentals');
  END IF;

  IF jsonb_typeof(backup->'rental_items') = 'array' AND jsonb_array_length(backup->'rental_items') > 0 THEN
    INSERT INTO public.rental_items
    SELECT * FROM jsonb_populate_recordset(NULL::public.rental_items, backup->'rental_items');
  END IF;

  IF jsonb_typeof(backup->'additional_items') = 'array' AND jsonb_array_length(backup->'additional_items') > 0 THEN
    INSERT INTO public.additional_items
    SELECT * FROM jsonb_populate_recordset(NULL::public.additional_items, backup->'additional_items');
  END IF;

  IF jsonb_typeof(backup->'rental_photos') = 'array' AND jsonb_array_length(backup->'rental_photos') > 0 THEN
    INSERT INTO public.rental_photos
    SELECT * FROM jsonb_populate_recordset(NULL::public.rental_photos, backup->'rental_photos');
  END IF;

  RETURN TRUE;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.restore_backup_json(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.restore_backup_json(JSONB) TO authenticated;

