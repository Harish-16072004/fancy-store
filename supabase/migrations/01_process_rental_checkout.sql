CREATE OR REPLACE FUNCTION public.process_rental_checkout(
  payload JSONB
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rental_id UUID;
  v_item JSONB;
  v_add_item JSONB;
  v_item_id UUID;
  v_req_qty INTEGER;
  v_total_stock INTEGER;
  v_booked_qty INTEGER;
  v_start_date DATE := (payload->>'date_given')::DATE;
  v_end_date DATE := (payload->>'expected_return_date')::DATE;
BEGIN
  IF auth.role() <> 'authenticated' OR NOT public.is_active_staff() THEN
    RAISE EXCEPTION 'Unauthorized: Active staff session required.';
  END IF;

  IF v_end_date < v_start_date THEN
    RAISE EXCEPTION 'Expected return date cannot be earlier than pickup date.';
  END IF;

  -- Lock and verify stock availability for each inventory item
  IF payload->'items' IS NOT NULL AND jsonb_array_length(payload->'items') > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
    LOOP
      v_item_id := NULLIF(v_item->>'item_id', '')::UUID;
      v_req_qty := COALESCE((v_item->>'quantity')::INTEGER, 1);

      IF v_req_qty <= 0 THEN
        RAISE EXCEPTION 'Item quantity must be greater than zero.';
      END IF;

      IF v_item_id IS NOT NULL THEN
        SELECT quantity INTO v_total_stock
        FROM public.inventory_items
        WHERE id = v_item_id
        FOR UPDATE;

        IF NOT FOUND THEN
          RAISE EXCEPTION 'Inventory item % not found.', v_item_id;
        END IF;

        SELECT COALESCE(SUM(ri.quantity), 0) INTO v_booked_qty
        FROM public.rental_items ri
        JOIN public.rentals r ON r.id = ri.rental_id
        WHERE ri.item_id = v_item_id
          AND r.status <> 'returned'
          AND v_start_date < r.expected_return_date
          AND r.date_given < v_end_date;

        IF (v_total_stock - v_booked_qty) < v_req_qty THEN
          RAISE EXCEPTION 'Insufficient stock for item % between % and % (Requested: %, Available: %).',
            v_item->>'name', v_start_date, v_end_date, v_req_qty, GREATEST(0, v_total_stock - v_booked_qty);
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- Insert rental header
  INSERT INTO public.rentals (
    booking_number, customer_name, customer_phone, customer_address,
    date_given, expected_return_date, actual_return_date,
    status, is_pre_booking, pre_booking_paid,
    rental_charge, advance_amount, advance_returned, notes
  ) VALUES (
    payload->>'booking_number',
    payload->>'customer_name',
    payload->>'customer_phone',
    payload->>'customer_address',
    v_start_date,
    v_end_date,
    NULLIF(payload->>'actual_return_date', '')::DATE,
    COALESCE(payload->>'status', 'active'),
    COALESCE((payload->>'is_pre_booking')::BOOLEAN, false),
    COALESCE((payload->>'pre_booking_paid')::NUMERIC, 0),
    COALESCE((payload->>'rental_charge')::NUMERIC, 0),
    COALESCE((payload->>'advance_amount')::NUMERIC, 0),
    COALESCE((payload->>'advance_returned')::BOOLEAN, false),
    payload->>'notes'
  ) RETURNING id INTO v_rental_id;

  -- Insert rental items
  IF payload->'items' IS NOT NULL AND jsonb_array_length(payload->'items') > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
    LOOP
      INSERT INTO public.rental_items (
        rental_id, item_id, name, category_name, size, quantity, rental_price
      ) VALUES (
        v_rental_id,
        NULLIF(v_item->>'item_id', '')::UUID,
        v_item->>'name',
        COALESCE(v_item->>'category_name', 'Costumes'),
        COALESCE(v_item->>'size', 'M'),
        COALESCE((v_item->>'quantity')::INTEGER, 1),
        COALESCE((v_item->>'rental_price')::NUMERIC, 0)
      );
    END LOOP;
  END IF;

  -- Insert additional items
  IF payload->'additional_items' IS NOT NULL AND jsonb_array_length(payload->'additional_items') > 0 THEN
    FOR v_add_item IN SELECT * FROM jsonb_array_elements(payload->'additional_items')
    LOOP
      INSERT INTO additional_items (
        rental_id, name, quantity
      ) VALUES (
        v_rental_id,
        v_add_item->>'name',
        COALESCE((v_add_item->>'quantity')::INTEGER, 1)
      );
    END LOOP;
  END IF;

  RETURN v_rental_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.process_rental_checkout(JSONB) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.process_rental_checkout(JSONB) TO authenticated;
