import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stok — semua bahan (aktif + nonaktif) + jumlah menu pemakai
 * + daftar menu aktif (untuk tab resep).
 */
export async function GET() {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  try {
    const [ingredients, menus] = await Promise.all([
      db.ingredient.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        include: { _count: { select: { menuLinks: true } } },
      }),
      db.menuItem.findMany({
        where: { isArchived: false },
        orderBy: [{ name: "asc" }],
        select: { id: true, name: true, price: true, status: true },
      }),
    ]);

    return NextResponse.json({
      ingredients: ingredients.map((i) => ({
        id: i.id,
        name: i.name,
        unit: i.unit,
        stock: i.stock,
        minStock: i.minStock,
        isActive: i.isActive,
        createdAt: i.createdAt,
        menuLinks: i._count.menuLinks,
      })),
      menus,
    });
  } catch (e) {
    console.error("[admin/stok GET]", e);
    return NextResponse.json({ error: "Gagal memuat data bahan." }, { status: 500 });
  }
}

/**
 * POST /api/admin/stok — buat bahan baru.
 * Stok awal tidak membuat StockMovement (riwayat diisi lewat penyesuaian
 * agar admin sadar jejaknya, dan bahan baru masih bisa dihapus bila salah buat).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const unit = String(body.unit ?? "").trim();
  const stock = Number(body.stock ?? 0);
  const minStock = Number(body.minStock ?? 0);

  if (!name) return NextResponse.json({ error: "Nama bahan wajib diisi." }, { status: 400 });
  if (name.length > 60)
    return NextResponse.json({ error: "Nama bahan maksimal 60 karakter." }, { status: 400 });
  if (!unit)
    return NextResponse.json({ error: "Satuan bahan wajib diisi (gr, ml, pcs, …)." }, { status: 400 });
  if (unit.length > 20)
    return NextResponse.json({ error: "Satuan maksimal 20 karakter." }, { status: 400 });
  if (!Number.isFinite(stock) || stock < 0)
    return NextResponse.json({ error: "Stok awal harus angka ≥ 0." }, { status: 400 });
  if (!Number.isFinite(minStock) || minStock < 0)
    return NextResponse.json({ error: "Batas minimum harus angka ≥ 0." }, { status: 400 });

  try {
    const duplikat = await db.ingredient.count({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (duplikat > 0) {
      return NextResponse.json({ error: `Bahan "${name}" sudah ada.` }, { status: 400 });
    }

    const ingredient = await db.ingredient.create({
      data: {
        name,
        unit,
        stock: Math.round(stock * 1000) / 1000,
        minStock: Math.round(minStock * 1000) / 1000,
      },
    });
    await logActivity({
      session,
      action: "INGREDIENT_CREATE",
      entity: "Ingredient",
      entityId: ingredient.id,
      detail: { name, unit, stock: ingredient.stock, minStock: ingredient.minStock },
    });

    return NextResponse.json({ ingredient }, { status: 201 });
  } catch (e) {
    console.error("[admin/stok POST]", e);
    return NextResponse.json({ error: "Gagal membuat bahan." }, { status: 500 });
  }
}
