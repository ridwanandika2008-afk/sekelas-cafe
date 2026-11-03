/**
 * Konstanta & label status Sekelas Cafe.
 * Status disimpan sebagai string di DB; mapping label/warna ada di sini.
 */

export type Role = "ADMIN" | "KASIR" | "BARISTA";
export const ROLES: Role[] = ["ADMIN", "KASIR", "BARISTA"];

export const ROLE_LABEL: Record<string, string> = {
  ADMIN: "Admin",
  KASIR: "Kasir",
  BARISTA: "Barista",
};

export type OrderStatus =
  | "NEW"
  | "QUEUED"
  | "PREPARING"
  | "READY"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED";

export const ORDER_STATUS_LABEL: Record<string, string> = {
  NEW: "Menunggu Pembayaran",
  QUEUED: "Dalam Antrean",
  PREPARING: "Sedang Dibuat",
  READY: "Siap Diambil",
  DELIVERING: "Sedang Diantar",
  COMPLETED: "Selesai",
  CANCELLED: "Dibatalkan",
};

/** Kelas badge Tailwind (palet hangat) per status pesanan */
export const ORDER_STATUS_BADGE: Record<string, string> = {
  NEW: "bg-stone-100 text-stone-700 border-stone-300",
  QUEUED: "bg-amber-100 text-amber-800 border-amber-300",
  PREPARING: "bg-orange-100 text-orange-800 border-orange-300",
  READY: "bg-emerald-100 text-emerald-800 border-emerald-300",
  DELIVERING: "bg-teal-100 text-teal-800 border-teal-300",
  COMPLETED: "bg-[#efe4d3] text-[#5a4326] border-[#d9c5a3]",
  CANCELLED: "bg-red-100 text-red-700 border-red-300",
};

export type PaymentStatus = "UNPAID" | "PAID" | "CANCELLED";
export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  UNPAID: "Belum Dibayar",
  PAID: "Lunas",
  CANCELLED: "Dibatalkan",
};

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
};

export type Fulfillment = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export const FULFILLMENT_LABEL: Record<string, string> = {
  DINE_IN: "Makan di Tempat",
  TAKEAWAY: "Bawa Pulang",
  DELIVERY: "Antar Area Sekolah",
};
export const FULFILLMENT_ICON: Record<string, string> = {
  DINE_IN: "utensils",
  TAKEAWAY: "shopping-bag",
  DELIVERY: "bike",
};

export const MENU_STATUS_LABEL: Record<string, string> = {
  AVAILABLE: "Tersedia",
  SOLD_OUT: "Habis",
  PAUSED: "Dijeda Sementara",
  INACTIVE: "Tidak Aktif",
};
export const MENU_STATUS_BADGE: Record<string, string> = {
  AVAILABLE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  SOLD_OUT: "bg-red-100 text-red-700 border-red-300",
  PAUSED: "bg-amber-100 text-amber-800 border-amber-300",
  INACTIVE: "bg-stone-100 text-stone-600 border-stone-300",
};

/** Menu yang bisa dipesan pembeli */
export const ORDERABLE_MENU_STATUS = "AVAILABLE";
/** Menu yang tampil di daftar pembeli (selain itu tersembunyi) */
export const VISIBLE_MENU_STATUSES = ["AVAILABLE", "SOLD_OUT", "PAUSED"];

export const CHANNEL_LABEL: Record<string, string> = {
  ONLINE: "Pesan Online",
  POS: "Kasir (POS)",
};

/** Batasan praktis */
export const MAX_QTY_PER_ITEM = 50;
export const MAX_ITEMS_PER_ORDER = 30;
export const MAX_CART_NOTE = 200;
export const MAX_NAME_LENGTH = 60;
export const QRIS_NOTE =
  "Scan QRIS pada layar kasir / meja kafe, lalu tunjukkan bukti bayar ke kasir untuk verifikasi.";

/** Prefix tautan pesanan */
export const ORDER_COOKIE = "skls_session";
