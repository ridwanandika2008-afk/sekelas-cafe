import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { VISIBLE_MENU_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

/** Daftar menu publik: kategori aktif + menu yang terlihat (termasuk habis/dijeda) */
export async function GET() {
  const [categories, items] = await Promise.all([
    db.category.findMany({
      where: { isArchived: false },
      orderBy: { sortOrder: "asc" },
      select: { id: true, name: true },
    }),
    db.menuItem.findMany({
      where: { isArchived: false, status: { in: VISIBLE_MENU_STATUSES } },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: {
        id: true,
        categoryId: true,
        name: true,
        description: true,
        imageUrl: true,
        price: true,
        status: true,
        isFeatured: true,
        optionGroups: {
          orderBy: { sortOrder: "asc" },
          select: {
            id: true,
            name: true,
            isRequired: true,
            maxSelect: true,
            options: {
              orderBy: { sortOrder: "asc" },
              select: {
                id: true,
                name: true,
                priceDelta: true,
                isAvailable: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return NextResponse.json({ categories, items });
}
