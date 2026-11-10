import { supabase } from './supabase';
import { uploadPhoto, getPhotoUrl, getSignedPhotoUrl, getSignedPhotoUrls } from './storage-bucket';
import type { Category, InventoryItem, Rental, RentalItem, AdditionalItemInput } from '../types';

// ============================================
// Category Operations
// ============================================

export async function fetchCategories(): Promise<{ data: Category[] | null; error: any }> {
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) return { data: null, error };

  const categories: Category[] = (data || []).map(row => ({
    id: row.id,
    name: row.name,
  }));

  return { data: categories, error: null };
}

export async function createCategory(name: string): Promise<{ data: Category | null; error: any }> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name })
    .select()
    .single();

  if (error) return { data: null, error };
  return { data: { id: data.id, name: data.name }, error: null };
}

export async function updateCategoryDb(id: string, name: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('categories')
    .update({ name })
    .eq('id', id);
  return { error };
}

export async function deleteCategoryDb(id: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('categories')
    .delete()
    .eq('id', id);
  return { error };
}

// ============================================
// Inventory Operations
// ============================================

export async function fetchInventory(): Promise<{ data: InventoryItem[] | null; error: any }> {
  const { data, error } = await supabase
    .from('inventory_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) return { data: null, error };

  const photoPaths = (data || []).map((r: any) => r.photo_path).filter(Boolean);
  const signedMap = await getSignedPhotoUrls(photoPaths);

  const items: InventoryItem[] = (data || []).map(row => ({
    id: row.id,
    name: row.name,
    categoryId: row.category_id || '',
    size: row.size,
    quantity: row.quantity,
    rentalPrice: Number(row.rental_price),
    photo: row.photo_path ? (signedMap[row.photo_path] || getPhotoUrl(row.photo_path)) : undefined,
  }));

  return { data: items, error: null };
}

export async function createInventoryItemDb(
  itemData: Omit<InventoryItem, 'id'>
): Promise<{ data: InventoryItem | null; error: any }> {
  let photoPath: string | null = null;

  // Upload photo if it's a base64 data URI
  if (itemData.photo && itemData.photo.startsWith('data:')) {
    photoPath = await uploadPhoto(itemData.photo, 'inventory');
  }

  const { data, error } = await supabase
    .from('inventory_items')
    .insert({
      name: itemData.name,
      category_id: itemData.categoryId || null,
      size: itemData.size,
      quantity: itemData.quantity,
      rental_price: itemData.rentalPrice,
      photo_path: photoPath,
    })
    .select()
    .single();

  if (error) return { data: null, error };

  const signedPhoto = data.photo_path ? (await getSignedPhotoUrl(data.photo_path) || getPhotoUrl(data.photo_path)) : undefined;

  return {
    data: {
      id: data.id,
      name: data.name,
      categoryId: data.category_id || '',
      size: data.size,
      quantity: data.quantity,
      rentalPrice: Number(data.rental_price),
      photo: signedPhoto,
    },
    error: null,
  };
}

export async function updateInventoryItemDb(
  id: string,
  itemData: Omit<InventoryItem, 'id'>
): Promise<{ data: InventoryItem | null; error: any }> {
  const updatePayload: Record<string, any> = {
    name: itemData.name,
    category_id: itemData.categoryId || null,
    size: itemData.size,
    quantity: itemData.quantity,
    rental_price: itemData.rentalPrice,
  };

  // Handle photo changes
  if (itemData.photo && itemData.photo.startsWith('data:')) {
    // New photo uploaded — upload to storage
    const path = await uploadPhoto(itemData.photo, 'inventory');
    if (path) updatePayload.photo_path = path;
  } else if (!itemData.photo) {
    // Photo removed
    updatePayload.photo_path = null;
  }
  // If itemData.photo is a URL (existing photo), don't touch photo_path

  const { data, error } = await supabase
    .from('inventory_items')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();

  if (error) return { data: null, error };

  const signedPhoto = data.photo_path ? (await getSignedPhotoUrl(data.photo_path) || getPhotoUrl(data.photo_path)) : undefined;

  return {
    data: {
      id: data.id,
      name: data.name,
      categoryId: data.category_id || '',
      size: data.size,
      quantity: data.quantity,
      rentalPrice: Number(data.rental_price),
      photo: signedPhoto,
    },
    error: null,
  };
}

export async function deleteInventoryItemDb(id: string): Promise<{ error: any }> {
  const { error } = await supabase
    .from('inventory_items')
    .delete()
    .eq('id', id);
  return { error };
}

// ============================================
// Rental Operations
// ============================================

/** Map a raw Supabase row (with nested joins) back to the app's Rental type */
function mapDbRentalToRental(dbRental: any, signedMap: Record<string, string> = {}): Rental {
  const handoverPhotos = (dbRental.rental_photos || [])
    .filter((p: any) => p.photo_type === 'handover')
    .map((p: any) => signedMap[p.photo_path] || getPhotoUrl(p.photo_path));

  const returnPhotos = (dbRental.rental_photos || [])
    .filter((p: any) => p.photo_type === 'return')
    .map((p: any) => signedMap[p.photo_path] || getPhotoUrl(p.photo_path));

  return {
    id: dbRental.id,
    bookingNumber: dbRental.booking_number,
    customerName: dbRental.customer_name,
    customerPhone: dbRental.customer_phone,
    customerAddress: dbRental.customer_address || undefined,
    items: (dbRental.rental_items || []).map((ri: any): RentalItem => ({
      itemId: ri.item_id || '',
      name: ri.name,
      categoryName: ri.category_name,
      size: ri.size,
      quantity: ri.quantity,
      rentalPrice: Number(ri.rental_price),
    })),
    additionalItems: (dbRental.additional_items || []).map((ai: any): AdditionalItemInput => ({
      name: ai.name,
      quantity: ai.quantity,
    })),
    dateGiven: dbRental.date_given,
    expectedReturnDate: dbRental.expected_return_date,
    actualReturnDate: dbRental.actual_return_date || undefined,
    status: dbRental.status,
    isPreBooking: dbRental.is_pre_booking || false,
    preBookingPaid: Number(dbRental.pre_booking_paid) || 0,
    rentalCharge: Number(dbRental.rental_charge),
    advanceAmount: Number(dbRental.advance_amount),
    advanceReturned: dbRental.advance_returned || false,
    handoverPhotos,
    returnPhotos: returnPhotos.length > 0 ? returnPhotos : undefined,
    notes: dbRental.notes || undefined,
    createdAt: dbRental.created_at,
  };
}

export async function fetchRentals(page: number = 1, pageSize: number = 50): Promise<{ data: Rental[] | null; error: any }> {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error } = await supabase
    .from('rentals')
    .select(`
      *,
      rental_items(*),
      additional_items(*),
      rental_photos(*)
    `)
    .order('created_at', { ascending: false })
    .range(from, to);

  if (error) return { data: null, error };

  const allPhotoPaths: string[] = [];
  (data || []).forEach((r: any) => {
    (r.rental_photos || []).forEach((p: any) => {
      if (p.photo_path) allPhotoPaths.push(p.photo_path);
    });
  });

  const signedMap = await getSignedPhotoUrls(allPhotoPaths);
  return { data: (data || []).map(r => mapDbRentalToRental(r, signedMap)), error: null };
}

