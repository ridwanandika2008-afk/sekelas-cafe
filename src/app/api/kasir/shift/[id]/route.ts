import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-guard";
import { addShiftExpense, closeShift, ShiftError } from "@/lib/shift-service";

/**
 * Aksi pada shift kasir.
 * body: { action: "tutup", closingCash } | { action: "pengeluaran", amount, note }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["KASIR", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const action = String(body?.action ?? "");

  try {
    if (action === "tutup") {
      const shift = await closeShift(id, Number(body?.closingCash ?? 0), session);
      return NextResponse.json({ shift });
    }
    if (action === "pengeluaran") {
      const expense = await addShiftExpense(
        id,
        Number(body?.amount ?? 0),
        String(body?.note ?? ""),
        session
      );
      return NextResponse.json({ expense });
    }
    return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
  } catch (e) {
    if (e instanceof ShiftError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[shift-aksi]", e);
    return NextResponse.json({ error: "Gagal memproses aksi shift." }, { status: 500 });
  }
}
