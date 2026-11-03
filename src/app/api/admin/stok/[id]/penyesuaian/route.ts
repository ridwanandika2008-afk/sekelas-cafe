import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";

/**
 * POST /api/admin/stok/[id]/penyesuaian — catat penyesuaian stok bahan.
 * IN = tambah, OUT = pemakaian manual (boleh minus), ADJUST = SET nilai absolut baru.
 * Selalu membentuk StockMovement + memperbarui stok dalam satu transaksi.
 */
export async function POST(
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

  const type = String(body.type ?? "");
  const amount = Number(body.amount);
  const note = String(body.note ?? "").trim();

  if (!["IN", "OUT", "ADJUST"].includes(type)) {
    return NextResponse.json(
      { error: "Jenis penyesuaian harus Stok Masuk, Pemakaian Manual, atau Set Ulang." },
      { status: 400 }
    );
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Jumlah harus angka lebih dari 0." }, { status: 400 });
  }
  if (!note) {
    return NextResponse.json(
      { error: "Catatan wajib diisi agar penyesuaian punya jejak yang jelas." },
      { status: 400 }
    );
  }

  try {
    const result = await db.$transaction(async (tx) => {
      const existing = await tx.ingredient.findUnique({ where: { id } });
      if (!existing) return { notFound: true as const };

      const rounded = Math.round(amount * 1000) / 1000;
      const before = existing.stock;
      const after =
        type === "IN" ? before + rounded : type === "OUT" ? before - rounded : rounded;

      await tx.ingredient.update({ where: { id }, data: { stock: after } });
      await tx.stockMovement.create({
        data: {
          ingredientId: id,
          type,
          amount: rounded,
          note: note.slice(0, 200),
          userId: session.userId,
        },
      });
      return { notFound: false as const, before, after };
    });

    if (result.notFound) {
      return NextResponse.json({ error: "Bahan tidak ditemukan." }, { status: 404 });
    }

    const updated = await db.ingredient.findUnique({ where: { id } });
    await logActivity({
      session,
      action: "STOCK_ADJUST",
      entity: "Ingredient",
      entityId: id,
      detail: {
        name: updated?.name,
        type,
        amount,
        sebelum: Math.round(result.before * 1000) / 1000,
        sesudah: Math.round(result.after * 1000) / 1000,
        catatan: note.slice(0, 200),
      },
    });

    const warnings: string[] = [];
    if (updated && result.after < updated.minStock) {
      warnings.push(
        `Stok ${updated.name} (${result.after} ${updated.unit}) di bawah batas minimum ${updated.minStock} ${updated.unit} — segera restock.`
      );
    }
    if (result.after < 0) {
      warnings.push("Stok bernilai minus — cocokkan ulang dengan stok fisik lewat Set Ulang Nilai.");
    }

    return NextResponse.json({ ingredient: updated, warnings });
  } catch (e) {
    console.error("[admin/stok penyesuaian POST]", e);
    return NextResponse.json({ error: "Gagal menyimpan penyesuaian." }, { status: 500 });
  }
}
