import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

/**
 * Data struk (pelanggan / dapur) untuk dicetak.
 * ?type=customer|kitchen — struk dapur khusus kasir/admin.
 * Struk pelanggan: kasir/admin ATAU access key (?k=...) dari pembeli.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orderNumber: string }> }
) {
  const { orderNumber } = await params;
  const type = req.nextUrl.searchParams.get("type") === "kitchen" ? "kitchen" : "customer";
  const key = req.nextUrl.searchParams.get("k");
  const session = await getSession();

  const order = await db.order.findUnique({
    where: { orderNumber: orderNumber.toUpperCase() },
    include: { items: { orderBy: { sortOrder: "asc" } }, promo: { select: { name: true } } },
  });
  if (!order) return NextResponse.json({ error: "Pesanan tidak ditemukan." }, { status: 404 });

  const isStaff = session && ["KASIR", "ADMIN"].includes(session.role);
  const isBuyer = Boolean(key && order.accessKey && key === order.accessKey);

  if (type === "kitchen" && !isStaff) {
    return NextResponse.json({ error: "Struk dapur hanya untuk staf." }, { status: 403 });
  }
  if (!isStaff && !isBuyer) {
    return NextResponse.json({ error: "Tidak berhak mencetak struk ini." }, { status: 403 });
  }

  const settings = await getSettings();

  return NextResponse.json({
    type,
    cafe: {
      name: settings.cafeName,
      address: settings.address,
      footer: settings.receiptFooter,
      whatsapp: settings.whatsapp,
    },
    order: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      fulfillment: order.fulfillment,
      tableNumber: order.tableNumber,
      deliveryBuilding: order.deliveryBuilding,
      deliveryRoom: order.deliveryRoom,
      deliveryNote: order.deliveryNote,
      note: order.note,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      subtotal: order.subtotal,
      deliveryFee: order.deliveryFee,
      discount: order.discount,
      promoName: order.promo?.name ?? null,
      total: order.total,
      cashReceived: order.cashReceived,
      cashChange: order.cashChange,
      createdAt: order.createdAt,
      items: order.items.map((i) => ({
        name: i.nameSnapshot,
        qty: i.qty,
        unitPrice: i.unitPrice,
        note: i.note,
        isDone: i.isDone,
        options: JSON.parse(i.optionsJson || "[]") as { groupName: string; optionName: string }[],
      })),
    },
  });
}
