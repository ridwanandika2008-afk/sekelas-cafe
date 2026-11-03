import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { wibDayStartFromKey } from "@/lib/format";

export const dynamic = "force-dynamic";

/** Riwayat transaksi kasir: ?tanggal=YYYY-MM-DD&metode=CASH|QRIS&status=&q= */
export async function GET(req: NextRequest) {
  const { session, error } = await requireApiRole(["KASIR", "ADMIN"]);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const tanggal = sp.get("tanggal"); // YYYY-MM-DD
  const metode = sp.get("metode");
  const status = sp.get("status");
  const q = sp.get("q")?.trim();
  const limit = Math.min(parseInt(sp.get("limit") ?? "50", 10) || 50, 200);

  const where: Record<string, unknown> = {};
  if (tanggal && /^\d{4}-\d{2}-\d{2}$/.test(tanggal)) {
    const from = wibDayStartFromKey(tanggal);
    const to = new Date(from.getTime() + 24 * 3600 * 1000);
    where.createdAt = { gte: from, lt: to };
  }
  if (metode === "CASH" || metode === "QRIS") {
    where.paymentMethod = metode;
    where.paymentStatus = "PAID";
  }
  if (status) where.status = status;
  if (q) {
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customerName: { contains: q, mode: "insensitive" } },
    ];
  }

  const orders = await db.order.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      kasir: { select: { name: true } },
      _count: { select: { items: true } },
    },
  });

  const paidOnly = orders.filter((o) => o.paymentStatus === "PAID" && o.status !== "CANCELLED");
  const totalTunai = paidOnly
    .filter((o) => o.paymentMethod === "CASH")
    .reduce((s, o) => s + o.total, 0);
  const totalQris = paidOnly
    .filter((o) => o.paymentMethod === "QRIS")
    .reduce((s, o) => s + o.total, 0);

  return NextResponse.json({
    tanggal: tanggal ?? null,
    ringkasan: {
      jumlah: paidOnly.length,
      totalTunai,
      totalQris,
      total: totalTunai + totalQris,
    },
    orders: orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      channel: o.channel,
      customerName: o.customerName,
      fulfillment: o.fulfillment,
      status: o.status,
      paymentStatus: o.paymentStatus,
      paymentMethod: o.paymentMethod,
      total: o.total,
      itemCount: o._count.items,
      kasirName: o.kasir?.name ?? null,
      createdAt: o.createdAt,
      cancelReason: o.cancelReason,
    })),
  });
}
