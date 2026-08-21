CREATE OR REPLACE FUNCTION process_rental_checkout(
  payload JSONB
) RETURNS UUID AS $$
DECLARE
  v_rental_id UUID;
  v_item JSONB;
  v_add_item JSONB;
BEGIN
  -- 1. Insert into rentals
  INSERT INTO rentals (
    booking_number, customer_name, customer_phone, customer_address, 
    date_given, expected_return_date, actual_return_date, 
    status, is_pre_booking, pre_booking_paid, 
    rental_charge, advance_amount, advance_returned, notes
  ) VALUES (
    payload->>'booking_number',
    payload->>'customer_name',
    payload->>'customer_phone',
    payload->>'customer_address',
    payload->>'date_given',
    payload->>'expected_return_date',
    payload->>'actual_return_date',
    payload->>'status',
    (payload->>'is_pre_booking')::BOOLEAN,
    COALESCE((payload->>'pre_booking_paid')::INTEGER, 0),
    (payload->>'rental_charge')::INTEGER,
    (payload->>'advance_amount')::INTEGER,
    (payload->>'advance_returned')::BOOLEAN,
    payload->>'notes'
  ) RETURNING id INTO v_rental_id;

  -- 2. Insert rental items
  IF payload->'items' IS NOT NULL AND jsonb_array_length(payload->'items') > 0 THEN
    FOR v_item IN SELECT * FROM jsonb_array_elements(payload->'items')
    LOOP
      INSERT INTO rental_items (
        rental_id, item_id, name, category_name, size, quantity, rental_price
      ) VALUES (
        v_rental_id,
        CASE WHEN (v_item->>'item_id') IS NULL OR (v_item->>'item_id') = '' THEN NULL ELSE (v_item->>'item_id')::UUID END,
        v_item->>'name',
        v_item->>'category_name',
        v_item->>'size',
        (v_item->>'quantity')::INTEGER,
        (v_item->>'rental_price')::INTEGER
      );
    END LOOP;
  END IF;

  -- 3. Insert additional items
  IF payload->'additional_items' IS NOT NULL AND jsonb_array_length(payload->'additional_items') > 0 THEN
    FOR v_add_item IN SELECT * FROM jsonb_array_elements(payload->'additional_items')
    LOOP
      INSERT INTO additional_items (
        rental_id, name, quantity
      ) VALUES (
        v_rental_id,
        v_add_item->>'name',
        (v_add_item->>'quantity')::INTEGER
      );
    END LOOP;
  END IF;

  RETURN v_rental_id;
END;
$$ LANGUAGE plpgsql;
