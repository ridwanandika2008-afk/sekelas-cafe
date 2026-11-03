import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";

export const dynamic = "force-dynamic";

/** Validasi input promo lengkap (dipakai saat membuat promo baru) */
function validatePromoInput(body: Record<string, unknown>) {
  const name = String(body.name ?? "").trim();
  if (!name) return { error: "Nama promo wajib diisi." } as const;
  if (name.length > 60) return { error: "Nama promo maksimal 60 karakter." } as const;

  const type = String(body.type ?? "");
  if (!["PERCENT", "NOMINAL"].includes(type))
    return { error: "Jenis promo harus Diskon Persen atau Potongan Nominal." } as const;

  const value = Number(body.value);
  if (!Number.isInteger(value)) return { error: "Nilai promo harus angka bulat." } as const;
  if (type === "PERCENT" && (value < 1 || value > 100))
    return { error: "Diskon persen harus di antara 1–100%." } as const;
  if (type === "NOMINAL" && value < 1000)
    return { error: "Potongan nominal minimal Rp1.000." } as const;

  const minOrder = Number(body.minOrder ?? 0);
  if (!Number.isInteger(minOrder) || minOrder < 0)
    return { error: "Minimum belanja harus angka ≥ 0." } as const;

  const startsAt = new Date(String(body.startsAt ?? ""));
  const endsAt = new Date(String(body.endsAt ?? ""));
  if (Number.isNaN(startsAt.getTime())) return { error: "Waktu mulai tidak valid." } as const;
  if (Number.isNaN(endsAt.getTime())) return { error: "Waktu berakhir tidak valid." } as const;
  if (endsAt.getTime() <= startsAt.getTime())
    return { error: "Waktu berakhir harus setelah waktu mulai." } as const;

  return {
    data: {
      name,
      type: type as "PERCENT" | "NOMINAL",
      value,
      minOrder,
      startsAt,
      endsAt,
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    },
  } as const;
}

/**
 * GET /api/admin/promo — semua promo + jumlah pesanan pemakai.
 */
export async function GET() {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  try {
    const promos = await db.promo.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { orders: true } } },
    });
    return NextResponse.json({
      promos: promos.map((p) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        value: p.value,
        scope: p.scope,
        minOrder: p.minOrder,
        startsAt: p.startsAt,
        endsAt: p.endsAt,
        isActive: p.isActive,
        usageCount: p.usageCount,
        createdAt: p.createdAt,
        orders: p._count.orders,
      })),
    });
  } catch (e) {
    console.error("[admin/promo GET]", e);
    return NextResponse.json({ error: "Gagal memuat promo." }, { status: 500 });
  }
}

/**
 * POST /api/admin/promo — buat promo (scope ALL untuk seluruh pesanan).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const validated = validatePromoInput(body as Record<string, unknown>);
  if ("error" in validated) {
    return NextResponse.json({ error: validated.error }, { status: 400 });
  }

  try {
    const promo = await db.promo.create({
      data: {
        name: validated.data.name,
        type: validated.data.type,
        value: validated.data.value,
        scope: "ALL",
        minOrder: validated.data.minOrder,
        startsAt: validated.data.startsAt,
        endsAt: validated.data.endsAt,
        isActive: validated.data.isActive,
      },
    });
    await logActivity({
      session,
      action: "PROMO_CREATE",
      entity: "Promo",
      entityId: promo.id,
      detail: {
        name: promo.name,
        type: promo.type,
        value: promo.value,
        minOrder: promo.minOrder,
        startsAt: promo.startsAt,
        endsAt: promo.endsAt,
      },
    });
    return NextResponse.json({ promo }, { status: 201 });
  } catch (e) {
    console.error("[admin/promo POST]", e);
    return NextResponse.json({ error: "Gagal membuat promo." }, { status: 500 });
  }
}
