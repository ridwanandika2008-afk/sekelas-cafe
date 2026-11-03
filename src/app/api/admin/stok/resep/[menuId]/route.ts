import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/stok/resep/[menuId] — resep menu + semua bahan (pilihan).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ menuId: string }> }
) {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const { menuId } = await params;

  try {
    const menu = await db.menuItem.findUnique({
      where: { id: menuId },
      select: { id: true, name: true, price: true, status: true, isArchived: true },
    });
    if (!menu) {
      return NextResponse.json({ error: "Menu tidak ditemukan." }, { status: 404 });
    }

    const [items, ingredients] = await Promise.all([
      db.menuItemIngredient.findMany({
        where: { menuItemId: menuId },
        orderBy: { ingredient: { name: "asc" } },
        include: {
          ingredient: { select: { id: true, name: true, unit: true, stock: true, isActive: true } },
        },
      }),
      db.ingredient.findMany({
        orderBy: [{ isActive: "desc" }, { name: "asc" }],
        select: { id: true, name: true, unit: true, stock: true, isActive: true },
      }),
    ]);

    return NextResponse.json({
      menu,
      items: items.map((it) => ({
        ingredientId: it.ingredientId,
        amount: it.amount,
        ingredient: it.ingredient,
      })),
      ingredients,
    });
  } catch (e) {
    console.error("[admin/stok resep GET]", e);
    return NextResponse.json({ error: "Gagal memuat resep menu." }, { status: 500 });
  }
}

/**
 * PUT /api/admin/stok/resep/[menuId] — ganti total resep menu (replace).
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ menuId: string }> }
) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const { menuId } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || !Array.isArray(body.items)) {
    return NextResponse.json({ error: "Data resep tidak valid." }, { status: 400 });
  }

  try {
    const menu = await db.menuItem.findUnique({
      where: { id: menuId },
      select: { id: true, name: true, isArchived: true },
    });
    if (!menu) {
      return NextResponse.json({ error: "Menu tidak ditemukan." }, { status: 404 });
    }

    const seen = new Set<string>();
    const clean: { ingredientId: string; amount: number }[] = [];
    for (const raw of body.items) {
      const ingredientId = String(raw?.ingredientId ?? "");
      const amount = Number(raw?.amount);
      if (!ingredientId)
        return NextResponse.json({ error: "Ada baris resep tanpa bahan terpilih." }, { status: 400 });
      if (!Number.isFinite(amount) || amount <= 0)
        return NextResponse.json(
          { error: "Jumlah pemakaian tiap bahan harus angka lebih dari 0." },
          { status: 400 }
        );
      if (seen.has(ingredientId))
        return NextResponse.json(
          { error: "Satu bahan hanya boleh muncul sekali dalam resep." },
          { status: 400 }
        );
      seen.add(ingredientId);
      clean.push({ ingredientId, amount: Math.round(amount * 1000) / 1000 });
    }

    if (clean.length > 30) {
      return NextResponse.json({ error: "Maksimal 30 bahan per resep." }, { status: 400 });
    }

    const bahanIds = clean.map((c) => c.ingredientId);
    const bahanCount = await db.ingredient.count({ where: { id: { in: bahanIds } } });
    if (bahanCount !== clean.length) {
      return NextResponse.json({ error: "Ada bahan yang tidak ditemukan." }, { status: 400 });
    }

    await db.$transaction([
      db.menuItemIngredient.deleteMany({ where: { menuItemId: menuId } }),
      ...(clean.length
        ? [db.menuItemIngredient.createMany({ data: clean.map((c) => ({ ...c, menuItemId: menuId })) })]
        : []),
    ]);

    await logActivity({
      session,
      action: "RECIPE_UPDATE",
      entity: "MenuItem",
      entityId: menuId,
      detail: { menu: menu.name, jumlahBahan: clean.length, items: clean },
    });

    return NextResponse.json({ ok: true, jumlahBahan: clean.length });
  } catch (e) {
    console.error("[admin/stok resep PUT]", e);
    return NextResponse.json({ error: "Gagal menyimpan resep." }, { status: 500 });
  }
}
