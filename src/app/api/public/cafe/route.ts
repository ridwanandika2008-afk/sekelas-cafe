import { NextResponse } from "next/server";
import { getCafeStatus, getSettings, getSchedules } from "@/lib/settings";
import { DAY_NAMES } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Info kafe publik: pengaturan tampilan, status buka, jadwal */
export async function GET() {
  const [settings, schedules, status] = await Promise.all([
    getSettings(),
    getSchedules(),
    getCafeStatus(),
  ]);

  return NextResponse.json({
    cafe: {
      name: settings.cafeName,
      address: settings.address,
      whatsapp: settings.whatsapp,
      heroHeadline: settings.heroHeadline,
      heroSubheadline: settings.heroSubheadline,
      heroImageUrl: settings.heroImageUrl,
      aboutText: settings.aboutText,
      deliveryEnabled: settings.deliveryEnabled,
      deliveryFee: settings.deliveryFee,
      qrisEnabled: settings.qrisEnabled,
      cashEnabled: settings.cashEnabled,
      mapQuery: settings.mapQuery,
    },
    status,
    schedules: schedules.map((s) => ({
      day: s.dayOfWeek,
      dayName: DAY_NAMES[s.dayOfWeek],
      isOpen: s.isOpen,
      openTime: s.openTime,
      closeTime: s.closeTime,
    })),
  });
}
