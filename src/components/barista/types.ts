/**
 * Tipe data & helper untuk antrean dapur barista.
 * Bentuk data mengikuti respons GET /api/barista/antrean.
 */

export type BaristaOption = {
  groupName?: string;
  optionName?: string;
};

export type BaristaItem = {
  id: string;
  name: string;
  qty: number;
  note: string | null;
  isDone: boolean;
  options: BaristaOption[];
};

export type BaristaOrder = {
  id: string;
  orderNumber: string;
  customerName: string | null;
  channel: string;
  fulfillment: string;
  tableNumber: string | null;
  deliveryBuilding: string | null;
  deliveryRoom: string | null;
  deliveryNote: string | null;
  note: string | null;
  status: string;
  createdAt: string;
  progress: { done: number; total: number };
  items: BaristaItem[];
};

export type AntreanResponse = {
  antrean: BaristaOrder[];
  siap: BaristaOrder[];
  selesaiHariIni: number;
};

/** "SC-261103-007" → bagian urut "007" */
export function orderSeq(orderNumber: string): string {
  const parts = orderNumber.split("-");
  return parts[parts.length - 1] ?? orderNumber;
}

/** Ringkasan opsi item: "Large · Less Sugar · Extra Shot" */
export function optionSummary(item: BaristaItem): string {
  return item.options
    .map((o) => o.optionName)
    .filter((v): v is string => Boolean(v))
    .join(" · ");
}

/** Progres efektif (jumlah porsi) dari daftar item */
export function itemProgress(items: BaristaItem[]): { done: number; total: number } {
  const done = items.filter((i) => i.isDone).reduce((s, i) => s + i.qty, 0);
  const total = items.reduce((s, i) => s + i.qty, 0);
  return { done, total };
}

/** Terapkan override optimistic ke daftar pesanan (toggle yang sedang in-flight) */
export function applyOverrides(
  orders: BaristaOrder[],
  overrides: Record<string, boolean>
): BaristaOrder[] {
  if (Object.keys(overrides).length === 0) return orders;
  return orders.map((o) => {
    if (!o.items.some((i) => i.id in overrides)) return o;
    const items = o.items.map((i) =>
      i.id in overrides ? { ...i, isDone: overrides[i.id] } : i
    );
    return { ...o, items, progress: itemProgress(items) };
  });
}
