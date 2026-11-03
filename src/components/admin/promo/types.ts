/** Tipe data & helper bersama modul Promo & Diskon (admin). */

export type AdminPromo = {
  id: string;
  name: string;
  type: string; // PERCENT | NOMINAL
  value: number;
  scope: string;
  minOrder: number;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  orders: number;
};

export type PromoState = "AKTIF" | "NONAKTIF" | "TERJADWAL" | "BERAKHIR";

/** Status promo relatif waktu sekarang */
export function promoState(p: AdminPromo, now: Date = new Date()): PromoState {
  if (!p.isActive) return "NONAKTIF";
  if (now.getTime() < new Date(p.startsAt).getTime()) return "TERJADWAL";
  if (now.getTime() > new Date(p.endsAt).getTime()) return "BERAKHIR";
  return "AKTIF";
}

export const PROMO_STATE_LABEL: Record<PromoState, string> = {
  AKTIF: "Aktif",
  NONAKTIF: "Nonaktif",
  TERJADWAL: "Terjadwal",
  BERAKHIR: "Berakhir",
};

export const PROMO_STATE_BADGE: Record<PromoState, string> = {
  AKTIF: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300",
  NONAKTIF: "border-stone-300 bg-stone-100 text-stone-600 dark:border-stone-700 dark:bg-stone-900 dark:text-stone-300",
  TERJADWAL: "border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-300",
  BERAKHIR: "border-red-300 bg-red-100 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300",
};

/** "Diskon 10%" / "Potongan Rp2.000" */
export function promoTypeLabel(p: Pick<AdminPromo, "type" | "value">): string {
  return p.type === "PERCENT"
    ? `Diskon ${p.value}%`
    : `Potongan Rp${p.value.toLocaleString("id-ID")}`;
}

/** ISO → nilai input datetime-local (waktu lokal browser) */
export function toLocalInputValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Hitung potongan dari subtotal contoh (untuk preview dialog) */
export function hitungPotongan(
  type: string,
  value: number,
  subtotal: number
): number {
  if (type === "PERCENT") {
    return Math.min(Math.round((subtotal * value) / 100), subtotal);
  }
  return Math.min(value, subtotal);
}
