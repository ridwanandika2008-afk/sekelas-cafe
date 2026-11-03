/**
 * Komputasi laporan penjualan (dipakai /api/laporan & /api/laporan/export).
 * Definisi transaksi valid (WAJIB konsisten): paymentStatus = "PAID" DAN
 * status ≠ "CANCELLED". Pesanan CANCELLED dihitung terpisah sebagai pembatalan.
 * Bukan route — hanya modul bantu.
 */
import { db } from "@/lib/db";
import { TZ, wibDateKey, wibDayStartFromKey } from "@/lib/format";

export const MAX_RANGE_DAYS = 366;

export type LaporanRingkasan = {
  totalPendapatan: number;
  jumlahPesanan: number;
  totalTunai: number;
  totalQris: number;
  rataRataPerPesanan: number;
  totalBiayaAntar: number;
  totalDiskon: number;
  jumlahPembatalan: number;
  totalDibatalkan: number;
};

export type LaporanData = {
  dari: string;
  sampai: string;
  ringkasan: LaporanRingkasan;
  perHari: { tanggal: string; pendapatan: number; jumlahPesanan: number }[];
  perJam: { jam: number; jumlahPesanan: number }[];
  menuTerlaris: { nama: string; qty: number; pendapatan: number }[];
  menuKurangDiminati: { nama: string; qty: number; pendapatan: number }[];
  perKasir: {
    nama: string;
    jumlahTransaksi: number;
    tunai: number;
    qris: number;
    total: number;
  }[];
  perMetodePenerimaan: { fulfillment: string; jumlah: number }[];
};

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

function isValidKey(key: string | null | undefined): key is string {
  if (!key || !KEY_RE.test(key)) return false;
  return !Number.isNaN(new Date(`${key}T00:00:00+07:00`).getTime());
}

/**
 * Validasi & normalisasi rentang "dari"/"sampai" (kunci tanggal WIB).
 * Default bila kosong: 7 hari terakhir s/d hari ini (WIB).
 */
export function parseRange(
  dariRaw: string | null,
  sampaiRaw: string | null
): { dari: string; sampai: string } | { error: string } {
  const todayKey = wibDateKey();
  const fallbackDari = wibDateKey(
    new Date(wibDayStartFromKey(todayKey).getTime() - 6 * 24 * 3600 * 1000)
  );
  const dari = isValidKey(dariRaw) ? (dariRaw as string) : fallbackDari;
  const sampai = isValidKey(sampaiRaw) ? (sampaiRaw as string) : todayKey;
  if (dari > sampai) {
    return { error: "Tanggal mulai tidak boleh melewati tanggal akhir." };
  }
  const days =
    Math.round(
      (wibDayStartFromKey(sampai).getTime() - wibDayStartFromKey(dari).getTime()) /
        (24 * 3600 * 1000)
    ) + 1;
  if (days > MAX_RANGE_DAYS) {
    return { error: `Rentang tanggal terlalu panjang — maksimal ${MAX_RANGE_DAYS} hari.` };
  }
  return { dari, sampai };
}

/** Jam WIB (0–23) dari sebuah Date — konversi zona waktu di JS. */
export function wibHour(d: Date): number {
  const h = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    hour12: false,
  }).format(d);
  return parseInt(h, 10) % 24;
}

const FULFILLMENTS = ["DINE_IN", "TAKEAWAY", "DELIVERY"] as const;

