import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * Riwayat shift kasir (CLOSED) — 20 terakhir.
 * KASIR: milik sendiri. ADMIN: semua kasir (nama kasir disertakan).
 */
export async function GET() {
  const { session, error } = await requireApiRole(["KASIR", "ADMIN"]);
  if (error) return error;

  const shifts = await db.shift.findMany({
    where: {
      status: "CLOSED",
      ...(session.role === "ADMIN" ? {} : { kasirId: session.userId }),
    },
    orderBy: [{ closedAt: "desc" }, { openedAt: "desc" }],
    take: 20,
    include: {
      kasir: { select: { name: true } },
      _count: { select: { orders: { where: { paymentStatus: "PAID" } } } },
    },
  });

  return NextResponse.json({
    shifts: shifts.map((s) => ({
      id: s.id,
      kasirName: s.kasir?.name ?? "-",
      openedAt: s.openedAt,
      closedAt: s.closedAt,
      openingCash: s.openingCash,
      closingCash: s.closingCash,
      cashTotal: s.cashTotal,
      qrisTotal: s.qrisTotal,
      expenseTotal: s.expenseTotal,
      expectedCash: s.expectedCash,
      variance: s.variance,
      jumlahTransaksi: s._count.orders,
    })),
  });
}
