import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { wibDayStartFromKey } from "@/lib/format";
import type { Prisma } from "@prisma/client";

/**
 * GET /api/admin/aktivitas? action=&q=&dari=&sampai=&page=&limit=
 * Filter aksi (pilih dari daftar unik), pencarian nama pelaku / nomor entity,
 * rentang tanggal WIB, pagination offset (default 30), urut terbaru.
 */
export async function GET(req: NextRequest) {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const url = new URL(req.url);
  const action = url.searchParams.get("action")?.trim() || "";
  const q = url.searchParams.get("q")?.trim() || "";
  const dari = url.searchParams.get("dari")?.trim() || "";
  const sampai = url.searchParams.get("sampai")?.trim() || "";
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "30", 10) || 30));

  const where: Prisma.ActivityLogWhereInput = {};
  if (action) where.action = action;
  if (q) {
    where.OR = [
      { actorName: { contains: q, mode: "insensitive" } },
      { entityId: { contains: q, mode: "insensitive" } },
    ];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(dari) || /^\d{4}-\d{2}-\d{2}$/.test(sampai)) {
    where.createdAt = {};
    if (/^\d{4}-\d{2}-\d{2}$/.test(dari)) {
      where.createdAt.gte = wibDayStartFromKey(dari);
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(sampai)) {
      // sampai akhir hari (eksklusif +24 jam)
      where.createdAt.lt = new Date(wibDayStartFromKey(sampai).getTime() + 24 * 3600 * 1000);
    }
  }

  try {
    const [logs, total, actionRows] = await Promise.all([
      db.activityLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          actorName: true,
          role: true,
          action: true,
          entity: true,
          entityId: true,
          detail: true,
          createdAt: true,
        },
      }),
      db.activityLog.count({ where }),
      db.activityLog.findMany({
        distinct: ["action"],
        select: { action: true },
        orderBy: { action: "asc" },
      }),
    ]);

    return NextResponse.json({
      logs,
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
      actions: actionRows.map((a) => a.action),
    });
  } catch (e) {
    console.error("[admin/aktivitas]", e);
    return NextResponse.json({ error: "Gagal memuat riwayat aktivitas." }, { status: 500 });
  }
}
