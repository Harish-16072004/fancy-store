import React, { useState } from 'react';
import { Search, Filter, Calendar, User, Phone, MapPin, CheckCircle2, AlertCircle, Trash2, Edit2, FileDown, Eye, Camera, Check, ToggleLeft, ToggleRight, X, Sparkles, Receipt, HelpCircle, ArrowRight, Printer, Download } from 'lucide-react';
import { Rental, Category, InventoryItem } from '../types';
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
        .map((item) => `${item.name} [Size: ${item.size}, Qty: ${item.quantity}, Price: ₹${item.rentalPrice}]`)
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
        'Rental Charge (₹)': r.rentalCharge,
        'Security Deposit (₹)': r.advanceAmount,
        'Pre-Booking Paid Today (₹)': r.preBookingPaid || 0,
        'Remaining Balance Due (₹)': (r.rentalCharge + r.advanceAmount) - (r.preBookingPaid || 0),
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
      alert(`Dress handed over for Booking #${rental.bookingNumber}! Collected remaining balance of ₹${remainingBalance}. Order is now ACTIVE.`, 'success');
    };

    if (onShowConfirm) {
      onShowConfirm(
        `Complete Handover for Booking #${rental.bookingNumber}`,
        `Customer: ${rental.customerName} (${rental.customerPhone})\n\n• Total Order Cost (Rent + Deposit): ₹${totalOrderCost}\n• Pre-Booking Token Paid: ₹${rental.preBookingPaid || 0}\n• REMAINING BALANCE TO COLLECT TODAY: ₹${remainingBalance}\n\nConfirm collecting ₹${remainingBalance} and completing costume handover?`,
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
      <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white p-4 border border-slate-200 rounded-none shadow-sm">
        
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
          <input
            type="text"
            id="search-rentals"
            placeholder="Search by Booking # (e.g. BK-1001), name, phone, or address..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-none bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all font-medium"
          />
        </div>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {(['all', 'pre-booked', 'active', 'overdue', 'returned'] as const).map((filter) => (
            <button
              key={filter}
              type="button"
              id={`filter-status-${filter}`}
              onClick={() => setStatusFilter(filter)}
              className={`px-3.5 py-1.5 rounded-none font-bold text-xs uppercase shrink-0 transition-all cursor-pointer ${
                statusFilter === filter
                  ? filter === 'pre-booked'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                    : 'bg-slate-900 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {filter === 'pre-booked' ? 'PRE-BOOKED' : filter}
            </button>
          ))}
        </div>

        {/* Excel Export Triggers */}
        <div className="flex gap-2">
          <button
            type="button"
            id="btn-export-filtered-rentals"
            onClick={() => handleExportRentalsExcel(false)}
            className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-none flex items-center justify-center gap-1.5 transition-all text-xs font-bold cursor-pointer"
            title="Export current filtered list"
          >
            <FileDown className="w-4.5 h-4.5" /> Export Filtered (.xlsx)
          </button>
        </div>
      </div>

      {/* 2. Overdue return camera process panel */}
      {returningRentalId && (() => {
        const rental = rentals.find((r) => r.id === returningRentalId)!;
        return (
          <div className="p-6 bg-white border border-slate-200 rounded-none shadow-sm space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <Receipt className="w-5 h-5 text-blue-800" />
                Register Costume Return for {rental.customerName}
              </h3>
              <button
                type="button"
                id="btn-close-return-panel"
                onClick={() => setReturningRentalId(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-none transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-slate-50 border border-slate-200 rounded-none p-4 space-y-2">
                  <h4 className="font-bold text-slate-800 text-sm">Handover Costume Specifications</h4>
                  <div className="text-xs text-slate-600 space-y-1">
                    {rental.items.map((i) => (
                      <p key={i.itemId}>
                        • <strong>{i.name}</strong> (Size: {i.size} • Rented: {i.quantity})
                      </p>
                    ))}
                    {rental.additionalItems.length > 0 && (
                      <div className="pt-1.5 border-t border-slate-200 mt-1.5">
                        <p className="font-semibold">Additional items to count back:</p>
                        {rental.additionalItems.map((ai, index) => (
                          <p key={index} className="text-xxs">• {ai.name} (Qty: {ai.quantity})</p>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Date Returned *</label>
                    <input
                      type="date"
                      required
                      value={actualReturnDate}
                      onChange={(e) => setActualReturnDate(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Notes on Return Condition</label>
                    <input
                      type="text"
                      placeholder="e.g. Returned clean, minor rip..."
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>
                </div>

                {/* Compare Handover Photos */}
                {rental.handoverPhotos.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-xs font-bold text-slate-600 flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-slate-400" /> Reference Handover Condition Photos:
                    </p>
                    <div className="flex gap-2 overflow-x-auto pb-1">
                      {rental.handoverPhotos.map((p, idx) => (
                        <div key={idx} className="relative w-16 h-16 rounded-none overflow-hidden border border-slate-200 shrink-0">
                          <img referrerPolicy="no-referrer" src={p} alt="handover record" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Capture return photos */}
              <div className="bg-slate-50 p-4 border border-slate-200 rounded-none">
                <CameraCapture
                  photos={returnPhotos}
                  onChange={setReturnPhotos}
                  label="Capture Return Condition"
                  maxPhotos={5}
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                id="btn-cancel-complete-return"
                onClick={() => setReturningRentalId(null)}
                className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-none text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                id="btn-complete-return"
                onClick={handleCompleteReturn}
                className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-none text-xs shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" /> Mark Dress Returned
              </button>
            </div>
          </div>
        );
      })()}

      {/* 3. Editing Rental Record Panel */}
      {editingRental && (
        <form onSubmit={saveRentalEdits} className="p-6 bg-white border border-slate-200 rounded-none shadow-sm space-y-4 animate-fadeIn">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h3 className="text-lg font-bold text-slate-800">Edit Rental Handover Record</h3>
            <button
              type="button"
              id="btn-close-edit-rental"
              onClick={() => setEditingRental(null)}
              className="p-1 text-slate-400 hover:text-slate-600 rounded-none transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Name</label>
              <input
                type="text"
                required
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Phone</label>
              <input
                type="text"
                required
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Customer Address</label>
              <input
                type="text"
                value={editAddress}
                placeholder="Enter Address / City"
                onChange={(e) => setEditAddress(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Rental Charge (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={editCharge}
                onChange={(e) => setEditCharge(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Date Given</label>
              <input
                type="date"
                required
                value={editDateGiven}
                onChange={(e) => setEditDateGiven(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Expected Return Date</label>
              <input
                type="date"
                required
                value={editExpectedDate}
                onChange={(e) => setEditExpectedDate(e.target.value)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Advance Deposit (₹)</label>
              <input
                type="number"
                required
                min="0"
                value={editAdvance}
                onChange={(e) => setEditAdvance(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 font-mono focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-800 mb-1">Pre-Booking Token Paid Today (₹)</label>
              <input
                type="number"
                min="0"
                value={editPreBookingPaid}
                onChange={(e) => setEditPreBookingPaid(parseInt(e.target.value) || 0)}
                className="w-full px-3 py-1.5 border border-amber-200 rounded-none text-sm bg-amber-50/50 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-600"
              />
            </div>

            <div className="md:col-span-2 lg:col-span-3">
              <label className="block text-xs font-bold text-slate-700 mb-1">Notes</label>
              <textarea
                value={editNotes}
                onChange={(e) => setEditNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              id="btn-cancel-save-edit-rental"
              onClick={() => setEditingRental(null)}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-none text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-edit-rental"
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-none text-xs shadow-xs transition-colors cursor-pointer"
            >
              Save Record Changes
            </button>
          </div>
        </form>
      )}

      {/* 4. Tickets Stack/List view */}
      <div className="space-y-4">
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
              id={`rental-card-${rental.id}`}
              className={`relative bg-white border rounded-none shadow-xs hover:shadow-sm transition-all flex flex-col md:flex-row justify-between overflow-hidden ${
                isPreBooked
                  ? 'border-amber-300 bg-amber-50/10'
                  : isOverdue
                  ? 'border-red-200 bg-red-50/5'
                  : isReturned
                  ? 'border-slate-200'
                  : 'border-blue-100'
              }`}
            >
              {/* Costume Tag left accent bar */}
              <div
                className={`w-full md:w-2 shrink-0 h-3 md:h-auto ${
                  isPreBooked ? 'bg-amber-500' : isOverdue ? 'bg-red-500' : isReturned ? 'bg-slate-300' : 'bg-blue-600'
                }`}
              />

              <div className="flex-1 p-5 grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                {/* Section A: Customer details (4 cols) */}
                <div className="md:col-span-4 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xxs font-black tracking-wider uppercase px-2 py-0.5 rounded-none font-mono ${
                        isPreBooked
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : isOverdue
                          ? 'bg-red-100 text-red-700'
                          : isReturned
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-blue-50 text-blue-800'
                      }`}
                    >
                      {isPreBooked ? 'PRE-BOOKED' : computedStatus}
                    </span>
                    
                    <span className="text-xs font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 border border-amber-200/80">
                      BOOKING #: {rental.bookingNumber || 'BK-1000'}
                    </span>
                  </div>

                  <h4 className="text-lg font-bold text-slate-900 flex items-center gap-1.5 leading-tight">
                    <User className="w-4 h-4 text-slate-400 shrink-0" />
                    {rental.customerName}
                  </h4>

                  <p className="text-sm text-slate-500 flex items-center gap-1.5 font-mono">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    {rental.customerPhone}
                  </p>

                  {rental.customerAddress && (
                    <p className="text-xs text-slate-500 flex items-center gap-1.5 font-mono truncate" title={rental.customerAddress}>
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {rental.customerAddress}
                    </p>
                  )}
                </div>

                {/* Section B: Rented Outfit Details (4 cols) */}
                <div className="md:col-span-4 space-y-1.5 border-y md:border-y-0 md:border-x border-slate-100 py-3 md:py-0 md:px-5">
                  <span className="text-xxs font-bold text-slate-400 uppercase tracking-wider font-mono">Costumes & Items</span>
                  <div className="space-y-1 text-sm">
                    {rental.items.map((item, idx) => (
                      <p key={idx} className="font-semibold text-slate-800 flex justify-between">
                        <span>• {item.name}</span>
                        <span className="text-xxs bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded-none ml-2 whitespace-nowrap">
                          {item.size} × {item.quantity}
                        </span>
                      </p>
                    ))}

                    {rental.additionalItems.length > 0 && (
                      <div className="text-slate-500 text-xs italic pt-1 border-t border-dashed border-slate-100 mt-1">
                        Extras: {rental.additionalItems.map((ai) => `${ai.name} (x${ai.quantity})`).join(', ')}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section C: Financials & Dates (4 cols) */}
                <div className="md:col-span-4 grid grid-cols-2 gap-2.5 text-xs">
                  <div className="space-y-0.5">
                    <span className="block text-xxs font-mono uppercase text-slate-400">
                      {isPreBooked ? 'Scheduled Pickup' : 'Handed Over'}
                    </span>
                    <span className="text-sm text-slate-700 font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {rental.dateGiven}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="block text-xxs font-mono uppercase text-slate-400">Due Back</span>
                    <span className={`text-sm font-semibold flex items-center gap-1 ${isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      {rental.expectedReturnDate}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="block text-xxs font-mono uppercase text-slate-400">Rental Charge</span>
                    <span className="text-sm font-bold text-blue-700 font-mono">
                      ₹{rental.rentalCharge}
                    </span>
                  </div>

                  <div className="space-y-0.5">
                    <span className="block text-xxs font-mono uppercase text-slate-400">Deposit (Refundable)</span>
                    <span className={`text-sm font-bold font-mono ${rental.advanceReturned ? 'text-slate-400 line-through' : 'text-emerald-600'}`}>
                      ₹{rental.advanceAmount}
                    </span>
                  </div>

                  {/* Pre-Booking Token & Remaining Balance if Pre-Booked */}
                  {isPreBooked && (
                    <div className="col-span-2 pt-2 border-t border-amber-200/60 bg-amber-50/80 p-2 rounded-none space-y-1">
                      <div className="flex justify-between text-xxs font-bold text-amber-900">
                        <span>Pre-Paid Advance Token:</span>
                        <span className="font-mono text-emerald-700">₹{prePaid}</span>
                      </div>
                      <div className="flex justify-between text-xs font-black text-slate-900 border-t border-amber-200/80 pt-1">
                        <span>Balance Due at Handover:</span>
                        <span className="font-mono text-amber-900">₹{remainingBalance}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons Toolbar at Right side */}
              <div className="bg-slate-50 border-t md:border-t-0 md:border-l border-slate-100 p-4 shrink-0 flex md:flex-col justify-end md:justify-center gap-2 items-center">
                
                <div className="flex gap-1 md:flex-row items-center">
                  {/* Download PDF Invoice */}
                  <button
                    type="button"
                    id={`btn-download-pdf-${rental.id}`}
                    onClick={() => {
                      generateRentalInvoicePDF(rental);
                      alert(`Generated PDF Invoice for ${rental.customerName}`, 'success');
                    }}
                    className="p-1.5 rounded-none text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors cursor-pointer"
                    title="Download PDF Bill Invoice"
                  >
                    <Download className="w-4.5 h-4.5" />
                  </button>

                  {/* View details */}
                  <button
                    type="button"
                    id={`btn-view-details-${rental.id}`}
                    onClick={() => setSelectedRentalForView(rental)}
                    className="p-1.5 rounded-none text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                    title="View Invoice Slip"
                  >
                    <Eye className="w-4.5 h-4.5" />
                  </button>

                  {/* Edit */}
                  <button
                    type="button"
                    id={`btn-edit-rental-${rental.id}`}
                    onClick={() => startEditRental(rental)}
                    className="p-1.5 rounded-none text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 transition-colors cursor-pointer"
                    title="Edit Record"
                  >
                    <Edit2 className="w-4.5 h-4.5" />
                  </button>

                  {/* Delete */}
                  <button
                    type="button"
                    id={`btn-delete-rental-${rental.id}`}
                    onClick={() => handleDeleteRental(rental.id, rental.customerName)}
                    className="p-1.5 rounded-none text-red-500 hover:text-red-700 hover:bg-red-50 transition-colors cursor-pointer"
                    title="Delete Record"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>

                {/* Handover or Return Button */}
                {isPreBooked ? (
                  <button
                    type="button"
                    id={`btn-handover-prebooking-${rental.id}`}
                    onClick={() => handleHandoverPreBooking(rental)}
                    className="px-3 py-1.5 rounded-none bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                    title="Collect remaining balance and mark as active handover"
                  >
                    <ArrowRight className="w-4 h-4" /> Handover (Collect ₹{remainingBalance})
                  </button>
                ) : !isReturned ? (
                  <button
                    type="button"
                    id={`btn-return-dress-${rental.id}`}
                    onClick={() => openReturnPanel(rental)}
                    className="px-3 py-1.5 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-sm transition-all"
                    title="Process Costume Hand-back"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Return
                  </button>
                ) : (
                  <div className="px-3 py-1 text-emerald-700 font-bold text-xs bg-emerald-50 rounded-none border border-emerald-100 flex items-center gap-1 select-none">
                    <Check className="w-3.5 h-3.5" /> Returned
                  </div>
                )}

                {/* Advance Refund Toggle */}
                <button
                  type="button"
                  id={`btn-toggle-advance-${rental.id}`}
                  onClick={() => handleToggleAdvance(rental)}
                  disabled={!isReturned}
                  className={`px-2.5 py-1.5 rounded-none border font-bold text-xs flex items-center gap-1 cursor-pointer transition-all ${
                    !isReturned 
                      ? 'opacity-40 border-slate-100 bg-slate-50 text-slate-400' 
                      : rental.advanceReturned 
                      ? 'bg-slate-200 border-slate-300 text-slate-600' 
                      : 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100'
                  }`}
                  title={rental.advanceReturned ? 'Deposit is Refunded' : 'Pending Deposit Refund'}
                >
                  {rental.advanceReturned ? 'Refunded' : 'Refund Deposit'}
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
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto animate-fadeIn font-sans">
            <div className="bg-white border border-slate-200 rounded-none max-w-2xl w-full shadow-xl relative overflow-hidden my-8">
              
              {/* Ticket Header */}
              <div className="bg-slate-900 text-slate-100 p-6 flex justify-between items-center border-b border-slate-800 relative">
                <div>
                  <span className="font-mono text-xxs uppercase tracking-wider text-sky-400 font-bold block">ARIYA THANGAM FANCY DRESS FOR RENT</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <h3 className="text-xl font-bold text-white">Rental Ticket</h3>
                    <span className="bg-amber-500 text-slate-950 font-black text-xs px-2 py-0.5 font-mono">
                      BOOKING #: {r.bookingNumber || 'BK-1000'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-modal-download-pdf"
                    onClick={() => {
                      generateRentalInvoicePDF(r);
                      alert(`Downloaded PDF Invoice for ${r.customerName}`, 'success');
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-none transition-all cursor-pointer shadow-sm"
                  >
                    <Download className="w-3.5 h-3.5" /> PDF Invoice
                  </button>
                  <button
                    type="button"
                    id="btn-close-view-modal"
                    onClick={() => setSelectedRentalForView(null)}
                    className="p-1.5 bg-slate-800 text-slate-400 rounded-none hover:bg-slate-700 hover:text-white transition-colors cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Receipt Content */}
              <div className="p-6 space-y-5">
                
                {/* Visual divider line */}
                <div className="border-b border-slate-100 pb-4 flex justify-between items-center text-sm">
                  <div>
                    <p className="text-xxs text-slate-400 uppercase font-mono tracking-wider font-bold">Issued To</p>
                    <p className="text-lg font-bold text-slate-800">{r.customerName}</p>
                    <p className="text-xs text-slate-500 font-mono font-semibold">{r.customerPhone}</p>
                    {r.customerAddress && (
                      <p className="text-xs text-slate-500 font-mono flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" /> {r.customerAddress}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xxs text-slate-400 uppercase font-mono tracking-wider font-bold">Status</p>
                    <span className={`text-xxs font-black px-2.5 py-1 rounded-none font-mono uppercase inline-block ${
                      computed === 'pre-booked' ? 'bg-amber-100 text-amber-900 border border-amber-300' : computed === 'overdue' ? 'bg-red-100 text-red-700' : computed === 'returned' ? 'bg-slate-100 text-slate-600' : 'bg-blue-50 text-blue-800'
                    }`}>
                      {computed === 'pre-booked' ? 'PRE-BOOKED (ADVANCE)' : computed}
                    </span>
                  </div>
                </div>

                {/* Items and prices list */}
                <div className="space-y-2">
                  <h5 className="text-xxs font-bold text-slate-400 uppercase tracking-wider font-mono">Outfits Checklist</h5>
                  <div className="bg-slate-50 border border-slate-200 rounded-none divide-y divide-slate-100 overflow-hidden shadow-xs">
                    {r.items.map((item, idx) => (
                      <div key={idx} className="p-3.5 flex justify-between items-center text-sm">
                        <div>
                          <p className="font-bold text-slate-800">{item.name}</p>
                          <p className="text-xxs text-slate-400">Category: {item.categoryName} • Size: {item.size}</p>
                        </div>
                        <div className="text-right font-mono text-xs font-bold text-slate-700">
                          {item.quantity} × ₹{item.rentalPrice} = ₹{item.quantity * item.rentalPrice}
                        </div>
                      </div>
                    ))}

                    {r.additionalItems.length > 0 && (
                      <div className="p-3.5 bg-slate-100/40 text-xs">
                        <p className="font-bold text-slate-700 mb-1.5 uppercase font-mono text-xxs">Accessories Checklist</p>
                        <div className="space-y-1 text-slate-600">
                          {r.additionalItems.map((ai, index) => (
                            <p key={index} className="flex justify-between font-semibold">
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
                <div className="grid grid-cols-3 gap-4 border-y border-slate-150 py-3 font-semibold text-xs">
                  <div>
                    <span className="block text-xxs uppercase text-slate-400 font-mono">Date Taken</span>
                    <span className="text-sm text-slate-700 font-bold">{r.dateGiven}</span>
                  </div>
                  <div>
                    <span className="block text-xxs uppercase text-slate-400 font-mono">Expected Return</span>
                    <span className={`text-sm font-bold ${computed === 'overdue' ? 'text-red-600 font-black' : 'text-slate-700'}`}>
                      {r.expectedReturnDate}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xxs uppercase text-slate-400 font-mono">Actual Return</span>
                    <span className="text-sm text-slate-700 font-bold">
                      {r.actualReturnDate || 'Not Returned Yet'}
                    </span>
                  </div>
                </div>

                {/* Charges Breakdown */}
                <div className="space-y-3 bg-slate-50 p-4 rounded-none border border-slate-200">
                  <h5 className="text-xxs font-bold text-slate-400 uppercase tracking-wider font-mono">Charges & Revenue Breakdown</h5>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-800 font-bold">
                      <span>Net Costume Rental Charge (Revenue)</span>
                      <span className="font-mono text-blue-700">₹{r.rentalCharge}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Refundable Security Advance Deposit</span>
                      <span className="font-mono font-bold">₹{r.advanceAmount}</span>
                    </div>

                    {r.isPreBooking || r.preBookingPaid ? (
                      <>
                        <div className="flex justify-between text-amber-900 font-bold bg-amber-50 p-1.5 border border-amber-200/60">
                          <span>Pre-Booking Token Paid Today</span>
                          <span className="font-mono text-emerald-700">₹{r.preBookingPaid || 0}</span>
                        </div>
                        <div className="border-t border-slate-200 pt-2 flex justify-between font-black text-slate-900 text-sm">
                          <span>Remaining Balance at Handover</span>
                          <span className="font-mono text-amber-900 text-base">₹{(r.rentalCharge + r.advanceAmount) - (r.preBookingPaid || 0)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="border-t border-slate-200 pt-2 flex justify-between font-bold text-slate-800 text-sm">
                        <span>Upfront Collected at Counter</span>
                        <span className="font-mono text-slate-900 font-black text-base">₹{r.rentalCharge + r.advanceAmount}</span>
                      </div>
                    )}

                    <p className="text-[10px] text-slate-500 italic mt-0.5">
                      * Advance deposit (₹{r.advanceAmount}) is refunded upon costume return and is excluded from shop revenue metrics.
                    </p>

                    <div className="flex justify-between text-xxs pt-1 items-center font-bold">
                      <span className="text-slate-500">Deposit Settlement:</span>
                      <span className={`px-2 py-0.5 rounded-none font-mono ${r.advanceReturned ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-amber-50 text-amber-700 border border-amber-100'}`}>
                        {r.advanceReturned ? 'SETTLED & REFUNDED' : 'HELD IN SAFE (PENDING RETURN)'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Photos Grid display (Handover vs Return) */}
                {(r.handoverPhotos.length > 0 || (r.returnPhotos && r.returnPhotos.length > 0)) && (
                  <div className="space-y-2">
                    <h5 className="text-xxs font-bold text-slate-400 uppercase tracking-wider font-mono">Condition Photo Archive</h5>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* Handover photos */}
                      {r.handoverPhotos.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xxs text-slate-500 font-bold">Handover Photos ({r.handoverPhotos.length})</p>
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {r.handoverPhotos.map((img, idx) => (
                              <div key={idx} className="w-14 h-14 rounded-none border border-slate-200 overflow-hidden shrink-0">
                                <img referrerPolicy="no-referrer" src={img} alt="handover record" className="w-full h-full object-cover" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Return photos */}
                      {r.returnPhotos && r.returnPhotos.length > 0 && (
                        <div className="space-y-1">
                          <p className="text-xxs text-slate-500 font-bold">Return Photos ({r.returnPhotos.length})</p>
                          <div className="flex gap-1.5 overflow-x-auto pb-1">
                            {r.returnPhotos.map((img, idx) => (
                              <div key={idx} className="w-14 h-14 rounded-none border border-slate-200 overflow-hidden shrink-0">
                                <img referrerPolicy="no-referrer" src={img} alt="return record" className="w-full h-full object-cover" />
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
                  <div className="p-3 bg-blue-50/50 border border-blue-100 text-slate-700 rounded-none text-xs">
                    <p className="font-bold text-xxs text-blue-800 uppercase font-mono tracking-wider mb-0.5">Receipt Notes</p>
                    <p className="italic font-medium">&quot;{r.notes}&quot;</p>
                  </div>
                )}
              </div>

              {/* Receipt Footer printable design */}
              <div className="bg-slate-50 text-center py-3 border-t border-slate-100 font-mono text-xxs text-slate-400 font-bold">
                <span>THANK YOU FOR DEALING WITH MASQUERADE HUB</span>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
