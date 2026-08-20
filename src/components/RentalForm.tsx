import React, { useState, useEffect, useMemo } from 'react';
import { 
  Save, 
  Trash2, 
  Plus, 
  MinusCircle, 
  PlusCircle, 
  Notebook,
  Calendar,
  Clock,
  BookmarkCheck,
  Hash,
  CalendarDays,
  ArrowRight,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { Category, InventoryItem, Rental, RentalItem } from '../types';
import { getRentalComputedStatus, getNextBookingNumber } from '../utils/storage';
import { getItemAvailableQtyForDateRange, getItemBookedRentals } from '../utils/availability';
import CameraCapture from './CameraCapture';
import CostumeScheduleModal from './CostumeScheduleModal';

interface RentalFormProps {
  categories: Category[];
  inventory: InventoryItem[];
  existingRentals?: Rental[];
  activeRentals?: Rental[];
  onSaveRental?: (rental: Rental) => void;
  onSave?: (rentalData: any) => void;
  onCancel?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function RentalForm({
  categories,
  inventory,
  existingRentals,
  activeRentals,
  onSaveRental,
  onSave,
  onCancel,
  onShowToast
}: RentalFormProps) {
  const rentalsList = existingRentals || activeRentals || [];
  const handleSave = onSaveRental || onSave || (() => {});

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Booking Mode: Direct Handover vs Pre-Booking
  const [isPreBooking, setIsPreBooking] = useState(false);
  const [preBookingPaid, setPreBookingPaid] = useState<number>(200);

  // Auto-generated sequential booking number
  const nextBookingNum = getNextBookingNumber(rentalsList);

  // Selected Stock Items Map (itemId -> quantity)
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({});

  // Additional freeform accessories (untracked custom props)
  const [additionalItems, setAdditionalItems] = useState<{ name: string; quantity: number }[]>([]);

  // Dates (Rotation Period)
  const [dateGiven, setDateGiven] = useState(new Date().toISOString().split('T')[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState(() => {
    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 2);
    return nextWeek.toISOString().split('T')[0];
  });

  // Schedule modal state for inspecting any costume's reservations
  const [inspectScheduleItem, setInspectScheduleItem] = useState<InventoryItem | null>(null);

  // Financial Charges
  const [rentalCharge, setRentalCharge] = useState<number>(0);
  const [advanceAmount, setAdvanceAmount] = useState<number>(0);
  const [isAdvanceManuallyEdited, setIsAdvanceManuallyEdited] = useState(false);

  // Optional Notes & Photos
  const [notes, setNotes] = useState('');
  const [issuePhotos, setIssuePhotos] = useState<string[]>([]);

  // Search and Category Filter for Inventory Selector
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Calculate rental duration in days
  const rentalDurationDays = useMemo(() => {
    if (!dateGiven || !expectedReturnDate) return 1;
    const d1 = new Date(dateGiven);
    const d2 = new Date(expectedReturnDate);
    const diffTime = d2.getTime() - d1.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  }, [dateGiven, expectedReturnDate]);

  // Dynamic stock availability calculation for a given item in the selected date window [dateGiven, expectedReturnDate]
  const getRemainingStock = (item: InventoryItem): number => {
    return getItemAvailableQtyForDateRange(item, dateGiven, expectedReturnDate, rentalsList);
  };

  // Recalculate charges whenever selected items or pre-booking mode change
  useEffect(() => {
    let autoCharge = 0;

    Object.entries(selectedItems).forEach(([itemId, qty]) => {
      const found = inventory.find(i => i.id === itemId);
      const numQty = Number(qty) || 0;
      if (found && numQty > 0) {
        autoCharge += (Number(found.rentalPrice) || 0) * numQty;
      }
    });

    setRentalCharge(autoCharge);

    if (!isAdvanceManuallyEdited) {
      // For Advance Pre-Booking: refundable deposit is automatically (rent charge - 200)
      setAdvanceAmount(isPreBooking ? Math.max(0, autoCharge - 200) : autoCharge);
    }
  }, [selectedItems, inventory, isAdvanceManuallyEdited, isPreBooking]);

  // Handlers for selected items
  const handleAddCostume = (itemId: string) => {
    const item = inventory.find(i => i.id === itemId);
    if (!item) return;

    const remaining = getRemainingStock(item);
    const currentSelected = selectedItems[itemId] || 0;

    if (currentSelected < remaining) {
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: currentSelected + 1
      }));
    } else {
      if (onShowToast) {
        onShowToast(
          remaining === 0
            ? `"${item.name}" is already reserved between ${dateGiven} and ${expectedReturnDate}. Click 'Schedule' to view rotation slots!`
            : `Only ${remaining} unit(s) of "${item.name}" available for ${dateGiven} to ${expectedReturnDate}!`,
          'error'
        );
      }
    }
  };

  const handleDecrementCostume = (itemId: string) => {
    const currentSelected = selectedItems[itemId] || 0;
    if (currentSelected <= 1) {
      const newMap = { ...selectedItems };
      delete newMap[itemId];
      setSelectedItems(newMap);
    } else {
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: currentSelected - 1
      }));
    }
  };

  // Additional accessory items handlers
  const addAdditionalItemField = () => {
    setAdditionalItems(prev => [...prev, { name: '', quantity: 1 }]);
  };

  const updateAdditionalItem = (index: number, field: 'name' | 'quantity', val: any) => {
    const updated = [...additionalItems];
    updated[index] = { ...updated[index], [field]: val };
    setAdditionalItems(updated);
  };

  const removeAdditionalItemField = (index: number) => {
    setAdditionalItems(prev => prev.filter((_, i) => i !== index));
  };

  // Check if any selected item exceeds availability under currently chosen dates
  const conflictingItems = useMemo(() => {
    const conflicts: { item: InventoryItem; selected: number; available: number }[] = [];
    Object.entries(selectedItems).forEach(([itemId, qty]) => {
      const numQty = Number(qty) || 0;
      if (numQty > 0) {
        const item = inventory.find(i => i.id === itemId);
        if (item) {
          const avail = getItemAvailableQtyForDateRange(item, dateGiven, expectedReturnDate, rentalsList);
          if (numQty > avail) {
            conflicts.push({ item, selected: numQty, available: avail });
          }
        }
      }
    });
    return conflicts;
  }, [selectedItems, inventory, dateGiven, expectedReturnDate, rentalsList]);

  // Form Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerName.trim() || !customerPhone.trim()) {
      if (onShowToast) onShowToast('Please provide customer name and phone number.', 'error');
      return;
    }

    if (!dateGiven || !expectedReturnDate) {
      if (onShowToast) onShowToast('Please select both Pickup Date and Return Date.', 'error');
      return;
    }

    if (expectedReturnDate < dateGiven) {
      if (onShowToast) onShowToast('Expected Return Date cannot be earlier than Pickup Date.', 'error');
      return;
    }

    // Verify stock availability for selected dates
    if (conflictingItems.length > 0) {
      const first = conflictingItems[0];
      if (onShowToast) {
        onShowToast(
          `Stock conflict: "${first.item.name}" has only ${first.available} unit(s) available for ${dateGiven} to ${expectedReturnDate}. Please adjust dates or selection.`,
          'error'
        );
      }
      return;
    }

    const compiledItems: RentalItem[] = [];

    // Compile inventory items
    Object.entries(selectedItems).forEach(([itemId, qty]) => {
      const selectedQty = Number(qty) || 0;
      if (selectedQty > 0) {
        const inv = inventory.find(i => i.id === itemId);
        if (inv) {
          const cat = categories.find(c => c.id === inv.categoryId);
          compiledItems.push({
            itemId: inv.id,
            name: inv.name,
            categoryName: cat ? cat.name : 'Costumes',
            size: inv.size || 'M',
            quantity: selectedQty,
            rentalPrice: Number(inv.rentalPrice) || 0
          });
        }
      }
    });

    const validAdditions = additionalItems
      .filter(ai => ai.name.trim() && Number(ai.quantity) > 0)
      .map(ai => ({ name: ai.name.trim(), quantity: Number(ai.quantity) }));

    if (compiledItems.length === 0 && validAdditions.length === 0) {
      if (onShowToast) onShowToast('Please select at least one costume or accessory.', 'error');
      return;
    }

    const newRental: Rental = {
      id: `RET_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      bookingNumber: getNextBookingNumber(rentalsList),
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      customerAddress: customerAddress.trim(),
      items: compiledItems,
      additionalItems: validAdditions,
      dateGiven,
      expectedReturnDate,
      status: isPreBooking ? 'pre-booked' : 'active',
      isPreBooking,
      preBookingPaid: isPreBooking ? Number(preBookingPaid) || 0 : 0,
      rentalCharge: Number(rentalCharge) || 0,
      advanceAmount: Number(advanceAmount) || 0,
      advanceReturned: false,
      handoverPhotos: issuePhotos,
      notes: notes.trim(),
      createdAt: new Date().toISOString()
    };

    handleSave(newRental);
  };

  const totalUpfront = rentalCharge + advanceAmount;

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fadeIn pb-12">
      
      {/* Schedule / Timeline Inspection Modal */}
      {inspectScheduleItem && (
        <CostumeScheduleModal
          item={inspectScheduleItem}
          rentals={rentalsList}
          targetStartDate={dateGiven}
          targetEndDate={expectedReturnDate}
          onClose={() => setInspectScheduleItem(null)}
        />
      )}

      {/* Header Bar */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white p-6 rounded-none shadow-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xxs font-mono uppercase tracking-widest text-sky-400 font-extrabold">
              Counter Terminal • Slip Entry
            </span>
            <span className="bg-amber-400 text-slate-950 font-mono text-xxs font-extrabold px-2 py-0.5 rounded-none flex items-center gap-1 shadow-xs">
              <Hash className="w-3 h-3" /> Booking #{nextBookingNum}
            </span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">Issue New Rental Slip</h2>
        </div>
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-none transition-colors cursor-pointer"
          >
            Cancel Entry
          </button>
        )}
      </div>

      {/* 00. Booking Mode & Rotation Date Range Configuration */}
      <div className="bg-white border border-slate-200 p-5 rounded-none shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
          <div>
            <span className="text-xs font-extrabold text-slate-800 block uppercase tracking-wider font-mono">
              00. Booking Mode &amp; Rotation Period
            </span>
            <p className="text-xxs text-slate-500">
              Select order type and rotation dates. Stock availability automatically updates as per return dates of other orders.
            </p>
          </div>

          <div className="flex bg-slate-100 p-1 border border-slate-200 rounded-none shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsPreBooking(false);
                setPreBookingPaid(0);
                if (!isAdvanceManuallyEdited) {
                  setAdvanceAmount(rentalCharge);
                }
              }}
              className={`px-4 py-2 text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                !isPreBooking
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Direct Handover (Today)
            </button>

            <button
              type="button"
              onClick={() => {
                setIsPreBooking(true);
                setPreBookingPaid(200);
                if (!isAdvanceManuallyEdited) {
                  setAdvanceAmount(Math.max(0, rentalCharge - 200));
                }
              }}
              className={`px-4 py-2 text-xs font-bold font-mono transition-all cursor-pointer flex items-center gap-1.5 ${
                isPreBooking
                  ? 'bg-amber-500 text-slate-950 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookmarkCheck className="w-3.5 h-3.5" />
              Advance Pre-Booking
            </button>
          </div>
        </div>

        {/* Date Range Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center bg-slate-50 p-4 border border-slate-200">
          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-blue-700" />
              {isPreBooking ? 'Scheduled Pickup Date *' : 'Handover / Issue Date *'}
            </label>
            <input
              type="date"
              required
              value={dateGiven}
              onChange={(e) => setDateGiven(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm font-bold font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>

          <div className="md:col-span-2 flex flex-col items-center justify-center text-center py-1">
            <span className="text-[10px] uppercase font-mono font-extrabold text-slate-400">Duration</span>
            <div className="text-xs font-black font-mono text-blue-800 bg-blue-100 px-2 py-0.5 mt-0.5 flex items-center gap-1">
              <ArrowRight className="w-3 h-3 text-blue-600" />
              {rentalDurationDays} Day{rentalDurationDays !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="md:col-span-5">
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-700" />
              Scheduled Return Date *
            </label>
            <input
              type="date"
              required
              value={expectedReturnDate}
              min={dateGiven}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-none text-sm font-bold font-mono bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Live Rotation availability indicator banner */}
        <div className="bg-blue-50/60 border border-blue-100 p-2.5 flex items-center justify-between text-xxs font-mono text-slate-700">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>
              <strong>Rotation Engine Active:</strong> Showing dresses available from{' '}
              <strong className="text-blue-900">{dateGiven}</strong> to{' '}
              <strong className="text-blue-900">{expectedReturnDate}</strong>.
            </span>
          </div>
          <span className="text-slate-500 italic hidden sm:inline">
            Returned on date X is instantly available for next customer picking up on date X.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Customer and Costume Selectors (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* 1. Customer Information Ticket Card */}
          <div className="bg-white border border-slate-200 p-5 rounded-none shadow-xs relative">
            <div className="absolute top-0 left-6 -translate-y-1/2 bg-slate-900 text-white font-bold px-2.5 py-0.5 rounded-none text-xxs uppercase tracking-wider font-mono">
              01. Customer File
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  id="rent-customer-name"
                  required
                  placeholder="Enter Customer Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-slate-50/50"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Phone Number *</label>
                <input
                  type="tel"
                  id="rent-customer-phone"
                  required
                  placeholder="Enter Phone/Mobile"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-slate-50/50"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-700 mb-1">Customer Address / Location</label>
                <input
                  type="text"
                  id="rent-customer-address"
                  placeholder="Enter House No., Street, Area, City"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-slate-50/50"
                />
              </div>
            </div>
          </div>

          {/* 2. Costume Inventory Select Ticket Card */}
          <div className="bg-white border border-slate-200 p-5 rounded-none shadow-xs relative space-y-4">
            <div className="absolute top-0 left-6 -translate-y-1/2 bg-slate-900 text-white font-bold px-2.5 py-0.5 rounded-none text-xxs uppercase tracking-wider font-mono">
              02. Outfit Selector &amp; Rotation Stock
            </div>

            {/* Date Conflict Warning Banner if dates changed after selecting */}
            {conflictingItems.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs rounded-none flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <strong className="font-bold">Stock Conflict for Chosen Dates:</strong>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-xxs">
                    {conflictingItems.map(({ item, selected, available }) => (
                      <li key={item.id}>
                        <strong>{item.name}</strong>: Selected {selected} unit(s), but only {available} free between {dateGiven} and {expectedReturnDate}.
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2 mt-2 pt-1">
              <input
                type="text"
                placeholder="Search outfits by name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-slate-50/50"
              />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 bg-slate-50/50 font-bold"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Inventory Items Pick List */}
            <div className="max-h-80 overflow-y-auto space-y-2 pr-1 border border-slate-100 rounded-none p-2 bg-slate-50/50">
              {inventory
                .filter(item => {
                  const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
                  const matchCat = selectedCategoryFilter === 'all' || item.categoryId === selectedCategoryFilter;
                  return matchSearch && matchCat;
                })
                .map(item => {
                  const cat = categories.find(c => c.id === item.categoryId);
                  const remaining = getRemainingStock(item);
                  const selectedQty = selectedItems[item.id] || 0;
                  const canAdd = selectedQty < remaining;
                  const totalStoreStock = Number(item.quantity) || 0;
                  const bookedRentalsCount = getItemBookedRentals(item.id, rentalsList).length;

                  return (
                    <div 
                      key={item.id} 
                      className={`p-2.5 bg-white border rounded-none flex items-center justify-between text-xs transition-all ${
                        selectedQty > 0 ? 'border-blue-500 shadow-xs ring-1 ring-blue-400/30' : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => setInspectScheduleItem(item)}
                            className="text-[10px] text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-1.5 py-0.5 rounded-none font-mono flex items-center gap-1 cursor-pointer"
                            title="Inspect complete rotation schedule for this outfit"
                          >
                            <CalendarDays className="w-3 h-3" />
                            Schedule ({bookedRentalsCount})
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-2 items-center text-xxs font-semibold">
                          <span className="text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded-none border border-blue-100">
                            {cat?.name || 'Category'}
                          </span>
                          <span className="text-slate-500">Size: {item.size}</span>
                          <span className="text-emerald-700 font-mono font-bold">₹{item.rentalPrice}/day</span>
                          
                          {/* Available in this date window badge */}
                          <span
                            className={`px-2 py-0.5 rounded-none font-mono font-bold ${
                              remaining <= 0
                                ? 'bg-red-100 text-red-700 border border-red-200'
                                : remaining < totalStoreStock
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {remaining <= 0
                              ? `0 / ${totalStoreStock} Avail (Booked in window)`
                              : `Avail: ${remaining} of ${totalStoreStock}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {selectedQty > 0 ? (
                          <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-none px-2 py-0.5">
                            <button
                              type="button"
                              id={`btn-form-dec-${item.id}`}
                              onClick={() => handleDecrementCostume(item.id)}
                              className="text-blue-700 hover:text-blue-900 cursor-pointer"
                            >
                              <MinusCircle className="w-4 h-4" />
                            </button>
                            <span className="font-mono font-bold text-sm text-slate-900 w-4 text-center">{selectedQty}</span>
                            <button
                              type="button"
                              id={`btn-form-inc-${item.id}`}
                              onClick={() => handleAddCostume(item.id)}
                              disabled={!canAdd}
                              className="text-blue-700 hover:text-blue-900 disabled:opacity-30 cursor-pointer"
                            >
                              <PlusCircle className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            id={`btn-form-add-${item.id}`}
                            onClick={() => handleAddCostume(item.id)}
                            disabled={remaining <= 0}
                            className={`px-3 py-1.5 rounded-none font-bold text-xxs transition-all cursor-pointer ${
                              remaining <= 0
                                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xs'
                            }`}
                          >
                            {remaining <= 0 ? 'Booked' : '+ Select'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 3. Repeatable Additional Accessories Card */}
          <div className="bg-white border border-slate-200 p-5 rounded-none shadow-xs relative space-y-4">
            <div className="absolute top-0 left-6 -translate-y-1/2 bg-slate-900 text-white font-bold px-2.5 py-0.5 rounded-none text-xxs uppercase tracking-wider font-mono">
              03. Additional Accessories (Custom)
            </div>

            <p className="text-xxs text-slate-400 pt-1">
              Add extra customized elements not stored in standard inventory, like &quot;1 belt&quot;, &quot;sword prop&quot;, &quot;caps&quot;, etc.
            </p>

            <div className="space-y-2">
              {additionalItems.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    id={`add-item-name-${idx}`}
                    placeholder="e.g. Extra sword prop, Belt, Crown"
                    value={item.name}
                    onChange={(e) => updateAdditionalItem(idx, 'name', e.target.value)}
                    className="flex-1 px-3 py-1.5 border border-slate-200 rounded-none text-xs focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                  />
                  <div className="w-20 shrink-0 flex items-center border border-slate-200 rounded-none bg-slate-50">
                    <button
                      type="button"
                      id={`btn-dec-add-qty-${idx}`}
                      onClick={() => updateAdditionalItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                      className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      id={`add-item-qty-${idx}`}
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateAdditionalItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full text-center bg-transparent border-none text-xs font-bold font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      id={`btn-inc-add-qty-${idx}`}
                      onClick={() => updateAdditionalItem(idx, 'quantity', item.quantity + 1)}
                      className="px-1.5 py-0.5 text-slate-500 hover:text-slate-800 font-bold"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    id={`btn-remove-add-item-${idx}`}
                    onClick={() => removeAdditionalItemField(idx)}
                    className="p-1.5 bg-red-50 text-red-600 rounded-none hover:bg-red-100 shrink-0 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              id="btn-add-accessory-field"
              onClick={addAdditionalItemField}
              className="py-2 px-3 rounded-none border border-dashed border-slate-300 hover:border-blue-600 text-slate-600 hover:text-blue-800 font-bold text-xs w-full flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Accessory / Custom Item
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Selected list summary, financials & camera (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Checkout Invoice Box */}
          <div className="bg-slate-900 text-white rounded-none p-5 shadow-xs border-t-4 border-blue-600 relative">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <span className="font-mono text-xxs uppercase tracking-wider text-slate-400">Rental Ticket Summary</span>
                <span className="text-xxs bg-blue-600 text-white font-black px-1.5 py-0.5 rounded-none font-mono">DRAFT</span>
              </div>

              {/* Rented Outfits Listed */}
              <div className="space-y-2">
                <p className="text-xxs font-bold text-slate-400 uppercase tracking-wider font-mono">Rented Costumes</p>
                {Object.keys(selectedItems).length === 0 ? (
                  <p className="text-slate-500 text-xs italic">No costume items selected yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {Object.entries(selectedItems).map(([id, q]) => {
                      const item = inventory.find(i => i.id === id);
                      if (!item) return null;
                      return (
                        <div key={id} className="flex justify-between items-center text-xs bg-slate-950 p-2 rounded-none border border-slate-800">
                          <span className="font-bold text-slate-200">{item.name} <span className="text-slate-400 font-mono">({q}x)</span></span>
                          <p className="font-bold text-sky-400 font-mono">₹{(Number(item.rentalPrice) || 0) * (Number(q) || 0)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Handover / Return Dates in Invoice */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-800">
                <div className="bg-slate-950 p-2.5 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Pickup Date</span>
                  <span className="font-bold font-mono text-sky-400 text-xs">{dateGiven}</span>
                </div>
                <div className="bg-slate-950 p-2.5 border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase font-mono block">Return Date</span>
                  <span className="font-bold font-mono text-emerald-400 text-xs">{expectedReturnDate}</span>
                </div>
              </div>

              {/* Financial Charges Input */}
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xxs text-slate-400 mb-1">Rent Charge (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={rentalCharge}
                      onChange={(e) => {
                        const newRent = parseInt(e.target.value) || 0;
                        setRentalCharge(newRent);
                        if (!isAdvanceManuallyEdited) {
                          setAdvanceAmount(isPreBooking ? Math.max(0, newRent - 200) : newRent);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-none text-sm font-bold text-sky-400 font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xxs text-slate-400 mb-1">
                      {isPreBooking ? 'Refundable Deposit (Rent - ₹200)' : 'Refundable Deposit (₹)'}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={advanceAmount}
                      onChange={(e) => {
                        setIsAdvanceManuallyEdited(true);
                        setAdvanceAmount(parseInt(e.target.value) || 0);
                      }}
                      className="w-full bg-slate-950 border border-slate-800 px-2 py-1.5 rounded-none text-sm font-bold text-emerald-400 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Pre-Booking Token Paid Today Field */}
                {isPreBooking && (
                  <div className="bg-amber-950/40 border border-amber-500/40 p-3 rounded-none space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-xxs font-bold uppercase tracking-wider text-amber-300 font-mono">
                        Pre-Booking Token Paid Today (₹)
                      </label>
                      <span className="text-xxs bg-amber-400 text-slate-950 px-1 font-bold font-mono">DEFAULT ₹200</span>
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="Default ₹200"
                      value={preBookingPaid}
                      onChange={(e) => setPreBookingPaid(parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-amber-500/50 px-3 py-2 rounded-none text-base font-extrabold text-amber-300 font-mono focus:outline-none focus:border-amber-400"
                    />
                    <p className="text-xxs text-amber-200/80 italic">
                      Default token amount is ₹200. Collected right now to reserve the costume in advance.
                    </p>
                  </div>
                )}

                {/* Info Text about pre-booking rule */}
                <p className="text-xxs text-slate-400 italic font-mono">
                  {isPreBooking 
                    ? `Pre-Booking Rule: Default token = ₹200. Refundable deposit = (Rent ₹${rentalCharge} - ₹200) = ₹${advanceAmount}.`
                    : 'Direct Handover Rule: Refundable deposit is equal to rental charge. Total collected upfront = Rent + Deposit.'}
                </p>

                {/* Total & Remaining Balance Summary */}
                <div className="bg-slate-950 p-3 border border-slate-800 rounded-none space-y-1.5">
                  <div className="flex justify-between text-xs text-slate-300">
                    <span>Total Order Cost (Rent + Deposit):</span>
                    <span className="font-mono font-bold">₹{totalUpfront}</span>
                  </div>

                  {isPreBooking ? (
                    <>
                      <div className="flex justify-between text-xs text-amber-300 font-bold">
                        <span>Paid Today (Token):</span>
                        <span className="font-mono">₹{preBookingPaid}</span>
                      </div>
                      <div className="flex justify-between text-sm font-extrabold text-sky-400 border-t border-slate-800 pt-1.5">
                        <span>Remaining Balance at Handover:</span>
                        <span className="font-mono">₹{Math.max(0, totalUpfront - preBookingPaid)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm font-extrabold text-emerald-400 border-t border-slate-800 pt-1.5">
                      <span>Total Collected Today:</span>
                      <span className="font-mono">₹{totalUpfront}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="border-t border-slate-800 pt-3 space-y-1">
                <label className="text-xxs text-slate-400 flex items-center gap-1">
                  <Notebook className="w-3.5 h-3.5 text-slate-500" /> Optional Handover Notes
                </label>
                <textarea
                  placeholder="Damage annotations, costume accessories notes, special agreements..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-800 rounded-none text-xs text-slate-100 p-2 focus:outline-none focus:border-blue-600"
                />
              </div>

              {/* Complete Handover Save Trigger */}
              <div className="pt-2">
                <button
                  type="submit"
                  id="btn-save-new-rental"
                  disabled={conflictingItems.length > 0}
                  className="w-full py-3 rounded-none bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800 disabled:text-slate-500 active:scale-[0.98] transition-all text-white font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {isPreBooking
                    ? `Save Pre-Booking Slip (Collect ₹${preBookingPaid} Token)`
                    : `Save & Handover (Collect ₹${totalUpfront})`}
                </button>
              </div>
            </div>
          </div>

          {/* Handover Camera condition photos */}
          <div className="bg-white border border-slate-200 p-5 rounded-none shadow-xs">
            <CameraCapture
              photos={issuePhotos}
              onChange={setIssuePhotos}
              label="Attach Handover Condition Photos"
              maxPhotos={5}
            />
          </div>

        </div>
      </div>

    </form>
  );
}
