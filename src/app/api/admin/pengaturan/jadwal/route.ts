import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";
import { getSchedules, invalidateSettingsCache } from "@/lib/settings";

/**
 * PUT /api/admin/pengaturan/jadwal — simpan jadwal 7 hari sekaligus.
 * body: { days: [{ dayOfWeek, isOpen, openTime, closeTime } × 7] }
 * Validasi: HH:MM, closeTime > openTime per hari yang buka.
 */
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export async function PUT(req: NextRequest) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  const days = body?.days;
  if (!Array.isArray(days)) {
    return NextResponse.json({ error: "Format jadwal tidak valid." }, { status: 400 });
  }

  const seen = new Set<number>();
  for (const d of days) {
    const dayOfWeek = Number(d?.dayOfWeek);
    if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) {
      return NextResponse.json({ error: "Hari harus 0–6 (Minggu–Sabtu)." }, { status: 400 });
    }
    if (seen.has(dayOfWeek)) {
      return NextResponse.json({ error: "Ada hari yang terduplikasi." }, { status: 400 });
    }
    seen.add(dayOfWeek);

    const isOpen = Boolean(d?.isOpen);
    const openTime = String(d?.openTime ?? "");
    const closeTime = String(d?.closeTime ?? "");
    if (!HHMM.test(openTime) || !HHMM.test(closeTime)) {
      return NextResponse.json(
        { error: "Format jam harus HH:MM (cth. 07:00)." },
        { status: 400 }
      );
    }
    if (isOpen && closeTime <= openTime) {
      return NextResponse.json(
        { error: "Jam tutup harus lebih besar dari jam buka." },
        { status: 400 }
      );
    }
  }

  try {
    await db.$transaction(
      days.map((d: { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string }) =>
        db.daySchedule.upsert({
          where: { dayOfWeek: d.dayOfWeek },
          update: {
            isOpen: Boolean(d.isOpen),
            openTime: d.openTime,
            closeTime: d.closeTime,
          },
          create: {
            dayOfWeek: d.dayOfWeek,
            isOpen: Boolean(d.isOpen),
            openTime: d.openTime,
            closeTime: d.closeTime,
          },
        })
      )
    );

    invalidateSettingsCache();

    await logActivity({
      session,
      action: "SETTINGS_UPDATE",
      entity: "Setting",
      entityId: "jadwal",
      detail: {
        perubahan: ["jam operasional"],
        hariBuka: days.filter((d: { isOpen: boolean }) => d.isOpen).length,
      },
    });

    const schedules = await getSchedules();
    return NextResponse.json({ schedules });
  } catch (e) {
    console.error("[admin/pengaturan/jadwal PUT]", e);
    return NextResponse.json({ error: "Gagal menyimpan jadwal." }, { status: 500 });
  }
}
