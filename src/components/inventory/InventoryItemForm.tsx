import React from 'react';
import { X, FileImage, Check } from 'lucide-react';
import { Category } from '../../types';

interface InventoryItemFormProps {
  isItemFormOpen: boolean;
  editingItemId: string | null;
  itemName: string;
  setItemName: (val: string) => void;
  itemCatId: string;
  setItemCatId: (val: string) => void;
  itemSize: string;
  setItemSize: (val: string) => void;
  itemQty: number;
  setItemQty: (val: number) => void;
  itemPrice: number;
  setItemPrice: (val: number) => void;
  itemPhoto: string;
  setItemPhoto: (val: string) => void;
  categories: Category[];
  handleSaveItem: (e: React.FormEvent) => void;
  handlePhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setIsItemFormOpen: (val: boolean) => void;
}

export default function InventoryItemForm({
  isItemFormOpen,
  editingItemId,
  itemName,
  setItemName,
  itemCatId,
  setItemCatId,
  itemSize,
  setItemSize,
  itemQty,
  setItemQty,
  itemPrice,
  setItemPrice,
  itemPhoto,
  setItemPhoto,
  categories,
  handleSaveItem,
  handlePhotoUpload,
  setIsItemFormOpen
}: InventoryItemFormProps) {
  if (!isItemFormOpen) return null;

  return (
    <div className="p-8 neo-flat space-y-6 animate-fadeIn relative">
      <h3 className="text-2xl font-black text-[var(--color-navy)] border-b border-[rgba(0,0,0,0.05)] pb-4">
        {editingItemId ? 'Edit Costume Outfit' : 'Add New Costume Outfit'}
      </h3>

      <form onSubmit={handleSaveItem} className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Costume Name *</label>
            <input
              type="text"
              required
              placeholder="e.g., Tiger Costume Deluxe"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
              className="w-full px-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Category *</label>
              <select
                required
                value={itemCatId}
                onChange={(e) => setItemCatId(e.target.value)}
                className="w-full px-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              >
                <option value="" disabled>Select Category</option>
                <option value="Animals">Animals</option>
                <option value="Vegetables">Vegetables</option>
                <option value="Freedom Fighters">Freedom Fighters</option>
                <option value="Fairy Tales & Royals">Fairy Tales & Royals</option>
                <option value="Traditional Costumes">Traditional Costumes</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Size *</label>
              <select
                required
                value={itemSize}
                onChange={(e) => setItemSize(e.target.value)}
                className="w-full px-4 py-3 neo-pressed text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              >
                <option value="" disabled>Select Size</option>
                <option value="S">Small (S)</option>
                <option value="M">Medium (M)</option>
                <option value="L">Large (L)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Quantity *</label>
              <input
                type="number"
                required
                min="0"
                value={itemQty}
                onChange={(e) => setItemQty(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 neo-pressed text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Rent (₹) *</label>
              <input
                type="number"
                required
                min="0"
                value={itemPrice}
                onChange={(e) => setItemPrice(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 neo-pressed text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] text-[var(--color-sky)]"
              />
            </div>
          </div>
        </div>

        <div className="space-y-6 flex flex-col justify-between">
          <div>
            <label className="block text-[10px] uppercase tracking-widest font-bold text-slate-500 mb-2">Photo</label>
            <div className="flex items-center gap-6">
              {itemPhoto ? (
                <div className="relative w-32 h-32 neo-pressed overflow-hidden shrink-0">
                  <img referrerPolicy="no-referrer" src={itemPhoto} alt="Preview" className="w-full h-full object-contain mix-blend-multiply rounded-lg" />
                  <button
                    type="button"
                    onClick={() => setItemPhoto('')}
                    className="absolute top-2 right-2 p-1.5 neo-btn text-red-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-32 neo-pressed flex flex-col items-center justify-center text-slate-400 shrink-0">
                  <FileImage className="w-8 h-8 mb-2" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">No Photo</span>
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
                  onClick={() => document.getElementById('file-item-photo')?.click()}
                  className="px-6 py-3 neo-btn font-bold text-xs uppercase tracking-widest cursor-pointer w-full"
                >
                  Select Image
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-4 justify-end pt-6">
            <button
              type="button"
              onClick={() => setIsItemFormOpen(false)}
              className="px-6 py-3 neo-btn text-slate-500 font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-3 neo-btn-primary font-bold text-xs uppercase tracking-widest flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Check className="w-5 h-5" />
              Save Costume
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
