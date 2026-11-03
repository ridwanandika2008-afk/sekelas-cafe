/** Tipe data bersama modul Stok & Bahan Baku (admin). */

export type AdminIngredient = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  minStock: number;
  isActive: boolean;
  createdAt: string;
  menuLinks: number;
};

export type MenuLite = {
  id: string;
  name: string;
  price: number;
  status: string;
};

export type MovementItem = {
  id: string;
  type: string; // IN | OUT | ADJUST
  amount: number;
  note: string | null;
  createdAt: string;
  orderNumber: string | null;
  userName: string | null;
  userRole: string | null;
};

export type IngredientOption = {
  id: string;
  name: string;
  unit: string;
  stock: number;
  isActive: boolean;
};

export type RecipeRow = {
  ingredientId: string;
  amount: number;
};

/** Warna badge stok: merah bila < minStock, kuning bila < 2×minStock */
export function stockBadgeTone(stock: number, minStock: number): "red" | "amber" | "plain" {
  if (minStock > 0 && stock < minStock) return "red";
  if (minStock > 0 && stock < 2 * minStock) return "amber";
  return "plain";
}

export function formatAmount(n: number): string {
  // Angka bahan bisa desimal (0.5) — rapikan tanpa nol buntut
  return Number(n.toFixed(2)).toLocaleString("id-ID");
}
