/**
 * Peta label ramah untuk kode aksi ActivityLog (Bahasa Indonesia).
 * Dipakai dashboard admin & halaman riwayat aktivitas.
 */

export const ACTIVITY_ACTION_LABEL: Record<string, string> = {
  LOGIN: "Masuk",
  LOGOUT: "Keluar",
  ORDER_CREATE: "Buat Pesanan",
  ORDER_POS_CREATE: "Buat Pesanan POS",
  PAYMENT_CASH: "Bayar Tunai",
  PAYMENT_QRIS: "Bayar QRIS",
  PAYMENT_VERIFY: "Verifikasi Pembayaran",
  ORDER_ITEM_DONE: "Item Selesai",
  ORDER_ITEM_UNDO: "Batalkan Item",
  ORDER_READY: "Pesanan Siap",
  ORDER_DELIVERING: "Antar Pesanan",
  ORDER_COMPLETED: "Pesanan Selesai",
  ORDER_CANCELLED: "Batalkan Pesanan",
  MENU_CREATE: "Buat Menu",
  MENU_UPDATE: "Ubah Menu",
  MENU_DELETE: "Hapus Menu",
  CATEGORY_CREATE: "Buat Kategori",
  CATEGORY_UPDATE: "Ubah Kategori",
  CATEGORY_DELETE: "Hapus Kategori",
  USER_CREATE: "Buat Pengguna",
  USER_UPDATE: "Ubah Pengguna",
  USER_DELETE: "Hapus Pengguna",
  SETTINGS_UPDATE: "Ubah Pengaturan",
  PROMO_CREATE: "Buat Promo",
  PROMO_UPDATE: "Ubah Promo",
  PROMO_DELETE: "Hapus Promo",
  STOCK_ADJUST: "Sesuaikan Stok",
  RECIPE_UPDATE: "Ubah Resep",
  SHIFT_OPEN: "Buka Shift",
  SHIFT_CLOSE: "Tutup Shift",
  SHIFT_EXPENSE: "Catat Pengeluaran",
  DATA_IMPORT: "Impor Data",
  DATA_EXPORT: "Ekspor Data",
};

export function activityLabel(action: string): string {
  return ACTIVITY_ACTION_LABEL[action] ?? action;
}

/** Warna badge per kelompok aksi (palet hangat, konsisten dengan modul lain) */
export const ACTIVITY_ACTION_BADGE: Record<string, string> = {
  LOGIN: "bg-stone-100 text-stone-700 border-stone-300",
  LOGOUT: "bg-stone-100 text-stone-700 border-stone-300",
  ORDER_CREATE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  ORDER_POS_CREATE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  PAYMENT_CASH: "bg-[#efe4d3] text-[#5a4326] border-[#d9c5a3]",
  PAYMENT_QRIS: "bg-teal-100 text-teal-800 border-teal-300",
  PAYMENT_VERIFY: "bg-teal-100 text-teal-800 border-teal-300",
  ORDER_ITEM_DONE: "bg-lime-100 text-lime-800 border-lime-300",
  ORDER_ITEM_UNDO: "bg-amber-100 text-amber-800 border-amber-300",
  ORDER_READY: "bg-orange-100 text-orange-800 border-orange-300",
  ORDER_DELIVERING: "bg-teal-100 text-teal-800 border-teal-300",
  ORDER_COMPLETED: "bg-[#efe4d3] text-[#5a4326] border-[#d9c5a3]",
  ORDER_CANCELLED: "bg-red-100 text-red-700 border-red-300",
  MENU_CREATE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  MENU_UPDATE: "bg-amber-100 text-amber-800 border-amber-300",
  MENU_DELETE: "bg-red-100 text-red-700 border-red-300",
  CATEGORY_CREATE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CATEGORY_UPDATE: "bg-amber-100 text-amber-800 border-amber-300",
  CATEGORY_DELETE: "bg-red-100 text-red-700 border-red-300",
  USER_CREATE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  USER_UPDATE: "bg-amber-100 text-amber-800 border-amber-300",
  USER_DELETE: "bg-red-100 text-red-700 border-red-300",
  SETTINGS_UPDATE: "bg-amber-100 text-amber-800 border-amber-300",
  PROMO_CREATE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  PROMO_UPDATE: "bg-amber-100 text-amber-800 border-amber-300",
  PROMO_DELETE: "bg-red-100 text-red-700 border-red-300",
  STOCK_ADJUST: "bg-orange-100 text-orange-800 border-orange-300",
  RECIPE_UPDATE: "bg-amber-100 text-amber-800 border-amber-300",
  SHIFT_OPEN: "bg-[#efe4d3] text-[#5a4326] border-[#d9c5a3]",
  SHIFT_CLOSE: "bg-[#efe4d3] text-[#5a4326] border-[#d9c5a3]",
  SHIFT_EXPENSE: "bg-orange-100 text-orange-800 border-orange-300",
  DATA_IMPORT: "bg-teal-100 text-teal-800 border-teal-300",
  DATA_EXPORT: "bg-teal-100 text-teal-800 border-teal-300",
};

/** Label entitas singkat */
export const ACTIVITY_ENTITY_LABEL: Record<string, string> = {
  Order: "Pesanan",
  MenuItem: "Menu",
  Category: "Kategori",
  User: "Pengguna",
  Setting: "Pengaturan",
  Promo: "Promo",
  Ingredient: "Bahan",
  Shift: "Shift",
  StockMovement: "Mutasi Stok",
};

export function activityEntityLabel(entity: string | null | undefined): string {
  if (!entity) return "-";
  return ACTIVITY_ENTITY_LABEL[entity] ?? entity;
}
