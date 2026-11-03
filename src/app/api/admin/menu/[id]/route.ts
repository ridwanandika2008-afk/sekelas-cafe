import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";
import { optionGroupsCreateData, parseOptionGroups, parsePrice, parseStatus } from "../helpers";

/**
 * PATCH /api/admin/menu/[id]
 *  - { archive: true|false }  → arsipkan / pulihkan saja
 *  - { status: "..." }        → ganti status cepat
 *  - field lainnya            → update penuh (termasuk replace optionGroups)
 * DELETE /api/admin/menu/[id] — hanya bila belum pernah dipakai di OrderItem.
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
    const existing = await db.menuItem.findUnique({
      where: { id },
      include: { optionGroups: { select: { id: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Menu tidak ditemukan." }, { status: 404 });
    }

    // Aksi khusus: arsipkan / pulihkan
    if (typeof body.archive === "boolean" && Object.keys(body).length === 1) {
      const updated = await db.menuItem.update({
        where: { id },
        data: { isArchived: body.archive },
      });
      await logActivity({
        session,
        action: "MENU_UPDATE",
        entity: "MenuItem",
        entityId: id,
        detail: { name: existing.name, aksi: body.archive ? "arsipkan" : "pulihkan" },
      });
      return NextResponse.json({ menu: updated });
    }

    const data: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Nama menu wajib diisi." }, { status: 400 });
      if (name.length > 100) {
        return NextResponse.json({ error: "Nama menu maksimal 100 karakter." }, { status: 400 });
      }
      const duplikat = await db.menuItem.count({
        where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
      });
      if (duplikat > 0) {
        return NextResponse.json(
          { error: `Nama menu "${name}" sudah dipakai — gunakan nama lain.` },
          { status: 400 }
        );
      }
      data.name = name;
    }

    if (body.categoryId !== undefined) {
      const categoryId = String(body.categoryId).trim();
      const kategori = await db.category.findUnique({ where: { id: categoryId } });
      if (!kategori) {
        return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });
      }
      data.categoryId = categoryId;
    }

    if (body.price !== undefined) {
      const price = parsePrice(body.price);
      if (!price.ok) return NextResponse.json({ error: price.error }, { status: 400 });
      data.price = price.value;
    }

    if (body.status !== undefined) {
      const status = parseStatus(body.status);
      if (!status.ok) return NextResponse.json({ error: status.error }, { status: 400 });
      data.status = status.value;
    }

    if (body.description !== undefined) {
      data.description = body.description ? String(body.description).trim() : null;
    }
    if (body.imageUrl !== undefined) {
      data.imageUrl = body.imageUrl ? String(body.imageUrl) : null;
    }
    if (body.isFeatured !== undefined) {
      data.isFeatured = Boolean(body.isFeatured);
    }
    if (body.sortOrder !== undefined) {
      const so = Number(body.sortOrder);
      data.sortOrder = Number.isInteger(so) ? so : 0;
    }

    // Replace seluruh grup opsi bila dikirim
    let replaceGroups = false;
    if (body.optionGroups !== undefined) {
      const parsed = parseOptionGroups(body.optionGroups);
      if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });
      replaceGroups = true;
      data.optionGroups = {
        deleteMany: {},
        create: optionGroupsCreateData(parsed.groups),
      };
    }

    const updated = await db.menuItem.update({
      where: { id },
      data,
      include: replaceGroups ? { optionGroups: { include: { options: true } } } : undefined,
    });

    await logActivity({
      session,
      action: "MENU_UPDATE",
      entity: "MenuItem",
      entityId: id,
      detail: {
        name: (data.name as string) ?? existing.name,
        perubahan: Object.keys(data).filter((k) => k !== "optionGroups"),
        opsiDiganti: replaceGroups,
      },
    });

    return NextResponse.json({ menu: updated });
  } catch (e) {
    console.error("[admin/menu PATCH]", e);
    return NextResponse.json({ error: "Gagal memperbarui menu." }, { status: 500 });
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
    const existing = await db.menuItem.findUnique({
      where: { id },
      select: { id: true, name: true, _count: { select: { orderItems: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Menu tidak ditemukan." }, { status: 404 });
    }
    if (existing._count.orderItems > 0) {
      return NextResponse.json(
        { error: "Menu sudah punya riwayat transaksi — arsipkan saja." },
        { status: 400 }
      );
    }

    await db.menuItem.delete({ where: { id } });
    await logActivity({
      session,
      action: "MENU_DELETE",
      entity: "MenuItem",
      entityId: id,
      detail: { name: existing.name },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/menu DELETE]", e);
    return NextResponse.json({ error: "Gagal menghapus menu." }, { status: 500 });
  }
}
