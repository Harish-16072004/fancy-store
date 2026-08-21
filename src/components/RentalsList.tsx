import React, { useState } from 'react';
import { Search, Filter, Calendar, User, Phone, MapPin, CheckCircle2, AlertCircle, Trash2, Edit2, FileDown, Eye, Camera, Check, ToggleLeft, ToggleRight, X, Sparkles, Receipt, HelpCircle, ArrowRight, Printer, Download } from 'lucide-react';
import { Rental, Category, InventoryItem } from '../types';
import { toPaise, toRupees, formatINR } from '../utils/money';
import { getRentalComputedStatus } from '../utils/storage';
import { generateRentalInvoicePDF } from '../utils/pdfGenerator';
import CameraCapture from './CameraCapture';
import * as XLSX from 'xlsx';

interface RentalsListProps {
  rentals: Rental[];
  categories: Category[];
  inventory: InventoryItem[];
  onUpdateRental: (id: string, updated: Partial<Rental>) => void;
  onDeleteRental: (id: string) => void;
  initialFilter?: 'active' | 'overdue' | 'returned' | 'all';
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onShowConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export default function RentalsList({
  rentals,
  categories,
  inventory,
  onUpdateRental,
  onDeleteRental,
  initialFilter = 'all',
  onShowToast,
  onShowConfirm,
}: RentalsListProps) {
  // Override alert locally
  const alert = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    if (onShowToast) {
      onShowToast(msg, type);
    } else {
      window.alert(msg);
    }
  };

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pre-booked' | 'active' | 'overdue' | 'returned' | 'all'>(initialFilter as any);

  // Detail Modal view
  const [selectedRentalForView, setSelectedRentalForView] = useState<Rental | null>(null);

  // Return Processing state
  const [returningRentalId, setReturningRentalId] = useState<string | null>(null);
  const [actualReturnDate, setActualReturnDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [returnPhotos, setReturnPhotos] = useState<string[]>([]);
  const [returnNotes, setReturnNotes] = useState('');

  // Editing rental state
  const [editingRental, setEditingRental] = useState<Rental | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editDateGiven, setEditDateGiven] = useState('');
  const [editExpectedDate, setEditExpectedDate] = useState('');
  const [editCharge, setEditCharge] = useState<number>(0);
  const [editAdvance, setEditAdvance] = useState<number>(0);
  const [editPreBookingPaid, setEditPreBookingPaid] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');

