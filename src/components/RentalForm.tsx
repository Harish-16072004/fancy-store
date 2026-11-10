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
import CustomerDetailsSection from './rental/CustomerDetailsSection';
import ItemsSelectionSection from './rental/ItemsSelectionSection';
import { toPaise, toRupees, formatINR } from '../utils/money';
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
  const handleSave = onSaveRental || onSave || (() => { });

  // Customer Details
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Booking Mode: Direct Handover vs Pre-Booking
  const [isPreBooking, setIsPreBooking] = useState(false);
  const [preBookingPaid, setPreBookingPaid] = useState<number>(toPaise(200));

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
      setAdvanceAmount(isPreBooking ? Math.max(0, autoCharge - toPaise(200)) : autoCharge);
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
      preBookingPaid: isPreBooking ? preBookingPaid : 0,
      rentalCharge: rentalCharge || 0,
      advanceAmount: advanceAmount || 0,
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
      <div className="neo-flat p-4 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-[var(--color-sky)] font-bold">
              New Rental
            </span>
            <span className="neo-pressed text-[var(--color-navy)] font-mono text-[10px] font-bold px-3 py-1 rounded-lg flex items-center gap-1.5">
              <Hash className="w-3 h-3" /> Booking #{nextBookingNum}
            </span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-[var(--color-navy)] tracking-tight">Issue Slip</h2>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="w-full sm:w-auto px-6 py-3 neo-btn text-slate-500 font-bold text-sm shrink-0 hover:text-[var(--color-navy)] text-center cursor-pointer"
          >
            Cancel
          </button>
        )}
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
        {/* LEFT COLUMN */}
        <div className="lg:col-span-7 space-y-8">
          <CustomerDetailsSection
            isPreBooking={isPreBooking}
            setIsPreBooking={setIsPreBooking}
            setPreBookingPaid={setPreBookingPaid}
            isAdvanceManuallyEdited={isAdvanceManuallyEdited}
            setAdvanceAmount={setAdvanceAmount}
            rentalCharge={rentalCharge}
            dateGiven={dateGiven}
            setDateGiven={setDateGiven}
            expectedReturnDate={expectedReturnDate}
            setExpectedReturnDate={setExpectedReturnDate}
            rentalDurationDays={rentalDurationDays}
            customerName={customerName}
            setCustomerName={setCustomerName}
            customerPhone={customerPhone}
            setCustomerPhone={setCustomerPhone}
            customerAddress={customerAddress}
            setCustomerAddress={setCustomerAddress}
          />

          <ItemsSelectionSection
            inventory={inventory}
            categories={categories}
            rentalsList={rentalsList}
            selectedItems={selectedItems}
            additionalItems={additionalItems}
            conflictingItems={conflictingItems}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategoryFilter={selectedCategoryFilter}
            setSelectedCategoryFilter={setSelectedCategoryFilter}
            setInspectScheduleItem={setInspectScheduleItem}
            getRemainingStock={getRemainingStock}
            handleAddCostume={handleAddCostume}
            handleDecrementCostume={handleDecrementCostume}
            addAdditionalItemField={addAdditionalItemField}
            updateAdditionalItem={updateAdditionalItem}
            removeAdditionalItemField={removeAdditionalItemField}
          />
        </div>

        {/* RIGHT COLUMN: Selected list summary, financials & camera (5 cols) */}
        <div className="lg:col-span-5 space-y-6">

          {/* Checkout Invoice Box */}
          <div className="neo-pressed p-4 sm:p-8 relative">
            <div className="absolute top-0 left-4 sm:left-8 -translate-y-1/2 neo-flat bg-[var(--color-navy)] text-[var(--color-sky)] font-bold px-4 py-1 text-[13px] sm:text-[15px] uppercase tracking-widest font-mono">
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
                          <p className="font-bold text-[var(--color-sky)] font-mono">{formatINR((Number(item.rentalPrice) || 0) * (Number(q) || 0))}</p>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rent (₹)</label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={rentalCharge ? toRupees(rentalCharge) : ""}
                      onChange={(e) => {
                        const newRent = toPaise(e.target.value);
                        setRentalCharge(newRent);
                        if (!isAdvanceManuallyEdited) {
                          setAdvanceAmount(isPreBooking ? Math.max(0, newRent - toPaise(200)) : newRent);
                        }
                      }}
                      className="w-full neo-flat px-4 py-3 text-sm font-bold text-[var(--color-sky)] font-mono focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">
                      {isPreBooking ? `Deposit (-${formatINR(toPaise(200))})` : 'Deposit (₹)'}
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={advanceAmount ? toRupees(advanceAmount) : ""}
                      onChange={(e) => {
                        setIsAdvanceManuallyEdited(true);
                        setAdvanceAmount(toPaise(e.target.value));
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
                      <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-1 rounded-lg font-bold">DEFAULT {formatINR(toPaise(200))}</span>
                    </div>
                    <input
                      type="number"
                      required
                      min="0"
                      placeholder="200"
                      value={preBookingPaid ? toRupees(preBookingPaid) : ""}
                      onChange={(e) => setPreBookingPaid(toPaise(e.target.value))}
                      className="w-full neo-pressed px-4 py-3 text-base font-extrabold text-amber-600 font-mono focus:outline-none"
                    />
                  </div>
                )}

                {/* Total & Remaining Balance Summary */}
                <div className="neo-flat p-5 space-y-3">
                  <div className="flex justify-between text-xs font-bold text-slate-500 uppercase tracking-widest">
                    <span>Order Total:</span>
                    <span className="font-mono text-[var(--color-navy)]">{formatINR(totalUpfront)}</span>
                  </div>

                  {isPreBooking ? (
                    <>
                      <div className="flex justify-between text-xs font-bold text-amber-600 uppercase tracking-widest">
                        <span>Paid Token:</span>
                        <span className="font-mono">{formatINR(preBookingPaid)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-[var(--color-sky)] border-t border-[rgba(0,0,0,0.05)] pt-3">
                        <span className="uppercase tracking-widest">Due at Pickup:</span>
                        <span className="font-mono">{formatINR(Math.max(0, totalUpfront - preBookingPaid))}</span>
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between text-sm font-black text-emerald-500 border-t border-[rgba(0,0,0,0.05)] pt-3">
                      <span className="uppercase tracking-widest">Collect Today:</span>
                      <span className="font-mono">{formatINR(totalUpfront)}</span>
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
                        ? 'Save Pre-Booking'
                        : 'Complete Handover'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Handover Camera condition photos */}
          <div className="neo-flat p-4 sm:p-8">
            <div className="mb-4">
              <span className="text-[15px] font-bold text-[var(--color-sky)] uppercase tracking-widest font-mono">
                Condition Photos
              </span>
            </div>
            <CameraCapture
              photos={issuePhotos}
              onChange={setIssuePhotos}
              label="Attach Handover Photos"
              maxPhotos={2}
            />
          </div>

        </div>
      </div>

    </form>
  );
}
