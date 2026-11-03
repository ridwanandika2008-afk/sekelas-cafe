import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { wibDayStart } from "@/lib/format";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/stats — ringkasan dashboard admin untuk HARI INI (batas WIB).
 * Pendapatan = pesanan paymentStatus PAID & status ≠ CANCELLED.
 */
export async function GET() {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  try {
    const dayStart = wibDayStart();

    const todayOrders = await db.order.findMany({
      where: { createdAt: { gte: dayStart } },
      select: {
        channel: true,
        status: true,
        paymentMethod: true,
        paymentStatus: true,
        total: true,
        orderNumber: true,
      },
    });

    const paidOrders = todayOrders.filter(
      (o) => o.paymentStatus === "PAID" && o.status !== "CANCELLED"
    );
    const pendapatan = paidOrders.reduce((s, o) => s + o.total, 0);
    const tunaiOrders = paidOrders.filter((o) => o.paymentMethod === "CASH");
    const qrisOrders = paidOrders.filter((o) => o.paymentMethod === "QRIS");

    const statusCounts: Record<string, number> = {
      NEW: 0,
      QUEUED: 0,
      PREPARING: 0,
      READY: 0,
      DELIVERING: 0,
      COMPLETED: 0,
      CANCELLED: 0,
    };
    for (const o of todayOrders) {
      if (o.status in statusCounts) statusCounts[o.status] += 1;
    }

    // 5 menu terlaris hari ini (pesanan tidak dibatalkan)
    const items = await db.orderItem.findMany({
      where: {
        order: { createdAt: { gte: dayStart }, status: { not: "CANCELLED" } },
      },
      select: { nameSnapshot: true, qty: true, unitPrice: true },
    });
    const byName = new Map<string, { name: string; qty: number; total: number }>();
    for (const it of items) {
      const cur = byName.get(it.nameSnapshot) ?? { name: it.nameSnapshot, qty: 0, total: 0 };
      cur.qty += it.qty;
      cur.total += it.qty * it.unitPrice;
      byName.set(it.nameSnapshot, cur);
    }
    const menuTerlaris = [...byName.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

    // Bahan hampir habis: aktif & stock < minStock
    const ingredients = await db.ingredient.findMany({
      where: { isActive: true },
      select: { id: true, name: true, unit: true, stock: true, minStock: true },
    });
    const bahanHampirHabis = ingredients
      .filter((i) => i.stock < i.minStock)
      .sort((a, b) => a.stock - b.stock);

    // Pesanan aktif terbaru (belum selesai/batal)
    const pesananAktif = await db.order.findMany({
      where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        orderNumber: true,
        customerName: true,
        channel: true,
        status: true,
        paymentStatus: true,
        total: true,
        createdAt: true,
        items: { select: { qty: true, isDone: true } },
      },
    });

    const aktivitasTerbaru = await db.activityLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        actorName: true,
        role: true,
        action: true,
        entity: true,
        entityId: true,
        createdAt: true,
      },
    });

    const body: Prisma.InputJsonValue = {
      tanggal: dayStart.toISOString(),
      hariIni: {
        pendapatan,
        jumlahPesanan: todayOrders.length,
        online: todayOrders.filter((o) => o.channel === "ONLINE").length,
        pos: todayOrders.filter((o) => o.channel === "POS").length,
        tunai: { jumlah: tunaiOrders.length, total: tunaiOrders.reduce((s, o) => s + o.total, 0) },
        qris: { jumlah: qrisOrders.length, total: qrisOrders.reduce((s, o) => s + o.total, 0) },
        statusCounts,
      },
      menuTerlaris,
      bahanHampirHabis,
      pesananAktif: pesananAktif.map((o) => ({
        id: o.id,
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        channel: o.channel,
        status: o.status,
        paymentStatus: o.paymentStatus,
        total: o.total,
        createdAt: o.createdAt,
        itemCount: o.items.reduce((s, i) => s + i.qty, 0),
        doneCount: o.items.filter((i) => i.isDone).reduce((s, i) => s + i.qty, 0),
      })),
      aktivitasTerbaru,
    };

    return NextResponse.json(body);
  } catch (e) {
    console.error("[admin/stats]", e);
    return NextResponse.json(
      { error: "Gagal memuat ringkasan dashboard." },
      { status: 500 }
    );
  }
}
