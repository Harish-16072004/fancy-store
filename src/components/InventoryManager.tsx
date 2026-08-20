import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Search, Filter, Tag, Hash, FileImage, Sparkles, Check, X, AlertCircle, FileDown, CalendarDays, Clock } from 'lucide-react';
import { Category, InventoryItem, Rental } from '../types';
import { getItemBookedRentals } from '../utils/availability';
import CostumeScheduleModal from './CostumeScheduleModal';
import * as XLSX from 'xlsx';

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
        'Rental Price (₹)': item.rentalPrice,
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
    setItemPrice(item.rentalPrice);
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
      rentalPrice: itemPrice,
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
      <div className="flex border-b border-slate-200">
        <button
          type="button"
          id="tab-view-items"
          onClick={() => setActiveTab('items')}
          className={`px-5 py-2.5 font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'items'
              ? 'border-b-2 border-slate-900 text-slate-900 font-extrabold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Outfits / Costumes ({inventory.length})
        </button>
        <button
          type="button"
          id="tab-view-categories"
          onClick={() => setActiveTab('categories')}
          className={`px-5 py-2.5 font-bold text-sm transition-all cursor-pointer ${
            activeTab === 'categories'
              ? 'border-b-2 border-slate-900 text-slate-900 font-extrabold'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          Categories ({categories.length})
        </button>
      </div>

      {activeTab === 'items' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center bg-white p-4 border border-slate-200 rounded-none shadow-sm">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="text"
                id="search-inventory"
                placeholder="Search costume name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-none bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
              />
            </div>

            {/* Category Filter */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-400 shrink-0" />
              <select
                id="filter-category"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="px-3.5 py-2 border border-slate-200 rounded-none bg-slate-50 text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all"
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
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                id="btn-export-inventory"
                onClick={handleExportInventoryExcel}
                className="px-4 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-none font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                title="Export Costume Inventory list separately to Excel"
              >
                <FileDown className="w-4.5 h-4.5" />
                Export (.xlsx)
              </button>

              <button
                type="button"
                id="btn-add-costume-modal"
                onClick={openAddItemForm}
                className="px-4 py-2 rounded-none bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer"
              >
                <Plus className="w-4.5 h-4.5" />
                Add Outfit
              </button>
            </div>
          </div>

          {/* Costume Form (Inline Modal Style) */}
          {isItemFormOpen && (
            <div className="p-6 bg-white border border-slate-200 rounded-none shadow-sm space-y-4 animate-fadeIn relative">
              <h3 className="text-lg font-bold text-slate-800 border-b border-slate-100 pb-2">
                {editingItemId ? 'Edit Costume Outfit' : 'Add New Costume Outfit'}
              </h3>

              <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Costume Name *</label>
                    <input
                      type="text"
                      id="form-item-name"
                      required
                      placeholder="e.g., Tiger Costume Deluxe"
                      value={itemName}
                      onChange={(e) => setItemName(e.target.value)}
                      className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Category *</label>
                      <select
                        id="form-item-category"
                        required
                        value={itemCatId}
                        onChange={(e) => setItemCatId(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      >
                        {categories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Size *</label>
                      <input
                        type="text"
                        id="form-item-size"
                        required
                        placeholder="e.g., S, M, L, XL, 4-6 yrs"
                        value={itemSize}
                        onChange={(e) => setItemSize(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Quantity in Stock *</label>
                      <input
                        type="number"
                        id="form-item-quantity"
                        required
                        min="0"
                        value={itemQty}
                        onChange={(e) => setItemQty(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">Rental Price (₹) *</label>
                      <input
                        type="number"
                        id="form-item-price"
                        required
                        min="0"
                        value={itemPrice}
                        onChange={(e) => setItemPrice(parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 flex flex-col justify-between">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Outfit Photo (Optional)</label>
                    <div className="flex items-center gap-4">
                      {itemPhoto ? (
                        <div className="relative w-24 h-24 rounded-none overflow-hidden border border-slate-200 shadow-xs">
                          <img referrerPolicy="no-referrer" src={itemPhoto} alt="Upload Preview" className="w-full h-full object-cover" />
                          <button
                            type="button"
                            id="btn-remove-item-photo"
                            onClick={() => setItemPhoto('')}
                            className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-none hover:bg-red-700 shadow-xs transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="w-24 h-24 rounded-none bg-slate-50 flex flex-col items-center justify-center border border-dashed border-slate-200 text-slate-400">
                          <FileImage className="w-6 h-6" />
                          <span className="text-xxs mt-1">No Photo</span>
                        </div>
                      )}

                      <div className="flex-1">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                          id="file-item-photo"
                        />
                        <button
                          type="button"
                          id="btn-upload-item-photo"
                          onClick={() => document.getElementById('file-item-photo')?.click()}
                          className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 rounded-none text-xs font-semibold text-slate-600 transition-colors cursor-pointer"
                        >
                          Select Image File
                        </button>
                        <p className="text-xxs text-slate-400 mt-2">
                          JPEG/PNG images. Will be saved in local storage. Keep image sizes small for better persistence.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-3 justify-end pt-4">
                    <button
                      type="button"
                      id="btn-cancel-item-form"
                      onClick={() => setIsItemFormOpen(false)}
                      className="px-3.5 py-1.5 rounded-none bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      id="btn-save-item"
                      className="px-4 py-1.5 rounded-none bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                    >
                      <Check className="w-4 h-4" />
                      Save Costume
                    </button>
                  </div>
                </div>
              </form>
            </div>
          )}

          {/* Costumes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredItems.map((item) => {
              const category = categories.find((c) => c.id === item.categoryId);
              const bookedRentals = getItemBookedRentals(item.id, rentals);
              const activeCount = bookedRentals.filter((b) => b.status === 'active' || b.status === 'overdue').length;
              const prebookedCount = bookedRentals.filter((b) => b.status === 'pre-booked').length;

              return (
                <div
                  key={item.id}
                  id={`item-card-${item.id}`}
                  className="bg-white border border-slate-200 rounded-none overflow-hidden shadow-xs hover:shadow-sm transition-all flex flex-col"
                >
                  {/* Photo area with fallback tag styling */}
                  <div className="h-44 bg-slate-100 relative overflow-hidden shrink-0 flex items-center justify-center">
                    {item.photo ? (
                      <img
                        src={item.photo}
                        alt={item.name}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-tr from-slate-50 to-blue-50/30 flex flex-col items-center justify-center text-slate-300 p-4">
                        <Sparkles className="w-10 h-10 text-slate-300 mb-1.5" />
                        <span className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono">
                          {category?.name || 'No Category'}
                        </span>
                      </div>
                    )}

                    {/* Costume Tag Sticker Overlay */}
                    <div className="absolute top-2.5 left-2.5 bg-slate-900 text-white font-extrabold text-xxs uppercase px-2 py-1 rounded-none shadow-xs font-mono flex items-center gap-1">
                      <Tag className="w-3 h-3 text-sky-400" /> Size {item.size}
                    </div>

                    <div className="absolute bottom-2.5 right-2.5 bg-slate-950/80 backdrop-blur-xs text-white font-mono font-bold text-xs px-2 py-0.5 rounded-none">
                      ₹{item.rentalPrice} / day
                    </div>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{item.name}</h4>
                      </div>
                      <p className="text-xxs text-slate-500 mt-1 flex items-center gap-1 font-semibold">
                        <Tag className="w-3.5 h-3.5 text-blue-700" /> {category?.name || 'Uncategorized'}
                      </p>
                    </div>

                    {/* Rotation schedule booking status pill */}
                    <div className="flex items-center justify-between gap-2 text-xxs font-mono bg-slate-50 p-2 border border-slate-100">
                      <div className="flex items-center gap-1.5">
                        {bookedRentals.length > 0 ? (
                          <span className="text-blue-800 font-bold flex items-center gap-1">
                            <Clock className="w-3 h-3 text-blue-600" />
                            {activeCount > 0 && `${activeCount} out `}
                            {prebookedCount > 0 && `(${prebookedCount} booked)`}
                          </span>
                        ) : (
                          <span className="text-emerald-700 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3 text-emerald-600" /> 100% In Store
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setScheduleItem(item)}
                        className="text-blue-700 hover:text-blue-900 font-bold flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        <CalendarDays className="w-3 h-3" /> Schedule ({bookedRentals.length})
                      </button>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                      <span className="text-xs font-semibold text-slate-600 flex items-center gap-1 font-mono">
                        <Hash className="w-4 h-4 text-slate-400" />
                        Stock: {item.quantity} units
                      </span>

                      <div className="flex gap-1.5">
                        <button
                          type="button"
                          id={`btn-edit-item-${item.id}`}
                          onClick={() => openEditItemForm(item)}
                          className="p-1.5 rounded-none bg-slate-50 hover:bg-slate-100 text-slate-600 transition-colors cursor-pointer"
                          title="Edit Outfit"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          id={`btn-delete-item-${item.id}`}
                          onClick={() => handleDeleteItem(item.id, item.name)}
                          className="p-1.5 rounded-none bg-red-50 hover:bg-red-100 text-red-600 transition-colors cursor-pointer"
                          title="Delete Outfit"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredItems.length === 0 && (
              <div className="col-span-full py-12 text-center bg-slate-50 border border-dashed border-slate-200 rounded-none">
                <AlertCircle className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-bold text-slate-700">No Costume Outfits Found</h3>
                <p className="text-slate-500 text-xs mt-1">Try adjusting your filters or search keywords.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Add Category Form */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-none shadow-xs space-y-3">
            <h4 className="text-sm font-bold text-slate-800">Add New Costume Category</h4>
            <p className="text-slate-500 text-xs">
              Create a custom section to group similar rental items. E.g., &quot;Superheroes&quot;, &quot;Halloween Special&quot;, &quot;Historical Figures&quot;.
            </p>

            <form onSubmit={handleCatSubmit} className="flex gap-2">
              <input
                type="text"
                id="input-new-cat"
                placeholder="e.g. Traditional Costumes"
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                className="flex-1 px-3 py-1.5 border border-slate-200 rounded-none text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600"
              />
              <button
                type="submit"
                id="btn-add-category"
                className="px-4 py-1.5 rounded-none bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Add
              </button>
            </form>
          </div>

          {/* Categories List */}
          <div className="space-y-3">
            <h4 className="text-sm font-bold text-slate-800">Existing Categories</h4>

            <div className="space-y-2">
              {categories.map((cat) => {
                const count = inventory.filter((item) => item.categoryId === cat.id).length;
                const isEditing = editingCatId === cat.id;

                return (
                  <div
                    key={cat.id}
                    id={`cat-item-${cat.id}`}
                    className="flex items-center justify-between p-3.5 bg-white border border-slate-200 rounded-none shadow-xs"
                  >
                    {isEditing ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          id={`input-edit-cat-${cat.id}`}
                          value={editingCatName}
                          onChange={(e) => setEditingCatName(e.target.value)}
                          className="flex-1 px-2.5 py-1 border border-blue-600 rounded-none text-sm focus:outline-none"
                        />
                        <button
                          type="button"
                          id={`btn-save-cat-${cat.id}`}
                          onClick={() => handleUpdateCategorySubmit(cat.id)}
                          className="p-1.5 bg-emerald-600 text-white rounded-none hover:bg-emerald-700 transition-colors cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          id={`btn-cancel-cat-${cat.id}`}
                          onClick={() => setEditingCatId(null)}
                          className="p-1.5 bg-slate-100 text-slate-600 rounded-none hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="space-y-0.5">
                          <span className="text-sm font-bold text-slate-800">{cat.name}</span>
                          <span className="block text-xxs text-slate-400 font-semibold font-mono">
                            {count} costume outfit{count !== 1 ? 's' : ''} in inventory
                          </span>
                        </div>

                        <div className="flex gap-1">
                          <button
                            type="button"
                            id={`btn-start-edit-cat-${cat.id}`}
                            onClick={() => startEditCategory(cat)}
                            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-none transition-colors cursor-pointer"
                            title="Rename Category"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            id={`btn-delete-cat-${cat.id}`}
                            onClick={() => handleDeleteCat(cat.id, cat.name)}
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-none transition-colors cursor-pointer"
                            title="Delete Category"
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
