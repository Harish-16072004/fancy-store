import { Rental } from '../types';

// ============================================
// Pure utility functions (no storage dependency)
// ============================================

/**
 * Compute the display status of a rental dynamically.
 * 'overdue' is never stored — it's calculated from today's date.
 */
export const getRentalComputedStatus = (rental: Rental): 'pre-booked' | 'active' | 'overdue' | 'returned' => {
  if (rental.status === 'returned') {
    return 'returned';
  }
  if (rental.status === 'pre-booked') {
    return 'pre-booked';
  }
  const today = new Date().toISOString().split('T')[0];
  if (rental.expectedReturnDate < today) {
    return 'overdue';
  }
  return 'active';
};

/**
 * Generate the next sequential booking number from an existing list.
 * e.g. if max is BK-1004, returns BK-1005.
 */
export const getNextBookingNumber = (rentals: Rental[]): string => {
  let highestNum = 1000;
  rentals.forEach((r) => {
    if (r.bookingNumber && r.bookingNumber.startsWith('BK-')) {
      const num = parseInt(r.bookingNumber.replace('BK-', ''), 10);
      if (!isNaN(num) && num > highestNum) highestNum = num;
    }
  });
  return `BK-${highestNum + 1}`;
};
