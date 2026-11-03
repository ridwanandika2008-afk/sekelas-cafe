import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-guard";
import { createOrder, OrderError } from "@/lib/order-service";

/** Buat pesanan POS (kasir) — bisa langsung dibayar saat transaksi */
export async function POST(req: NextRequest) {
  const { session, error } = await requireApiRole(["KASIR", "ADMIN"]);
  if (error) return error;

  try {
    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Data transaksi tidak valid." }, { status: 400 });

    const result = await createOrder({
      channel: "POS",
      customerName: String(body.customerName ?? "Pelanggan"),
      fulfillment: body.fulfillment,
      tableNumber: body.tableNumber ?? null,
      deliveryBuilding: body.deliveryBuilding ?? null,
      deliveryRoom: body.deliveryRoom ?? null,
      deliveryNote: body.deliveryNote ?? null,
      note: body.note ?? null,
      items: Array.isArray(body.items) ? body.items : [],
      promoId: body.promoId ?? null,
      payment: body.payment ?? null,
      session,
    });

    return NextResponse.json({
      order: {
        id: result.order.id,
        orderNumber: result.order.orderNumber,
        total: result.order.total,
        subtotal: result.order.subtotal,
        deliveryFee: result.order.deliveryFee,
        discount: result.order.discount,
        paymentStatus: result.order.paymentStatus,
        status: result.order.status,
        cashChange: result.order.cashChange,
        accessKey: result.accessKey,
      },
    });
  } catch (e) {
    if (e instanceof OrderError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[pos-order]", e);
    return NextResponse.json({ error: "Gagal membuat transaksi." }, { status: 500 });
  }
}
