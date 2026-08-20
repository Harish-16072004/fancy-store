import React from 'react';
import { X, Calendar, Clock, User, Phone, CheckCircle2, AlertTriangle, Sparkles, Hash, ArrowRight } from 'lucide-react';
import { InventoryItem, Rental } from '../types';
import { getItemBookedRentals, checkDateRangeOverlap } from '../utils/availability';

interface CostumeScheduleModalProps {
  item: InventoryItem | null;
  rentals: Rental[];
  targetStartDate?: string;
  targetEndDate?: string;
  onClose: () => void;
}

export default function CostumeScheduleModal({
  item,
  rentals,
  targetStartDate,
  targetEndDate,
  onClose,
}: CostumeScheduleModalProps) {
  if (!item) return null;

  const bookings = getItemBookedRentals(item.id, rentals);
  const totalStock = Number(item.quantity) || 0;

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white w-full max-w-2xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-slideUp">
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex items-start justify-between gap-4 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xxs font-mono uppercase tracking-widest text-sky-400 font-extrabold">
                Rotation Schedule &amp; Bookings
              </span>
              <span className="bg-blue-600 text-white font-mono text-xxs font-bold px-2 py-0.5">
                Total Stock: {totalStock} unit{totalStock > 1 ? 's' : ''}
              </span>
            </div>
            <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              {item.name}
            </h3>
            <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 font-mono">
              <span>Size: <strong className="text-white">{item.size}</strong></span>
              <span>•</span>
              <span>Rate: <strong className="text-emerald-400">₹{item.rentalPrice}/day</strong></span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Selected Query Range Reference (if given) */}
        {targetStartDate && targetEndDate && (
          <div className="bg-blue-50/80 border-b border-blue-100 px-5 py-3 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-blue-700 shrink-0" />
              <span className="text-slate-700">
                Checking availability for: <strong className="text-slate-900 font-mono">{targetStartDate}</strong> <ArrowRight className="inline w-3 h-3 text-slate-400 mx-1" /> <strong className="text-slate-900 font-mono">{targetEndDate}</strong>
              </span>
            </div>
            <span className="text-xxs font-bold text-blue-800 bg-white border border-blue-200 px-2 py-0.5 font-mono">
              ROTATION CHECK
            </span>
          </div>
        )}

        {/* Booking Timeline List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {bookings.length === 0 ? (
            <div className="py-12 text-center bg-slate-50 border border-dashed border-slate-200 p-6 space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">100% Free - No Active Reservations</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                This costume currently has no conflicting active rentals or upcoming pre-bookings. All {totalStock} unit{totalStock > 1 ? 's are' : ' is'} ready for immediate booking or rotation.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">
                <span>Reserved Slots ({bookings.length})</span>
                <span className="text-xxs text-slate-400">Sorted by Pickup Date</span>
              </div>

              <div className="space-y-2.5">
                {bookings.map(({ rental, quantity, startDate, endDate, status }, idx) => {
                  const isConflict = targetStartDate && targetEndDate
                    ? checkDateRangeOverlap(targetStartDate, targetEndDate, startDate, endDate)
                    : false;

                  return (
                    <div
                      key={rental.id || idx}
                      className={`p-4 border transition-all ${
                        isConflict
                          ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400/50'
                          : 'bg-white border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
                        <div className="flex items-center gap-2">
                          <span className="bg-slate-900 text-white font-mono text-xs font-black px-2 py-0.5">
                            {rental.bookingNumber || `BK-${rental.id.slice(-4)}`}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">{rental.customerName}</span>
                        </div>

                        <div className="flex items-center gap-2">
                          {isConflict && (
                            <span className="text-xxs font-black bg-amber-500 text-slate-950 px-2 py-0.5 font-mono flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> OVERLAPS REQUESTED DATES
                            </span>
                          )}
                          <span
                            className={`text-xxs font-black px-2 py-0.5 font-mono uppercase ${
                              status === 'pre-booked'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : status === 'overdue'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-50 text-blue-800'
                            }`}
                          >
                            {status === 'pre-booked' ? 'Pre-Booked' : status}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2.5 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 block font-mono uppercase font-bold">Pickup Date</span>
                            <span className="font-bold font-mono text-slate-800">{startDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Clock className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 block font-mono uppercase font-bold">Return Date</span>
                            <span className="font-bold font-mono text-slate-800">{endDate}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 text-slate-600">
                          <Hash className="w-4 h-4 text-slate-400 shrink-0" />
                          <div>
                            <span className="text-[10px] text-slate-400 block font-mono uppercase font-bold">Qty Reserved</span>
                            <span className="font-bold font-mono text-slate-800">{quantity} unit{quantity > 1 ? 's' : ''}</span>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 text-xxs text-slate-500 flex items-center justify-between font-mono pt-1">
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" /> {rental.customerPhone || 'No phone recorded'}
                        </span>
                        <span>
                          {rental.isPreBooking ? `Token Paid: ₹${rental.preBookingPaid || 0}` : 'Active In-Field'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Rotation Explanation Box */}
          <div className="bg-slate-50 border border-slate-200 p-3 text-xxs text-slate-600 space-y-1 font-sans">
            <strong className="text-slate-800 font-bold block flex items-center gap-1 font-mono uppercase">
              <CheckCircle2 className="w-3.5 h-3.5 text-blue-700" /> Dress Rotation Rule:
            </strong>
            <p>
              When an order returns on date <strong>X</strong> (e.g. Aug 12), the dress is checked in and ready for the next customer picking up on date <strong>X</strong> (Aug 12) or later.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-100 px-5 py-3 border-t border-slate-200 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-colors cursor-pointer"
          >
            Close Schedule
          </button>
        </div>
      </div>
    </div>
  );
}
