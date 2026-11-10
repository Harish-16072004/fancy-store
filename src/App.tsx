import React, { useState, useEffect } from 'react';
import { Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from './store';
import { useQuery } from '@tanstack/react-query';
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

  const location = useLocation();
  const navigate = useNavigate();

  // Active path for nav highlighting
  const activeTab = location.pathname;

  // Back-prefiltering state when coming from clicking a dashboard block
  const [rentalsFilter, setRentalsFilter] = useState<'active' | 'overdue' | 'returned' | 'all'>('all');

  // Core States from Zustand
  const { categories, setCategories, inventory, setInventory, rentals, setRentals, isDataLoading, setIsDataLoading } = useStore();

  const [isCreatingRental, setIsCreatingRental] = useState(false);



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

  // Load data from Supabase using React Query
  const { data: catData, isLoading: catLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await fetchCategories();
      if (res.error) throw res.error;
      let loadedCats = res.data || [];
      const requiredCategories = ['Animals', 'Vegetables', 'Freedom Fighters', 'Fairy Tales & Royals', 'Traditional Costumes'];
      const missingCats = requiredCategories.filter(name => !loadedCats.some(c => c.name === name));

      if (missingCats.length > 0) {
        const newCatsResults = await Promise.all(missingCats.map(name => createCategory(name)));
        const successfullyCreated = newCatsResults.map(res => res.data).filter(Boolean) as Category[];
        loadedCats = [...loadedCats, ...successfullyCreated];
      }
      return loadedCats;
    },
    enabled: !!user,
  });

  const { data: invData, isLoading: invLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: async () => {
      const res = await fetchInventory();
      if (res.error) throw res.error;
      return res.data || [];
    },
    enabled: !!user,
  });

  // Load latest 50 rentals to optimize initial load
  const { data: rentData, isLoading: rentLoading } = useQuery({
    queryKey: ['rentals'],
    queryFn: async () => {
      const res = await fetchRentals(1, 50);
      if (res.error) throw res.error;
      return res.data || [];
    },
    enabled: !!user,
  });

  // Sync React Query data to Zustand store for UI operations
  useEffect(() => {
    if (catData) setCategories(catData);
  }, [catData, setCategories]);

  useEffect(() => {
    if (invData) setInventory(invData);
  }, [invData, setInventory]);

  useEffect(() => {
    if (rentData) setRentals(rentData);
  }, [rentData, setRentals]);

  useEffect(() => {
    setIsDataLoading(catLoading || invLoading || rentLoading);
  }, [catLoading, invLoading, rentLoading, setIsDataLoading]);



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
    let finalCategoryId = itemData.categoryId;
    const staticCategories = ['Animals', 'Vegetables', 'Freedom Fighters', 'Fairy Tales & Royals', 'Traditional Costumes'];

    // Auto-create or resolve static categories that were hardcoded in the dropdown
    if (staticCategories.includes(finalCategoryId)) {
      const existingCat = categories.find(c => c.name === finalCategoryId);
      if (existingCat) {
        finalCategoryId = existingCat.id;
      } else {
        const { data: newCat } = await createCategory(finalCategoryId);
        if (newCat) {
          setCategories(prev => [...prev, newCat]);
          finalCategoryId = newCat.id;
        } else {
          showToast('Failed to create category on the fly.', 'error');
          return;
        }
      }
      itemData.categoryId = finalCategoryId;
    }

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
    let finalCategoryId = itemData.categoryId;
    const staticCategories = ['Animals', 'Vegetables', 'Freedom Fighters', 'Fairy Tales & Royals', 'Traditional Costumes'];

    if (staticCategories.includes(finalCategoryId)) {
      const existingCat = categories.find(c => c.name === finalCategoryId);
      if (existingCat) {
        finalCategoryId = existingCat.id;
      } else {
        const { data: newCat } = await createCategory(finalCategoryId);
        if (newCat) {
          setCategories(prev => [...prev, newCat]);
          finalCategoryId = newCat.id;
        } else {
          showToast('Failed to create category on the fly.', 'error');
          return;
        }
      }
      itemData.categoryId = finalCategoryId;
    }

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
      console.error('Error creating rental:', error);
      showToast(error.message || 'Failed to create rental. Please try again.', 'error');
      return;
    }
    if (data) {
      setRentals(prev => [data, ...prev]);
      setRentalsFilter('all');
      navigate('/rentals');
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
    navigate('/rentals');
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
          <div className={`p-2 rounded-none shrink-0 ${toast.type === 'success' ? 'bg-emerald-50 text-emerald-600' :
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
          </div>
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
              </h1>
              <p className="text-slate-500 font-medium text-sm mt-1">
                Store Inventory & Rental Management
              </p>
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

              ].map((tab) => {
                const Icon = tab.icon;
                const targetPath = tab.id === 'dashboard' ? '/' : '/' + tab.id;
const isActive = activeTab === targetPath;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={(e) => {
    e.preventDefault();
    if (tab.id === 'rentals') setRentalsFilter('all');
    navigate(tab.id === 'dashboard' ? '/' : '/' + tab.id);
  }}
                    className={`px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2.5 shrink-0 transition-all ${isActive
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 sm:py-8">
        <div className="animate-fadeIn">

          {/* Dashboard View */}
          <Routes>
  <Route path="/" element={
            <div className="space-y-8">
              {/* Stat dashboard cards */}
              <Dashboard
                rentals={rentals}
                onViewRentals={handleDashboardCardClick}
                onNavigateToAnalytics={() => navigate('/analytics')}
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
                      onClick={() => navigate('/new-rental')}
                      className="neo-btn-primary px-6 py-3"
                    >
                      + New Rental
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate('/inventory')}
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
          } />
  {/* Analytics & Bills View */}
  <Route path="/analytics" element={
            <Analytics
              rentals={rentals}
              inventory={inventory}
              onShowToast={showToast}
            />
          } />
  {/* New Customer Entry Form */}
  <Route path="/new-rental" element={
            <RentalForm
              categories={categories}
              inventory={inventory}
              existingRentals={rentals}
              activeRentals={rentals}
              onSave={handleAddRental}
              onCancel={() => navigate('/')}
              onShowToast={showToast}
              isSubmitting={isCreatingRental}
            />
          } />
  {/* Rentals List / Tracking */}
  <Route path="/rentals" element={
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
          } />
  {/* Inventory Manager */}
  <Route path="/inventory" element={
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
              onShowConfirm={showConfirm} />
  } />
</Routes>

</div>
      </main>

      {/* Footer */}
      <footer className="py-6 mt-auto mb-16 md:mb-0 border-t border-[rgba(0,0,0,0.05)]">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-semibold text-center sm:text-left text-slate-400">
          <p>© 2026 Cloakroom Operations</p>
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

          ].map((tab) => {
            const Icon = tab.icon;
            const targetPath = tab.id === 'dashboard' ? '/' : '/' + tab.id;
const isActive = activeTab === targetPath;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={(e) => {
    e.preventDefault();
    if (tab.id === 'rentals') setRentalsFilter('all');
    navigate(tab.id === 'dashboard' ? '/' : '/' + tab.id);
  }}
                className={`flex flex-col items-center gap-1 p-2 transition-all rounded-xl ${isActive
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
