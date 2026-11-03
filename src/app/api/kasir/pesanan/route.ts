import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { wibDayStart } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Daftar pesanan untuk kasir.
 * ?scope=aktif  → pesanan hari ini yang belum selesai (masuk/diproses/siap/antar)
 * ?scope=semua  → semua pesanan hari ini
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireApiRole(["KASIR", "ADMIN"]);
  if (error) return error;

  const scope = req.nextUrl.searchParams.get("scope") ?? "aktif";
  const from = wibDayStart();

  const orders = await db.order.findMany({
    where: {
      createdAt: { gte: from },
      ...(scope === "aktif"
        ? { status: { in: ["NEW", "QUEUED", "PREPARING", "READY", "DELIVERING"] } }
        : {}),
    },
    orderBy: { createdAt: "asc" },
    include: {
      items: { orderBy: { sortOrder: "asc" } },
      kasir: { select: { name: true } },
    },
  });

  return NextResponse.json({
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      channel: o.channel,
      customerName: o.customerName,
      fulfillment: o.fulfillment,
      tableNumber: o.tableNumber,
      deliveryBuilding: o.deliveryBuilding,
      deliveryRoom: o.deliveryRoom,
      deliveryNote: o.deliveryNote,
      note: o.note,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      subtotal: o.subtotal,
      deliveryFee: o.deliveryFee,
      discount: o.discount,
      total: o.total,
      cashReceived: o.cashReceived,
      cashChange: o.cashChange,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      completedAt: o.completedAt,
      cancelReason: o.cancelReason,
      kasirName: o.kasir?.name ?? null,
      items: o.items.map((i) => ({
        id: i.id,
        name: i.nameSnapshot,
        qty: i.qty,
        unitPrice: i.unitPrice,
        note: i.note,
        isDone: i.isDone,
        options: JSON.parse(i.optionsJson || "[]") as { groupName: string; optionName: string }[],
      })),
    })),
  });
}
