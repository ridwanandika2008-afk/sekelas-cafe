import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stok/[id]/riwayat — 50 movement terakhir sebuah bahan,
 * lengkap nomor pesanan & nama pelaku (direlasikan manual karena model
 * StockMovement tidak punya relasi ketat ke Order/User).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  try {
    const ingredient = await db.ingredient.findUnique({ where: { id } });
    if (!ingredient) {
      return NextResponse.json({ error: "Bahan tidak ditemukan." }, { status: 404 });
    }

    const movements = await db.stockMovement.findMany({
      where: { ingredientId: id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const orderIds = [...new Set(movements.map((m) => m.orderId).filter((v): v is string => !!v))];
    const userIds = [...new Set(movements.map((m) => m.userId).filter((v): v is string => !!v))];
    const [orders, users] = await Promise.all([
      orderIds.length
        ? db.order.findMany({ where: { id: { in: orderIds } }, select: { id: true, orderNumber: true } })
        : Promise.resolve([] as { id: string; orderNumber: string }[]),
      userIds.length
        ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, role: true } })
        : Promise.resolve([] as { id: string; name: string; role: string }[]),
    ]);
    const orderMap = new Map(orders.map((o) => [o.id, o.orderNumber]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      ingredient: {
        id: ingredient.id,
        name: ingredient.name,
        unit: ingredient.unit,
        stock: ingredient.stock,
        minStock: ingredient.minStock,
      },
      movements: movements.map((m) => ({
        id: m.id,
        type: m.type,
        amount: m.amount,
        note: m.note,
        createdAt: m.createdAt,
        orderNumber: m.orderId ? (orderMap.get(m.orderId) ?? null) : null,
        userName: m.userId ? (userMap.get(m.userId)?.name ?? null) : null,
        userRole: m.userId ? (userMap.get(m.userId)?.role ?? null) : null,
      })),
    });
  } catch (e) {
    console.error("[admin/stok riwayat GET]", e);
    return NextResponse.json({ error: "Gagal memuat riwayat stok." }, { status: 500 });
  }
}
