import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Tag, 
  TrendingUp, 
  ClipboardList, 
  PlusCircle, 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  Clock, 
  Info,
  CheckCircle,
  HelpCircle,
  X,
  BarChart3,
  LogOut,
  Loader2
} from 'lucide-react';
import { Category, InventoryItem, Rental } from './types';
import { getRentalComputedStatus, getNextBookingNumber } from './utils/storage';
import {
  fetchCategories,
  createCategory,
  updateCategoryDb,
  deleteCategoryDb,
  fetchInventory,
  createInventoryItemDb,
  updateInventoryItemDb,
  deleteInventoryItemDb,
  fetchRentals,
  createRentalDb,
  updateRentalDb,
  deleteRentalDb,
  exportBackupJSON,
  importBackupJSON,
} from './lib/database';
import { useAuth } from './context/AuthContext';
import LoginPage from './components/LoginPage';

// Import our modular components
import Dashboard from './components/Dashboard';
import InventoryManager from './components/InventoryManager';
import RentalForm from './components/RentalForm';
import RentalsList from './components/RentalsList';
import Analytics from './components/Analytics';

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();

  // Tabs: 'dashboard', 'analytics', 'rentals', 'new-rental', 'inventory', 'settings'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'rentals' | 'new-rental' | 'inventory' | 'settings'>('dashboard');
  
  // Back-prefiltering state when coming from clicking a dashboard block
  const [rentalsFilter, setRentalsFilter] = useState<'active' | 'overdue' | 'returned' | 'all'>('all');

  // Core States
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);

  // Data loading state
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [isCreatingRental, setIsCreatingRental] = useState(false);

  // Time representation
  const [currentTime, setCurrentTime] = useState('');

  // Toast and Custom Confirmation states
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
  };

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmDialog({ title, message, onConfirm });
  };

  // Dismiss toast automatically
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load data from Supabase when user is authenticated
  useEffect(() => {
    if (!user) return;

    async function loadData() {
      setIsDataLoading(true);
      try {
        const [catResult, invResult, rentalResult] = await Promise.all([
          fetchCategories(),
          fetchInventory(),
          fetchRentals(),
        ]);
        if (catResult.data) setCategories(catResult.data);
        if (invResult.data) setInventory(invResult.data);
        if (rentalResult.data) setRentals(rentalResult.data);

        if (catResult.error || invResult.error || rentalResult.error) {
          console.error('Data loading errors:', catResult.error, invResult.error, rentalResult.error);
          showToast('Some data failed to load. Please refresh the page.', 'error');
        }
      } catch (err) {
        console.error('Failed to load data:', err);
        showToast('Failed to connect to database. Please check your connection.', 'error');
      } finally {
        setIsDataLoading(false);
      }
    }

    loadData();
  }, [user]);

  // Update time clock every second
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // ============================================
  // Category CRUD Handlers (async)
  // ============================================

  const handleAddCategory = async (name: string) => {
    const { data, error } = await createCategory(name);
    if (error) {
      showToast('Failed to create category. Please try again.', 'error');
      return;
    }
    if (data) {
      setCategories(prev => [...prev, data]);
      showToast(`Category "${name}" created successfully.`, 'success');
    }
  };

  const handleUpdateCategory = async (id: string, name: string) => {
    const { error } = await updateCategoryDb(id, name);
    if (error) {
      showToast('Failed to update category.', 'error');
      return;
    }
    setCategories(prev => prev.map(cat => cat.id === id ? { ...cat, name } : cat));
    showToast(`Category updated to "${name}".`, 'success');
  };

  const handleDeleteCategory = async (id: string) => {
    const { error } = await deleteCategoryDb(id);
    if (error) {
      showToast('Failed to delete category.', 'error');
      return;
    }
    setCategories(prev => prev.filter(cat => cat.id !== id));
    showToast('Category deleted.', 'info');
  };

  // ============================================
  // Inventory CRUD Handlers (async)
  // ============================================

  const handleAddInventoryItem = async (itemData: Omit<InventoryItem, 'id'>) => {
    const { data, error } = await createInventoryItemDb(itemData);
    if (error) {
      showToast('Failed to add outfit. Please try again.', 'error');
      return;
    }
    if (data) {
      setInventory(prev => [data, ...prev]);
      showToast(`Outfit "${itemData.name}" added to stock inventory.`, 'success');
    }
  };

  const handleUpdateInventoryItem = async (id: string, itemData: Omit<InventoryItem, 'id'>) => {
    const { data, error } = await updateInventoryItemDb(id, itemData);
    if (error) {
      showToast('Failed to update outfit.', 'error');
      return;
    }
    if (data) {
      setInventory(prev => prev.map(item => item.id === id ? data : item));
      showToast(`Outfit "${itemData.name}" stock details saved.`, 'success');
    }
  };

  const handleDeleteInventoryItem = async (id: string) => {
    const { error } = await deleteInventoryItemDb(id);
    if (error) {
      showToast('Failed to remove outfit.', 'error');
      return;
    }
    setInventory(prev => prev.filter(item => item.id !== id));
    showToast('Outfit removed from stock list.', 'info');
  };

  // ============================================
  // Rental CRUD Handlers (async)
  // ============================================

  const handleAddRental = async (rentalData: Omit<Rental, 'id' | 'createdAt'>) => {
    setIsCreatingRental(true);
    showToast('Creating rental slip & uploading photos...', 'info');

    const { data, error } = await createRentalDb(rentalData);
    setIsCreatingRental(false);

    if (error) {
      showToast('Failed to create rental. Please try again.', 'error');
      return;
    }
    if (data) {
      setRentals(prev => [data, ...prev]);
      setRentalsFilter('all');
      setActiveTab('rentals');
      showToast(`Rental handover registered successfully for customer "${rentalData.customerName}"!`, 'success');
    }
  };

  const handleUpdateRental = async (id: string, updatedFields: Partial<Rental>) => {
    // Optimistic update for non-photo fields
    const { returnPhotos, handoverPhotos, ...safeFields } = updatedFields;
    if (Object.keys(safeFields).length > 0) {
      setRentals(prev => prev.map(r => r.id === id ? { ...r, ...safeFields } : r));
    }

    const { data, error } = await updateRentalDb(id, updatedFields);
    if (error) {
      showToast('Failed to save changes. Reverting...', 'error');
      // Revert by re-fetching
      const { data: fresh } = await fetchRentals();
      if (fresh) setRentals(fresh);
      return;
    }
    if (data) {
      // Replace with server-confirmed data (includes photo URLs)
      setRentals(prev => prev.map(r => r.id === id ? data : r));
    }
  };

  const handleDeleteRental = async (id: string) => {
    const { error } = await deleteRentalDb(id);
    if (error) {
      showToast('Failed to delete rental.', 'error');
      return;
    }
    setRentals(prev => prev.filter(rent => rent.id !== id));
  };

  // Dashboard View Redirection Helper
  const handleDashboardCardClick = (filter: 'active' | 'overdue' | 'returned' | 'all') => {
    setRentalsFilter(filter);
    setActiveTab('rentals');
  };

  // ============================================
  // Backup & Restore (async)
  // ============================================

  const handleDownloadBackup = async () => {
    showToast('Generating database backup...', 'info');
    try {
      const jsonStr = await exportBackupJSON();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `cloakroom_database_backup_${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      URL.revokeObjectURL(url);
      showToast('Database backup downloaded successfully!', 'success');
    } catch {
      showToast('Failed to generate backup.', 'error');
    }
  };

  const handleRestoreBackupUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        showToast('Restoring database from backup...', 'info');
        const success = await importBackupJSON(text);
        if (success) {
          // Reload all data from Supabase
          const [catResult, invResult, rentalResult] = await Promise.all([
            fetchCategories(),
            fetchInventory(),
            fetchRentals(),
          ]);
          if (catResult.data) setCategories(catResult.data);
          if (invResult.data) setInventory(invResult.data);
          if (rentalResult.data) setRentals(rentalResult.data);
          showToast('Database restored successfully! All stock, categories, and rentals have been updated.', 'success');
        } else {
          showToast('Failed to restore backup. Invalid database format.', 'error');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleResetDatabase = () => {
    showConfirm(
      'Reset Database',
      'Are you sure you want to CLEAR the entire database? ALL categories, outfits, and rental records will be permanently deleted. This cannot be undone.',
      async () => {
        const success = await importBackupJSON(JSON.stringify({
          categories: [],
          inventory_items: [],
          rentals: [],
          rental_items: [],
          additional_items: [],
          rental_photos: [],
        }));
        if (success) {
          setCategories([]);
          setInventory([]);
          setRentals([]);
          showToast('Database cleared successfully.', 'success');
        } else {
          showToast('Failed to clear database.', 'error');
        }
      }
    );
  };

  // Active rentals list (for stock calculating availability)
  const activeBookedRentals = rentals.filter(r => getRentalComputedStatus(r) !== 'returned');

  // ============================================
  // Auth Gates
  // ============================================

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans neo-bg">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 neo-flat flex items-center justify-center mx-auto text-[var(--color-sky)]">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="w-6 h-6 border-2 border-[var(--color-sky-light)] border-t-[var(--color-sky)] rounded-full animate-spin mx-auto" />
          <p className="text-[var(--color-navy)] text-sm font-bold">Loading App...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage />;
  }

  if (isDataLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-sans neo-bg">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 neo-flat flex items-center justify-center mx-auto text-[var(--color-sky)]">
            <Sparkles className="w-8 h-8" />
          </div>
          <div className="w-6 h-6 border-2 border-[var(--color-sky-light)] border-t-[var(--color-sky)] rounded-full animate-spin mx-auto" />
          <p className="text-[var(--color-navy)] text-sm font-bold">Loading Store Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans select-none selection:bg-blue-100 pb-16 md:pb-0 neo-bg">
      
      {/* Dynamic Toast Notification */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-md bg-white border border-slate-200 shadow-xl p-4 rounded-none flex items-center gap-3 animate-slideDown backdrop-blur-md bg-white/95">
          <div className={`p-2 rounded-none shrink-0 ${
            toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
            toast.type === 'error' ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'
          }`}>
            <CheckCircle className="w-5 h-5" />
          </div>
          <p className="text-slate-800 text-xs font-bold flex-1 leading-snug">{toast.message}</p>
          <button 
            type="button" 
            onClick={() => setToast(null)} 
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Custom Confirm Dialog Modal */}
      {confirmDialog && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-end md:items-center justify-center p-0 md:p-4">
          <div className="bg-white w-full md:max-w-md rounded-none border-t md:border border-slate-200 p-6 shadow-2xl space-y-5 animate-slideUp">
            <div className="w-12 h-1 bg-slate-200 rounded-none mx-auto md:hidden -mt-2 mb-3"></div>
            <div className="space-y-2">
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-blue-800" />
                {confirmDialog.title}
              </h3>
              <p className="text-slate-600 text-xs leading-relaxed">{confirmDialog.message}</p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-none text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmDialog.onConfirm();
                  setConfirmDialog(null);
                }}
                className="flex-1 py-3 bg-blue-800 hover:bg-blue-900 text-white font-bold rounded-none text-xs shadow-sm transition-colors cursor-pointer"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Compact Header */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 neo-flat mx-2 mt-2 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 neo-pressed flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5 text-[var(--color-sky)]" />
          </div>
          <div>
            <h1 className="text-sm font-black text-[var(--color-navy)] tracking-tight">Ariya Thangam</h1>
            <p className="text-[10px] text-[var(--color-sky)] font-extrabold font-mono tracking-widest uppercase">Store Operations</p>
          </div>
        </div>
        <div className="text-right text-[10px] font-bold font-mono text-[var(--color-navy)] neo-pressed px-3 py-1.5 rounded-lg">
          {currentTime.split(' ')[0] || '00:00:00'}
        </div>
      </div>

      {/* Desktop Visual Header */}
      <header className="hidden md:block neo-flat mx-4 mt-4 p-4 z-20 relative">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Shop branding block with tag design */}
          <div className="flex items-center gap-5 text-center md:text-left">
            <div className="w-14 h-14 neo-pressed flex items-center justify-center shrink-0">
              <Sparkles className="w-7 h-7 text-[var(--color-sky)]" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-[var(--color-navy)] tracking-tight flex items-center justify-center md:justify-start gap-3">
                Ariya Thangam
                <span className="text-xs text-[var(--color-sky)] font-bold px-2 py-1 neo-pressed rounded-lg font-mono uppercase tracking-widest shrink-0">
                  Operations
                </span>
              </h1>
              <p className="text-slate-500 font-medium text-sm mt-1">
                Store Inventory & Rental Management
              </p>
            </div>
          </div>

          {/* Shop counter real-time clock card */}
          <div className="neo-pressed px-5 py-3 rounded-2xl flex items-center gap-6 shrink-0">
            <div className="space-y-1">
              <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-widest">Today</span>
              <span className="text-sm font-bold text-[var(--color-navy)] flex items-center gap-2 font-mono">
                <Calendar className="w-4 h-4 text-[var(--color-sky)]" />
                {new Date().toISOString().split('T')[0]}
              </span>
            </div>
            
            <div className="w-px h-8 bg-slate-300"></div>
            
            <div className="space-y-1">
              <span className="block text-[10px] uppercase text-slate-400 font-bold tracking-widest">Time</span>
              <span className="text-sm font-bold text-[var(--color-navy)] flex items-center gap-2 font-mono">
                <Clock className="w-4 h-4 text-[var(--color-sky)]" />
                {currentTime || '00:00:00'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab/Ticket Selectors Row */}
        <div className="mt-4 border-t border-[rgba(0,0,0,0.05)] pt-4">
          <div className="overflow-x-auto scrollbar-none px-2">
            <nav className="flex gap-4">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                { id: 'analytics', label: 'Analytics', icon: BarChart3 },
                { id: 'new-rental', label: 'New Rental', icon: PlusCircle, highlight: true },
                { id: 'rentals', label: 'Rentals', icon: ClipboardList },
                { id: 'inventory', label: 'Inventory', icon: Tag },
                { id: 'settings', label: 'Settings', icon: Database },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id === 'rentals') setRentalsFilter('all');
                      setActiveTab(tab.id as any);
                    }}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2.5 shrink-0 transition-all ${
                      isActive
                        ? 'neo-pressed text-[var(--color-navy)]'
                        : tab.highlight
                        ? 'neo-btn text-[var(--color-sky)]'
                        : 'neo-btn text-slate-500 hover:text-[var(--color-navy)]'
                    }`}
                  >
                    <Icon className="w-4.5 h-4.5 shrink-0" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </header>

      {/* Main Counter Workspace */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="animate-fadeIn">
          
          {/* Dashboard View */}
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stat dashboard cards */}
              <Dashboard 
                rentals={rentals} 
                onViewRentals={handleDashboardCardClick} 
                onNavigateToAnalytics={() => setActiveTab('analytics')}
              />

              {/* Quick Assistant Terminal guide */}
              <div className="neo-flat p-8 grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
                <div className="space-y-6">
                  <h3 className="text-2xl font-bold text-[var(--color-navy)] flex items-center gap-3">
                    <Info className="w-6 h-6 text-[var(--color-sky)]" />
                    Store Operations
                  </h3>
                  <div className="space-y-4 text-sm text-slate-600 font-medium leading-relaxed">
                    <p>
                      Track inventory, manage customer rentals, and oversee store operations in real time.
                    </p>
                    <ul className="space-y-3">
                      <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-sky)]"></div><strong>Security Deposit:</strong> Collect rental price + equal deposit.</li>
                      <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-sky)]"></div><strong>Photo Tracking:</strong> Add photos during checkout.</li>
                      <li className="flex items-center gap-2"><div className="w-1.5 h-1.5 rounded-full bg-[var(--color-sky)]"></div><strong>Cloud Sync:</strong> All data is securely backed up.</li>
                    </ul>
                  </div>

                  <div className="pt-2 flex flex-wrap gap-4">
                    <button
                      type="button"
                      onClick={() => setActiveTab('new-rental')}
                      className="neo-btn-primary px-6 py-3"
                    >
                      + New Rental
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('inventory')}
                      className="neo-btn px-6 py-3 text-[var(--color-navy)]"
                    >
                      Manage Inventory
                    </button>
                  </div>
                </div>

                {/* Aesthetic Ticket Receipt Illustration */}
                <div className="neo-pressed p-8 hidden md:flex flex-col space-y-5">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-slate-500 font-bold">Store Statistics</span>
                  
                  <div className="space-y-4 text-sm font-medium">
                    <div className="flex justify-between items-center text-slate-600">
                      <span>Unique Items</span>
                      <span className="font-mono font-bold text-[var(--color-navy)] neo-flat px-3 py-1 text-xs">
                        {inventory.length}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>Total Stock Volume</span>
                      <span className="font-mono font-bold text-[var(--color-navy)] neo-flat px-3 py-1 text-xs">
                        {inventory.reduce((sum, item) => sum + item.quantity, 0)} units
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>Currently Rented</span>
                      <span className="font-mono font-bold text-[var(--color-navy)] neo-flat px-3 py-1 text-xs">
                        {activeBookedRentals.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.quantity, 0), 0)} units
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span>Item Categories</span>
                      <span className="font-mono font-bold text-[var(--color-navy)] neo-flat px-3 py-1 text-xs">
                        {categories.length}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Analytics & Bills View */}
          {activeTab === 'analytics' && (
            <Analytics
              rentals={rentals}
              inventory={inventory}
              onShowToast={showToast}
            />
          )}

          {/* New Customer Entry Form */}
          {activeTab === 'new-rental' && (
            <RentalForm
              categories={categories}
              inventory={inventory}
              existingRentals={rentals}
              activeRentals={rentals}
              onSave={handleAddRental}
              onCancel={() => setActiveTab('dashboard')}
              onShowToast={showToast}
              isSubmitting={isCreatingRental}
            />
          )}

          {/* Rentals List / Tracking */}
          {activeTab === 'rentals' && (
            <RentalsList
              rentals={rentals}
              categories={categories}
              inventory={inventory}
              onUpdateRental={handleUpdateRental}
              onDeleteRental={handleDeleteRental}
              initialFilter={rentalsFilter}
              onShowToast={showToast}
              onShowConfirm={showConfirm}
            />
          )}

          {/* Inventory Manager */}
          {activeTab === 'inventory' && (
            <InventoryManager
              categories={categories}
              inventory={inventory}
              rentals={rentals}
              onAddCategory={handleAddCategory}
              onUpdateCategory={handleUpdateCategory}
              onDeleteCategory={handleDeleteCategory}
              onAddInventoryItem={handleAddInventoryItem}
              onUpdateInventoryItem={handleUpdateInventoryItem}
              onDeleteInventoryItem={handleDeleteInventoryItem}
              onShowToast={showToast}
              onShowConfirm={showConfirm}
            />
          )}

          {/* Settings & Backups */}
          {activeTab === 'settings' && (
            <div className="max-w-3xl mx-auto space-y-6">
              <div className="neo-flat p-8 space-y-8">
                
                <div className="border-b border-[rgba(0,0,0,0.05)] pb-4">
                  <h3 className="text-xl font-bold text-[var(--color-navy)] flex items-center gap-2">
                    <Database className="w-6 h-6 text-[var(--color-sky)]" />
                    Database & Recovery
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Manage system backups, export data, or restore from a previous snapshot.
                  </p>
                  <p className="text-xs text-[var(--color-sky)] font-bold mt-2 font-mono uppercase tracking-widest">
                    Cloud Database · {user?.email}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Export block */}
                  <div className="neo-pressed p-6 flex flex-col justify-between space-y-6">
                    <div>
                      <h4 className="font-bold text-base text-[var(--color-navy)] flex items-center gap-2">
                        <Download className="w-5 h-5 text-emerald-500" />
                        Export Backup
                      </h4>
                      <p className="text-xs text-slate-500 mt-2 font-medium">
                        Download a full snapshot of inventory, categories, and active rentals to a local file.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleDownloadBackup}
                      className="w-full py-3 neo-btn text-[var(--color-navy)] font-bold text-sm flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Save as .json
                    </button>
                  </div>

                  {/* Import block */}
                  <div className="neo-pressed p-6 flex flex-col justify-between space-y-6">
                    <div>
                      <h4 className="font-bold text-base text-[var(--color-navy)] flex items-center gap-2">
                        <Upload className="w-5 h-5 text-[var(--color-sky)]" />
                        Restore Backup
                      </h4>
                      <p className="text-xs text-slate-500 mt-2 font-medium">
                        Upload a snapshot to restore data. <strong>Warning:</strong> Replaces current data.
                      </p>
                    </div>

                    <div>
                      <input
                        type="file"
                        accept="application/json"
                        onChange={handleRestoreBackupUpload}
                        className="hidden"
                        id="db-restore-upload-input"
                      />
                      <button
                        type="button"
                        onClick={() => document.getElementById('db-restore-upload-input')?.click()}
                        className="w-full py-3 neo-btn text-[var(--color-navy)] font-bold text-sm flex items-center justify-center gap-2"
                      >
                        <Upload className="w-4 h-4" />
                        Upload .json
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reset Warning block */}
                <div className="neo-pressed p-6 flex flex-col sm:flex-row justify-between items-center gap-6">
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="font-bold text-base text-red-500 flex items-center justify-center sm:justify-start gap-2">
                      <RotateCcw className="w-5 h-5" />
                      System Reset
                    </h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Permanently wipes all inventory and active rentals from the system.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetDatabase}
                    className="px-6 py-3 neo-btn text-red-500 font-bold text-sm shrink-0"
                  >
                    Clear All Data
                  </button>
                </div>

                {/* Sign Out */}
                <div className="border-t border-[rgba(0,0,0,0.05)] pt-6">
                  <button
                    type="button"
                    onClick={signOut}
                    className="w-full py-3 neo-btn text-[var(--color-navy)] font-bold text-sm flex items-center justify-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Sign Out
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 mt-auto mb-16 md:mb-0 border-t border-[rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-semibold text-center sm:text-left text-slate-400">
          <p>© 2026 Cloakroom Operations</p>
          <div className="flex gap-4 font-mono text-[10px] tracking-widest uppercase">
            <span>Powered by Supabase</span>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 neo-flat rounded-t-3xl rounded-b-none z-40 pb-safe shadow-lg px-2 pt-2 pb-1">
        <nav className="flex justify-around items-center">
          {[
            { id: 'dashboard', label: 'Home', icon: TrendingUp },
            { id: 'analytics', label: 'Reports', icon: BarChart3 },
            { id: 'new-rental', label: 'Rent', icon: PlusCircle, highlight: true },
            { id: 'rentals', label: 'Rentals', icon: ClipboardList },
            { id: 'inventory', label: 'Stock', icon: Tag },
            { id: 'settings', label: 'Backup', icon: Database },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  if (tab.id === 'rentals') setRentalsFilter('all');
                  setActiveTab(tab.id as any);
                }}
                className={`flex flex-col items-center gap-1 p-2 transition-all rounded-xl ${
                  isActive 
                    ? 'neo-pressed text-[var(--color-navy)]' 
                    : tab.highlight 
                    ? 'text-[var(--color-sky)] neo-btn'
                    : 'text-slate-400 hover:text-[var(--color-navy)]'
                }`}
              >
                <Icon className={`w-5 h-5 ${tab.highlight && !isActive ? 'scale-110' : ''}`} />
                <span className="text-[9px] font-bold tracking-widest uppercase">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

    </div>
  );
}