export async function computeLaporan(dari: string, sampai: string): Promise<LaporanData> {
  const rangeStart = wibDayStartFromKey(dari);
  const rangeEnd = new Date(wibDayStartFromKey(sampai).getTime() + 24 * 3600 * 1000);

  const orders = await db.order.findMany({
    where: { createdAt: { gte: rangeStart, lt: rangeEnd } },
    include: {
      kasir: { select: { name: true } },
      items: { select: { nameSnapshot: true, qty: true, unitPrice: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const valid = orders.filter(
    (o) => o.paymentStatus === "PAID" && o.status !== "CANCELLED"
  );
  const cancelled = orders.filter((o) => o.status === "CANCELLED");

  const totalPendapatan = valid.reduce((s, o) => s + o.total, 0);
  const totalTunai = valid
    .filter((o) => o.paymentMethod === "CASH")
    .reduce((s, o) => s + o.total, 0);
  const totalQris = valid
    .filter((o) => o.paymentMethod === "QRIS")
    .reduce((s, o) => s + o.total, 0);
  const jumlahPesanan = valid.length;
  const rataRataPerPesanan =
    jumlahPesanan > 0 ? Math.round(totalPendapatan / jumlahPesanan) : 0;
  const totalBiayaAntar = valid.reduce((s, o) => s + o.deliveryFee, 0);
  const totalDiskon = valid.reduce((s, o) => s + o.discount, 0);

  // --- per hari: isi semua tanggal di rentang walau kosong ---
  const perHari: LaporanData["perHari"] = [];
  const perHariMap = new Map<string, LaporanData["perHari"][number]>();
  for (let t = rangeStart.getTime(); t < rangeEnd.getTime(); t += 24 * 3600 * 1000) {
    const key = wibDateKey(new Date(t));
    const entry = { tanggal: key, pendapatan: 0, jumlahPesanan: 0 };
    perHariMap.set(key, entry);
    perHari.push(entry);
  }
  for (const o of valid) {
    const entry = perHariMap.get(wibDateKey(o.createdAt));
    if (entry) {
      entry.pendapatan += o.total;
      entry.jumlahPesanan += 1;
    }
  }

  // --- per jam (0–23, WIB) ---
  const perJam: LaporanData["perJam"] = Array.from({ length: 24 }, (_, jam) => ({
    jam,
    jumlahPesanan: 0,
  }));
  for (const o of valid) {
    perJam[wibHour(o.createdAt)].jumlahPesanan += 1;
  }

  // --- agregat menu terjual (join OrderItem.nameSnapshot, qty × unitPrice) ---
  const menuMap = new Map<string, { nama: string; qty: number; pendapatan: number }>();
  for (const o of valid) {
    for (const it of o.items) {
      const cur =
        menuMap.get(it.nameSnapshot) ?? { nama: it.nameSnapshot, qty: 0, pendapatan: 0 };
      cur.qty += it.qty;
      cur.pendapatan += it.qty * it.unitPrice;
      menuMap.set(it.nameSnapshot, cur);
    }
  }
  const menuAll = [...menuMap.values()];
  const menuTerlaris = [...menuAll]
    .sort(
      (a, b) => b.qty - a.qty || b.pendapatan - a.pendapatan || a.nama.localeCompare(b.nama)
    )
    .slice(0, 10);
  const menuKurangDiminati = [...menuAll]
    .sort(
      (a, b) => a.qty - b.qty || a.pendapatan - b.pendapatan || a.nama.localeCompare(b.nama)
    )
    .slice(0, 10);

  // --- per kasir ---
  const kasirMap = new Map<
    string,
    { nama: string; jumlahTransaksi: number; tunai: number; qris: number; total: number }
  >();
  for (const o of valid) {
    const nama = o.kasir?.name ?? "Tanpa Kasir";
    const cur =
      kasirMap.get(nama) ??
      { nama, jumlahTransaksi: 0, tunai: 0, qris: 0, total: 0 };
    cur.jumlahTransaksi += 1;
    if (o.paymentMethod === "CASH") cur.tunai += o.total;
    else if (o.paymentMethod === "QRIS") cur.qris += o.total;
    cur.total += o.total;
    kasirMap.set(nama, cur);
  }
  const perKasir = [...kasirMap.values()].sort((a, b) => b.total - a.total);

  // --- per metode penerimaan ---
  const perMetodePenerimaan = FULFILLMENTS.map((f) => ({
    fulfillment: f,
    jumlah: valid.filter((o) => o.fulfillment === f).length,
  }));

  return {
    dari,
    sampai,
    ringkasan: {
      totalPendapatan,
      jumlahPesanan,
      totalTunai,
      totalQris,
      rataRataPerPesanan,
      totalBiayaAntar,
      totalDiskon,
      jumlahPembatalan: cancelled.length,
      totalDibatalkan: cancelled.reduce((s, o) => s + o.total, 0),
    },
    perHari,
    perJam,
    menuTerlaris,
    menuKurangDiminati,
    perKasir,
    perMetodePenerimaan,
  };
}
