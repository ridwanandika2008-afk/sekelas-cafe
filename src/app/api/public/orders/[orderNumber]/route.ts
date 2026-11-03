import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Lacak pesanan publik: butuh nomor pesanan + access key (anti-enumerasi) */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  const key = req.nextUrl.searchParams.get("k") ?? "";
  if (!key) return NextResponse.json({ error: "Kunci akses pesanan tidak valid." }, { status: 403 });

  const order = await db.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      promo: { select: { name: true } },
    },
  });
  if (!order || order.accessKey !== key) {
    return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });
  }

  const doneUnits = order.items.filter((i) => i.isDone).reduce((s, i) => s + i.qty, 0);
  const totalUnits = order.items.reduce((s, i) => s + i.qty, 0);

  return NextResponse.json({
    order: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      channel: order.channel,
      fulfillment: order.fulfillment,
      tableNumber: order.tableNumber,
      deliveryBuilding: order.deliveryBuilding,
      deliveryRoom: order.deliveryRoom,
      note: order.note,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      promoName: order.promo?.name ?? null,
      total: order.total,
      createdAt: order.createdAt,
      paidAt: order.paidAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      cancelReason: order.cancelReason,
      progress: { done: doneUnits, total: totalUnits },
      items: order.items.map((i) => ({
        name: i.nameSnapshot,
        qty: i.qty,
        unitPrice: i.unitPrice,
        note: i.note,
        options: JSON.parse(i.optionsJson || "[]") as {
          groupName: string;
          optionName: string;
        }[],
      })),
    },
  });
}
