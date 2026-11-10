import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, Tag, Hash, FileImage, Sparkles, Check, X, AlertCircle, FileDown, CalendarDays, Clock } from 'lucide-react';
import { Category, InventoryItem, Rental } from '../types';
import { getItemBookedRentals } from '../utils/availability';
import CostumeScheduleModal from './CostumeScheduleModal';
import InventoryItemForm from './inventory/InventoryItemForm';
import * as XLSX from 'xlsx';
import { toPaise, toRupees, formatINR } from '../utils/money';

interface InventoryManagerProps {
  categories: Category[];
  inventory: InventoryItem[];
  rentals?: Rental[];
  onAddCategory: (name: string) => void;
  onUpdateCategory: (id: string, name: string) => void;
  onDeleteCategory: (id: string) => void;
  onAddInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  onUpdateInventoryItem: (id: string, item: Omit<InventoryItem, 'id'>) => void;
  onDeleteInventoryItem: (id: string) => void;
  onShowToast?: (msg: string, type?: 'success' | 'info' | 'error') => void;
  onShowConfirm?: (title: string, message: string, onConfirm: () => void) => void;
}

export default function InventoryManager({
  categories,
  inventory,
  rentals = [],
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddInventoryItem,
  onUpdateInventoryItem,
  onDeleteInventoryItem,
  onShowToast,
  onShowConfirm,
}: InventoryManagerProps) {
  // Override alert locally
  const alert = (msg: string, type: 'success' | 'info' | 'error' = 'info') => {
    if (onShowToast) {
      onShowToast(msg, type);
    } else {
      window.alert(msg);
    }
  };

  const [activeTab, setActiveTab] = useState<'items' | 'categories'>('items');
  const [scheduleItem, setScheduleItem] = useState<InventoryItem | null>(null);

  // Export Inventory list to Excel separately
  const handleExportInventoryExcel = () => {
    const dataRows = inventory.map((item) => {
      const category = categories.find((c) => c.id === item.categoryId);
      return {
        'Costume Name': item.name,
        'Category': category ? category.name : 'Unknown',
        'Size': item.size,
        'Stock Quantity': item.quantity,
        'Rental Price (₹)': toRupees(item.rentalPrice),
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Stock');

    worksheet['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 10 }, { wch: 15 }, { wch: 18 }];

    XLSX.writeFile(workbook, `costume_inventory_report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Form states for Category
  const [newCatName, setNewCatName] = useState('');
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Form states for Inventory Item
  const [isItemFormOpen, setIsItemFormOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  const [itemName, setItemName] = useState('');
  const [itemCatId, setItemCatId] = useState('');
  const [itemSize, setItemSize] = useState('M');
  const [itemQty, setItemQty] = useState<number>(1);
  const [itemPrice, setItemPrice] = useState<number>(200);
  const [itemPhoto, setItemPhoto] = useState<string>('');

  // Handle category submit
  const handleCatSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newCatName.trim()) {
      onAddCategory(newCatName.trim());
      setNewCatName('');
    }
  };

  const startEditCategory = (cat: Category) => {
    setEditingCatId(cat.id);
    setEditingCatName(cat.name);
  };

  const handleUpdateCategorySubmit = (id: string) => {
    if (editingCatName.trim()) {
      onUpdateCategory(id, editingCatName.trim());
      setEditingCatId(null);
      setEditingCatName('');
    }
  };

  // Handle costume image uploads
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setItemPhoto(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Open item form for creating
  const openAddItemForm = () => {
    setEditingItemId(null);
    setItemName('');
    setItemCatId(categories[0]?.id || '');
    setItemSize('M');
    setItemQty(1);
    setItemPrice(300);
    setItemPhoto('');
    setIsItemFormOpen(true);
  };

  // Open item form for editing
  const openEditItemForm = (item: InventoryItem) => {
    setEditingItemId(item.id);
    setItemName(item.name);
    setItemCatId(item.categoryId);
    setItemSize(item.size);
    setItemQty(item.quantity);
    setItemPrice(toRupees(item.rentalPrice));
    setItemPhoto(item.photo || '');
    setIsItemFormOpen(true);
  };

  // Save Inventory Item
  const handleSaveItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || !itemCatId) return;

    const itemData = {
      name: itemName.trim(),
      categoryId: itemCatId,
      size: itemSize,
      quantity: itemQty,
      rentalPrice: toPaise(itemPrice),
      photo: itemPhoto || undefined,
    };

    if (editingItemId) {
      onUpdateInventoryItem(editingItemId, itemData);
    } else {
      onAddInventoryItem(itemData);
    }

    setIsItemFormOpen(false);
  };

  // Delete item with simple confirmation
  const handleDeleteItem = (id: string, name: string) => {
    const runDelete = () => {
      onDeleteInventoryItem(id);
    };
    if (onShowConfirm) {
      onShowConfirm(
        'Delete Outfit',
        `Are you sure you want to delete "${name}" from the inventory?`,
        runDelete
      );
    } else if (window.confirm(`Are you sure you want to delete "${name}" from the inventory?`)) {
      runDelete();
    }
  };

  // Delete category (checks if items exist under it first)
  const handleDeleteCat = (id: string, name: string) => {
    const attachedCount = inventory.filter(item => item.categoryId === id).length;
    if (attachedCount > 0) {
      alert(`Cannot delete category "${name}" because it contains ${attachedCount} costume items. Move or delete those costumes first.`, 'error');
      return;
    }
    const runDelete = () => {
      onDeleteCategory(id);
    };
    if (onShowConfirm) {
      onShowConfirm(
        'Delete Category',
        `Are you sure you want to delete the category "${name}"?`,
        runDelete
      );
    } else if (window.confirm(`Are you sure you want to delete the category "${name}"?`)) {
      runDelete();
    }
  };

  // Filter items
  const filteredItems = inventory.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Tab Navigation */}
      <div className="flex gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('items')}
          className={`flex-1 px-5 py-3 font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'items'
              ? 'neo-pressed text-[var(--color-navy)]'
              : 'neo-btn text-slate-500 hover:text-[var(--color-navy)]'
            }`}
        >
          Outfits / Costumes ({inventory.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('categories')}
          className={`flex-1 px-5 py-3 font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${activeTab === 'categories'
              ? 'neo-pressed text-[var(--color-navy)]'
              : 'neo-btn text-slate-500 hover:text-[var(--color-navy)]'
            }`}
        >
          Categories ({categories.length})
        </button>
      </div>

      {activeTab === 'items' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 sm:gap-6 justify-between items-stretch md:items-center neo-flat p-4 sm:p-6">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--color-sky)]" />
              <input
                type="text"
                placeholder="Search costume name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-3">
              <Filter className="w-5 h-5 text-slate-400 shrink-0" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full md:w-auto px-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] transition-all"
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Add New Costume Button */}
            <div className="grid grid-cols-2 sm:flex gap-3 sm:gap-4 shrink-0">
              <button
                type="button"
                onClick={handleExportInventoryExcel}
                className="px-4 sm:px-6 py-3 neo-btn text-emerald-500 hover:text-emerald-600 font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer"
                title="Export Costume Inventory list"
              >
                <FileDown className="w-5 h-5" />
                Export
              </button>

              <button
                type="button"
                onClick={openAddItemForm}
                className="px-4 sm:px-6 py-3 neo-btn-primary font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                Add Outfit
              </button>
            </div>
          </div>

          {/* Costume Form (Inline Modal Style) */}
          <InventoryItemForm
            isItemFormOpen={isItemFormOpen}
            editingItemId={editingItemId}
            itemName={itemName}
            setItemName={setItemName}
            itemCatId={itemCatId}
            setItemCatId={setItemCatId}
            itemSize={itemSize}
            setItemSize={setItemSize}
            itemQty={itemQty}
            setItemQty={setItemQty}
            itemPrice={itemPrice}
            setItemPrice={setItemPrice}
            itemPhoto={itemPhoto}
            setItemPhoto={setItemPhoto}
            categories={categories}
            handleSaveItem={handleSaveItem}
            handlePhotoUpload={handlePhotoUpload}
            setIsItemFormOpen={setIsItemFormOpen}
          />

          {/* Costumes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredItems.map((item) => {
              const category = categories.find((c) => c.id === item.categoryId);
              const bookedRentals = getItemBookedRentals(item.id, rentals);
              const activeCount = bookedRentals.filter((b) => b.status === 'active' || b.status === 'overdue').length;
              const prebookedCount = bookedRentals.filter((b) => b.status === 'pre-booked').length;

              return (
                <div
                  key={item.id}
                  className="neo-flat overflow-hidden transition-all flex flex-col group p-4"
                >
                  {/* Photo area with fallback tag styling */}
                  <div className="h-48 neo-pressed relative overflow-hidden shrink-0 flex items-center justify-center mb-4">
                    {item.photo ? (
                      <img
                        src={item.photo}
                        alt={item.name}
                        className="w-full h-full object-contain mix-blend-multiply rounded-lg transition-transform group-hover:scale-105"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
                        <Sparkles className="w-10 h-10 text-[var(--color-sky)] opacity-50 mb-2" />
                        <span className="text-[10px] font-bold text-slate-400 tracking-widest uppercase font-mono">
                          {category?.name || 'No Category'}
                        </span>
                      </div>
                    )}

                    {/* Costume Tag Sticker Overlay */}
                    <div className="absolute top-3 left-3 bg-[var(--color-navy)] text-white font-black text-[10px] tracking-widest uppercase px-3 py-1 shadow-md font-mono flex items-center gap-2 rounded-lg">
                      <Tag className="w-3 h-3 text-[var(--color-sky)]" /> {item.size}
                    </div>

                    <div className="absolute bottom-3 right-3 bg-[var(--color-sky)] text-white font-mono font-black text-xs px-3 py-1 shadow-md rounded-lg">
                      {formatINR(item.rentalPrice)}/day
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-between space-y-4">
                    <div>
                      <h4 className="text-lg font-black text-[var(--color-navy)] line-clamp-1">{item.name}</h4>
                      <p className="text-[10px] text-slate-500 mt-1 flex items-center gap-1 font-bold uppercase tracking-widest">
                        <Tag className="w-3 h-3 text-slate-400" /> {category?.name || 'Uncategorized'}
                      </p>
                    </div>

                    {/* Rotation schedule booking status pill */}
                    <div className="flex items-center justify-between gap-2 text-[10px] font-mono neo-pressed p-3">
                      <div className="flex items-center gap-2">
                        {bookedRentals.length > 0 ? (
                          <span className="text-blue-500 font-bold flex items-center gap-1 uppercase tracking-widest">
                            <Clock className="w-3 h-3 text-blue-400" />
                            {activeCount > 0 && `${activeCount} out `}
                            {prebookedCount > 0 && `(${prebookedCount} booked)`}
                          </span>
                        ) : (
                          <span className="text-emerald-500 font-bold flex items-center gap-1 uppercase tracking-widest">
                            <Check className="w-3 h-3 text-emerald-400" /> In Store
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setScheduleItem(item)}
                        className="text-[var(--color-sky)] hover:text-[var(--color-navy)] font-bold flex items-center gap-1 uppercase tracking-widest cursor-pointer"
                      >
                        <CalendarDays className="w-3 h-3" /> Schedule
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <span className="text-xs font-black text-slate-500 flex items-center gap-2 font-mono uppercase tracking-widest">
                        <Hash className="w-4 h-4 text-slate-400" />
                        Stock: {item.quantity}
                      </span>

                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditItemForm(item)}
                          className="p-2 neo-btn text-slate-400 hover:text-[var(--color-navy)] transition-colors cursor-pointer"
                          title="Edit Outfit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="p-2 neo-btn text-red-400 hover:text-red-500 transition-colors cursor-pointer"
                          title="Delete Outfit"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="col-span-full py-16 text-center neo-pressed">
                <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-black text-[var(--color-navy)]">No Costume Outfits Found</h3>
                <p className="text-slate-500 text-sm mt-2 font-medium">Try adjusting your filters or search keywords.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8">
          {/* Add Category Form */}
          <div className="p-4 sm:p-8 neo-flat space-y-4">
            <h4 className="text-xl font-black text-[var(--color-navy)]">New Category</h4>
            <p className="text-slate-500 text-sm font-medium">
              Create a custom section to group similar items (e.g. Superheroes, Historical).
            </p>

            <form onSubmit={handleCatSubmit} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. Traditional Costumes"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="w-full sm:flex-1 min-w-0 px-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              />
              <button
                type="submit"
                className="w-full sm:w-auto px-6 py-3 neo-btn-primary font-bold text-xs flex items-center justify-center gap-2 uppercase tracking-widest cursor-pointer shrink-0"
              >
                <Plus className="w-5 h-5" /> Add
              </button>
            </form>
          </div>

          {/* Categories List */}
          <div className="p-4 sm:p-8 neo-flat space-y-6">
            <h4 className="text-xl font-black text-[var(--color-navy)]">Categories</h4>

            <div className="space-y-4 max-h-[50vh] overflow-y-auto pr-1 hide-scrollbar">
              {categories.map((cat) => {
                const count = inventory.filter((item) => item.categoryId === cat.id).length;
                const isEditing = editingCatId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between p-4 neo-pressed"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex gap-3">
                        <input
                          type="text"
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 px-4 py-2 neo-pressed text-sm font-bold focus:outline-none ring-1 ring-[var(--color-sky)]"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateCategorySubmit(cat.id)}
                          className="p-2 neo-btn text-emerald-500 hover:text-emerald-600 transition-colors cursor-pointer"
                        >
                          <Check className="w-5 h-5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCatId(null)}
                          className="p-2 neo-btn text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-1">
                          <span className="text-base font-black text-[var(--color-navy)]">{cat.name}</span>
                          <span className="block text-[10px] text-slate-500 font-bold uppercase tracking-widest font-mono">
                            {count} item{count !== 1 ? 's' : ''}
                          </span>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEditCategory(cat)}
                            className="p-2 neo-btn text-slate-400 hover:text-[var(--color-navy)] transition-colors cursor-pointer"
                            title="Rename"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCat(cat.id, cat.name)}
                            className="p-2 neo-btn text-red-400 hover:text-red-500 transition-colors cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
      {/* Schedule Inspection Modal */}
      {scheduleItem && (
        <CostumeScheduleModal
          item={scheduleItem}
          rentals={rentals}
          onClose={() => setScheduleItem(null)}
        />
      )}
    </div>
  );
}
