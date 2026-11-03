import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";
import { optionGroupsCreateData, parseOptionGroups, parsePrice, parseStatus } from "./helpers";

/**
 * GET /api/admin/menu — semua menu (termasuk arsip) + kategori + grup opsi.
 * POST /api/admin/menu — buat menu baru (validasi nama unik, harga, kategori, opsi).
 */
export async function GET() {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  try {
    const [items, categories] = await Promise.all([
      db.menuItem.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        include: {
          category: { select: { id: true, name: true, isArchived: true } },
          optionGroups: {
            orderBy: { sortOrder: "asc" },
            include: { options: { orderBy: { sortOrder: "asc" } } },
          },
          _count: { select: { orderItems: true } },
        },
      }),
      db.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: { id: true, name: true, isArchived: true, sortOrder: true },
      }),
    ]);

    return NextResponse.json({
      categories,
      items: items.map((m) => ({
        id: m.id,
        name: m.name,
        description: m.description,
        imageUrl: m.imageUrl,
        price: m.price,
        status: m.status,
        sortOrder: m.sortOrder,
        isFeatured: m.isFeatured,
        isArchived: m.isArchived,
        createdAt: m.createdAt,
        categoryId: m.categoryId,
        category: m.category,
        optionGroups: m.optionGroups,
        orderItemCount: m._count.orderItems,
      })),
    });
  } catch (e) {
    console.error("[admin/menu GET]", e);
    return NextResponse.json({ error: "Gagal memuat data menu." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Nama menu wajib diisi." }, { status: 400 });
  if (name.length > 100) {
    return NextResponse.json({ error: "Nama menu maksimal 100 karakter." }, { status: 400 });
  }
  const categoryId = String(body.categoryId ?? "").trim();
  if (!categoryId) {
    return NextResponse.json({ error: "Kategori wajib dipilih." }, { status: 400 });
  }
  const price = parsePrice(body.price);
  if (!price.ok) return NextResponse.json({ error: price.error }, { status: 400 });
  const status = parseStatus(body.status);
  if (!status.ok) return NextResponse.json({ error: status.error }, { status: 400 });

  try {
    const [duplikat, kategori] = await Promise.all([
      db.menuItem.count({ where: { name: { equals: name, mode: "insensitive" } } }),
      db.category.findUnique({ where: { id: categoryId } }),
    ]);
    if (duplikat > 0) {
      return NextResponse.json(
        { error: `Nama menu "${name}" sudah dipakai — gunakan nama lain.` },
        { status: 400 }
      );
    }
    if (!kategori) {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });
    }

    const parsed = parseOptionGroups(body.optionGroups);
    if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

    const sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

    const menu = await db.menuItem.create({
      data: {
        name,
        categoryId,
        description: body.description ? String(body.description).trim() : null,
        imageUrl: body.imageUrl ? String(body.imageUrl) : null,
        price: price.value,
        status: status.value,
        sortOrder,
        isFeatured: Boolean(body.isFeatured),
        optionGroups: { create: optionGroupsCreateData(parsed.groups) },
      },
      include: { optionGroups: { include: { options: true } } },
    });

    await logActivity({
      session,
      action: "MENU_CREATE",
      entity: "MenuItem",
      entityId: menu.id,
      detail: { name: menu.name, price: menu.price, kategori: kategori.name },
    });

    return NextResponse.json({ menu }, { status: 201 });
  } catch (e) {
    console.error("[admin/menu POST]", e);
    return NextResponse.json({ error: "Gagal menyimpan menu." }, { status: 500 });
  }
}
