import React from 'react';
import { CalendarDays, MinusCircle, PlusCircle, Trash2, Plus, AlertCircle } from 'lucide-react';
import { Category, InventoryItem, Rental } from '../../types';
import { formatINR } from '../../utils/money';
import { getItemBookedRentals } from '../../utils/availability';

interface ItemsSelectionSectionProps {
  inventory: InventoryItem[];
  categories: Category[];
  rentalsList: Rental[];
  selectedItems: Record<string, number>;
  additionalItems: { name: string; quantity: number }[];
  conflictingItems: { item: InventoryItem; selected: number; available: number }[];
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  selectedCategoryFilter: string;
  setSelectedCategoryFilter: (val: string) => void;
  setInspectScheduleItem: (item: InventoryItem | null) => void;
  getRemainingStock: (item: InventoryItem) => number;
  handleAddCostume: (itemId: string) => void;
  handleDecrementCostume: (itemId: string) => void;
  addAdditionalItemField: () => void;
  updateAdditionalItem: (index: number, field: 'name' | 'quantity', val: any) => void;
  removeAdditionalItemField: (index: number) => void;
}

export default function ItemsSelectionSection({
  inventory, categories, rentalsList,
  selectedItems, additionalItems, conflictingItems,
  searchQuery, setSearchQuery,
  selectedCategoryFilter, setSelectedCategoryFilter,
  setInspectScheduleItem, getRemainingStock,
  handleAddCostume, handleDecrementCostume,
  addAdditionalItemField, updateAdditionalItem, removeAdditionalItemField
}: ItemsSelectionSectionProps) {
  return (
    <>
      {/* 2. Costume Inventory Select Ticket Card */}
      <div className="neo-flat p-8 relative space-y-6">
        <div className="absolute top-0 left-8 -translate-y-1/2 neo-flat bg-[var(--color-navy)] text-[var(--color-sky)] font-bold px-4 py-1 text-[15px] uppercase tracking-widest font-mono">
          Items
        </div>

        {/* Date Conflict Warning Banner if dates changed after selecting */}
        {conflictingItems.length > 0 && (
          <div className="p-4 neo-pressed ring-2 ring-red-400 text-red-600 text-xs flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <div>
              <strong className="font-bold">Stock Conflict:</strong>
              <ul className="list-disc list-inside mt-2 space-y-1 text-[10px] font-medium tracking-wide">
                {conflictingItems.map(({ item, selected, available }) => (
                  <li key={item.id}>
                    <strong>{item.name}</strong>: Selected {selected}, only {available} free.
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 mt-4">
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 neo-pressed px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
          />
          <select
            value={selectedCategoryFilter}
            onChange={(e) => setSelectedCategoryFilter(e.target.value)}
            className="neo-pressed px-4 py-3 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)] appearance-none cursor-pointer"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {/* Inventory Items Pick List */}
        <div className="max-h-96 overflow-y-auto space-y-4 pr-2 custom-scrollbar p-2">
          {inventory
            .filter(item => {
              const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
              const matchCat = selectedCategoryFilter === 'all' || item.categoryId === selectedCategoryFilter;
              return matchSearch && matchCat;
            })
            .map(item => {
              const cat = categories.find(c => c.id === item.categoryId);
              const remaining = getRemainingStock(item);
              const selectedQty = selectedItems[item.id] || 0;
              const canAdd = selectedQty < remaining;
              const totalStoreStock = Number(item.quantity) || 0;
              const bookedRentalsCount = getItemBookedRentals(item.id, rentalsList).length;

              return (
                <div
                  key={item.id}
                  className={`p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${selectedQty > 0 ? 'neo-flat ring-2 ring-[var(--color-sky)]' : 'neo-btn'
                    }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-[var(--color-navy)] text-base">{item.name}</span>
                      <button
                        type="button"
                        onClick={() => setInspectScheduleItem(item)}
                        className="text-[10px] neo-pressed text-[var(--color-sky)] px-2 py-1 font-bold tracking-widest uppercase flex items-center gap-1.5"
                        title="Schedule"
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                        ({bookedRentalsCount})
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-3 items-center text-[10px] font-bold tracking-widest uppercase">
                      <span className="text-slate-500">{cat?.name}</span>
                      <span className="text-slate-500">Size {item.size}</span>
                      <span className="text-emerald-500 font-mono">{formatINR(item.rentalPrice)}/d</span>

                      <span
                        className={`px-3 py-1 neo-pressed ${remaining <= 0
                          ? 'text-red-500'
                          : remaining < totalStoreStock
                            ? 'text-amber-500'
                            : 'text-emerald-500'
                          }`}
                      >
                        Avail {remaining}/{totalStoreStock}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {selectedQty > 0 ? (
                      <div className="flex items-center gap-3 neo-pressed px-3 py-1.5">
                        <button
                          type="button"
                          onClick={() => handleDecrementCostume(item.id)}
                          className="text-slate-400 hover:text-[var(--color-navy)] cursor-pointer"
                        >
                          <MinusCircle className="w-5 h-5" />
                        </button>
                        <span className="font-mono font-bold text-base text-[var(--color-navy)] w-6 text-center">{selectedQty}</span>
                        <button
                          type="button"
                          onClick={() => handleAddCostume(item.id)}
                          disabled={!canAdd}
                          className="text-slate-400 hover:text-[var(--color-navy)] disabled:opacity-30 cursor-pointer"
                        >
                          <PlusCircle className="w-5 h-5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddCostume(item.id)}
                        disabled={remaining <= 0}
                        className={`px-5 py-2.5 font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer ${remaining <= 0
                          ? 'neo-pressed text-slate-400 cursor-not-allowed'
                          : 'neo-btn text-[var(--color-navy)]'
                          }`}
                      >
                        {remaining <= 0 ? 'Out' : 'Select'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* 3. Repeatable Additional Accessories Card */}
      <div className="neo-flat p-8 relative space-y-6">
        <div className="absolute top-0 left-8 -translate-y-1/2 neo-flat bg-[var(--color-navy)] text-[var(--color-sky)] font-bold px-4 py-1 text-[15px] uppercase tracking-widest font-mono">
          Accessories
        </div>

        <p className="text-xs font-medium text-slate-500 mt-2">
          Add extra custom elements (props, belts, caps).
        </p>

        <div className="space-y-4">
          {additionalItems.map((item, idx) => (
            <div key={idx} className="flex gap-4 items-center">
              <input
                type="text"
                placeholder="E.g. Extra sword, Belt"
                value={item.name}
                onChange={(e) => updateAdditionalItem(idx, 'name', e.target.value)}
                className="flex-1 neo-pressed px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-sky)]"
              />
              <div className="w-24 shrink-0 flex items-center neo-pressed p-1">
                <button
                  type="button"
                  onClick={() => updateAdditionalItem(idx, 'quantity', Math.max(1, item.quantity - 1))}
                  className="px-2 py-1 text-slate-400 hover:text-[var(--color-navy)] font-bold text-lg"
                >
                  -
                </button>
                <input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateAdditionalItem(idx, 'quantity', parseInt(e.target.value) || 1)}
                  className="w-full text-center bg-transparent border-none text-sm font-bold font-mono focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => updateAdditionalItem(idx, 'quantity', item.quantity + 1)}
                  className="px-2 py-1 text-slate-400 hover:text-[var(--color-navy)] font-bold text-lg"
                >
                  +
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeAdditionalItemField(idx)}
                className="p-3 neo-btn text-red-500 shrink-0"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        <button
          type="button"
          onClick={addAdditionalItemField}
          className="py-3 px-4 neo-btn text-slate-500 hover:text-[var(--color-sky)] font-bold text-[10px] tracking-widest uppercase w-full flex items-center justify-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Custom Prop
        </button>
      </div>
    </>
  );
}
