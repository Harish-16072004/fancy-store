import React from 'react';
import { Clock, BookmarkCheck, Calendar, ArrowRight } from 'lucide-react';
import { toPaise } from '../../utils/money';

interface CustomerDetailsSectionProps {
  isPreBooking: boolean;
  setIsPreBooking: (val: boolean) => void;
  setPreBookingPaid: (val: number) => void;
  isAdvanceManuallyEdited: boolean;
  setAdvanceAmount: (val: number) => void;
  rentalCharge: number;
  dateGiven: string;
  setDateGiven: (val: string) => void;
  expectedReturnDate: string;
  setExpectedReturnDate: (val: string) => void;
  rentalDurationDays: number;
  customerName: string;
  setCustomerName: (val: string) => void;
  customerPhone: string;
  setCustomerPhone: (val: string) => void;
  customerAddress: string;
  setCustomerAddress: (val: string) => void;
}

export default function CustomerDetailsSection({
  isPreBooking, setIsPreBooking, setPreBookingPaid,
  isAdvanceManuallyEdited, setAdvanceAmount, rentalCharge,
  dateGiven, setDateGiven,
  expectedReturnDate, setExpectedReturnDate,
  rentalDurationDays,
  customerName, setCustomerName,
  customerPhone, setCustomerPhone,
  customerAddress, setCustomerAddress
}: CustomerDetailsSectionProps) {
  return (
    <>
      {/* 00. Booking Mode & Rotation Date Range Configuration */}
      <div className="neo-flat p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-[rgba(0,0,0,0.05)] pb-6">
          <div>
            <span className="text-[20px] font-bold text-[var(--color-sky)] block uppercase tracking-widest font-mono">
              Order Type
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
              className={`px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all ${!isPreBooking
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
                setPreBookingPaid(toPaise(200));
                if (!isAdvanceManuallyEdited) {
                  setAdvanceAmount(Math.max(0, rentalCharge - toPaise(200)));
                }
              }}
              className={`px-5 py-3 text-sm font-bold flex items-center gap-2 transition-all ${isPreBooking
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

      {/* 1. Customer Information Ticket Card */}
      <div className="neo-flat p-8 relative">
        <div className="absolute top-0 left-8 -translate-y-1/2 neo-flat bg-[var(--color-navy)] text-[var(--color-sky)] font-bold px-4 py-1 text-[15px] uppercase tracking-widest font-mono">
          Customer Info
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
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Address (Optional)</label>
            <textarea
              placeholder="Full Address"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              className="w-full neo-pressed px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] h-20 resize-none"
            />
          </div>
        </div>
      </div>
    </>
  );
}
