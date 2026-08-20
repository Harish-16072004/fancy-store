import { Category, InventoryItem, Rental } from '../types';

// Default Seed Categories
const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-animals', name: 'Animals' },
  { id: 'cat-vegetables', name: 'Vegetables' },
  { id: 'cat-freedom-fighters', name: 'Freedom Fighters' },
  { id: 'cat-fairy-tales', name: 'Fairy Tales & Royals' },
];

// Default Seed Inventory Items
const DEFAULT_INVENTORY: InventoryItem[] = [
  {
    id: 'item-lion',
    name: 'Lion Costume (Full Jumpsuit)',
    categoryId: 'cat-animals',
    size: 'M',
    quantity: 3,
    rentalPrice: 450,
  },
  {
    id: 'item-tiger',
    name: 'Tiger Deluxe Costume with Mask',
    categoryId: 'cat-animals',
    size: 'L',
    quantity: 2,
    rentalPrice: 500,
  },
  {
    id: 'item-rabbit',
    name: 'Fluffy Rabbit Costume with Ears',
    categoryId: 'cat-animals',
    size: 'S',
    quantity: 4,
    rentalPrice: 350,
  },
  {
    id: 'item-tomato',
    name: 'Bright Red Tomato Costume',
    categoryId: 'cat-vegetables',
    size: 'S',
    quantity: 2,
    rentalPrice: 300,
  },
  {
    id: 'item-carrot',
    name: 'Long Orange Carrot Costume',
    categoryId: 'cat-vegetables',
    size: 'M',
    quantity: 3,
    rentalPrice: 300,
  },
  {
    id: 'item-gandhi',
    name: 'Mahatma Gandhi Outfit (Dhoti + Shawl + Specs)',
    categoryId: 'cat-freedom-fighters',
    size: 'M',
    quantity: 5,
    rentalPrice: 400,
  },
  {
    id: 'item-bose',
    name: 'Subhas Chandra Bose INA Uniform (Cap + Jacket + Pants)',
    categoryId: 'cat-freedom-fighters',
    size: 'L',
    quantity: 3,
    rentalPrice: 500,
  },
  {
    id: 'item-laxmibai',
    name: 'Rani Lakshmibai Warrior Dress (Saree + Shield + Sword)',
    categoryId: 'cat-freedom-fighters',
    size: 'M',
    quantity: 2,
    rentalPrice: 600,
  },
  {
    id: 'item-king',
    name: 'Royal Prince / King Costume with Crown',
    categoryId: 'cat-fairy-tales',
    size: 'L',
    quantity: 2,
    rentalPrice: 650,
  }
];

// Helper to get formatted date string relative to today
function getDateString(daysOffset: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  return date.toISOString().split('T')[0];
}

// Default Seed Rentals
const DEFAULT_RENTALS: Rental[] = [
  {
    id: 'rent-1',
    bookingNumber: 'BK-1001',
    customerName: 'Aarav Sharma',
    customerPhone: '9876543210',
    customerAddress: '42 MG Road, Indiranagar, Bengaluru',
    items: [
      {
        itemId: 'item-lion',
        name: 'Lion Costume (Full Jumpsuit)',
        categoryName: 'Animals',
        size: 'M',
        quantity: 1,
        rentalPrice: 450,
      }
    ],
    additionalItems: [
      { name: '1 Extra Animal Face Paint Palette', quantity: 1 }
    ],
    dateGiven: getDateString(-5),
    expectedReturnDate: getDateString(-2), // Overdue!
    status: 'active',
    rentalCharge: 450,
    advanceAmount: 450,
    advanceReturned: false,
    handoverPhotos: [],
    notes: 'Needs to be returned in dry-cleaned condition. Customer was very polite.',
    createdAt: new Date(getDateString(-5)).toISOString(),
  },
  {
    id: 'rent-2',
    bookingNumber: 'BK-1002',
    customerName: 'Priya Patel',
    customerPhone: '9123456789',
    customerAddress: '15 Civil Lines, Sector 4, Ahmedabad',
    items: [
      {
        itemId: 'item-tomato',
        name: 'Bright Red Tomato Costume',
        categoryName: 'Vegetables',
        size: 'S',
        quantity: 1,
        rentalPrice: 300,
      },
      {
        itemId: 'item-carrot',
        name: 'Long Orange Carrot Costume',
        categoryName: 'Vegetables',
        size: 'M',
        quantity: 1,
        rentalPrice: 300,
      }
    ],
    additionalItems: [
      { name: 'Green head band', quantity: 2 }
    ],
    dateGiven: getDateString(-1),
    expectedReturnDate: getDateString(3), // Active, within limit
    status: 'active',
    rentalCharge: 600,
    advanceAmount: 600,
    advanceReturned: false,
    handoverPhotos: [],
    notes: 'School play performance. Double check headbands during return.',
    createdAt: new Date(getDateString(-1)).toISOString(),
  },
  {
    id: 'rent-3',
    bookingNumber: 'BK-1003',
    customerName: 'Vikram Singh',
    customerPhone: '9888777666',
    customerAddress: '88 Model Town, Jaipur, Rajasthan',
    items: [
      {
        itemId: 'item-gandhi',
        name: 'Mahatma Gandhi Outfit (Dhoti + Shawl + Specs)',
        categoryName: 'Freedom Fighters',
        size: 'M',
        quantity: 1,
        rentalPrice: 400,
      }
    ],
    additionalItems: [
      { name: 'Fake walking stick', quantity: 1 }
    ],
    dateGiven: getDateString(-8),
    expectedReturnDate: getDateString(-5),
    actualReturnDate: getDateString(-5),
    status: 'returned',
    rentalCharge: 400,
    advanceAmount: 400,
    advanceReturned: true,
    handoverPhotos: [],
    returnPhotos: [],
    notes: 'Returned on time and specs were in perfect shape. Refunded full deposit.',
    createdAt: new Date(getDateString(-8)).toISOString(),
  },
  {
    id: 'rent-4',
    bookingNumber: 'BK-1004',
    customerName: 'Meera Nambiar',
    customerPhone: '9988001122',
    customerAddress: '72 Anna Salai, Chennai, Tamil Nadu',
    items: [
      {
        itemId: 'item-laxmibai',
        name: 'Rani Lakshmibai Warrior Dress (Saree + Shield + Sword)',
        categoryName: 'Freedom Fighters',
        size: 'M',
        quantity: 1,
        rentalPrice: 600,
      }
    ],
    additionalItems: [],
    dateGiven: getDateString(5), // Scheduled handover date in 5 days
    expectedReturnDate: getDateString(8),
    status: 'pre-booked',
    isPreBooking: true,
    preBookingPaid: 200, // Default pre-booking token amount (₹200)
    rentalCharge: 600,
    advanceAmount: 400, // Refundable deposit = rent charge (600) - 200 = ₹400
    advanceReturned: false,
    handoverPhotos: [],
    notes: 'Pre-booked for Independence Day school competition. Handover scheduled on dateGiven.',
    createdAt: new Date().toISOString(),
  }
];

