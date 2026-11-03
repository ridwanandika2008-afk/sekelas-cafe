import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Promo aktif untuk checkout pembeli (scope ALL, sedang berlaku) */
export async function GET() {
  const now = new Date();
  const promos = await db.promo.findMany({
    where: {
      isActive: true,
      scope: "ALL",
      startsAt: { lte: now },
      endsAt: { gte: now },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      type: true,
      value: true,
      minOrder: true,
      startsAt: true,
      endsAt: true,
    },
  });
  return NextResponse.json({ promos });
}
