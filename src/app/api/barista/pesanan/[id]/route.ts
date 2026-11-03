import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-guard";
import { markOrderReady, OrderError } from "@/lib/order-service";

/** Tandai pesanan siap — server memastikan SEMUA item sudah selesai */
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["BARISTA", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  try {
    const order = await markOrderReady(id, session);
    return NextResponse.json({ order: { id: order.id, status: order.status } });
  } catch (e) {
    if (e instanceof OrderError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[barista-siap]", e);
    return NextResponse.json({ error: "Gagal menandai pesanan siap." }, { status: 500 });
  }
}
