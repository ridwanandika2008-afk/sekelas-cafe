import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";

/**
 * PATCH /api/admin/promo/[id] — ubah field promo / toggle aktif.
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
    const existing = await db.promo.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    }

    // Gabungkan dengan nilai lama agar validasi lintas-field tetap benar
    const merged: Record<string, unknown> = {
      name: body.name !== undefined ? body.name : existing.name,
      type: body.type !== undefined ? body.type : existing.type,
      value: body.value !== undefined ? body.value : existing.value,
      minOrder: body.minOrder !== undefined ? body.minOrder : existing.minOrder,
      startsAt: body.startsAt !== undefined ? body.startsAt : existing.startsAt.toISOString(),
      endsAt: body.endsAt !== undefined ? body.endsAt : existing.endsAt.toISOString(),
    };
    const validated = validateMerge(merged);
    if (validated.error) {
      return NextResponse.json({ error: validated.error }, { status: 400 });
    }

    const data: Record<string, unknown> = {};
    for (const key of ["name", "type", "value", "minOrder"] as const) {
      if (body[key] !== undefined) data[key] = validated.data![key];
    }
    if (body.startsAt !== undefined) data.startsAt = validated.data!.startsAt;
    if (body.endsAt !== undefined) data.endsAt = validated.data!.endsAt;
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan untuk disimpan." }, { status: 400 });
    }

    const promo = await db.promo.update({ where: { id }, data });
    await logActivity({
      session,
      action: "PROMO_UPDATE",
      entity: "Promo",
      entityId: id,
      detail: {
        name: promo.name,
        perubahan: Object.keys(data),
        isActive: promo.isActive,
      },
    });

    return NextResponse.json({ promo });
  } catch (e) {
    console.error("[admin/promo PATCH]", e);
    return NextResponse.json({ error: "Gagal memperbarui promo." }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/promo/[id] — hanya bila belum pernah dipakai order.
 * Promo terpakai ditolak (riwayat order aman karena relasi SetNull,
 * tapi demi kejelasan data promo lama tetap disimpan sebagai nonaktif).
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await db.promo.findUnique({
      where: { id },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Promo tidak ditemukan." }, { status: 404 });
    }
    if (existing._count.orders > 0) {
      return NextResponse.json(
        {
          error: `Promo "${existing.name}" sudah dipakai ${existing._count.orders} transaksi — nonaktifkan saja agar riwayat pesanan tetap lengkap.`,
        },
        { status: 400 }
      );
    }

    await db.promo.delete({ where: { id } });
    await logActivity({
      session,
      action: "PROMO_DELETE",
      entity: "Promo",
      entityId: id,
      detail: {
        name: existing.name,
        type: existing.type,
        value: existing.value,
        usageCount: existing.usageCount,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/promo DELETE]", e);
    return NextResponse.json({ error: "Gagal menghapus promo." }, { status: 500 });
  }
}

/* ---------- helper validasi (versi gabungan, semua field terisi) ---------- */
function validateMerge(merged: Record<string, unknown>) {
  const name = String(merged.name ?? "").trim();
  if (!name) return { error: "Nama promo wajib diisi." };
  if (name.length > 60) return { error: "Nama promo maksimal 60 karakter." };

  const type = String(merged.type ?? "");
  if (!["PERCENT", "NOMINAL"].includes(type))
    return { error: "Jenis promo tidak valid." };

  const value = Number(merged.value);
  if (!Number.isInteger(value)) return { error: "Nilai promo harus angka bulat." };
  if (type === "PERCENT" && (value < 1 || value > 100))
    return { error: "Diskon persen harus di antara 1–100%." };
  if (type === "NOMINAL" && value < 1000)
    return { error: "Potongan nominal minimal Rp1.000." };

  const minOrder = Number(merged.minOrder);
  if (!Number.isInteger(minOrder) || minOrder < 0)
    return { error: "Minimum belanja harus angka ≥ 0." };

  const startsAt = new Date(String(merged.startsAt));
  const endsAt = new Date(String(merged.endsAt));
  if (Number.isNaN(startsAt.getTime())) return { error: "Waktu mulai tidak valid." };
  if (Number.isNaN(endsAt.getTime())) return { error: "Waktu berakhir tidak valid." };
  if (endsAt.getTime() <= startsAt.getTime())
    return { error: "Waktu berakhir harus setelah waktu mulai." };

  return { data: { name, type, value, minOrder, startsAt, endsAt } };
}
