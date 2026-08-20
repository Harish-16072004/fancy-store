import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  Calendar, 
  Tag, 
  TrendingUp, 
  ClipboardList, 
  Settings, 
  PlusCircle, 
  Database, 
  Download, 
  Upload, 
  RotateCcw, 
  Clock, 
  Info,
  CheckCircle,
  HelpCircle,
  TrendingDown,
  X,
  BarChart3
} from 'lucide-react';
import { Category, InventoryItem, Rental } from './types';
import { 
  loadCategories, 
  saveCategories, 
  loadInventory, 
  saveInventory, 
  loadRentals, 
  saveRentals, 
  exportFullBackupJSON, 
  importFullBackupJSON,
  getRentalComputedStatus 
} from './utils/storage';

// Import our modular components
import Dashboard from './components/Dashboard';
import InventoryManager from './components/InventoryManager';
import RentalForm from './components/RentalForm';
import RentalsList from './components/RentalsList';
import Analytics from './components/Analytics';

export default function App() {
  // Tabs: 'dashboard', 'analytics', 'rentals', 'new-rental', 'inventory', 'settings'
  const [activeTab, setActiveTab] = useState<'dashboard' | 'analytics' | 'rentals' | 'new-rental' | 'inventory' | 'settings'>('dashboard');
  
  // Back-prefiltering state when coming from clicking a dashboard block
  const [rentalsFilter, setRentalsFilter] = useState<'active' | 'overdue' | 'returned' | 'all'>('all');

  // Core States
  const [categories, setCategories] = useState<Category[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [rentals, setRentals] = useState<Rental[]>([]);

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

  // Load data on boot
  useEffect(() => {
    setCategories(loadCategories());
    setInventory(loadInventory());
    setRentals(loadRentals());

    // Update time clock every second
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Save changes helper functions
  const handleAddCategory = (name: string) => {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name,
    };
    const next = [...categories, newCat];
    setCategories(next);
    saveCategories(next);
    showToast(`Category "${name}" created successfully.`, 'success');
  };

  const handleUpdateCategory = (id: string, name: string) => {
    const next = categories.map(cat => cat.id === id ? { ...cat, name } : cat);
    setCategories(next);
    saveCategories(next);
    showToast(`Category updated to "${name}".`, 'success');
  };

  const handleDeleteCategory = (id: string) => {
    const next = categories.filter(cat => cat.id !== id);
    setCategories(next);
    saveCategories(next);
    showToast('Category deleted.', 'info');
  };

  const handleAddInventoryItem = (itemData: Omit<InventoryItem, 'id'>) => {
    const newItem: InventoryItem = {
      ...itemData,
      id: `item-${Date.now()}`,
    };
    const next = [newItem, ...inventory];
    setInventory(next);
    saveInventory(next);
    showToast(`Outfit "${itemData.name}" added to stock inventory.`, 'success');
  };

  const handleUpdateInventoryItem = (id: string, itemData: Omit<InventoryItem, 'id'>) => {
    const next = inventory.map(item => item.id === id ? { ...item, ...itemData } : item);
    setInventory(next);
    saveInventory(next);
    showToast(`Outfit "${itemData.name}" stock details saved.`, 'success');
  };

  const handleDeleteInventoryItem = (id: string) => {
    const next = inventory.filter(item => item.id !== id);
    setInventory(next);
    saveInventory(next);
    showToast('Outfit removed from stock list.', 'info');
  };

  const handleAddRental = (rentalData: Omit<Rental, 'id' | 'createdAt'>) => {
    const newRental: Rental = {
      ...rentalData,
      id: `rent-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const next = [newRental, ...rentals];
    setRentals(next);
    saveRentals(next);
    
    // Switch to rentals tab to show new checkout
    setRentalsFilter('all');
    setActiveTab('rentals');
    showToast(`Rental handover registered successfully for customer "${rentalData.customerName}"!`, 'success');
  };

  const handleUpdateRental = (id: string, updatedFields: Partial<Rental>) => {
    const next = rentals.map(rent => rent.id === id ? { ...rent, ...updatedFields } : rent);
    setRentals(next);
    saveRentals(next);
  };

  const handleDeleteRental = (id: string) => {
    const next = rentals.filter(rent => rent.id !== id);
    setRentals(next);
    saveRentals(next);
  };

  // Dashboard View Redirection Helper
  const handleDashboardCardClick = (filter: 'active' | 'overdue' | 'returned' | 'all') => {
    setRentalsFilter(filter);
    setActiveTab('rentals');
  };

  // Backup & Restore
  const handleDownloadBackup = () => {
    const jsonStr = exportFullBackupJSON();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `fancy_dress_shop_database_backup_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleRestoreBackupUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result;
      if (typeof text === 'string') {
        const success = importFullBackupJSON(text);
        if (success) {
          // reload states
          setCategories(loadCategories());
          setInventory(loadInventory());
          setRentals(loadRentals());
          showToast('Database restored successfully! All stock, categories, and rentals have been updated.', 'success');
        } else {
          showToast('Failed to restore backup. Invalid database format. Please ensure you are uploading a valid backup JSON file.', 'error');
        }
      }
    };
    reader.readAsText(file);
    e.target.value = ''; // clear input
  };

  const handleResetDemoSeedData = () => {
    showConfirm(
      'Reset Database',
      'Are you sure you want to completely RESET the database to original demo seeds? ALL of your custom outfits, categories, and rental bookings will be permanently deleted.',
      () => {
        localStorage.clear();
        // Reload seeds
        setCategories(loadCategories());
        setInventory(loadInventory());
        setRentals(loadRentals());
        showToast('Database successfully reset to demo values!', 'success');
      }
    );
  };

  // Active rentals list (for stock calculating availability)
  const activeBookedRentals = rentals.filter(r => getRentalComputedStatus(r) !== 'returned');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans select-none selection:bg-blue-100 pb-16 md:pb-0">
      
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
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-slate-900 rounded-none flex items-center justify-center shadow-xs shrink-0">
            <Sparkles className="w-4.5 h-4.5 text-sky-400" />
          </div>
          <div>
            <h1 className="text-xs font-black text-slate-900 tracking-tight uppercase">Ariya Thangam</h1>
            <p className="text-[9px] text-blue-700 font-extrabold font-mono tracking-wider uppercase">Fancy Dress For Rent</p>
          </div>
        </div>
        <div className="text-right text-xxs font-bold font-mono text-slate-600 bg-slate-100 border border-slate-200/50 px-2 py-1 rounded-none">
          {currentTime.split(' ')[0] || '00:00:00'}
        </div>
      </div>

      {/* Desktop Visual Header */}
      <header className="hidden md:block bg-white text-slate-900 relative border-b border-slate-200 shadow-sm">
        
        {/* Accent Top Bar */}
        <div className="h-1 bg-gradient-to-r from-slate-900 via-blue-800 to-slate-900 w-full"></div>

        <div className="max-w-7xl mx-auto px-6 py-5 md:py-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Shop branding block with tag design */}
          <div className="flex items-center gap-4 text-center md:text-left">
            <div className="w-12 h-12 bg-slate-900 rounded-none flex items-center justify-center shadow-md shrink-0 border border-slate-800">
              <Sparkles className="w-7 h-7 text-sky-400" />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black text-slate-900 tracking-tight flex items-center justify-center md:justify-start gap-2">
                Ariya Thangam Fancy Dress For Rent
                <span className="text-xxs bg-blue-50 text-blue-800 border border-blue-100 font-bold px-2 py-0.5 rounded-none font-mono uppercase tracking-wider shrink-0">
                  Cloakroom Counter
                </span>
              </h1>
              <p className="text-slate-500 text-sm mt-0.5">
                Costume Inventory, Client Bookings &amp; Financial Analysis System
              </p>
            </div>
          </div>

          {/* Shop counter real-time clock card */}
          <div className="bg-slate-50 px-4 py-2.5 rounded-none border border-slate-200 flex items-center gap-4 shrink-0 shadow-sm">
            <div className="space-y-0.5">
              <span className="block text-xxs uppercase text-slate-400 font-bold tracking-wider">Counter Calendar</span>
              <span className="text-sm font-bold text-slate-700 flex items-center gap-1.5 font-mono">
                <Calendar className="w-3.5 h-3.5 text-blue-700" />
                {new Date().toISOString().split('T')[0]}
              </span>
            </div>
            
            <div className="w-[1px] h-8 bg-slate-200"></div>
            
            <div className="space-y-0.5">
              <span className="block text-xxs uppercase text-slate-400 font-bold tracking-wider">System Time</span>
              <span className="text-sm font-bold text-blue-700 flex items-center gap-1.5 font-mono">
                <Clock className="w-3.5 h-3.5" />
                {currentTime || '00:00:00'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab/Ticket Selectors Row */}
        <div className="bg-slate-50/60 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 overflow-x-auto scrollbar-none">
            <nav className="flex gap-2 py-2 px-2">
              {[
                { id: 'dashboard', label: 'Dashboard', icon: TrendingUp },
                { id: 'analytics', label: 'Analytics & Bills', icon: BarChart3 },
                { id: 'new-rental', label: 'New Rental Slip', icon: PlusCircle, highlight: true },
                { id: 'rentals', label: 'Rentals Log', icon: ClipboardList },
                { id: 'inventory', label: 'Manage Stock', icon: Tag },
                { id: 'settings', label: 'Backup Hub', icon: Database },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    id={`nav-tab-${tab.id}`}
                    onClick={() => {
                      if (tab.id === 'rentals') {
                        setRentalsFilter('all'); // reset sub filter when clicking directly
                      }
                      setActiveTab(tab.id as any);
                    }}
                    className={`px-4 py-2.5 rounded-none font-bold text-sm flex items-center gap-2 transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-md'
                        : tab.highlight
                        ? 'bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-800'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
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
              <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Info className="w-5.5 h-5.5 text-blue-800" />
                    How to Handle Rentals on the Counter
                  </h3>
                  <div className="space-y-3 text-sm text-slate-600">
                    <p className="leading-relaxed">
                      This management system is optimized for quick offline counter operation. It tracks costume stock, customer refunds, and handover conditions safely:
                    </p>
                    <ul className="space-y-2 list-disc list-inside">
                      <li><strong>Double Deposit Rule:</strong> We collect rental price + equal refundable deposit upfront for peace of mind.</li>
                      <li><strong>Photo Reference:</strong> Always snap condition photos during checkout to prevent dispute arguments on returns.</li>
                      <li><strong>Database Backups:</strong> Download a database JSON file to backup your stock list to a flash drive regularly!</li>
                    </ul>
                  </div>

                  <div className="pt-2 flex gap-3">
                    <button
                      type="button"
                      id="dash-quick-checkout"
                      onClick={() => setActiveTab('new-rental')}
                      className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-none text-sm shadow-sm transition-colors cursor-pointer"
                    >
                      + Start Checkout Slip
                    </button>
                    <button
                      type="button"
                      id="dash-quick-inventory"
                      onClick={() => setActiveTab('inventory')}
                      className="px-5 py-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold rounded-none text-sm transition-colors cursor-pointer"
                    >
                      Adjust Costume Stock
                    </button>
                  </div>
                </div>

                {/* Aesthetic Ticket Receipt Illustration */}
                <div className="bg-slate-50 border border-slate-200 rounded-none p-6 hidden md:flex flex-col space-y-4">
                  <span className="font-mono text-xxs uppercase tracking-wider text-slate-400 font-bold">Counter Quick-stats Info</span>
                  
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-semibold">Total Costumes Catalogued</span>
                      <span className="font-mono font-bold text-slate-950 bg-white px-2 py-0.5 rounded-none border border-slate-200">
                        {inventory.length} items
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-semibold">Total Stock Units in Store</span>
                      <span className="font-mono font-bold text-slate-950 bg-white px-2 py-0.5 rounded-none border border-slate-200">
                        {inventory.reduce((sum, item) => sum + item.quantity, 0)} units
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-semibold">Total Rented Out Right Now</span>
                      <span className="font-mono font-bold text-slate-950 bg-white px-2 py-0.5 rounded-none border border-slate-200">
                        {activeBookedRentals.reduce((sum, r) => sum + r.items.reduce((s, i) => s + i.quantity, 0), 0)} units
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-600">
                      <span className="font-semibold">Categories Active</span>
                      <span className="font-mono font-bold text-slate-950 bg-white px-2 py-0.5 rounded-none border border-slate-200">
                        {categories.length} categories
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
              <div className="bg-white border border-slate-200 rounded-none p-6 shadow-sm space-y-6">
                
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Database className="w-6 h-6 text-blue-800" />
                    Database Security &amp; Data Recovery Hub
                  </h3>
                  <p className="text-slate-500 text-sm mt-1">
                    Backup or restore all costume catalogs, category structures, and customer rental histories.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Export block */}
                  <div className="bg-slate-50 p-5 rounded-none border border-slate-200 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="font-bold text-base text-slate-800 flex items-center gap-1.5">
                        <Download className="w-5 h-5 text-emerald-600" />
                        Download Database Backup
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Saves a single JSON security file containing everything: categories, current stock inventory, condition logs, and historical customer rental receipts.
                      </p>
                    </div>

                    <button
                      type="button"
                      id="btn-backup-download"
                      onClick={handleDownloadBackup}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-none text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                    >
                      <Download className="w-4.5 h-4.5" />
                      Save Database File (.json)
                    </button>
                  </div>

                  {/* Import block */}
                  <div className="bg-slate-50 p-5 rounded-none border border-slate-200 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="font-bold text-base text-slate-800 flex items-center gap-1.5">
                        <Upload className="w-5 h-5 text-blue-800" />
                        Restore Database from File
                      </h4>
                      <p className="text-xs text-slate-500 mt-1">
                        Upload a previously exported database backup JSON file. <strong>Warning:</strong> This will replace your current counter database.
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
                        id="btn-backup-restore-trigger"
                        onClick={() => document.getElementById('db-restore-upload-input')?.click()}
                        className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-none text-sm flex items-center justify-center gap-1.5 shadow-sm transition-colors cursor-pointer"
                      >
                        <Upload className="w-4.5 h-4.5" />
                        Upload Backup (.json)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Reset Warning block */}
                <div className="bg-red-50 border border-red-200 rounded-none p-5 flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="space-y-1 text-center sm:text-left">
                    <h4 className="font-bold text-base text-red-800 flex items-center justify-center sm:justify-start gap-1.5">
                      <RotateCcw className="w-5 h-5" />
                      Danger Zone: Reset Demo Seeds
                    </h4>
                    <p className="text-xs text-red-700">
                      Wipes the database and loads the original seed data. Good for demonstration/testing on first launch.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="btn-db-reset-demo"
                    onClick={handleResetDemoSeedData}
                    className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-none text-sm shadow-sm shrink-0 transition-colors cursor-pointer"
                  >
                    Reset &amp; Seed Demo
                  </button>
                </div>

              </div>
            </div>
          )}

        </div>
      </main>

      {/* Footer cardboard styling */}
      <footer className="bg-slate-950 text-slate-400 py-6 border-t border-slate-900 mt-auto mb-16 md:mb-0">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm font-semibold text-center sm:text-left">
          <p>© 2026 Cloakroom. Running offline on secure local sandbox.</p>
          <div className="flex gap-4 font-mono text-xs text-slate-500">
            <span>DATABASE: LOCALSTORAGE</span>
          </div>
        </div>
      </footer>

      {/* Mobile Sticky Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 pb-safe shadow-lg">
        <nav className="flex justify-around items-center py-2 px-1">
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
                id={`mobile-nav-tab-${tab.id}`}
                onClick={() => {
                  if (tab.id === 'rentals') {
                    setRentalsFilter('all');
                  }
                  setActiveTab(tab.id as any);
                }}
                className={`flex flex-col items-center gap-1 py-1 px-2.5 transition-all relative ${
                  isActive 
                    ? 'text-blue-800 font-extrabold' 
                    : tab.highlight 
                    ? 'text-blue-700/80 font-semibold'
                    : 'text-slate-400 hover:text-slate-700'
                }`}
              >
                {isActive && (
                  <span className="absolute top-0 w-8 h-1 bg-slate-900 rounded-full"></span>
                )}
                <Icon className={`w-5 h-5 ${tab.highlight && !isActive ? 'scale-110 text-blue-600 animate-pulse' : ''}`} />
                <span className="text-[9px] font-bold tracking-tight uppercase">
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
