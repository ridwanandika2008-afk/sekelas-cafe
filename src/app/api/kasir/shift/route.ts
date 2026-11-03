import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { getOpenShift, openShift, ShiftError } from "@/lib/shift-service";

export const dynamic = "force-dynamic";

/** GET: shift aktif kasir + ringkasan transaksi shift berjalan */
export async function GET() {
  const { session, error } = await requireApiRole(["KASIR", "ADMIN"]);
  if (error) return error;

  const shift = await getOpenShift(session.userId);
  if (!shift) return NextResponse.json({ shift: null });

  const [orders, expenses] = await Promise.all([
    db.order.findMany({
      where: { shiftId: shift.id, paymentStatus: "PAID", status: { not: "CANCELLED" } },
    }),
    db.shiftExpense.findMany({ where: { shiftId: shift.id }, orderBy: { createdAt: "desc" } }),
  ]);

  const cashTotal = orders
    .filter((o) => o.paymentMethod === "CASH")
    .reduce((s, o) => s + o.total, 0);
  const qrisTotal = orders
    .filter((o) => o.paymentMethod === "QRIS")
    .reduce((s, o) => s + o.total, 0);
  const expenseTotal = expenses.reduce((s, e) => s + e.amount, 0);

  return NextResponse.json({
    shift: {
      ...shift,
      expenses,
      ringkasan: {
        jumlahTransaksi: orders.length,
        cashTotal,
        qrisTotal,
        expenseTotal,
        expectedCash: shift.openingCash + cashTotal - expenseTotal,
      },
    },
  });
}

/** POST: buka shift { openingCash } */
export async function POST(req: NextRequest) {
  const { session, error } = await requireApiRole(["KASIR", "ADMIN"]);
  if (error) return error;
  try {
    const body = await req.json().catch(() => ({}));
    const shift = await openShift(session.userId, Number(body?.openingCash ?? 0), session);
    return NextResponse.json({ shift });
  } catch (e) {
    if (e instanceof ShiftError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[shift-open]", e);
    return NextResponse.json({ error: "Gagal membuka shift." }, { status: 500 });
  }
}
