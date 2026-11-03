/**
 * Util format Indonesia (Rupiah, tanggal WIB, waktu relatif).
 * Semua waktu disajikan dalam Asia/Jakarta (WIB).
 */

export const TZ = "Asia/Jakarta";

export function formatRupiah(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "Rp0";
  return `Rp${Math.round(n).toLocaleString("id-ID")}`;
}

/** "2025-06-15" dalam WIB */
export function wibDateKey(d: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Kunci harian counter pesanan: "SC-250615" */
export function wibOrderKey(d: Date = new Date()): string {
  const [y, m, day] = wibDateKey(d).split("-");
  return `SC-${y.slice(2)}${m}${day}`;
}

/** "15 Jun 2025, 10.24" (WIB) */
export function formatWibDateTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

/** "15 Jun 2025" (WIB) */
export function formatWibDate(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

/** "10.24" (WIB) */
export function formatWibTime(d: Date | string | null | undefined): string {
  if (!d) return "-";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("id-ID", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export const DAY_NAMES = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

/** Bagian waktu WIB sekarang */
export function wibNowParts(d: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "0";
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return {
    dayOfWeek: dayMap[get("weekday")] ?? 0,
    hour: parseInt(get("hour"), 10) % 24,
    minute: parseInt(get("minute"), 10),
  };
}

/** "HH:MM" → menit sejak tengah malam */
export function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map((v) => parseInt(v, 10));
  return (h || 0) * 60 + (m || 0);
}

/** Awal hari WIB (00:00 WIB) sebagai Date UTC — untuk filter "hari ini" */
export function wibDayStart(d: Date = new Date()): Date {
  const key = wibDateKey(d); // "2025-06-15"
  return new Date(`${key}T00:00:00+07:00`);
}

/** Awal hari WIB dari string "YYYY-MM-DD" */
export function wibDayStartFromKey(key: string): Date {
  return new Date(`${key}T00:00:00+07:00`);
}

/** Selisih waktu relatif ringkas (client-side, id-ID) */
export function timeAgo(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 60) return "baru saja";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt lalu`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} jam lalu`;
  return `${Math.floor(diff / 86400)} hari lalu`;
}

/** Normalisasi nomor WA Indonesia → format internasional tanpa "+" */
export function waNumber(raw: string): string {
  let n = raw.replace(/[^0-9]/g, "");
  if (n.startsWith("0")) n = `62${n.slice(1)}`;
  if (n.startsWith("8")) n = `62${n}`;
  return n;
}

/** Tautan wa.me dengan pesan terisi */
export function waLink(raw: string, message?: string): string {
  const base = `https://wa.me/${waNumber(raw)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
