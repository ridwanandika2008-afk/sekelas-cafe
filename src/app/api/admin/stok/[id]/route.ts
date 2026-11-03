import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";

/**
 * PATCH /api/admin/stok/[id] — ubah nama/satuan/batas minimum/status aktif.
 * Stok TIDAK bisa diubah lewat sini — wajib lewat penyesuaian agar ada jejak.
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
    const existing = await db.ingredient.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Bahan tidak ditemukan." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Nama bahan wajib diisi." }, { status: 400 });
      if (name.length > 60)
        return NextResponse.json({ error: "Nama bahan maksimal 60 karakter." }, { status: 400 });
      const duplikat = await db.ingredient.count({
        where: { name: { equals: name, mode: "insensitive" }, id: { not: id } },
      });
      if (duplikat > 0)
        return NextResponse.json({ error: `Bahan "${name}" sudah ada.` }, { status: 400 });
      data.name = name;
    }
    if (body.unit !== undefined) {
      const unit = String(body.unit).trim();
      if (!unit)
        return NextResponse.json({ error: "Satuan bahan wajib diisi." }, { status: 400 });
      if (unit.length > 20)
        return NextResponse.json({ error: "Satuan maksimal 20 karakter." }, { status: 400 });
      data.unit = unit;
    }
    if (body.minStock !== undefined) {
      const minStock = Number(body.minStock);
      if (!Number.isFinite(minStock) || minStock < 0)
        return NextResponse.json({ error: "Batas minimum harus angka ≥ 0." }, { status: 400 });
      data.minStock = Math.round(minStock * 1000) / 1000;
    }
    if (body.isActive !== undefined) {
      data.isActive = Boolean(body.isActive);
    }
    if (body.stock !== undefined) {
      return NextResponse.json(
        { error: "Stok hanya bisa diubah lewat penyesuaian (agar tercatat di riwayat)." },
        { status: 400 }
      );
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan untuk disimpan." }, { status: 400 });
    }

    const ingredient = await db.ingredient.update({ where: { id }, data });
    await logActivity({
      session,
      action: "INGREDIENT_UPDATE",
      entity: "Ingredient",
      entityId: id,
      detail: {
        name: ingredient.name,
        perubahan: Object.keys(data),
        lama: {
          name: existing.name,
          unit: existing.unit,
          minStock: existing.minStock,
          isActive: existing.isActive,
        },
      },
    });

    return NextResponse.json({ ingredient });
  } catch (e) {
    console.error("[admin/stok PATCH]", e);
    return NextResponse.json({ error: "Gagal memperbarui bahan." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/stok/[id] — hanya bila aman:
 * - tidak dipakai resep menu mana pun, dan
 * - belum pernah tercatat dalam transaksi pesanan (movement dengan orderId).
 * Bahan yang hanya punya jejak penyesuaian manual masih boleh dihapus
 * (movement ikut ter-cascade & dicatat di log aktivitas sebagai audit).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await db.ingredient.findUnique({
      where: { id },
      include: {
        _count: { select: { menuLinks: true } },
        movements: { where: { orderId: { not: null } }, select: { id: true } },
      },
    });
    if (!existing) {
      return NextResponse.json({ error: "Bahan tidak ditemukan." }, { status: 404 });
    }
    if (existing._count.menuLinks > 0) {
      return NextResponse.json(
        {
          error: `Bahan "${existing.name}" dipakai resep ${existing._count.menuLinks} menu — hapus dari resepnya dulu, atau cukup nonaktifkan bahan ini.`,
        },
        { status: 400 }
      );
    }
    if (existing.movements.length > 0) {
      return NextResponse.json(
        {
          error: `Bahan "${existing.name}" sudah tercatat dalam ${existing.movements.length} riwayat transaksi pesanan — cukup nonaktifkan saja agar jejak transaksi tetap aman.`,
        },
        { status: 400 }
      );
    }

    const totalMovement = await db.stockMovement.count({ where: { ingredientId: id } });
    await db.ingredient.delete({ where: { id } });
    await logActivity({
      session,
      action: "INGREDIENT_DELETE",
      entity: "Ingredient",
      entityId: id,
      detail: { name: existing.name, unit: existing.unit, movementTerhapus: totalMovement },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/stok DELETE]", e);
    return NextResponse.json({ error: "Gagal menghapus bahan." }, { status: 500 });
  }
}
