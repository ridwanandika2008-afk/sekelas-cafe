"use client";

/**
 * Store keranjang pembeli (zustand + persist localStorage).
 * Harga di sini hanya untuk TAMPILAN — server selalu menghitung ulang
 * saat pesanan dibuat (anti-manipulasi harga).
 */
import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CartOption = {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceDelta: number;
};

export type CartLine = {
  uid: string;
  menuItemId: string;
  name: string;
  imageUrl?: string | null;
  basePrice: number;
  unitPrice: number;
  qty: number;
  note?: string;
  selectedOptions: CartOption[];
};

type CartState = {
  items: CartLine[];
  addItem: (line: Omit<CartLine, "uid">) => void;
  setQty: (uid: string, qty: number) => void;
  removeItem: (uid: string) => void;
  clear: () => void;
};

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      addItem: (line) =>
        set((s) => ({
          items: [
            ...s.items,
            { ...line, uid: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}` },
          ],
        })),
      setQty: (uid, qty) =>
        set((s) => ({
          items: s.items
            .map((i) => (i.uid === uid ? { ...i, qty: Math.max(0, Math.min(99, qty)) } : i))
            .filter((i) => i.qty > 0),
        })),
      removeItem: (uid) => set((s) => ({ items: s.items.filter((i) => i.uid !== uid) })),
      clear: () => set({ items: [] }),
    }),
    { name: "skls-cart" }
  )
);

export function cartSubtotal(items: CartLine[]): number {
  return items.reduce((s, i) => s + i.unitPrice * i.qty, 0);
}

export function cartTotalUnits(items: CartLine[]): number {
  return items.reduce((s, i) => s + i.qty, 0);
}
