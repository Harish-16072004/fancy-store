import React, { useState } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  AreaChart, 
  Area 
} from 'recharts';
import { 
  TrendingUp, 
  Calendar, 
  FileText, 
  Award, 
  Download, 
  Flame, 
  BarChart3, 
  Shirt, 
  ArrowUpRight, 
  ShieldCheck, 
  CheckCircle, 
  Activity, 
  Percent, 
  IndianRupee 
} from 'lucide-react';
import { Rental, InventoryItem } from '../types';
import { getRentalComputedStatus } from '../utils/storage';
import { generateFinancialReportPDF } from '../utils/pdfGenerator';

interface AnalyticsProps {
  rentals: Rental[];
  inventory: InventoryItem[];
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
}

export default function Analytics({ rentals, inventory, onShowToast }: AnalyticsProps) {
  // Date Range state for financial billing statements
  const [dateRangeFilter, setDateRangeFilter] = useState<'this_month' | 'last_30' | 'last_90' | 'all' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // Overall Financial Calculations
  const totalBookedRevenue = rentals.reduce((sum, r) => sum + r.rentalCharge, 0);
  const realizedRevenue = rentals
    .filter(r => getRentalComputedStatus(r) === 'returned')
    .reduce((sum, r) => sum + r.rentalCharge, 0);
  const activeRevenue = rentals
    .filter(r => getRentalComputedStatus(r) !== 'returned')
    .reduce((sum, r) => sum + r.rentalCharge, 0);
  const avgTicketSize = rentals.length > 0 ? Math.round(totalBookedRevenue / rentals.length) : 0;

  // 1. Filter rentals according to selected date range
  const getFilteredRentals = (): { filtered: Rental[]; startLabel: string; endLabel: string } => {
    const now = new Date();
    let startDate: Date | null = null;
    let endDate: Date | null = new Date();
    let startLabel = 'Beginning';
    let endLabel = 'Present';

    if (dateRangeFilter === 'this_month') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      startLabel = startDate.toISOString().split('T')[0];
      endLabel = now.toISOString().split('T')[0];
    } else if (dateRangeFilter === 'last_30') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 30);
      startLabel = startDate.toISOString().split('T')[0];
      endLabel = now.toISOString().split('T')[0];
    } else if (dateRangeFilter === 'last_90') {
      startDate = new Date();
      startDate.setDate(now.getDate() - 90);
      startLabel = startDate.toISOString().split('T')[0];
      endLabel = now.toISOString().split('T')[0];
    } else if (dateRangeFilter === 'custom' && customStartDate && customEndDate) {
      startDate = new Date(customStartDate);
      endDate = new Date(customEndDate);
      startLabel = customStartDate;
      endLabel = customEndDate;
    }

    if (!startDate) {
      return { filtered: rentals, startLabel: 'All-Time', endLabel: new Date().toISOString().split('T')[0] };
    }

    const filtered = rentals.filter(r => {
      const rentalDate = new Date(r.dateGiven);
      if (startDate && rentalDate < startDate) return false;
      if (endDate) {
        const endOfDay = new Date(endDate);
        endOfDay.setHours(23, 59, 59, 999);
        if (rentalDate > endOfDay) return false;
      }
      return true;
    });

    return { filtered, startLabel, endLabel };
  };

  const { filtered: periodRentals, startLabel, endLabel } = getFilteredRentals();

  // Period financial metrics
  const periodTotalRevenue = periodRentals.reduce((sum, r) => sum + r.rentalCharge, 0);
  const periodRealizedRevenue = periodRentals
    .filter(r => getRentalComputedStatus(r) === 'returned')
    .reduce((sum, r) => sum + r.rentalCharge, 0);
  const periodDepositsHandled = periodRentals.reduce((sum, r) => sum + r.advanceAmount, 0);

  // --- ANALYSIS 1: Frequently Rented / Best-Selling Dresses ---
  const itemStatsMap: Record<string, { name: string; category: string; count: number; totalRevenue: number }> = {};

  rentals.forEach(r => {
    r.items.forEach(item => {
      const key = item.itemId || item.name;
      if (!itemStatsMap[key]) {
        itemStatsMap[key] = {
          name: item.name,
          category: item.categoryName,
          count: 0,
          totalRevenue: 0,
        };
      }
      itemStatsMap[key].count += item.quantity;
      itemStatsMap[key].totalRevenue += item.rentalPrice * item.quantity;
    });
  });

  const topRepeatedOutfits = Object.values(itemStatsMap)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  const outfitChartData = topRepeatedOutfits.map(item => ({
    name: item.name.length > 15 ? item.name.substring(0, 15) + '…' : item.name,
    fullName: item.name,
    rentals: item.count,
    revenue: item.totalRevenue,
  }));

  // --- ANALYSIS 2: Peak Season / Monthly Revenue Trend ---
  const monthMap: Record<string, { month: string; rawMonth: string; revenue: number; count: number }> = {};

  rentals.forEach(r => {
    if (r.dateGiven && r.dateGiven.length >= 7) {
      const yearMonth = r.dateGiven.substring(0, 7); // YYYY-MM
      const [year, m] = yearMonth.split('-');
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const mIdx = parseInt(m, 10) - 1;
      const label = `${monthNames[mIdx] || m} '${year.substring(2)}`;

      if (!monthMap[yearMonth]) {
        monthMap[yearMonth] = { month: label, rawMonth: yearMonth, revenue: 0, count: 0 };
      }
      monthMap[yearMonth].revenue += r.rentalCharge;
      monthMap[yearMonth].count += 1;
    }
  });

  const monthlyTrendData = Object.values(monthMap)
    .sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));

  // Find Peak Month
  let peakMonth = { month: 'N/A', revenue: 0, count: 0 };
  monthlyTrendData.forEach(m => {
    if (m.revenue > peakMonth.revenue) {
      peakMonth = m;
    }
  });

  const DARK_BLUE_PALETTE = ['#0f172a', '#1e3a8a', '#2563eb', '#3b82f6', '#0284c7', '#0284c7', '#475569'];

  // Handler for PDF Report Download
  const handleDownloadPDFReport = () => {
    if (periodRentals.length === 0) {
      if (onShowToast) onShowToast('No rental transactions found for the selected period.', 'error');
      return;
    }
    generateFinancialReportPDF(rentals, startLabel, endLabel, periodRentals);
    if (onShowToast) onShowToast(`Downloaded Financial Statement PDF for ${startLabel} to ${endLabel}`, 'success');
  };

  return (
    <div className="space-y-8 animate-fadeIn pb-12">
      
      {/* Header Banner - Dark Blue Navy Theme */}
      <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 text-white rounded-none p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-blue-600/10 rounded-none blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 text-sky-300 px-3 py-1 rounded-none text-xs font-mono font-bold uppercase tracking-wider">
              <BarChart3 className="w-3.5 h-3.5 text-sky-400" />
              Unified Financials & Analytics
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-white">
              Revenue, Peak Seasons & Billing Statements
            </h2>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              Complete consolidated financial hub: track peak sales months, analyze repeatedly rented costumes, examine revenue metrics, and export period bills.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadPDFReport}
            className="self-start md:self-auto flex items-center gap-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-3 rounded-none shadow-lg shadow-blue-900/30 transition-all hover:scale-[1.02] cursor-pointer shrink-0 border border-blue-400/30"
          >
            <Download className="w-4 h-4 text-sky-200" />
            Export Statement PDF
          </button>
        </div>
      </div>

      {/* --- SECTION 1: ALL FINANCIAL METRIC KPI CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Booked Revenue */}
        <div className="bg-white border border-slate-200 rounded-none p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xxs font-black uppercase tracking-wider">Total Booked Revenue</p>
            <span className="text-blue-700 bg-blue-50 p-2 rounded-none">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h4 className="text-3xl font-black text-slate-900 font-mono">
              ₹{totalBookedRevenue}
            </h4>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              Net rental fees ({rentals.length} bookings, excludes refunded deposit)
            </p>
          </div>
        </div>

        {/* Realized Revenue */}
        <div className="bg-white border border-slate-200 rounded-none p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xxs font-black uppercase tracking-wider">Realized Cash Revenue</p>
            <span className="text-emerald-600 bg-emerald-50 p-2 rounded-none">
              <CheckCircle className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h4 className="text-3xl font-black text-emerald-600 font-mono">
              ₹{realizedRevenue}
            </h4>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              Settled on returned costumes
            </p>
          </div>
        </div>

        {/* Ongoing Revenue */}
        <div className="bg-white border border-slate-200 rounded-none p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xxs font-black uppercase tracking-wider">Ongoing In-Field Rent</p>
            <span className="text-sky-700 bg-sky-50 p-2 rounded-none">
              <Activity className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h4 className="text-3xl font-black text-sky-700 font-mono">
              ₹{activeRevenue}
            </h4>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              Committed on active rentals
            </p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="bg-white border border-slate-200 rounded-none p-5 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-slate-500 text-xxs font-black uppercase tracking-wider">Average Order Value (AOV)</p>
            <span className="text-amber-600 bg-amber-50 p-2 rounded-none">
              <Percent className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3">
            <h4 className="text-3xl font-black text-slate-900 font-mono">
              ₹{avgTicketSize}
            </h4>
            <p className="text-[10px] text-slate-500 font-bold mt-1">
              Average spend per customer rental ticket
            </p>
          </div>
        </div>

      </div>

      {/* --- SECTION 2: PEAK INSIGHT HIGHLIGHT CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Peak Season Card */}
        <div className="bg-white border border-slate-200 rounded-none p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Peak Sales Month</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-none">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-slate-900 font-mono tracking-tight">
              {peakMonth.month}
            </p>
            <p className="text-xs font-bold text-emerald-600 mt-1 flex items-center gap-1">
              <ArrowUpRight className="w-3.5 h-3.5" />
              Peak Revenue: ₹{peakMonth.revenue} ({peakMonth.count} orders)
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xxs font-semibold text-slate-500">
            Stock demand surges highest during this period.
          </div>
        </div>

        {/* Most Repeatedly Rented Costume Card */}
        <div className="bg-white border border-slate-200 rounded-none p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Most Rented Costume</span>
            <div className="p-2 bg-blue-50 text-blue-700 rounded-none">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-xl font-black text-slate-900 leading-snug truncate">
              {topRepeatedOutfits[0]?.name || 'N/A'}
            </p>
            <p className="text-xs font-bold text-blue-700 mt-1 font-mono">
              Rented {topRepeatedOutfits[0]?.count || 0} times • Earned ₹{topRepeatedOutfits[0]?.totalRevenue || 0}
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xxs font-semibold text-slate-500">
            Top customer favorite costume in stock.
          </div>
        </div>

        {/* Total Lifetime Bookings */}
        <div className="bg-white border border-slate-200 rounded-none p-5 shadow-sm relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Handovers Logged</span>
            <div className="p-2 bg-slate-100 text-slate-800 rounded-none">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-3xl font-black text-slate-900 font-mono">
              {rentals.length} Tickets
            </p>
            <p className="text-xs font-bold text-slate-600 mt-1">
              Across {inventory.length} costume styles in inventory
            </p>
          </div>
          <div className="mt-4 pt-3 border-t border-slate-100 text-xxs font-semibold text-slate-500">
            Recorded in local shop database.
          </div>
        </div>

      </div>

      {/* --- SECTION 3: CHARTS (PEAK MONTHS & TOP DRESSES) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Peak Season Area Chart (7 Cols) */}
        <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm lg:col-span-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-800" />
                Peak Season & Monthly Trend
              </h3>
              <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-100 font-bold px-2.5 py-1 rounded-none uppercase">
                Revenue Curve
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-6">Historical revenue peak visualizer month-by-month</p>
          </div>

          <div className="h-64 w-full">
            {monthlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0f172a" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0.05}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '0px', color: '#fff', border: 'none', fontSize: '12px' }}
                    formatter={(value: any) => [`₹${value}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0f172a" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                No monthly trend data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Most Repeatedly Rented Dresses Bar Chart (5 Cols) */}
        <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm lg:col-span-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Shirt className="w-5 h-5 text-blue-800" />
                Repeatedly Rented Outfits
              </h3>
              <span className="text-[10px] bg-blue-50 text-blue-800 border border-blue-100 font-bold px-2.5 py-1 rounded-none uppercase">
                Hire Count
              </span>
            </div>
            <p className="text-xs text-slate-500 mb-6">Costumes ordered most frequently by customers</p>
          </div>

          <div className="h-64 w-full">
            {outfitChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outfitChartData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#334155', fontWeight: 600 }} width={90} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '0px', color: '#fff', border: 'none', fontSize: '12px' }}
                    formatter={(val: any, name: any, item: any) => [`${val} times rented (₹${item.payload.revenue})`, 'Usage']}
                  />
                  <Bar dataKey="rentals" radius={[0, 0, 0, 0]}>
                    {outfitChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={DARK_BLUE_PALETTE[index % DARK_BLUE_PALETTE.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs font-bold">
                No costume hire statistics calculated yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- SECTION 4: STATEMENT GENERATOR FOR CUSTOM PERIODS & BILLS --- */}
      <div className="bg-white border border-slate-200 rounded-none p-6 md:p-8 shadow-sm space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-900" />
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Period Financial Statement & Bill Generator
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Filter by any custom date period or pre-set timeframe to generate and download itemized revenue statements.
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_30', label: 'Last 30 Days' },
              { id: 'last_90', label: 'Last 90 Days' },
              { id: 'custom', label: 'Custom Range' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateRangeFilter(tab.id as any)}
                className={`px-3.5 py-2 rounded-none text-xs font-bold transition-all cursor-pointer ${
                  dateRangeFilter === tab.id
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Selector Inputs (if custom chosen) */}
        {dateRangeFilter === 'custom' && (
          <div className="bg-slate-50 p-4 rounded-none border border-slate-200 flex flex-col sm:flex-row items-center gap-4 animate-fadeIn">
            <div className="flex-1 w-full space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-none px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
            <div className="flex-1 w-full space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-none px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-600"
              />
            </div>
          </div>
        )}

        {/* Summary Metric Strip for Selected Period */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-none border border-slate-200/80">
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Period Revenue</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">₹{periodTotalRevenue}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Realized Cash</p>
            <p className="text-2xl font-black text-emerald-600 font-mono mt-1">₹{periodRealizedRevenue}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Deposits Handled</p>
            <p className="text-2xl font-black text-blue-700 font-mono mt-1">₹{periodDepositsHandled}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-500">Total Bookings</p>
            <p className="text-2xl font-black text-slate-900 font-mono mt-1">{periodRentals.length}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleDownloadPDFReport}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs px-6 py-3.5 rounded-none shadow-md transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 text-sky-400" />
            Download PDF Financial Statement ({periodRentals.length} Bookings)
          </button>
        </div>

      </div>

    </div>
  );
}
