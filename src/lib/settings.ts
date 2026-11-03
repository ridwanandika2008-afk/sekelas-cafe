/**
 * Pengaturan kafe + status buka/tutup (cache 30 detik, hemat koneksi pooler).
 */
import { db } from "./db";
import { DAY_NAMES, timeToMinutes, wibNowParts } from "./format";

export type CafeSettings = {
  cafeName: string;
  address: string;
  whatsapp: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImageUrl: string;
  aboutText: string | null;
  deliveryFee: number;
  deliveryEnabled: boolean;
  qrisImageUrl: string | null;
  qrisEnabled: boolean;
  cashEnabled: boolean;
  receiptFooter: string;
  temporarilyClosed: boolean;
  closedMessage: string;
  mapQuery: string;
};

export type DayScheduleRow = {
  dayOfWeek: number;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
};

const CACHE_TTL_MS = 30_000;
let cache: { at: number; settings: CafeSettings; schedules: DayScheduleRow[] } | null = null;

export function invalidateSettingsCache() {
  cache = null;
}

const DEFAULT_SETTINGS: CafeSettings = {
  cafeName: "Sekelas Cafe",
  address:
    "Jl. Ki Mangun Sarkoro No.VI/3, Dusun Talun, Beji, Kec. Boyolangu, Kabupaten Tulungagung, Jawa Timur 66233",
  whatsapp: "085151823036",
  heroHeadline: "Ngopi Asik, Harga Bersahabat",
  heroSubheadline:
    "Kafe siswa-siswi SMKN 1 Boyolangu — segelas semangat di sela jam pelajaran.",
  heroImageUrl: "/images/hero-cafe.jpg",
  aboutText: null,
  deliveryFee: 1000,
  deliveryEnabled: true,
  qrisImageUrl: null,
  qrisEnabled: true,
  cashEnabled: true,
  receiptFooter: "Terima kasih sudah mampir! Simpan struk ini ya.",
  temporarilyClosed: false,
  closedMessage: "Kafe sedang tutup sementara. Pantau terus kabar dari kami ya!",
  mapQuery: "SMKN 1 Boyolangu, Tulungagung",
};

export async function getSettings(): Promise<CafeSettings> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.settings;
  try {
    const row = await db.setting.findUnique({ where: { id: "singleton" } });
    const settings: CafeSettings = row
      ? {
          cafeName: row.cafeName,
          address: row.address,
          whatsapp: row.whatsapp,
          heroHeadline: row.heroHeadline,
          heroSubheadline: row.heroSubheadline,
          heroImageUrl: row.heroImageUrl,
          aboutText: row.aboutText,
          deliveryFee: row.deliveryFee,
          deliveryEnabled: row.deliveryEnabled,
          qrisImageUrl: row.qrisImageUrl,
          qrisEnabled: row.qrisEnabled,
          cashEnabled: row.cashEnabled,
          receiptFooter: row.receiptFooter,
          temporarilyClosed: row.temporarilyClosed,
          closedMessage: row.closedMessage,
          mapQuery: row.mapQuery,
        }
      : DEFAULT_SETTINGS;
    if (cache) cache.settings = settings;
    else cache = { at: Date.now(), settings, schedules: [] };
    cache.settings = settings;
    return settings;
  } catch {
    return cache?.settings ?? DEFAULT_SETTINGS;
  }
}

export async function getSchedules(): Promise<DayScheduleRow[]> {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS && cache.schedules.length) {
    return cache.schedules;
  }
  let schedules = await db.daySchedule.findMany({ orderBy: { dayOfWeek: "asc" } });
  if (schedules.length < 7) {
    // Pastikan 7 hari terisi
    const have = new Set(schedules.map((s) => s.dayOfWeek));
    for (let d = 0; d <= 6; d++) {
      if (!have.has(d)) {
        schedules.push(
          await db.daySchedule.upsert({
            where: { dayOfWeek: d },
            create: { dayOfWeek: d, isOpen: true, openTime: "07:00", closeTime: "14:00" },
            update: {},
          })
        );
      }
    }
    schedules = schedules.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }
  if (cache) cache.schedules = schedules;
  else cache = { at: Date.now(), settings: DEFAULT_SETTINGS, schedules };
  return schedules;
}

export type CafeStatus = {
  isOpen: boolean;
  /** pesan ringkas untuk pembeli */
  message: string;
  /** "BUKA" | "BELUM_BUKA" | "SUDAH_TUTUP" | "LIBUR" | "TUTUP_SEMENTARA" */
  state: "BUKA" | "BELUM_BUKA" | "SUDAH_TUTUP" | "LIBUR" | "TUTUP_SEMENTARA";
  today: { name: string; openTime: string; closeTime: string; isOpen: boolean } | null;
};

export async function getCafeStatus(now: Date = new Date()): Promise<CafeStatus> {
  const settings = await getSettings();
  if (settings.temporarilyClosed) {
    return {
      isOpen: false,
      message: settings.closedMessage,
      state: "TUTUP_SEMENTARA",
      today: null,
    };
  }
  const schedules = await getSchedules();
  const { dayOfWeek, hour, minute } = wibNowParts(now);
  const today = schedules.find((s) => s.dayOfWeek === dayOfWeek);
  if (!today || !today.isOpen) {
    return {
      isOpen: false,
      message: `Hari ini (${DAY_NAMES[dayOfWeek]}) Sekelas Cafe libur. Sampai jumpa di hari operasional berikutnya!`,
      state: "LIBUR",
      today: today
        ? { name: DAY_NAMES[dayOfWeek], openTime: today.openTime, closeTime: today.closeTime, isOpen: false }
        : null,
    };
  }
  const nowMin = hour * 60 + minute;
  const open = timeToMinutes(today.openTime);
  const close = timeToMinutes(today.closeTime);
  if (nowMin < open) {
    return {
      isOpen: false,
      message: `Belum buka. Sekelas Cafe buka hari ini pukul ${today.openTime} WIB.`,
      state: "BELUM_BUKA",
      today: { name: DAY_NAMES[dayOfWeek], openTime: today.openTime, closeTime: today.closeTime, isOpen: true },
    };
  }
  if (nowMin >= close) {
    return {
      isOpen: false,
      message: `Sudah tutup (jam operasional ${today.openTime}–${today.closeTime} WIB). Sampai besok!`,
      state: "SUDAH_TUTUP",
      today: { name: DAY_NAMES[dayOfWeek], openTime: today.openTime, closeTime: today.closeTime, isOpen: true },
    };
  }
  return {
    isOpen: true,
    message: `Buka sampai ${today.closeTime} WIB.`,
    state: "BUKA",
    today: { name: DAY_NAMES[dayOfWeek], openTime: today.openTime, closeTime: today.closeTime, isOpen: true },
  };
}