// LocalStorage Keys
const KEYS = {
  CATEGORIES: 'fancy_dress_categories',
  INVENTORY: 'fancy_dress_inventory',
  RENTALS: 'fancy_dress_rentals'
};

export const loadCategories = (): Category[] => {
  const data = localStorage.getItem(KEYS.CATEGORIES);
  if (!data) {
    localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(DEFAULT_CATEGORIES));
    return DEFAULT_CATEGORIES;
  }
  return JSON.parse(data);
};

export const saveCategories = (categories: Category[]) => {
  localStorage.setItem(KEYS.CATEGORIES, JSON.stringify(categories));
};

export const loadInventory = (): InventoryItem[] => {
  const data = localStorage.getItem(KEYS.INVENTORY);
  if (!data) {
    localStorage.setItem(KEYS.INVENTORY, JSON.stringify(DEFAULT_INVENTORY));
    return DEFAULT_INVENTORY;
  }
  return JSON.parse(data);
};

export const saveInventory = (items: InventoryItem[]) => {
  localStorage.setItem(KEYS.INVENTORY, JSON.stringify(items));
};

export const loadRentals = (): Rental[] => {
  const data = localStorage.getItem(KEYS.RENTALS);
  let rentals: Rental[] = [];
  if (!data) {
    rentals = DEFAULT_RENTALS;
  } else {
    try {
      rentals = JSON.parse(data);
    } catch {
      rentals = DEFAULT_RENTALS;
    }
  }

  // Retrofit migration: Ensure all rentals have a valid bookingNumber
  let highestNum = 1000;
  rentals.forEach((r) => {
    if (r.bookingNumber && r.bookingNumber.startsWith('BK-')) {
      const num = parseInt(r.bookingNumber.replace('BK-', ''), 10);
      if (!isNaN(num) && num > highestNum) highestNum = num;
    }
  });

  let needsSave = !data;
  const migrated = rentals.map((r) => {
    if (!r.bookingNumber) {
      highestNum += 1;
      needsSave = true;
      return { ...r, bookingNumber: `BK-${highestNum}` };
    }
    return r;
  });

  if (needsSave) {
    saveRentals(migrated);
  }

  return migrated;
};

export const saveRentals = (rentals: Rental[]) => {
  localStorage.setItem(KEYS.RENTALS, JSON.stringify(rentals));
};

// Generate next sequential booking number (e.g. BK-1005)
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

// Compute status of a rental (including 'pre-booked', 'active', 'overdue', 'returned')
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

// Export full backup as JSON string
export const exportFullBackupJSON = (): string => {
  const backup = {
    categories: loadCategories(),
    inventory: loadInventory(),
    rentals: loadRentals(),
    version: '1.0',
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(backup, null, 2);
};

// Import full backup from JSON
export const importFullBackupJSON = (jsonString: string): boolean => {
  try {
    const parsed = JSON.parse(jsonString);
    if (parsed.categories && parsed.inventory && parsed.rentals) {
      saveCategories(parsed.categories);
      saveInventory(parsed.inventory);
      saveRentals(parsed.rentals);
      return true;
    }
    return false;
  } catch (e) {
    console.error('Failed to parse backup JSON', e);
    return false;
  }
};
