/**
 * Tipe data bersama modul kasir (POS, pesanan masuk, riwayat, shift).
 * Bentuk mengikuti respons API kasir/publik (lihat CONVENTIONS.md).
 */

export type MenuStatus = "AVAILABLE" | "SOLD_OUT" | "PAUSED" | "INACTIVE";
export type OrderStatusT =
  | "NEW"
  | "QUEUED"
  | "PREPARING"
  | "READY"
  | "DELIVERING"
  | "COMPLETED"
  | "CANCELLED";
export type PaymentStatusT = "UNPAID" | "PAID" | "CANCELLED";
export type PaymentMethodT = "CASH" | "QRIS";
export type FulfillmentT = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type ChannelT = "ONLINE" | "POS";

/** Menu publik dari GET /api/public/menu */
export type PublicOption = {
  id: string;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
};

export type PublicOptionGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  maxSelect: number;
  options: PublicOption[];
};

export type PublicMenuItem = {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  status: MenuStatus;
  isFeatured: boolean;
  optionGroups: PublicOptionGroup[];
};

export type PublicCategory = { id: string; name: string };

export type PublicMenuResponse = {
  categories: PublicCategory[];
  items: PublicMenuItem[];
};

/** Promo dari GET /api/public/promos */
export type PromoItem = {
  id: string;
  name: string;
  type: "PERCENT" | "NOMINAL";
  value: number;
  minOrder: number;
  startsAt: string;
  endsAt: string;
};

/** Info kafe dari GET /api/public/cafe (bagian yang dipakai kasir) */
export type CafeInfo = {
  name: string;
  address: string;
  whatsapp: string;
  deliveryEnabled: boolean;
  deliveryFee: number;
  qrisEnabled: boolean;
  cashEnabled: boolean;
};

/** Baris item pesanan dari API kasir */
export type KasirOrderItem = {
  id: string;
  name: string;
  qty: number;
  unitPrice: number;
  note: string | null;
  isDone: boolean;
  options: { groupName: string; optionName: string }[];
};

/** Pesanan dari GET /api/kasir/pesanan */
export type KasirOrder = {
  id: string;
  orderNumber: string;
  channel: ChannelT;
  customerName: string;
  fulfillment: FulfillmentT;
  tableNumber: string | null;
  deliveryBuilding: string | null;
  deliveryRoom: string | null;
  deliveryNote: string | null;
  note: string | null;
  status: OrderStatusT;
  paymentStatus: PaymentStatusT;
  paymentMethod: PaymentMethodT | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  total: number;
  cashReceived: number | null;
  cashChange: number | null;
  createdAt: string;
  paidAt: string | null;
  completedAt: string | null;
  cancelReason: string | null;
  kasirName: string | null;
  items: KasirOrderItem[];
};

/** Shift terbuka dari GET /api/kasir/shift */
export type ShiftExpense = {
  id: string;
  shiftId: string;
  amount: number;
  note: string;
  createdAt: string;
};

export type OpenShift = {
  id: string;
  kasirId: string;
  openedAt: string;
  closingCash: number | null;
  openingCash: number;
  cashTotal: number;
  qrisTotal: number;
  expenseTotal: number;
  status: "OPEN" | "CLOSED";
  expenses: ShiftExpense[];
  kasir: { name: string } | null;
  ringkasan: {
    jumlahTransaksi: number;
    cashTotal: number;
    qrisTotal: number;
    expenseTotal: number;
    expectedCash: number;
  };
};

/** Hasil buat pesanan POS (POST /api/kasir/pos/pesanan) */
export type PosOrderResult = {
  id: string;
  orderNumber: string;
  total: number;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  paymentStatus: PaymentStatusT;
  status: OrderStatusT;
  cashChange: number | null;
  accessKey: string;
};

/** Baris riwayat dari GET /api/kasir/riwayat */
export type RiwayatOrder = {
  id: string;
  orderNumber: string;
  channel: ChannelT;
  customerName: string;
  fulfillment: FulfillmentT;
  status: OrderStatusT;
  paymentStatus: PaymentStatusT;
  paymentMethod: PaymentMethodT | null;
  total: number;
  itemCount: number;
  kasirName: string | null;
  createdAt: string;
  cancelReason: string | null;
};

/** Riwayat shift dari GET /api/kasir/shift/riwayat */
export type ShiftHistory = {
  id: string;
  kasirName: string;
  openedAt: string;
  closedAt: string | null;
  openingCash: number;
  closingCash: number | null;
  cashTotal: number;
  qrisTotal: number;
  expenseTotal: number;
  expectedCash: number | null;
  variance: number | null;
  jumlahTransaksi: number;
};
