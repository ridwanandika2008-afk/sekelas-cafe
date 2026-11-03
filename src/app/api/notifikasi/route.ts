import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/** Notifikasi untuk role/user saat ini */
export async function GET() {
  const { session, error } = await requireApiRole(["ADMIN", "KASIR", "BARISTA"]);
  if (error) return error;

  const notifications = await db.notification.findMany({
    where: { OR: [{ role: session.role }, { userId: session.userId }] },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  return NextResponse.json({
    notifications,
    unread: notifications.filter((n) => !n.isRead).length,
  });
}

/** Tandai dibaca (semua notifikasi saya / role saya) */
export async function POST(req: NextRequest) {
  const { session, error } = await requireApiRole(["ADMIN", "KASIR", "BARISTA"]);
  if (error) return error;

  const body = await req.json().catch(() => ({}));
  if (body?.id) {
    await db.notification.updateMany({
      where: { id: String(body.id), OR: [{ role: session.role }, { userId: session.userId }] },
      data: { isRead: true },
    });
  } else {
    await db.notification.updateMany({
      where: { OR: [{ role: session.role }, { userId: session.userId }], isRead: false },
      data: { isRead: true },
    });
  }
  return NextResponse.json({ ok: true });
}
