import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";

/**
 * GET /api/admin/kategori — semua kategori + jumlah menu.
 * POST /api/admin/kategori — buat kategori (nama unik).
 */
export async function GET() {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  try {
    const categories = await db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: {
        _count: { select: { menuItems: true } },
        menuItems: { select: { isArchived: true } },
      },
    });

    return NextResponse.json({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        sortOrder: c.sortOrder,
        isArchived: c.isArchived,
        createdAt: c.createdAt,
        menuCount: c._count.menuItems,
        menuAktif: c.menuItems.filter((m) => !m.isArchived).length,
      })),
    });
  } catch (e) {
    console.error("[admin/kategori GET]", e);
    return NextResponse.json({ error: "Gagal memuat kategori." }, { status: 500 });
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
  if (!name) return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });
  if (name.length > 60) {
    return NextResponse.json({ error: "Nama kategori maksimal 60 karakter." }, { status: 400 });
  }
  const sortOrder = Number.isInteger(Number(body.sortOrder)) ? Number(body.sortOrder) : 0;

  try {
    const duplikat = await db.category.count({
      where: { name: { equals: name, mode: "insensitive" } },
    });
    if (duplikat > 0) {
      return NextResponse.json(
        { error: `Kategori "${name}" sudah ada.` },
        { status: 400 }
      );
    }

    const category = await db.category.create({ data: { name, sortOrder } });
    await logActivity({
      session,
      action: "CATEGORY_CREATE",
      entity: "Category",
      entityId: category.id,
      detail: { name },
    });

    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    console.error("[admin/kategori POST]", e);
    return NextResponse.json({ error: "Gagal membuat kategori." }, { status: 500 });
  }
}
