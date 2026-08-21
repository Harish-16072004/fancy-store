import React from 'react';
import { 
  Calendar, 
  AlertCircle, 
  IndianRupee, 
  ShieldAlert, 
  ArrowUpRight, 
  Sparkles, 
  BarChart3, 
  Activity,
  CheckCircle,
  ClipboardList,
  ShieldCheck,
  Zap
} from 'lucide-react';
import { Rental } from '../types';
import { formatINR, toRupees } from '../utils/money';
import { getRentalComputedStatus } from '../utils/storage';

interface DashboardProps {
  rentals: Rental[];
  onViewRentals: (filter: 'active' | 'overdue' | 'returned' | 'all') => void;
  onNavigateToAnalytics?: () => void;
}

export default function Dashboard({ rentals, onViewRentals, onNavigateToAnalytics }: DashboardProps) {
  // Operational calculations
  const activeRentals = rentals.filter(r => getRentalComputedStatus(r) === 'active');
  const overdueRentals = rentals.filter(r => getRentalComputedStatus(r) === 'overdue');
  const returnedRentals = rentals.filter(r => getRentalComputedStatus(r) === 'returned');

  // Pending advance deposits currently held
  const totalPendingAdvance = rentals
    .filter(r => getRentalComputedStatus(r) !== 'returned' && !r.advanceReturned)
    .reduce((sum, r) => sum + r.advanceAmount, 0);

  const totalActiveDeposits = rentals
    .filter(r => getRentalComputedStatus(r) !== 'returned')
    .reduce((sum, r) => sum + r.advanceAmount, 0);

  // Recent active rentals
  const recentActiveRentals = rentals
    .filter(r => getRentalComputedStatus(r) !== 'returned')
    .slice(0, 5);

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* Top Banner */}
      <div className="neo-flat p-8 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 neo-pressed text-[var(--color-sky)] px-4 py-2 rounded-xl text-xs font-mono font-bold uppercase tracking-widest">
              <Activity className="w-4 h-4" />
              Live Monitor
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--color-navy)]">
              Store Dashboard
            </h2>
            <p className="text-slate-500 font-medium text-sm max-w-2xl leading-relaxed">
              Real-time monitoring of active rentals, overdue items, and advance deposits.
            </p>
          </div>

          {onNavigateToAnalytics && (
            <button
              type="button"
              onClick={onNavigateToAnalytics}
              className="self-start md:self-auto flex items-center gap-2 neo-btn-primary px-6 py-4"
            >
              <BarChart3 className="w-5 h-5 text-white" />
              Income & Reports →
            </button>
          )}
        </div>
      </div>

      {/* --- CORE OPERATIONS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Active Rentals Card */}
        <div 
          onClick={() => onViewRentals('active')}
          className="neo-btn p-6 flex flex-col justify-between group h-full text-left"
        >
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Active Rentals</p>
              <h3 className="text-5xl font-black text-[var(--color-navy)] mt-4 font-mono">
                {activeRentals.length}
              </h3>
            </div>
            <div className="p-4 neo-pressed text-[var(--color-sky)]">
              <Calendar className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-[rgba(0,0,0,0.05)] flex justify-between items-center">
            <span className="text-xs font-bold text-[var(--color-navy)] group-hover:text-[var(--color-sky)] transition-colors">View Active</span>
            <span className="text-[10px] text-[var(--color-sky)] neo-pressed px-3 py-1.5 font-bold uppercase tracking-widest">Currently Out</span>
          </div>
        </div>

        {/* Overdue Rentals Card */}
        <div 
          onClick={() => onViewRentals('overdue')}
          className={`p-6 flex flex-col justify-between group h-full text-left transition-all ${overdueRentals.length > 0 ? 'neo-flat ring-2 ring-red-400 cursor-pointer' : 'neo-btn'}`}
        >
          {overdueRentals.length > 0 && (
            <div className="absolute top-4 right-4 px-3 py-1 bg-red-500 text-white font-bold text-[10px] uppercase rounded-full shadow-lg tracking-widest animate-pulse">
              Attention
            </div>
          )}
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Overdue</p>
              <h3 className={`text-5xl font-black mt-4 font-mono ${overdueRentals.length > 0 ? 'text-red-500' : 'text-[var(--color-navy)]'}`}>
                {overdueRentals.length}
              </h3>
            </div>
            <div className={`p-4 neo-pressed ${overdueRentals.length > 0 ? 'text-red-500' : 'text-slate-400'}`}>
              <AlertCircle className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-[rgba(0,0,0,0.05)] flex justify-between items-center">
            <span className={`text-xs font-bold transition-colors ${overdueRentals.length > 0 ? 'text-red-500 group-hover:text-red-600' : 'text-slate-500 group-hover:text-[var(--color-navy)]'}`}>
              View Overdue
            </span>
            {overdueRentals.length > 0 ? (
              <span className="text-[10px] bg-red-100 text-red-700 px-3 py-1.5 rounded-lg font-bold uppercase tracking-widest flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Action Req
              </span>
            ) : (
              <span className="text-[10px] text-slate-500 neo-pressed px-3 py-1.5 font-bold uppercase tracking-widest">Clear</span>
            )}
          </div>
        </div>

        {/* Security Deposits Held Card */}
        <div className="neo-flat p-6 flex flex-col justify-between h-full text-left">
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest">Pending Deposits</p>
              <h3 className="text-5xl font-black text-emerald-500 mt-4 font-mono flex items-center">
                <IndianRupee className="w-8 h-8 -mr-1 shrink-0 text-emerald-400" />
                {toRupees(totalPendingAdvance).toLocaleString('en-IN')}
              </h3>
            </div>
            <div className="p-4 neo-pressed text-emerald-500">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-8 pt-4 border-t border-[rgba(0,0,0,0.05)] flex justify-between items-center text-slate-600">
            <span className="text-xs font-bold text-emerald-500">Deposits with us</span>
            <span className="text-[10px] neo-pressed text-emerald-600 px-3 py-1.5 font-bold uppercase tracking-widest">
              Total: {formatINR(totalActiveDeposits)}
            </span>
          </div>
        </div>

      </div>

      {/* --- RECENT ACTIVE HANDOVERS SECTION --- */}
      <div className="neo-flat p-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-[var(--color-navy)] flex items-center gap-3">
              <ClipboardList className="w-6 h-6 text-[var(--color-sky)]" />
              Recent Handouts
            </h3>
            <p className="text-sm font-medium text-slate-500 mt-2">Latest items handed out to customers.</p>
          </div>
          <button
            type="button"
            onClick={() => onViewRentals('active')}
            className="text-sm font-bold text-[var(--color-navy)] hover:text-[var(--color-sky)] flex items-center gap-2 transition-colors neo-btn px-4 py-2"
          >
            View All ({activeRentals.length}) <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>

        {recentActiveRentals.length > 0 ? (
          <div className="space-y-4">
            {recentActiveRentals.map(r => {
              const status = getRentalComputedStatus(r);
              const isOverdue = status === 'overdue';
              return (
                <div key={r.id} className="neo-pressed p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[var(--color-navy)] text-base">{r.customerName}</span>
                      <span className="text-[10px] font-mono font-bold neo-flat text-slate-500 px-3 py-1 rounded-lg uppercase tracking-widest">
                        #{r.id.slice(-6)}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-slate-600">
                      {r.items.map(i => `${i.name} (${i.quantity}x)`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] font-bold block uppercase tracking-widest mb-1">Expected Return</span>
                      <span className={`font-mono font-bold ${isOverdue ? 'text-red-500' : 'text-slate-700'}`}>
                        {r.expectedReturnDate}
                      </span>
                    </div>

                    <span className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest neo-flat ${
                      isOverdue ? 'text-red-500 ring-1 ring-red-400' : 'text-[var(--color-sky)]'
                    }`}>
                      {isOverdue ? 'Overdue' : 'Active'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 neo-pressed text-center text-slate-400 text-sm font-bold uppercase tracking-widest">
            No active rentals currently.
          </div>
        )}
      </div>

    </div>
  );
}
