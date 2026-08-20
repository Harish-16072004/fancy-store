export interface Category {
  id: string;
  name: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  categoryId: string;
  size: string;
  quantity: number; // total quantity in stock
  rentalPrice: number;
  photo?: string; // dataURI or placeholder
}

export interface AdditionalItemInput {
  name: string;
  quantity: number;
}

export interface RentalItem {
  itemId: string;
  name: string;
  categoryName: string;
  size: string;
  quantity: number;
  rentalPrice: number;
}

export interface Rental {
  id: string;
  bookingNumber: string; // e.g. "BK-1001"
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  items: RentalItem[];
  additionalItems: AdditionalItemInput[];
  dateGiven: string; // YYYY-MM-DD (Handover / Pickup date)
  expectedReturnDate: string; // YYYY-MM-DD
  actualReturnDate?: string; // YYYY-MM-DD
  status: 'pre-booked' | 'active' | 'returned'; // 'overdue' is computed dynamically
  isPreBooking?: boolean;
  preBookingPaid?: number; // amount paid upfront at the time of pre-booking
  rentalCharge: number;
  advanceAmount: number;
  advanceReturned: boolean;
  handoverPhotos: string[]; // dataURIs
  returnPhotos?: string[]; // dataURIs
  notes?: string;
  createdAt: string;
}