  // Filter rentals
  const filteredRentals = rentals.filter((rental) => {
    const computedStatus = getRentalComputedStatus(rental);

    const matchesSearch =
      (rental.bookingNumber && rental.bookingNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      rental.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rental.customerPhone.includes(searchTerm) ||
      (rental.customerAddress && rental.customerAddress.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesStatus = true;
    if (statusFilter === 'pre-booked') {
      matchesStatus = computedStatus === 'pre-booked';
    } else if (statusFilter === 'active') {
      matchesStatus = computedStatus === 'active';
    } else if (statusFilter === 'overdue') {
      matchesStatus = computedStatus === 'overdue';
    } else if (statusFilter === 'returned') {
      matchesStatus = computedStatus === 'returned';
    }

    return matchesSearch && matchesStatus;
  });

  // Export filtered or all to .xlsx
  const handleExportRentalsExcel = (exportAll = false) => {
    const listToExport = exportAll ? rentals : filteredRentals;

    const dataRows = listToExport.map((r) => {
      const computed = getRentalComputedStatus(r);
      const outfitSummary = r.items
        .map((item) => `${item.name} [Size: ${item.size}, Qty: ${item.quantity}, Price: ${formatINR(item.rentalPrice)}]`)
        .join('; ');

      const accessorySummary = r.additionalItems
        .map((ai) => `${ai.name} (Qty: ${ai.quantity})`)
        .join(', ');

      return {
        'Booking Number': r.bookingNumber || 'BK-1000',
        'Customer Name': r.customerName,
        'Phone Number': r.customerPhone,
        'Customer Address': r.customerAddress || 'N/A',
        'Rented Outfits': outfitSummary || 'None',
        'Additional Accessories': accessorySummary || 'None',
        'Scheduled / Given Date': r.dateGiven,
        'Expected Return Date': r.expectedReturnDate,
        'Actual Return Date': r.actualReturnDate || 'Not Returned',
        'Status': computed.toUpperCase(),
        'Rental Charge (₹)': toRupees(r.rentalCharge),
        'Security Deposit (₹)': toRupees(r.advanceAmount),
        'Pre-Booking Paid Today (₹)': toRupees(r.preBookingPaid || 0),
        'Remaining Balance Due (₹)': toRupees((r.rentalCharge + r.advanceAmount) - (r.preBookingPaid || 0)),
        'Advance Deposit Returned': r.advanceReturned ? 'YES (Refunded)' : 'NO (Held)',
        'Handover Notes': r.notes || '',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Rentals Registry');

    // Auto-fit column widths (basic)
    const maxCols = Object.keys(dataRows[0] || {}).length;
    worksheet['!cols'] = Array(maxCols).fill({ wch: 22 });

    const fileName = `fancy_dress_rentals_report_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  };

  // Handover action for Pre-Bookings when customer receives the dress
  const handleHandoverPreBooking = (rental: Rental) => {
    const totalOrderCost = rental.rentalCharge + rental.advanceAmount;
    const remainingBalance = totalOrderCost - (rental.preBookingPaid || 0);

    const executeHandover = () => {
      onUpdateRental(rental.id, {
        status: 'active',
        dateGiven: new Date().toISOString().split('T')[0], // Set actual handover date to today
      });
      alert(`Dress handed over for Booking #${rental.bookingNumber}! Collected remaining balance of ${formatINR(remainingBalance)}. Order is now ACTIVE.`, 'success');
    };

    if (onShowConfirm) {
      onShowConfirm(
        `Complete Handover for Booking #${rental.bookingNumber}`,
        `Customer: ${rental.customerName} (${rental.customerPhone})\n\n• Total Order Cost (Rent + Deposit): ${formatINR(totalOrderCost)}\n• Pre-Booking Token Paid: ${formatINR(rental.preBookingPaid || 0)}\n• REMAINING BALANCE TO COLLECT TODAY: ${formatINR(remainingBalance)}\n\nConfirm collecting ${formatINR(remainingBalance)} and completing costume handover?`,
        executeHandover
      );
    } else {
      executeHandover();
    }
  };

  // Open return dialogue
  const openReturnPanel = (rental: Rental) => {
    setReturningRentalId(rental.id);
    setActualReturnDate(new Date().toISOString().split('T')[0]);
    setReturnPhotos([]);
    setReturnNotes(rental.notes || '');
  };

  const handleCompleteReturn = () => {
    if (!returningRentalId) return;
    onUpdateRental(returningRentalId, {
      status: 'returned',
      actualReturnDate,
      returnPhotos,
      notes: returnNotes.trim() || undefined,
    });
    setReturningRentalId(null);
    alert('Costume return registered successfully!', 'success');
  };

  // Toggle advance returned
  const handleToggleAdvance = (rental: Rental) => {
    if (rental.status !== 'returned') {
      alert('Security deposit refund is usually settled AFTER the costumes have been returned safely. Please process the "Dress Returned" handover first.', 'error');
      return;
    }
    onUpdateRental(rental.id, {
      advanceReturned: !rental.advanceReturned
    });
  };

  // Start editing rental
  const startEditRental = (rental: Rental) => {
    setEditingRental(rental);
    setEditName(rental.customerName);
    setEditPhone(rental.customerPhone);
    setEditAddress(rental.customerAddress || '');
    setEditDateGiven(rental.dateGiven);
    setEditExpectedDate(rental.expectedReturnDate);
    setEditCharge(rental.rentalCharge);
    setEditAdvance(rental.advanceAmount);
    setEditPreBookingPaid(rental.preBookingPaid || 0);
    setEditNotes(rental.notes || '');
  };

  // Save edit
  const saveRentalEdits = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRental) return;

    onUpdateRental(editingRental.id, {
      customerName: editName.trim(),
      customerPhone: editPhone.trim(),
      customerAddress: editAddress.trim() || undefined,
      dateGiven: editDateGiven,
      expectedReturnDate: editExpectedDate,
      rentalCharge: editCharge,
      advanceAmount: editAdvance,
      preBookingPaid: editPreBookingPaid,
      notes: editNotes.trim() || undefined,
    });

    setEditingRental(null);
    alert('Rental record updated successfully!', 'success');
  };

  // Delete rental record
  const handleDeleteRental = (id: string, name: string) => {
    const runDelete = () => {
      onDeleteRental(id);
      alert(`Rental ticket of "${name}" deleted.`, 'info');
    };
    if (onShowConfirm) {
      onShowConfirm(
        'Delete Rental Record',
        `CRITICAL WARNING: Are you sure you want to completely delete the rental ticket of "${name}"? This action cannot be undone.`,
        runDelete
      );
    } else if (window.confirm(`CRITICAL WARNING: Are you sure you want to completely delete the rental ticket of "${name}"? This action cannot be undone.`)) {
      runDelete();
    }
  };

  return (
    <div className="space-y-6">

      {/* 1. Header Filter Bar */}
      <div className="flex flex-col md:flex-row gap-6 justify-between items-stretch md:items-center neo-flat p-6">

        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-sky)]" />
          <input
            type="text"
            id="search-rentals"
            placeholder="Search bookings, names, phones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] transition-all"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
          {(['all', 'pre-booked', 'active', 'overdue', 'returned'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              id={`filter-status-${filter}`}
              onClick={() => setStatusFilter(filter)}
              className={`px-5 py-2.5 font-bold text-[10px] uppercase tracking-widest shrink-0 transition-all cursor-pointer ${statusFilter === filter
                  ? filter === 'pre-booked'
                    ? 'neo-pressed text-amber-500 ring-1 ring-amber-400'
                    : 'neo-pressed text-[var(--color-sky)]'
                  : 'neo-btn text-slate-500 hover:text-[var(--color-navy)]'
                }`}
            >
              {filter === 'pre-booked' ? 'PRE-BOOKED' : filter}
            </button>
          ))}
        </div>

        {/* Excel Export Triggers */}
        <div className="flex gap-4">
          <button
            type="button"
            id="btn-export-filtered-rentals"
            onClick={() => handleExportRentalsExcel(false)}
            className="px-5 py-2.5 neo-btn text-emerald-500 hover:text-emerald-600 flex items-center justify-center gap-2 transition-all text-[10px] tracking-widest uppercase font-bold cursor-pointer"
            title="Export filtered list"
          >
            <FileDown className="w-4 h-4" /> Export (.xlsx)
          </button>
        </div>
      </div>

      {/* 2. Overdue return camera process panel */}
      {returningRentalId && (() => {
        const rental = rentals.find((r) => r.id === returningRentalId)!;
        return (
          <div className="p-8 neo-flat space-y-6 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-[rgba(0,0,0,0.05)] pb-4">
              <h3 className="text-2xl font-black text-[var(--color-navy)] flex items-center gap-3">
                <Receipt className="w-6 h-6 text-[var(--color-sky)]" />
                Return: {rental.customerName}
              </h3>
              <button
                type="button"
                onClick={() => setReturningRentalId(null)}
                className="p-2 neo-btn text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="neo-pressed p-6 space-y-4">
                  <h4 className="font-bold text-[var(--color-sky)] text-[10px] uppercase tracking-widest">Handover Specifications</h4>
                  <div className="text-sm font-medium text-[var(--color-navy)] space-y-2">
                    {rental.items.map((i) => (
                      <p key={i.itemId}>
                        • <strong>{i.name}</strong> (Size: {i.size} • Rented: {i.quantity})
                      </p>
                    ))}
                    {rental.additionalItems.length > 0 && (
                      <div className="pt-3 border-t border-[rgba(0,0,0,0.05)] mt-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 mb-2">Extras to return:</p>
                        {rental.additionalItems.map((ai, index) => (
                          <p key={index} className="text-xs font-bold">• {ai.name} (Qty: {ai.quantity})</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Return Date *</label>
                    <input
                      type="date"
                      required
                      value={actualReturnDate}
                      onChange={(e) => setActualReturnDate(e.target.value)}
                      className="w-full px-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Condition Notes</label>
                    <input
                      type="text"
                      placeholder="e.g. Clean, minor rip"
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      className="w-full px-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
                    />
                  </div>
                </div>

                {/* Compare Handover Photos */}
                {rental.handoverPhotos.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                      <Eye className="w-4 h-4 text-[var(--color-sky)]" /> Handover Reference Photos
                    </p>
                    <div className="flex gap-4 overflow-x-auto pb-2">
                      {rental.handoverPhotos.map((p, idx) => (
                        <div key={idx} className="relative w-20 h-20 neo-pressed overflow-hidden shrink-0">
                          <img referrerPolicy="no-referrer" src={p} alt="handover record" className="w-full h-full object-cover rounded-lg mix-blend-multiply" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Capture return photos */}
              <div className="neo-flat p-6">
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-[var(--color-sky)] uppercase tracking-widest font-mono">
                    Capture Return Condition
                  </span>
                </div>
                <CameraCapture
                  photos={returnPhotos}
                  onChange={setReturnPhotos}
                  label="Take Photos"
                  maxPhotos={5}
                />
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-6 border-t border-[rgba(0,0,0,0.05)]">
              <button
                type="button"
                onClick={() => setReturningRentalId(null)}
                className="px-6 py-3 neo-btn text-slate-500 font-bold text-sm transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCompleteReturn}
                className="px-6 py-3 neo-btn-primary flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Check className="w-5 h-5" /> Mark Returned
              </button>
            </div>
          </div>
        );
      })()}

      {/* 3. Editing Rental Record Panel */}
      {editingRental && (
        <form onSubmit={saveRentalEdits} className="p-8 neo-flat space-y-6 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-[rgba(0,0,0,0.05)] pb-4">
            <h3 className="text-2xl font-black text-[var(--color-navy)]">Edit Ticket</h3>
            <button
              type="button"
              onClick={() => setEditingRental(null)}
              className="p-2 neo-btn text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Customer Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Customer Phone</label>
              <input
                type="text"
                required
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Address</label>
              <input
                type="text"
                value={editAddress}
                placeholder="City / Area"
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Rent (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={editCharge ? toRupees(editCharge) : ""}
                onChange={(e) => setEditCharge(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 neo-pressed text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] text-[var(--color-sky)]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Pickup Date</label>
              <input
                type="date"
                required
                value={editDateGiven}
                onChange={(e) => setEditDateGiven(e.target.value)}
                className="w-full px-4 py-3 neo-pressed text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Expected Return</label>
              <input
                type="date"
                required
                value={editExpectedDate}
                onChange={(e) => setEditExpectedDate(e.target.value)}
                className="w-full px-4 py-3 neo-pressed text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Deposit (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={editAdvance ? toRupees(editAdvance) : ""}
                onChange={(e) => setEditAdvance(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 neo-pressed text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] text-emerald-500"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest mb-2">Pre-Book Token (₹)</label>
              <input
                type="number"
                min="0"
                value={editPreBookingPaid ? toRupees(editPreBookingPaid) : ""}
                onChange={(e) => setEditPreBookingPaid(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 neo-pressed ring-1 ring-amber-400 text-sm font-bold font-mono text-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 neo-pressed text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-6 border-t border-[rgba(0,0,0,0.05)]">
            <button
              type="button"
              onClick={() => setEditingRental(null)}
              className="px-6 py-3 neo-btn text-slate-500 font-bold text-sm transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 neo-btn-primary font-bold text-sm transition-colors cursor-pointer"
            >
              Save Changes
            </button>
          </div>
        </form>
      )}

      {/* 4. Tickets Stack/List view */}
      <div className="space-y-6">
        {filteredRentals.map((rental) => {
          const computedStatus = getRentalComputedStatus(rental);
          const isPreBooked = computedStatus === 'pre-booked';
          const isOverdue = computedStatus === 'overdue';
          const isReturned = computedStatus === 'returned';

          const totalOrderVal = rental.rentalCharge + rental.advanceAmount;
          const prePaid = rental.preBookingPaid || 0;
          const remainingBalance = totalOrderVal - prePaid;

          return (
            <div
              key={rental.id}
              className={`neo-flat relative overflow-hidden transition-all flex flex-col md:flex-row justify-between group ${isPreBooked
                  ? 'ring-1 ring-amber-400'
                  : isOverdue
                    ? 'ring-1 ring-red-400'
                    : ''
                }`}
            >
              {/* Costume Tag left accent bar */}
              <div
                className={`absolute left-0 top-0 w-2 h-full ${isPreBooked ? 'bg-amber-400' : isOverdue ? 'bg-red-400' : isReturned ? 'bg-slate-300' : 'bg-[var(--color-sky)]'
                  }`}
              />

              <div className="flex-1 p-6 pl-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
                {/* Section A: Customer details (4 cols) */}
                <div className="md:col-span-4 space-y-3">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`text-[10px] font-bold tracking-widest uppercase px-3 py-1 neo-pressed ${isPreBooked
                          ? 'text-amber-500'
                          : isOverdue
                            ? 'text-red-500'
                            : isReturned
                              ? 'text-slate-400'
                              : 'text-[var(--color-sky)]'
                        }`}
                    >
                      {isPreBooked ? 'PRE-BOOKED' : computedStatus}
                    </span>

                    <span className="text-[10px] font-mono font-bold text-[var(--color-navy)] uppercase tracking-widest">
                      #{rental.bookingNumber || '1000'}
                    </span>
                  </div>

                  <h4 className="text-xl font-black text-[var(--color-navy)] flex items-center gap-2 leading-tight">
                    <User className="w-5 h-5 text-[var(--color-sky)] shrink-0" />
                    {rental.customerName}
                  </h4>

                  <p className="text-sm font-medium text-slate-500 flex items-center gap-2 font-mono">
                    <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                    {rental.customerPhone}
                  </p>

                  {rental.customerAddress && (
                    <p className="text-xs font-medium text-slate-500 flex items-center gap-2 font-mono truncate" title={rental.customerAddress}>
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      {rental.customerAddress}
                    </p>
                  )}
                </div>

                {/* Section B: Rented Outfit Details (4 cols) */}
                <div className="md:col-span-4 space-y-3 md:border-x border-[rgba(0,0,0,0.05)] md:px-8 py-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Items</span>
                  <div className="space-y-2 text-sm">
                    {rental.items.map((item, idx) => (
                      <p key={idx} className="font-bold text-[var(--color-navy)] flex justify-between items-center">
                        <span>• {item.name}</span>
                        <span className="text-[10px] neo-pressed text-[var(--color-sky)] px-2 py-1 font-mono uppercase tracking-widest">
                          {item.size} × {item.quantity}
                        </span>
                      </p>
                    ))}

                    {rental.additionalItems.length > 0 && (
                      <div className="text-slate-500 text-xs font-medium pt-2 border-t border-[rgba(0,0,0,0.05)] mt-2">
                        Extras: {rental.additionalItems.map((ai) => `${ai.name} (x${ai.quantity})`).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section C: Financials & Dates (4 cols) */}
                <div className="md:col-span-4 grid grid-cols-2 gap-4 text-sm font-medium">
                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold tracking-widest uppercase text-slate-500">
                      {isPreBooked ? 'Pickup' : 'Handover'}
                    </span>
                    <span className="text-[var(--color-navy)] font-bold flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[var(--color-sky)]" />
                      {rental.dateGiven}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold tracking-widest uppercase text-slate-500">Due</span>
                    <span className={`font-bold flex items-center gap-2 ${isOverdue ? 'text-red-500' : 'text-[var(--color-navy)]'}`}>
                      <Calendar className={`w-4 h-4 ${isOverdue ? 'text-red-400' : 'text-[var(--color-sky)]'}`} />
                      {rental.expectedReturnDate}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold tracking-widest uppercase text-slate-500">Rent</span>
                    <span className="font-black text-[var(--color-sky)] font-mono">
                      {formatINR(rental.rentalCharge)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="block text-[10px] font-bold tracking-widest uppercase text-slate-500">Deposit</span>
                    <span className={`font-black font-mono ${rental.advanceReturned ? 'text-slate-400 line-through' : 'text-emerald-500'}`}>
                      {formatINR(rental.advanceAmount)}
                    </span>
                  </div>

                  {/* Pre-Booking Token & Remaining Balance if Pre-Booked */}
                  {isPreBooked && (
                    <div className="col-span-2 pt-4 border-t border-[rgba(0,0,0,0.05)] mt-2 space-y-2">
                      <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest text-amber-500">
                        <span>Paid Token:</span>
                        <span className="font-mono text-emerald-500">{formatINR(prePaid)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-[var(--color-navy)] border-t border-[rgba(0,0,0,0.05)] pt-2">
                        <span className="uppercase tracking-widest text-[10px]">Due at Handover:</span>
                        <span className="font-mono text-amber-500 text-lg leading-none">{formatINR(remainingBalance)}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Toolbar at Right side */}
              <div className="md:w-32 bg-[rgba(0,0,0,0.02)] p-4 shrink-0 flex flex-row md:flex-col justify-center gap-4 items-center border-t md:border-t-0 md:border-l border-[rgba(0,0,0,0.05)]">

                <div className="flex gap-2 flex-row md:flex-col w-full">
                  {/* Download PDF Invoice */}
                  <button
                    type="button"
                    onClick={() => {
                      generateRentalInvoicePDF(rental);
                      alert(`Generated PDF Invoice for ${rental.customerName}`, 'success');
                    }}
                    className="p-3 w-full neo-btn text-[var(--color-sky)] hover:text-[var(--color-navy)] flex justify-center"
                    title="Download PDF"
                  >
                    <Download className="w-5 h-5" />
                  </button>

                  {/* View details */}
                  <button
                    type="button"
                    onClick={() => setSelectedRentalForView(rental)}
                    className="p-3 w-full neo-btn text-slate-400 hover:text-[var(--color-navy)] flex justify-center"
                    title="View Invoice"
                  >
                    <Eye className="w-5 h-5" />
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => startEditRental(rental)}
                    className="p-3 w-full neo-btn text-slate-400 hover:text-[var(--color-navy)] flex justify-center"
                    title="Edit Record"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => handleDeleteRental(rental.id, rental.customerName)}
                    className="p-3 w-full neo-btn text-red-400 hover:text-red-500 flex justify-center"
                    title="Delete Record"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>

                {/* Handover or Return Button */}
                {isPreBooked ? (
                  <button
                    type="button"
                    onClick={() => handleHandoverPreBooking(rental)}
                    className="w-full py-3 neo-btn text-amber-500 font-bold text-[10px] uppercase tracking-widest flex flex-col items-center gap-1 leading-tight hover:text-amber-600"
                    title="Complete Handover"
                  >
                    <ArrowRight className="w-5 h-5 mb-1" /> Handover
                  </button>
                ) : !isReturned ? (
                  <button
                    type="button"
                    onClick={() => openReturnPanel(rental)}
                    className="w-full py-3 neo-btn text-emerald-500 font-bold text-[10px] uppercase tracking-widest flex flex-col items-center gap-1 leading-tight hover:text-emerald-600"
                    title="Process Return"
                  >
                    <CheckCircle2 className="w-5 h-5 mb-1" /> Return
                  </button>
                ) : (
                  <div className="w-full py-3 neo-pressed text-emerald-500 font-bold text-[10px] uppercase tracking-widest flex flex-col items-center gap-1 leading-tight">
                    <Check className="w-5 h-5 mb-1" /> Returned
                  </div>
                )}

                {/* Advance Refund Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggleAdvance(rental)}
                  disabled={!isReturned}
                  className={`w-full py-3 font-bold text-[10px] uppercase tracking-widest flex flex-col items-center gap-1 leading-tight transition-all ${!isReturned
                      ? 'neo-pressed text-slate-400 opacity-50'
                      : rental.advanceReturned
                        ? 'neo-pressed text-slate-400'
                        : 'neo-btn text-emerald-500 hover:text-emerald-600'
                    }`}
                  title={rental.advanceReturned ? 'Refunded' : 'Refund'}
                >
                  {rental.advanceReturned ? 'Refunded' : 'Refund'}
                </button>
              </div>
            </div>
          );
        })}

        {filteredRentals.length === 0 && (
          <div className="py-12 text-center bg-stone-50 border-2 border-dashed border-stone-200 rounded-none">
            <Receipt className="w-12 h-12 text-stone-300 mx-auto mb-2" />
            <h3 className="text-xl font-bold text-stone-700">No Rental Records Found</h3>
            <p className="text-stone-500 text-base mt-1">Try adapting your search parameters or select &quot;ALL&quot;.</p>
          </div>
        )}
      </div>

      {/* 5. Receipts / Detailed Invoice View Modal */}
      {selectedRentalForView && (() => {
        const r = selectedRentalForView;
        const computed = getRentalComputedStatus(r);
        return (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-start justify-center p-4 pt-12 pb-12 overflow-y-auto animate-fadeIn font-sans">
            <div className="neo-flat max-w-2xl w-full relative overflow-hidden my-auto">

              {/* Ticket Header */}
              <div className="bg-[var(--color-navy)] text-slate-100 p-8 flex justify-between items-center relative">
                <div>
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-400 font-bold block mb-2">ARIYA THANGAM FANCY DRESS FOR RENT</span>
                  <div className="flex items-center gap-3">
                    <h3 className="text-2xl font-black text-white">Invoice</h3>
                    <span className="neo-flat text-[var(--color-navy)] font-black text-[10px] px-3 py-1 font-mono uppercase tracking-widest border-none">
                      #{r.bookingNumber || '1000'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      generateRentalInvoicePDF(r);
                      alert(`Downloaded PDF Invoice for ${r.customerName}`, 'success');
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/10 rounded-xl font-bold text-xs uppercase tracking-widest transition-all cursor-pointer"
                  >
                    <Download className="w-4 h-4" /> PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedRentalForView(null)}
                    className="p-2 bg-[rgba(0,0,0,0.2)] text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Receipt Content */}
              <div className="p-8 space-y-8">

                {/* Visual divider line */}
                <div className="border-b border-[rgba(0,0,0,0.05)] pb-6 flex justify-between items-start text-sm">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest font-bold mb-2">Issued To</p>
                    <p className="text-xl font-black text-[var(--color-navy)]">{r.customerName}</p>
                    <p className="text-sm text-slate-500 font-mono font-bold mt-1">{r.customerPhone}</p>
                    {r.customerAddress && (
                      <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-2">
                        <MapPin className="w-4 h-4 text-slate-400 shrink-0" /> {r.customerAddress}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest font-bold mb-2">Status</p>
                    <span className={`text-[10px] font-black px-4 py-2 neo-pressed font-mono uppercase tracking-widest inline-block ${computed === 'pre-booked' ? 'text-amber-500' : computed === 'overdue' ? 'text-red-500' : computed === 'returned' ? 'text-slate-500' : 'text-[var(--color-sky)]'
                      }`}>
                      {computed === 'pre-booked' ? 'PRE-BOOKED' : computed}
                    </span>
                  </div>
                </div>

                {/* Items and prices list */}
                <div className="space-y-4">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Outfits Checklist</h5>
                  <div className="neo-pressed overflow-hidden">
                    {r.items.map((item, idx) => (
                      <div key={idx} className="p-4 flex justify-between items-center text-sm border-b border-[rgba(0,0,0,0.05)] last:border-0">
                        <div>
                          <p className="font-bold text-[var(--color-navy)]">{item.name}</p>
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mt-1">{item.categoryName} • Size {item.size}</p>
                        </div>
                        <div className="text-right font-mono text-xs font-bold text-[var(--color-sky)]">
                          {item.quantity} × {formatINR(item.rentalPrice)} = {formatINR(item.quantity * item.rentalPrice)}
                        </div>
                      </div>
                    ))}

                    {r.additionalItems.length > 0 && (
                      <div className="p-4 bg-[rgba(0,0,0,0.02)] text-xs border-t border-[rgba(0,0,0,0.05)]">
                        <p className="font-bold text-slate-500 mb-2 uppercase font-mono text-[10px] tracking-widest">Accessories</p>
                        <div className="space-y-2 text-slate-600">
                          {r.additionalItems.map((ai, index) => (
                            <p key={index} className="flex justify-between font-bold">
                              <span>• {ai.name}</span>
                              <span className="font-mono text-slate-500">x{ai.quantity}</span>
                            </p>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dates Box */}
                <div className="grid grid-cols-3 gap-6 border-y border-[rgba(0,0,0,0.05)] py-6 font-medium text-xs">
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold mb-2">Pickup Date</span>
                    <span className="text-sm text-[var(--color-navy)] font-black">{r.dateGiven}</span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold mb-2">Due Return</span>
                    <span className={`text-sm font-black ${computed === 'overdue' ? 'text-red-500' : 'text-[var(--color-navy)]'}`}>
                      {r.expectedReturnDate}
                    </span>
                  </div>
                  <div>
                    <span className="block text-[10px] uppercase tracking-widest text-slate-500 font-mono font-bold mb-2">Actual Return</span>
                    <span className="text-sm text-slate-500 font-black">
                      {r.actualReturnDate || 'Pending'}
                    </span>
                  </div>
                </div>

                {/* Charges Breakdown */}
                <div className="space-y-4 neo-pressed p-6">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Invoice Summary</h5>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between text-slate-600 font-bold">
                      <span>Rent (Revenue)</span>
                      <span className="font-mono text-[var(--color-navy)]">{formatINR(r.rentalCharge)}</span>
                    </div>
                    <div className="flex justify-between text-slate-600 font-bold">
                      <span>Security Deposit</span>
                      <span className="font-mono">{formatINR(r.advanceAmount)}</span>
                    </div>

                    {r.isPreBooking || r.preBookingPaid ? (
                      <>
                        <div className="flex justify-between text-amber-600 font-bold neo-flat p-3 mt-4">
                          <span>Token Paid</span>
                          <span className="font-mono">{formatINR(r.preBookingPaid || 0)}</span>
                        </div>
                        <div className="pt-4 flex justify-between font-black text-[var(--color-navy)] text-lg">
                          <span>Balance Due</span>
                          <span className="font-mono text-[var(--color-sky)]">{formatINR((r.rentalCharge + r.advanceAmount) - (r.preBookingPaid || 0))}</span>
                        </div>
                      </>
                    ) : (
                      <div className="border-t border-[rgba(0,0,0,0.05)] pt-4 flex justify-between font-black text-[var(--color-navy)] text-lg">
                        <span>Total Paid</span>
                        <span className="font-mono text-[var(--color-sky)]">{formatINR(r.rentalCharge + r.advanceAmount)}</span>
                      </div>
                    )}

                    <div className="flex justify-between text-[10px] uppercase tracking-widest pt-4 items-center font-bold">
                      <span className="text-slate-500">Deposit Status:</span>
                      <span className={`px-3 py-1 neo-pressed ${r.advanceReturned ? 'text-emerald-500' : 'text-amber-500'}`}>
                        {r.advanceReturned ? 'REFUNDED' : 'HELD'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Photos Grid display (Handover vs Return) */}
                {(r.handoverPhotos.length > 0 || (r.returnPhotos && r.returnPhotos.length > 0)) && (
                  <div className="space-y-4">
                    <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">Condition Photos</h5>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {/* Handover photos */}
                      {r.handoverPhotos.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Handover ({r.handoverPhotos.length})</p>
                          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                            {r.handoverPhotos.map((img, idx) => (
                              <div key={idx} className="w-20 h-20 neo-pressed overflow-hidden shrink-0">
                                <img referrerPolicy="no-referrer" src={img} alt="handover record" className="w-full h-full object-cover rounded-lg mix-blend-multiply" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Return photos */}
                      {r.returnPhotos && r.returnPhotos.length > 0 && (
                        <div className="space-y-3">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Return ({r.returnPhotos.length})</p>
                          <div className="flex gap-3 overflow-x-auto pb-2 hide-scrollbar">
                            {r.returnPhotos.map((img, idx) => (
                              <div key={idx} className="w-20 h-20 neo-pressed overflow-hidden shrink-0">
                                <img referrerPolicy="no-referrer" src={img} alt="return record" className="w-full h-full object-cover rounded-lg mix-blend-multiply" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {r.notes && (
                  <div className="p-5 neo-pressed">
                    <p className="font-bold text-[10px] text-slate-500 uppercase font-mono tracking-widest mb-2">Notes</p>
                    <p className="italic font-medium text-sm text-[var(--color-navy)]">{r.notes}</p>
                  </div>
                )}
              </div>

              {/* Receipt Footer printable design */}
              <div className="bg-[rgba(0,0,0,0.02)] text-center py-4 border-t border-[rgba(0,0,0,0.05)] font-mono text-[10px] text-slate-500 font-bold tracking-widest uppercase">
                <span>THANK YOU</span>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
