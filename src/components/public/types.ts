/**
 * Tipe & fetcher respons API publik — dipakai halaman pembeli.
 * Bentuk respons mengikuti route di src/app/api/public/** (lihat CONVENTIONS.md).
 */

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
  status: "AVAILABLE" | "SOLD_OUT" | "PAUSED";
  isFeatured: boolean;
  optionGroups: PublicOptionGroup[];
};

export type PublicCategory = { id: string; name: string };

export type CafeInfo = {
  name: string;
  address: string;
  whatsapp: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImageUrl: string;
  aboutText: string;
  deliveryEnabled: boolean;
  deliveryFee: number;
  qrisEnabled: boolean;
  cashEnabled: boolean;
  mapQuery: string;
};

export type CafeStatus = {
  isOpen: boolean;
  message: string;
  state: string;
  today: {
    name: string;
    openTime: string;
    closeTime: string;
    isOpen: boolean;
  } | null;
};

export type DaySchedule = {
  day: number; // 0 = Minggu … 6 = Sabtu
  dayName: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

export type CafeResponse = {
  cafe: CafeInfo;
  status: CafeStatus;
  schedules: DaySchedule[];
};

export type MenuResponse = {
  categories: PublicCategory[];
  items: PublicMenuItem[];
};

export type PublicPromo = {
  id: string;
  name: string;
  type: "PERCENT" | "NOMINAL";
  value: number;
  minOrder: number;
};

export type PromosResponse = { promos: PublicPromo[] };

export type Fulfillment = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type PaymentMethod = "CASH" | "QRIS";

export type TrackedOrderItem = {
  name: string;
  qty: number;
  unitPrice: number;
  note: string | null;
  options: { groupName: string; optionName: string }[];
};

export type TrackedOrder = {
  orderNumber: string;
  customerName: string;
  channel: string;
  fulfillment: Fulfillment;
  tableNumber: string | null;
  deliveryBuilding: string | null;
  deliveryRoom: string | null;
  note: string | null;
  status: string;
  paymentStatus: string;
  paymentMethod: PaymentMethod | null;
  subtotal: number;
  deliveryFee: number;
  discount: number;
  promoName: string | null;
  total: number;
  createdAt: string;
  paidAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  progress: { done: number; total: number };
  items: TrackedOrderItem[];
};

export type CreateOrderResult = {
  orderNumber: string;
  accessKey: string;
  total: number;
};

export async function fetchCafe(): Promise<CafeResponse> {
  const res = await fetch("/api/public/cafe", { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memuat info kafe.");
  return (await res.json()) as CafeResponse;
}

export async function fetchMenu(): Promise<MenuResponse> {
  const res = await fetch("/api/public/menu", { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memuat menu.");
  return (await res.json()) as MenuResponse;
}

export async function fetchPromos(): Promise<PublicPromo[]> {
  const res = await fetch("/api/public/promos", { cache: "no-store" });
  if (!res.ok) throw new Error("Gagal memuat promo.");
  const data = (await res.json()) as PromosResponse;
  return data.promos;
}

/** Potongan promo untuk subtotal tertentu — serasi perhitungan server. */
export function promoDiscount(promo: PublicPromo, subtotal: number): number {
  if (subtotal < promo.minOrder) return 0;
  return promo.type === "PERCENT"
    ? Math.min(Math.round((subtotal * promo.value) / 100), subtotal)
    : Math.min(promo.value, subtotal);
}
