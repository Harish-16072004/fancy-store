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
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-none p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/10 rounded-none blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 text-sky-300 px-3 py-1 rounded-none text-xs font-mono font-bold uppercase tracking-wider">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              Live Shop Counter Monitor
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Operations Control Center
            </h2>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              Real-time monitoring for ongoing costume handovers, return deadlines, overdue items, and counter security deposits.
            </p>
          </div>

          {onNavigateToAnalytics && (
            <button
              type="button"
              onClick={onNavigateToAnalytics}
              className="self-start md:self-auto flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-3 rounded-none shadow-lg shadow-blue-950/40 transition-all hover:scale-[1.02] cursor-pointer shrink-0 border border-blue-400/30"
            >
              <BarChart3 className="w-4 h-4 text-sky-200" />
              Full Financials & Statements →
            </button>
          )}
        </div>
      </div>

      {/* --- CORE OPERATIONS CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Active Rentals Card */}
        <div 
          id="card-active-rentals"
          onClick={() => onViewRentals('active')}
          className="relative bg-white border border-slate-200 rounded-none p-6 shadow-sm hover:shadow hover:border-blue-400 transition-all cursor-pointer group flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-blue-50 rounded-none opacity-60 group-hover:scale-110 transition-transform"></div>
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Active Outfits Out</p>
              <h3 className="text-5xl font-black text-slate-900 mt-2 font-mono" id="stat-active-count">
                {activeRentals.length}
              </h3>
            </div>
            <div className="p-3 bg-blue-50 text-blue-700 rounded-none">
              <Calendar className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className="text-xs font-bold text-blue-700 group-hover:text-blue-800 group-hover:underline">View Active List</span>
            <span className="text-xxs text-blue-800 bg-blue-50 px-2.5 py-1 rounded-none font-black uppercase tracking-wider">In-Field</span>
          </div>
        </div>

        {/* Overdue Rentals Card */}
        <div 
          id="card-overdue-rentals"
          onClick={() => onViewRentals('overdue')}
          className={`relative bg-white border rounded-none p-6 shadow-sm hover:shadow transition-all cursor-pointer group flex flex-col justify-between overflow-hidden ${
            overdueRentals.length > 0 
              ? 'border-red-200 hover:border-red-300' 
              : 'border-slate-200 hover:border-slate-300'
          }`}
        >
          {overdueRentals.length > 0 && (
            <div className="absolute top-0 right-0 p-2 bg-red-600 text-white font-bold text-xxs uppercase rounded-none tracking-wider">
              Action Needed
            </div>
          )}
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-red-50 rounded-none opacity-40 group-hover:scale-110 transition-transform"></div>
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Overdue Returns</p>
              <h3 className={`text-5xl font-black mt-2 font-mono ${overdueRentals.length > 0 ? 'text-red-600' : 'text-slate-900'}`} id="stat-overdue-count">
                {overdueRentals.length}
              </h3>
            </div>
            <div className={`p-3 rounded-none ${overdueRentals.length > 0 ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-600'}`}>
              <AlertCircle className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center">
            <span className={`text-xs font-bold group-hover:underline ${overdueRentals.length > 0 ? 'text-red-600' : 'text-slate-600'}`}>
              View Overdue List
            </span>
            {overdueRentals.length > 0 ? (
              <span className="text-xxs bg-red-600 text-white px-2.5 py-1 rounded-none font-black uppercase tracking-wider flex items-center gap-1">
                <ShieldAlert className="w-3.5 h-3.5" /> Overdue
              </span>
            ) : (
              <span className="text-xxs text-slate-500 bg-slate-100 px-2.5 py-1 rounded-none font-bold">All Clear</span>
            )}
          </div>
        </div>

        {/* Security Deposits Held Card */}
        <div 
          id="card-pending-advances"
          className="relative bg-white border border-slate-200 rounded-none p-6 shadow-sm hover:shadow hover:border-emerald-300 transition-all group flex flex-col justify-between overflow-hidden"
        >
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-emerald-50 rounded-none opacity-60 transition-transform"></div>
          <div className="relative flex items-start justify-between">
            <div>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-wider">Active Deposits Held</p>
              <h3 className="text-5xl font-black text-emerald-600 mt-2 font-mono flex items-center" id="stat-advance-total">
                <IndianRupee className="w-9 h-9 -mr-1 shrink-0 text-emerald-500" />
                {totalPendingAdvance}
              </h3>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-none">
              <ShieldCheck className="w-8 h-8" />
            </div>
          </div>
          <div className="mt-6 pt-3 border-t border-slate-100 flex justify-between items-center text-slate-600">
            <span className="text-xs font-bold text-emerald-600">Counter Safe Deposit</span>
            <span className="text-xxs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-1 rounded-none font-bold uppercase">
              Total Safe: ₹{totalActiveDeposits}
            </span>
          </div>
        </div>

      </div>

      {/* --- RECENT ACTIVE HANDOVERS SECTION --- */}
      <div className="bg-white border border-slate-200 rounded-none p-6 md:p-8 shadow-sm space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight flex items-center gap-2">
              <ClipboardList className="w-5 h-5 text-blue-800" />
              Active Outfit Handover Log
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Quick operational overview of items currently out with customers</p>
          </div>
          <button
            type="button"
            onClick={() => onViewRentals('active')}
            className="text-xs font-bold text-blue-700 hover:text-blue-900 flex items-center gap-1 cursor-pointer"
          >
            See All Active ({activeRentals.length}) <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {recentActiveRentals.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentActiveRentals.map(r => {
              const status = getRentalComputedStatus(r);
              const isOverdue = status === 'overdue';
              return (
                <div key={r.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 px-3 rounded-none transition-colors">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{r.customerName}</span>
                      <span className="text-xxs font-mono font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-none">
                        #{r.id.slice(-6).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500">
                      {r.items.map(i => `${i.name} (${i.quantity}x)`).join(', ')}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-xs">
                    <div className="text-right">
                      <span className="text-slate-400 text-[10px] font-bold block uppercase">Expected Return</span>
                      <span className={`font-mono font-bold ${isOverdue ? 'text-red-600' : 'text-slate-700'}`}>
                        {r.expectedReturnDate}
                      </span>
                    </div>

                    <span className={`px-2.5 py-1 rounded-none text-xxs font-black uppercase font-mono ${
                      isOverdue ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {isOverdue ? 'OVERDUE' : 'ACTIVE'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs font-bold">
            No active costume rentals currently out on field.
          </div>
        )}
      </div>

    </div>
  );
}
