import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-guard";
import {
  cancelOrder,
  completeDelivery,
  completeOrder,
  markOrderPaid,
  startDelivery,
  OrderError,
} from "@/lib/order-service";

/**
 * Transisi pesanan oleh kasir/admin.
 * body: { action: "bayar" | "serahkan" | "antar" | "diterima" | "batal", ... }
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
    switch (action) {
      case "bayar": {
        const updated = await markOrderPaid(
          id,
          {
            method: body.method === "QRIS" ? "QRIS" : "CASH",
            cashReceived: body.cashReceived ?? null,
          },
          session
        );
        return NextResponse.json({ order: updated });
      }
      case "serahkan": {
        const updated = await completeOrder(id, session);
        return NextResponse.json({ order: updated });
      }
      case "antar": {
        const updated = await startDelivery(id, session);
        return NextResponse.json({ order: updated });
      }
      case "diterima": {
        const updated = await completeDelivery(id, session);
        return NextResponse.json({ order: updated });
      }
      case "batal": {
        const updated = await cancelOrder(id, String(body.reason ?? ""), session);
        return NextResponse.json({ order: updated });
      }
      default:
        return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
    }
  } catch (e) {
    if (e instanceof OrderError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[kasir-transisi]", e);
    return NextResponse.json({ error: "Gagal memproses aksi." }, { status: 500 });
  }
}
