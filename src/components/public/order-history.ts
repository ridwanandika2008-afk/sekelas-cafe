/**
 * Riwayat pesanan pembeli — localStorage key "skls-pesanan-saya".
 * Diekspos sebagai external store (useSyncExternalStore) agar aman hidrasi:
 * snapshot server = kosong, snapshot client dibaca dari localStorage.
 * accessKey memang milik pembeli, aman disimpan di perangkatnya.
 */

export type SavedOrder = {
  orderNumber: string;
  accessKey: string;
  total: number;
  customerName: string;
  createdAt: string; // ISO string saat pesanan dibuat
};

export const ORDER_HISTORY_KEY = "skls-pesanan-saya";

const EMPTY: SavedOrder[] = [];

function parseOrders(raw: string | null): SavedOrder[] {
  if (!raw) return EMPTY;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return EMPTY;
    return parsed.filter(
      (o): o is SavedOrder =>
        Boolean(o) &&
        typeof (o as SavedOrder).orderNumber === "string" &&
        typeof (o as SavedOrder).accessKey === "string"
    );
  } catch {
    return EMPTY;
  }
}

/* ===== External store (useSyncExternalStore) ===== */

const listeners = new Set<() => void>();
let snapshotCache: SavedOrder[] = EMPTY;
let snapshotRaw: string | null | undefined; // undefined = belum pernah dibaca

function emitChange() {
  for (const listener of listeners) listener();
}

/** Langganan perubahan riwayat (termasuk tab lain via event "storage"). */
export function subscribeOrderHistory(callback: () => void): () => void {
  listeners.add(callback);
  const onStorage = (e: StorageEvent) => {
    if (e.key === ORDER_HISTORY_KEY) callback();
  };
  if (typeof window !== "undefined") {
    window.addEventListener("storage", onStorage);
  }
  return () => {
    listeners.delete(callback);
    if (typeof window !== "undefined") {
      window.removeEventListener("storage", onStorage);
    }
  };
}

/** Snapshot client — hasil di-cache per isi raw localStorage agar referensi stabil. */
export function getOrderHistorySnapshot(): SavedOrder[] {
  if (typeof window === "undefined") return EMPTY;
  const raw = window.localStorage.getItem(ORDER_HISTORY_KEY);
  if (raw !== snapshotRaw) {
    snapshotRaw = raw;
    snapshotCache = parseOrders(raw);
  }
  return snapshotCache;
}

/** Snapshot server — selalu kosong (localStorage tidak ada di server). */
export function getOrderHistoryServerSnapshot(): SavedOrder[] {
  return EMPTY;
}

/* ===== Mutasi ===== */

function writeOrders(orders: SavedOrder[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(ORDER_HISTORY_KEY, JSON.stringify(orders));
  } catch {
    // penyimpanan penuh / mode privat — abaikan saja
  }
  emitChange();
}

/** Simpan / perbarui satu pesanan (tanpa duplikat; createdAt lama dipertahankan). */
export function saveOrderEntry(entry: SavedOrder) {
  if (typeof window === "undefined") return;
  const list = parseOrders(
    typeof window === "undefined" ? null : window.localStorage.getItem(ORDER_HISTORY_KEY)
  );
  const idx = list.findIndex((o) => o.orderNumber === entry.orderNumber);
  if (idx >= 0) {
    list[idx] = { ...entry, createdAt: list[idx].createdAt || entry.createdAt };
  } else {
    list.unshift(entry);
  }
  writeOrders(list);
}

/** Hapus satu pesanan dari riwayat (menulis perubahan + memberi tahu subscriber). */
export function removeOrderEntry(orderNumber: string) {
  if (typeof window === "undefined") return;
  const list = parseOrders(window.localStorage.getItem(ORDER_HISTORY_KEY)).filter(
    (o) => o.orderNumber !== orderNumber
  );
  writeOrders(list);
}
