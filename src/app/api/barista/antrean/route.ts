import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/** Antrean barista: pesanan lunas yang harus dikerjakan + pesanan siap */
export async function GET() {
  const { error } = await requireApiRole(["BARISTA", "ADMIN"]);
  if (error) return error;

  const [antrean, siap, riwayatSingkat] = await Promise.all([
    db.order.findMany({
      where: { status: { in: ["QUEUED", "PREPARING"] } },
      orderBy: { createdAt: "asc" },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    }),
    db.order.findMany({
      where: { status: { in: ["READY", "DELIVERING"] } },
      orderBy: { createdAt: "desc" },
      take: 12,
      include: { items: true },
    }),
    db.order.count({
      where: { status: "COMPLETED", createdAt: { gte: new Date(Date.now() - 8 * 3600 * 1000) } },
    }),
  ]);

  const mapOrder = (o: (typeof antrean)[number]) => {
    const doneUnits = o.items.filter((i) => i.isDone).reduce((s, i) => s + i.qty, 0);
    const totalUnits = o.items.reduce((s, i) => s + i.qty, 0);
    return {
      id: o.id,
      orderNumber: o.orderNumber,
      customerName: o.customerName,
      channel: o.channel,
      fulfillment: o.fulfillment,
      tableNumber: o.tableNumber,
      deliveryBuilding: o.deliveryBuilding,
      deliveryRoom: o.deliveryRoom,
      deliveryNote: o.deliveryNote,
      note: o.note,
      status: o.status,
      createdAt: o.createdAt,
      progress: { done: doneUnits, total: totalUnits },
      items: o.items.map((i) => ({
        id: i.id,
        name: i.nameSnapshot,
        qty: i.qty,
        note: i.note,
        isDone: i.isDone,
        options: JSON.parse(i.optionsJson || "[]") as { groupName: string; optionName: string }[],
      })),
    };
  };

  return NextResponse.json({
    antrean: antrean.map(mapOrder),
    siap: siap.map(mapOrder),
    selesaiHariIni: riwayatSingkat,
  });
}