export async function fetchRentalById(id: string): Promise<{ data: Rental | null; error: any }> {
  const { data, error } = await supabase
    .from('rentals')
    .select(`
      *,
      rental_items(*),
      additional_items(*),
      rental_photos(*)
    `)
    .eq('id', id)
    .single();

  if (error) return { data: null, error };

  const allPhotoPaths: string[] = (data.rental_photos || []).map((p: any) => p.photo_path).filter(Boolean);
  const signedMap = await getSignedPhotoUrls(allPhotoPaths);
  return { data: mapDbRentalToRental(data, signedMap), error: null };
}

export async function createRentalDb(
  rentalData: Omit<Rental, 'id' | 'createdAt'>
): Promise<{ data: Rental | null; error: any }> {
  // 1. Prepare payload for the RPC
  const payload = {
    booking_number: rentalData.bookingNumber,
    customer_name: rentalData.customerName,
    customer_phone: rentalData.customerPhone,
    customer_address: rentalData.customerAddress || null,
    date_given: rentalData.dateGiven,
    expected_return_date: rentalData.expectedReturnDate,
    actual_return_date: rentalData.actualReturnDate || null,
    status: rentalData.status,
    is_pre_booking: rentalData.isPreBooking || false,
    pre_booking_paid: rentalData.preBookingPaid || 0,
    rental_charge: rentalData.rentalCharge,
    advance_amount: rentalData.advanceAmount,
    advance_returned: rentalData.advanceReturned || false,
    notes: rentalData.notes || null,
    items: rentalData.items ? rentalData.items.map(item => ({
      item_id: item.itemId || null,
      name: item.name,
      category_name: item.categoryName,
      size: item.size,
      quantity: item.quantity,
      rental_price: item.rentalPrice,
    })) : [],
    additional_items: rentalData.additionalItems ? rentalData.additionalItems.map(ai => ({
      name: ai.name,
      quantity: ai.quantity,
    })) : [],
  };

  // 2. Execute the atomic transaction via RPC
  const { data: rentalId, error: rpcError } = await supabase.rpc('process_rental_checkout', { payload });

  if (rpcError || !rentalId) {
    console.error('process_rental_checkout RPC error:', rpcError);
    return { data: null, error: rpcError };
  }

  // 3. Upload handover photos to storage & insert photo records
  if (rentalData.handoverPhotos && rentalData.handoverPhotos.length > 0) {
    for (const photo of rentalData.handoverPhotos) {
      if (photo.startsWith('data:')) {
        const path = await uploadPhoto(photo, `rentals/${rentalId}/handover`);
        if (path) {
          await supabase.from('rental_photos').insert({
            rental_id: rentalId,
            photo_path: path,
            photo_type: 'handover',
          });
        }
      }
    }
  }

  // 4. Return the complete rental with all nested data
  return fetchRentalById(rentalId);
}

