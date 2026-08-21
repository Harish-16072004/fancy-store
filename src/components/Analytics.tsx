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
import { InventoryItem, Rental } from '../types';
import { formatINR } from '../utils/money';
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
      
      {/* Header Banner */}
      <div className="neo-flat p-8 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-[var(--color-sky)] opacity-10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 neo-pressed text-[var(--color-navy)] px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider">
              <BarChart3 className="w-4 h-4 text-[var(--color-sky)]" />
              Store Reports
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight text-[var(--color-navy)]">
              Income & Trends
            </h2>
            <p className="text-slate-500 text-sm max-w-2xl font-medium">
              See your best-selling costumes, track your monthly income, and download custom date statements.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadPDFReport}
            className="self-start md:self-auto neo-btn-primary font-bold text-xs px-6 py-4 flex items-center gap-2 uppercase tracking-widest cursor-pointer shrink-0"
          >
            <Download className="w-5 h-5" />
            Export Statement PDF
          </button>
        </div>
      </div>

      {/* --- SECTION 1: ALL FINANCIAL METRIC KPI CARDS --- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Total Booked Revenue */}
        <div className="neo-flat p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Total Sales</p>
            <span className="text-[var(--color-navy)] neo-pressed p-2">
              <TrendingUp className="w-5 h-5 text-[var(--color-sky)]" />
            </span>
          </div>
          <div>
            <h4 className="text-3xl font-black text-[var(--color-navy)] font-mono">
              {formatINR(totalBookedRevenue)}
            </h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
              Total Rent Amount
            </p>
          </div>
        </div>

        {/* Realized Revenue */}
        <div className="neo-flat p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Completed Sales</p>
            <span className="text-emerald-500 neo-pressed p-2">
              <CheckCircle className="w-5 h-5" />
            </span>
          </div>
          <div>
            <h4 className="text-3xl font-black text-emerald-500 font-mono">
              {formatINR(realizedRevenue)}
            </h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
              From Returned Items
            </p>
          </div>
        </div>

        {/* Ongoing Revenue */}
        <div className="neo-flat p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Pending Income</p>
            <span className="text-blue-500 neo-pressed p-2">
              <Activity className="w-5 h-5" />
            </span>
          </div>
          <div>
            <h4 className="text-3xl font-black text-blue-500 font-mono">
              {formatINR(activeRevenue)}
            </h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
              From Currently Rented Items
            </p>
          </div>
        </div>

        {/* Average Order Value */}
        <div className="neo-flat p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Average Bill</p>
            <span className="text-[var(--color-navy)] neo-pressed p-2">
              <Percent className="w-5 h-5 text-amber-500" />
            </span>
          </div>
          <div>
            <h4 className="text-3xl font-black text-[var(--color-navy)] font-mono">
              {formatINR(avgTicketSize)}
            </h4>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-2">
              Per Order
            </p>
          </div>
        </div>

      </div>

      {/* --- SECTION 2: PEAK INSIGHT HIGHLIGHT CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Peak Season Card */}
        <div className="neo-flat p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Peak Sales Month</span>
            <div className="neo-pressed p-2 text-amber-500">
              <Flame className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-[var(--color-navy)] font-mono tracking-tight">
              {peakMonth.month}
            </p>
            <p className="text-xs font-bold text-emerald-500 mt-2 flex items-center gap-1 uppercase tracking-widest">
              <ArrowUpRight className="w-4 h-4" />
              {formatINR(peakMonth.revenue)} ({peakMonth.count} orders)
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[rgba(0,0,0,0.05)] text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Highest stock demand period.
          </div>
        </div>

        {/* Most Repeatedly Rented Costume Card */}
        <div className="neo-flat p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Top Costume</span>
            <div className="neo-pressed p-2 text-[var(--color-sky)]">
              <Award className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-xl font-black text-[var(--color-navy)] leading-snug line-clamp-2">
              {topRepeatedOutfits[0]?.name || 'N/A'}
            </p>
            <p className="text-[10px] font-bold text-[var(--color-sky)] mt-2 font-mono uppercase tracking-widest">
              {topRepeatedOutfits[0]?.count || 0} times • {formatINR(topRepeatedOutfits[0]?.totalRevenue || 0)}
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[rgba(0,0,0,0.05)] text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Customer favorite outfit.
          </div>
        </div>

        {/* Total Lifetime Bookings */}
        <div className="neo-flat p-6 relative overflow-hidden flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Orders</span>
            <div className="neo-pressed p-2 text-[var(--color-navy)]">
              <ShieldCheck className="w-5 h-5" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-black text-[var(--color-navy)] font-mono">
              {rentals.length} Orders
            </p>
            <p className="text-[10px] font-bold text-slate-500 mt-2 uppercase tracking-widest">
              Across {inventory.length} styles
            </p>
          </div>
          <div className="mt-6 pt-4 border-t border-[rgba(0,0,0,0.05)] text-[10px] font-bold uppercase tracking-widest text-slate-400">
            All-time rental records.
          </div>
        </div>

      </div>

      {/* --- SECTION 3: CHARTS (PEAK MONTHS & TOP DRESSES) --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Peak Season Area Chart (7 Cols) */}
        <div className="neo-flat p-8 lg:col-span-7 flex flex-col justify-between">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black text-[var(--color-navy)] tracking-wide flex items-center gap-3">
                <Calendar className="w-6 h-6 text-[var(--color-sky)]" />
                Monthly Revenue Trend
              </h3>
              <span className="text-[10px] neo-pressed text-[var(--color-sky)] font-bold px-3 py-1.5 uppercase tracking-widest">
                Curve
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">Historical revenue peak visualizer</p>
          </div>

          <div className="h-64 w-full">
            {monthlyTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ebf1f5', borderRadius: '16px', color: '#102A43', border: '1px solid rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 'bold', boxShadow: '5px 5px 10px #c8cdd1, -5px -5px 10px #ffffff' }}
                    formatter={(value: any) => [`${formatINR(value)}`, 'Revenue']}
                  />
                  <Area type="monotone" dataKey="revenue" stroke="#0ea5e9" strokeWidth={4} fillOpacity={1} fill="url(#colorRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                No monthly trend data recorded yet.
              </div>
            )}
          </div>
        </div>

        {/* Most Repeatedly Rented Dresses Bar Chart (5 Cols) */}
        <div className="neo-flat p-8 lg:col-span-5 flex flex-col justify-between">
          <div className="mb-8">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xl font-black text-[var(--color-navy)] tracking-wide flex items-center gap-3">
                <Shirt className="w-6 h-6 text-[var(--color-sky)]" />
                Top Costumes
              </h3>
              <span className="text-[10px] neo-pressed text-[var(--color-sky)] font-bold px-3 py-1.5 uppercase tracking-widest">
                Demand
              </span>
            </div>
            <p className="text-sm font-medium text-slate-500">Outfits ordered most frequently</p>
          </div>

          <div className="h-64 w-full">
            {outfitChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={outfitChartData} layout="vertical" margin={{ top: 0, right: 10, left: 10, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#102A43', fontWeight: 800 }} width={100} axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#ebf1f5', borderRadius: '16px', color: '#102A43', border: '1px solid rgba(0,0,0,0.05)', fontSize: '12px', fontWeight: 'bold', boxShadow: '5px 5px 10px #c8cdd1, -5px -5px 10px #ffffff' }}
                    formatter={(val: any, name: any, item: any) => [`${val} times (${formatINR(item.payload.revenue)})`, 'Usage']}
                  />
                  <Bar dataKey="rentals" radius={[4, 4, 4, 4]} barSize={16}>
                    {outfitChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={['#102A43', '#0ea5e9', '#627D98', '#9FB3C8'][index % 4]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400 text-[10px] font-bold uppercase tracking-widest">
                No costume hire statistics yet.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* --- SECTION 4: STATEMENT GENERATOR FOR CUSTOM PERIODS & BILLS --- */}
      <div className="neo-flat p-8 space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-[rgba(0,0,0,0.05)] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-[var(--color-navy)]" />
              <h3 className="text-xl font-black text-[var(--color-navy)] tracking-tight">
                Statement & Bill Generator
              </h3>
            </div>
            <p className="text-sm font-medium text-slate-500 mt-2">
              Filter by date period to download itemized revenue statements.
            </p>
          </div>

          {/* Quick Filter Buttons */}
          <div className="flex flex-wrap items-center gap-4">
            {[
              { id: 'all', label: 'All Time' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_30', label: 'Last 30 Days' },
              { id: 'last_90', label: 'Last 90 Days' },
              { id: 'custom', label: 'Custom' },
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateRangeFilter(tab.id as any)}
                className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer ${
                  dateRangeFilter === tab.id
                    ? 'neo-pressed text-[var(--color-sky)]'
                    : 'neo-btn text-slate-500 hover:text-[var(--color-navy)]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Date Selector Inputs (if custom chosen) */}
        {dateRangeFilter === 'custom' && (
          <div className="neo-pressed p-6 flex flex-col sm:flex-row items-center gap-6 animate-fadeIn">
            <div className="flex-1 w-full space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Start Date</label>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="w-full neo-pressed px-4 py-3 text-sm font-bold text-[var(--color-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] bg-transparent"
              />
            </div>
            <div className="flex-1 w-full space-y-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">End Date</label>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="w-full neo-pressed px-4 py-3 text-sm font-bold text-[var(--color-navy)] focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] bg-transparent"
              />
            </div>
          </div>
        )}

        {/* Summary Metric Strip for Selected Period */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 neo-pressed p-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Period Revenue</p>
            <p className="text-2xl font-black text-[var(--color-navy)] font-mono mt-2">{formatINR(periodTotalRevenue)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Realized Cash</p>
            <p className="text-2xl font-black text-emerald-500 font-mono mt-2">{formatINR(periodRealizedRevenue)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Deposits Handled</p>
            <p className="text-2xl font-black text-[var(--color-sky)] font-mono mt-2">{formatINR(periodDepositsHandled)}</p>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Total Bookings</p>
            <p className="text-2xl font-black text-[var(--color-navy)] font-mono mt-2">{periodRentals.length}</p>
          </div>
        </div>

        {/* Action Button */}
        <div className="flex justify-end pt-4">
          <button
            type="button"
            onClick={handleDownloadPDFReport}
            className="flex items-center gap-3 neo-btn-primary font-bold text-xs px-8 py-4 uppercase tracking-widest cursor-pointer"
          >
            <Download className="w-5 h-5" />
            Download PDF Statement ({periodRentals.length})
          </button>
        </div>

      </div>

    </div>
  );
}
