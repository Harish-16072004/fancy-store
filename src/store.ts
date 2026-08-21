import { create } from 'zustand';
import { InventoryItem, Rental, Category } from './types';
import type { User } from '@supabase/supabase-js';
import { fetchCategories, fetchInventory, fetchRentals } from './lib/database';
import React from 'react';

interface AppState {
  inventory: InventoryItem[];
  rentals: Rental[];
  categories: Category[];
  user: User | null;
  isDataLoading: boolean;

  setInventory: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
  setRentals: React.Dispatch<React.SetStateAction<Rental[]>>;
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  setIsDataLoading: React.Dispatch<React.SetStateAction<boolean>>;

  // Actions
  addRental: (rental: Rental) => void;
  updateRental: (id: string, updates: Partial<Rental>) => void;
  addInventoryItem: (item: InventoryItem) => void;
  updateInventoryItem: (id: string, item: InventoryItem) => void;
  removeInventoryItem: (id: string) => void;
  addCategory: (cat: Category) => void;
  updateCategory: (id: string, name: string) => void;
  removeCategory: (id: string) => void;

  // Global load function
  loadData: () => Promise<void>;
}

export const useStore = create<AppState>((set) => ({
  inventory: [],
  rentals: [],
  categories: [],
  user: null,
  isDataLoading: true,

  setInventory: (update) => set((state) => ({ 
    inventory: typeof update === 'function' ? update(state.inventory) : update 
  })),
  setRentals: (update) => set((state) => ({ 
    rentals: typeof update === 'function' ? update(state.rentals) : update 
  })),
  setCategories: (update) => set((state) => ({ 
    categories: typeof update === 'function' ? update(state.categories) : update 
  })),
  setUser: (update) => set((state) => ({ 
    user: typeof update === 'function' ? update(state.user) : update 
  })),
  setIsDataLoading: (update) => set((state) => ({ 
    isDataLoading: typeof update === 'function' ? update(state.isDataLoading) : update 
  })),

  addRental: (rental) => set((state) => ({ rentals: [rental, ...state.rentals] })),
  updateRental: (id, updates) => set((state) => ({
    rentals: state.rentals.map(r => r.id === id ? { ...r, ...updates } : r)
  })),
  
  addInventoryItem: (item) => set((state) => ({ inventory: [item, ...state.inventory] })),
  updateInventoryItem: (id, updated) => set((state) => ({
    inventory: state.inventory.map(i => i.id === id ? updated : i)
  })),
  removeInventoryItem: (id) => set((state) => ({
    inventory: state.inventory.filter(i => i.id !== id)
  })),

  addCategory: (cat) => set((state) => ({ categories: [...state.categories, cat] })),
  updateCategory: (id, name) => set((state) => ({
    categories: state.categories.map(c => c.id === id ? { ...c, name } : c)
  })),
  removeCategory: (id) => set((state) => ({
    categories: state.categories.filter(c => c.id !== id)
  })),

  loadData: async () => {
    set({ isDataLoading: true });
    try {
      const [catResult, invResult, rentalResult] = await Promise.all([
        fetchCategories(),
        fetchInventory(),
        fetchRentals(),
      ]);

      set({ 
        categories: catResult.data || [],
        inventory: invResult.data || [],
        rentals: rentalResult.data || []
      });
    } catch (err) {
      console.error('Failed to load data in store:', err);
    } finally {
      set({ isDataLoading: false });
    }
  }
}));
