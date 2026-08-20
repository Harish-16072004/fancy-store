import { InventoryItem, Rental } from '../types';
import { getRentalComputedStatus } from './storage';

/**
 * Checks if two date ranges [start1, end1) and [start2, end2) overlap.
 * 
 * Rotation rule:
 * If Booking 1 ends on Aug 12 (returns Aug 12) and Booking 2 starts on Aug 12 (pickup Aug 12),
 * they DO NOT conflict because the dress is returned on Aug 12 for the next person.
 * 
 * Therefore:
 * [S1, E1) and [S2, E2) overlap if and only if S1 < E2 and S2 < E1.
 */
export function checkDateRangeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string
): boolean {
  if (!start1 || !end1 || !start2 || !end2) return false;
  
  // Ensure start <= end for both
  const s1 = start1 <= end1 ? start1 : end1;
  const e1 = start1 <= end1 ? end1 : start1;
  const s2 = start2 <= end2 ? start2 : end2;
  const e2 = start2 <= end2 ? end2 : start2;

  // Overlap condition for [s1, e1) and [s2, e2)
  return s1 < e2 && s2 < e1;
}

/**
 * Returns all active or pre-booked rentals that reserve a given item.
 */
export function getItemBookedRentals(
  itemId: string,
  rentals: Rental[],
  excludeRentalId?: string
): Array<{
  rental: Rental;
  quantity: number;
  startDate: string;
  endDate: string;
  status: string;
}> {
  const result: Array<{
    rental: Rental;
    quantity: number;
    startDate: string;
    endDate: string;
    status: string;
  }> = [];

  rentals.forEach((r) => {
    if (excludeRentalId && r.id === excludeRentalId) return;

    const status = getRentalComputedStatus(r);
    // If returned, the dress is back in inventory and doesn't block future bookings
    if (status === 'returned') return;

    // Find if this rental includes the target item
    const matchingItem = r.items?.find((i) => i.itemId === itemId);
    if (matchingItem && matchingItem.quantity > 0) {
      result.push({
        rental: r,
        quantity: matchingItem.quantity,
        startDate: r.dateGiven,
        endDate: r.expectedReturnDate,
        status,
      });
    }
  });

  // Sort chronologically by pickup/start date
  return result.sort((a, b) => a.startDate.localeCompare(b.startDate));
}

/**
 * Calculates how many units of an item are already booked during a specific date range [startDate, endDate].
 */
export function getItemBookedQtyForDateRange(
  itemId: string,
  startDate: string,
  endDate: string,
  rentals: Rental[],
  excludeRentalId?: string
): number {
  if (!startDate || !endDate) return 0;

  const relevantBookings = getItemBookedRentals(itemId, rentals, excludeRentalId);
  
  let bookedQty = 0;
  relevantBookings.forEach((b) => {
    if (checkDateRangeOverlap(startDate, endDate, b.startDate, b.endDate)) {
      bookedQty += b.quantity;
    }
  });

  return bookedQty;
}

/**
 * Calculates the available remaining stock for an item during a specific date range [startDate, endDate].
 */
export function getItemAvailableQtyForDateRange(
  item: InventoryItem,
  startDate: string,
  endDate: string,
  rentals: Rental[],
  excludeRentalId?: string
): number {
  const totalStock = Number(item.quantity) || 0;
  const bookedQty = getItemBookedQtyForDateRange(item.id, startDate, endDate, rentals, excludeRentalId);
  return Math.max(0, totalStock - bookedQty);
}
