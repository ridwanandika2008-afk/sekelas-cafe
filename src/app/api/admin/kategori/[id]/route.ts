import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";

/**
 * PATCH /api/admin/kategori/[id] — rename / urutan / arsip.
 * DELETE /api/admin/kategori/[id] — hanya bila tidak menanggung menu sama sekali.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  try {
    const existing = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { menuItems: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Nama kategori wajib diisi." }, { status: 400 });
      if (name.length > 60) {
        return NextResponse.json({ error: "Nama kategori maksimal 60 karakter." }, { status: 400 });
      }
      const duplikat = await db.category.count({
        where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
      });
      if (duplikat > 0) {
        return NextResponse.json({ error: `Kategori "${name}" sudah ada.` }, { status: 400 });
      }
      data.name = name;
    }
    if (body.sortOrder !== undefined) {
      const so = Number(body.sortOrder);
      data.sortOrder = Number.isInteger(so) ? so : 0;
    }
    if (body.isArchived !== undefined) {
      data.isArchived = Boolean(body.isArchived);
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan untuk disimpan." }, { status: 400 });
    }

    const category = await db.category.update({ where: { id }, data });
    await logActivity({
      session,
      action: "CATEGORY_UPDATE",
      entity: "Category",
      entityId: id,
      detail: {
        name: (data.name as string) ?? existing.name,
        perubahan: Object.keys(data),
        menuAktif: existing._count.menuItems,
      },
    });

    return NextResponse.json({ category });
  } catch (e) {
    console.error("[admin/kategori PATCH]", e);
    return NextResponse.json({ error: "Gagal memperbarui kategori." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await db.category.findUnique({
      where: { id },
      include: { _count: { select: { menuItems: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
    }
    if (existing._count.menuItems > 0) {
      return NextResponse.json(
        {
          error: `Kategori masih dipakai ${existing._count.menuItems} menu — pindahkan atau arsipkan menunya dulu.`,
        },
        { status: 400 }
      );
    }

    await db.category.delete({ where: { id } });
    await logActivity({
      session,
      action: "CATEGORY_DELETE",
      entity: "Category",
      entityId: id,
      detail: { name: existing.name },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/kategori DELETE]", e);
    return NextResponse.json({ error: "Gagal menghapus kategori." }, { status: 500 });
  }
}
