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
  onSaveRental?: (rental: Omit<Rental, 'id' | 'createdAt'>) => void;
  onSave?: (rentalData: Omit<Rental, 'id' | 'createdAt'>) => void;
  onCancel?: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
  isSubmitting?: boolean;
}

export default function RentalForm({
  categories,
  inventory,
  existingRentals,
  activeRentals,
  onSaveRental,
  onSave,
  onCancel,
  onShowToast,
  isSubmitting = false
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

    const newRental: Omit<Rental, 'id' | 'createdAt'> = {
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
      <div className="neo-flat p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-sky)] font-bold">
              New Rental
            </span>
            <span className="neo-pressed text-[var(--color-navy)] font-mono text-[10px] font-bold px-3 py-1 rounded-lg flex items-center gap-1.5">
              <Hash className="w-3 h-3" /> Booking #{nextBookingNum}
            </span>
          </div>
          <h2 className="text-3xl font-black text-[var(--color-navy)] tracking-tight">Issue Slip</h2>
        </div>
        
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-3 neo-btn text-slate-500 font-bold text-sm shrink-0 hover:text-[var(--color-navy)]"
          >
            Cancel
          </button>
        )}
      </div>

      {/* 00. Booking Mode & Rotation Date Range Configuration */}
      <div className="neo-flat p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-[rgba(0,0,0,0.05)] pb-6">
          <div>
            <span className="text-[10px] font-bold text-[var(--color-sky)] block uppercase tracking-widest font-mono">
              01. Order Type
            </span>
            <p className="text-sm font-medium text-slate-500 mt-2">
              Select order type. Stock automatically updates based on chosen dates.
            </p>
          </div>

          <div className="flex gap-4 shrink-0">
            <button
              type="button"
              onClick={() => {
                setIsPreBooking(false);
                setPreBookingPaid(0);
                if (!isAdvanceManuallyEdited) {
                  setAdvanceAmount(rentalCharge);
                }
              }}
              className={`px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all ${
                !isPreBooking
                  ? 'neo-pressed text-[var(--color-navy)]'
                  : 'neo-btn text-slate-500'
              }`}
            >
              <Clock className="w-4 h-4" />
              Direct Handover
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
              className={`px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all ${
                isPreBooking
                  ? 'neo-pressed text-amber-500 ring-1 ring-amber-400'
                  : 'neo-btn text-slate-500'
              }`}
            >
              <BookmarkCheck className="w-4 h-4" />
              Pre-Booking
            </button>
          </div>
        </div>

        {/* Date Range Inputs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[var(--color-sky)]" />
              {isPreBooking ? 'Pickup Date *' : 'Handover Date *'}
            </label>
            <input
              type="date"
              required
              value={dateGiven}
              onChange={(e) => setDateGiven(e.target.value)}
              className="w-full neo-pressed px-4 py-3 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
            />
          </div>

          <div className="md:col-span-2 flex flex-col items-center justify-center text-center py-2">
            <span className="text-[10px] uppercase font-mono font-bold text-slate-400 tracking-widest">Duration</span>
            <div className="text-xs font-bold font-mono text-[var(--color-sky)] neo-pressed px-3 py-1.5 mt-2 flex items-center gap-2">
              <ArrowRight className="w-3 h-3" />
              {rentalDurationDays} Day{rentalDurationDays !== 1 ? 's' : ''}
            </div>
          </div>

          <div className="md:col-span-5">
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-500" />
              Return Date *
            </label>
            <input
              type="date"
              required
              value={expectedReturnDate}
              min={dateGiven}
              onChange={(e) => setExpectedReturnDate(e.target.value)}
              className="w-full neo-pressed px-4 py-3 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Customer and Costume Selectors (7 cols) */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* 1. Customer Information Ticket Card */}
          <div className="neo-flat p-8 relative">
            <div className="absolute top-0 left-8 -translate-y-1/2 neo-flat bg-[var(--color-navy)] text-white font-bold px-4 py-1 text-[10px] uppercase tracking-widest font-mono">
              02. Customer Info
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Full Name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full neo-pressed px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Phone Number *</label>
                <input
                  type="tel"
                  required
                  placeholder="Mobile"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  className="w-full neo-pressed px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Address / Location</label>
                <input
                  type="text"
                  placeholder="Street, Area, City"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  className="w-full neo-pressed px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                />
              </div>
            </div>
          </div>

          {/* 2. Costume Inventory Select Ticket Card */}
          <div className="neo-flat p-8 relative space-y-6">
            <div className="absolute top-0 left-8 -translate-y-1/2 neo-flat bg-[var(--color-navy)] text-white font-bold px-4 py-1 text-[10px] uppercase tracking-widest font-mono">
              03. Items
            </div>

            {/* Date Conflict Warning Banner if dates changed after selecting */}
            {conflictingItems.length > 0 && (
              <div className="p-4 neo-pressed ring-2 ring-red-400 text-red-600 text-xs flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <div>
                  <strong className="font-bold">Stock Conflict:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1 text-[10px] font-medium tracking-wide">
                    {conflictingItems.map(({ item, selected, available }) => (
                      <li key={item.id}>
                        <strong>{item.name}</strong>: Selected {selected}, only {available} free.
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mt-4">
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1 neo-pressed px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              />
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="neo-pressed px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] appearance-none cursor-pointer"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Inventory Items Pick List */}
            <div className="max-h-96 overflow-y-auto space-y-4 pr-2 custom-scrollbar p-2">
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
                      className={`p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                        selectedQty > 0 ? 'neo-flat ring-2 ring-[var(--color-sky)]' : 'neo-btn'
                      }`}
                    >
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <span className="font-bold text-[var(--color-navy)] text-base">{item.name}</span>
                          <button
                            type="button"
                            onClick={() => setInspectScheduleItem(item)}
                            className="text-[10px] neo-pressed text-[var(--color-sky)] px-2 py-1 font-bold tracking-widest uppercase flex items-center gap-1.5"
                            title="Schedule"
                          >
                            <CalendarDays className="w-3.5 h-3.5" />
                            ({bookedRentalsCount})
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-3 items-center text-[10px] font-bold tracking-widest uppercase">
                          <span className="text-slate-500">{cat?.name}</span>
                          <span className="text-slate-500">Size {item.size}</span>
                          <span className="text-emerald-500 font-mono">₹{item.rentalPrice}/d</span>
                          
                          <span
                            className={`px-3 py-1 neo-pressed ${
                              remaining <= 0
                                ? 'text-red-500'
                                : remaining < totalStoreStock
                                ? 'text-amber-500'
                                : 'text-emerald-500'
                            }`}
                          >
                            Avail {remaining}/{totalStoreStock}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        {selectedQty > 0 ? (
                          <div className="flex items-center gap-3 neo-pressed px-3 py-1.5">
                            <button
                              type="button"
                              onClick={() => handleDecrementCostume(item.id)}
                              className="text-slate-400 hover:text-[var(--color-navy)] cursor-pointer"
                            >
                              <MinusCircle className="w-5 h-5" />
                            </button>
                            <span className="font-mono font-bold text-base text-[var(--color-navy)] w-6 text-center">{selectedQty}</span>
                            <button
                              type="button"
                              onClick={() => handleAddCostume(item.id)}
                              disabled={!canAdd}
                              className="text-slate-400 hover:text-[var(--color-navy)] disabled:opacity-30 cursor-pointer"
                            >
                              <PlusCircle className="w-5 h-5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAddCostume(item.id)}
                            disabled={remaining <= 0}
                            className={`px-5 py-2.5 font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer ${
                              remaining <= 0
                                ? 'neo-pressed text-slate-400 cursor-not-allowed'
                                : 'neo-btn text-[var(--color-navy)]'
                            }`}
                          >
                            {remaining <= 0 ? 'Out' : 'Select'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* 3. Repeatable Additional Accessories Card */}
          <div className="neo-flat p-8 relative space-y-6">
            <div className="absolute top-0 left-8 -translate-y-1/2 neo-flat bg-[var(--color-navy)] text-white font-bold px-4 py-1 text-[10px] uppercase tracking-widest font-mono">
              04. Accessories
            </div>

            <p className="text-xs font-medium text-slate-500 mt-2">
              Add extra custom elements (props, belts, caps).
            </p>

            <div className="space-y-4">
              {additionalItems.map((item, idx) => (
                <div key={idx} className="flex gap-4 items-center">
                  <input
                    type="text"
                    placeholder="E.g. Extra sword, Belt"
                    value={item.name}
                    onChange={(e) => updateAdditionalItem(idx, 'name', e.target.value)}
                    className="flex-1 neo-pressed px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                  />
                  <div className="w-24 shrink-0 flex items-center neo-pressed p-1">
                    <button
                      type="button"
                      onClick={() => updateAdditionalItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                      className="px-2 py-1 text-slate-400 hover:text-[var(--color-navy)] font-bold text-lg"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(e) => updateAdditionalItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                      className="w-full text-center bg-transparent border-none text-sm font-bold font-mono focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => updateAdditionalItem(idx, 'quantity', item.quantity + 1)}
                      className="px-2 py-1 text-slate-400 hover:text-[var(--color-navy)] font-bold text-lg"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeAdditionalItemField(idx)}
                    className="p-3 neo-btn text-red-500 shrink-0"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={addAdditionalItemField}
              className="py-3 px-4 neo-btn text-slate-500 hover:text-[var(--color-sky)] font-bold text-[10px] tracking-widest uppercase w-full flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Custom Prop
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Selected list summary, financials & camera (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Checkout Invoice Box */}
          <div className="neo-pressed p-8 relative">
            <div className="absolute top-0 left-8 -translate-y-1/2 neo-flat bg-[var(--color-navy)] text-white font-bold px-4 py-1 text-[10px] uppercase tracking-widest font-mono">
              Slip Summary
            </div>

            <div className="space-y-6 mt-4">
              <div className="flex items-center justify-between border-b border-[rgba(0,0,0,0.05)] pb-4">
                <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-slate-500">Ticket</span>
                <span className="text-[10px] font-bold text-[var(--color-sky)] neo-flat px-3 py-1 uppercase tracking-widest font-mono">DRAFT</span>
              </div>

              {/* Rented Outfits Listed */}
              <div className="space-y-4">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Cart</p>
                {Object.keys(selectedItems).length === 0 ? (
                  <p className="text-slate-400 text-sm italic font-medium">Cart is empty</p>
                ) : (
                  <div className="space-y-3">
                    {Object.entries(selectedItems).map(([id, q]) => {
                      const item = inventory.find(i => i.id === id);
                      if (!item) return null;
                      return (
                        <div key={id} className="flex justify-between items-center text-sm neo-flat p-4">
                          <span className="font-bold text-[var(--color-navy)]">{item.name} <span className="text-slate-400 font-mono">({q}x)</span></span>
                          <p className="font-bold text-[var(--color-sky)] font-mono">₹{(Number(item.rentalPrice) || 0) * (Number(q) || 0)}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Handover / Return Dates in Invoice */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[rgba(0,0,0,0.05)]">
                <div className="neo-flat p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Pickup</span>
                  <span className="font-bold font-mono text-[var(--color-sky)] text-sm">{dateGiven}</span>
                </div>
                <div className="neo-flat p-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Return</span>
                  <span className="font-bold font-mono text-emerald-500 text-sm">{expectedReturnDate}</span>
                </div>
              </div>

              {/* Financial Charges Input */}
              <div className="space-y-6 pt-4 border-t border-[rgba(0,0,0,0.05)]">
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rent (₹)</label>
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
                      className="w-full neo-flat px-4 py-3 text-sm font-bold text-[var(--color-sky)] font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      {isPreBooking ? 'Deposit (-₹200)' : 'Deposit (₹)'}
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
                      className="w-full neo-flat px-4 py-3 text-sm font-bold text-emerald-500 font-mono focus:outline-none"
                    />
                  </div>
                </div>

                {/* Pre-Booking Token Paid Today Field */}
                {isPreBooking && (
                  <div className="neo-flat ring-1 ring-amber-400/50 p-5 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-amber-600">
                        Token Paid (₹)
                      </label>
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-bold">DEFAULT ₹200</span>
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="200"
                      value={preBookingPaid}
                      onChange={(e) => setPreBookingPaid(parseInt(e.target.value) || 0)}
                      className="w-full neo-pressed px-4 py-3 text-base font-extrabold text-amber-600 font-mono focus:outline-none"
                    />
                  </div>
                )}

                {/* Total & Remaining Balance Summary */}
                <div className="neo-flat p-5 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span>Order Total:</span>
                    <span className="font-mono text-[var(--color-navy)]">₹{totalUpfront}</span>
                  </div>

                  {isPreBooking ? (
                    <>
                      <div className="flex justify-between text-xs font-bold text-amber-600 uppercase tracking-widest">
                        <span>Paid Token:</span>
                        <span className="font-mono">₹{preBookingPaid}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-[var(--color-sky)] border-t border-[rgba(0,0,0,0.05)] pt-3">
                        <span className="uppercase tracking-widest">Due at Pickup:</span>
                        <span className="font-mono">₹{Math.max(0, totalUpfront - preBookingPaid)}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm font-black text-emerald-500 border-t border-[rgba(0,0,0,0.05)] pt-3">
                      <span className="uppercase tracking-widest">Collect Today:</span>
                      <span className="font-mono">₹{totalUpfront}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="border-t border-[rgba(0,0,0,0.05)] pt-6 space-y-3">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Notebook className="w-4 h-4 text-[var(--color-sky)]" /> Handover Notes
                </label>
                <textarea
                  placeholder="Annotations, damage notes..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full neo-pressed p-4 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                />
              </div>

              {/* Complete Handover Save Trigger */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={conflictingItems.length > 0 || isSubmitting}
                  className="w-full py-4 neo-btn-primary disabled:opacity-50 flex items-center justify-center gap-3 shadow-md"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-5 h-5" />
                      {isPreBooking
                        ? `Save Pre-Booking (₹${preBookingPaid})`
                        : `Complete Handover (₹${totalUpfront})`}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Handover Camera condition photos */}
          <div className="neo-flat p-8">
            <div className="mb-4">
              <span className="text-[10px] font-bold text-[var(--color-sky)] uppercase tracking-widest font-mono">
                05. Condition Photos
              </span>
            </div>
            <CameraCapture
              photos={issuePhotos}
              onChange={setIssuePhotos}
              label="Attach Handover Photos"
              maxPhotos={5}
            />
          </div>

        </div>
      </div>

    </form>
  );
}