export async function updateRentalDb(
  id: string,
  updates: Partial<Rental>
): Promise<{ data: Rental | null; error: any }> {
  // Handle return photo uploads (base64 → storage)
  if (updates.returnPhotos && updates.returnPhotos.length > 0) {
    for (const photo of updates.returnPhotos) {
      if (photo.startsWith('data:')) {
        const path = await uploadPhoto(photo, `rentals/${id}/return`);
        if (path) {
          await supabase.from('rental_photos').insert({
            rental_id: id,
            photo_path: path,
            photo_type: 'return',
          });
        }
      }
    }
  }

  // Map camelCase fields to snake_case DB columns
  const dbUpdates: Record<string, any> = {};
  if (updates.status !== undefined) dbUpdates.status = updates.status;
  if (updates.actualReturnDate !== undefined) dbUpdates.actual_return_date = updates.actualReturnDate;
  if (updates.advanceReturned !== undefined) dbUpdates.advance_returned = updates.advanceReturned;
  if (updates.customerName !== undefined) dbUpdates.customer_name = updates.customerName;
  if (updates.customerPhone !== undefined) dbUpdates.customer_phone = updates.customerPhone;
  if (updates.customerAddress !== undefined) dbUpdates.customer_address = updates.customerAddress;
  if (updates.dateGiven !== undefined) dbUpdates.date_given = updates.dateGiven;
  if (updates.expectedReturnDate !== undefined) dbUpdates.expected_return_date = updates.expectedReturnDate;
  if (updates.rentalCharge !== undefined) dbUpdates.rental_charge = updates.rentalCharge;
  if (updates.advanceAmount !== undefined) dbUpdates.advance_amount = updates.advanceAmount;
  if (updates.preBookingPaid !== undefined) dbUpdates.pre_booking_paid = updates.preBookingPaid;
  if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
  if (updates.isPreBooking !== undefined) dbUpdates.is_pre_booking = updates.isPreBooking;
  if (updates.bookingNumber !== undefined) dbUpdates.booking_number = updates.bookingNumber;

  if (Object.keys(dbUpdates).length > 0) {
    const { error } = await supabase
      .from('rentals')
      .update(dbUpdates)
      .eq('id', id);
    if (error) return { data: null, error };
  }

  // Return the refreshed rental
  return fetchRentalById(id);
}

export async function deleteRentalDb(id: string): Promise<{ error: any }> {
  // rental_items, additional_items, rental_photos cascade-delete via FK
  const { error } = await supabase
    .from('rentals')
    .delete()
    .eq('id', id);
  return { error };
}

// ============================================
// Booking Number
// ============================================

export async function getNextBookingNumberDb(): Promise<string> {
  const { data } = await supabase
    .from('rentals')
    .select('booking_number')
    .order('created_at', { ascending: false })
    .limit(200);

  let highestNum = 1000;
  (data || []).forEach((r: any) => {
    if (r.booking_number && r.booking_number.startsWith('BK-')) {
      const num = parseInt(r.booking_number.replace('BK-', ''), 10);
      if (!isNaN(num) && num > highestNum) highestNum = num;
    }
  });

  return `BK-${highestNum + 1}`;
}

// ============================================
// Backup & Restore
// ============================================

export async function exportBackupJSON(): Promise<string> {
  const [cats, inv, rentals, rentalItems, addItems, photos] = await Promise.all([
    supabase.from('categories').select('*').order('created_at'),
    supabase.from('inventory_items').select('*').order('created_at'),
    supabase.from('rentals').select('*').order('created_at'),
    supabase.from('rental_items').select('*'),
    supabase.from('additional_items').select('*'),
    supabase.from('rental_photos').select('*'),
  ]);

  return JSON.stringify({
    categories: cats.data || [],
    inventory_items: inv.data || [],
    rentals: rentals.data || [],
    rental_items: rentalItems.data || [],
    additional_items: addItems.data || [],
    rental_photos: photos.data || [],
    version: '2.0',
    exportedAt: new Date().toISOString(),
  }, null, 2);
}

export async function importBackupJSON(jsonString: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(jsonString);
    if (
      !parsed ||
      !Array.isArray(parsed.categories) ||
      !Array.isArray(parsed.inventory_items) ||
      !Array.isArray(parsed.rentals)
    ) {
      return false;
    }

    const { data, error } = await supabase.rpc('restore_backup_json', { backup: parsed });
    if (error || !data) {
      console.error('Atomic backup restore failed:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('Failed to import backup:', e);
    return false;
  }
}
