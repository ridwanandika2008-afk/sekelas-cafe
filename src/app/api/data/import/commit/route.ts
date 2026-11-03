import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";
import {
  IMPORT_MAX_ROWS,
  toStringRecord,
  validateKategoriRow,
  validateMenuRow,
  type ImportType,
} from "../helpers";

export const dynamic = "force-dynamic";

/**
 * POST /api/data/import/commit — body { type: "menu"|"kategori", rows: [...] }
 * Server WAJIB revalidasi seluruh baris (jangan percaya hasil client).
 * Menu: upsert by nama (case-insensitive) — menu baru tanpa opsi, menu lama
 * diperbarui field-nya saja (grup opsi & foto tidak disentuh).
 */
export async function POST(req: NextRequest) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  let body: { type?: unknown; rows?: unknown } | null = null;
  try {
    body = (await req.json()) as { type?: unknown; rows?: unknown };
  } catch {
    return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400 });
  }

  const type = body?.type;
  if (type !== "menu" && type !== "kategori") {
    return NextResponse.json(
      { error: "Jenis impor tidak dikenal — gunakan menu atau kategori." },
      { status: 400 }
    );
  }
  const rawRows = body?.rows;
  if (!Array.isArray(rawRows) || rawRows.length === 0) {
    return NextResponse.json(
      { error: "Tidak ada baris data untuk diimpor." },
      { status: 400 }
    );
  }
  if (rawRows.length > IMPORT_MAX_ROWS) {
    return NextResponse.json(
      { error: `Maksimal ${IMPORT_MAX_ROWS} baris per impor.` },
      { status: 400 }
    );
  }

  try {
    let diimpor = 0;
    let diperbarui = 0;
    let dilewati = 0;
    const seenNama = new Set<string>();

    if (type === "menu") {
      const cats = await db.category.findMany({ select: { id: true, name: true } });
      const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c]));
      const menus = await db.menuItem.findMany({ select: { id: true, name: true } });
      const menuByName = new Map(menus.map((m) => [m.name.toLowerCase(), m]));

      for (const raw of rawRows) {
        const values = toStringRecord(raw);
        const res = validateMenuRow(values);
        const errors: string[] = res.ok ? [] : [...res.errors];

        if (res.ok) {
          const key = res.data.nama.toLowerCase();
          if (seenNama.has(key)) {
            errors.push(`Nama "${res.data.nama}" duplikat dalam data impor`);
          } else {
            seenNama.add(key);
          }
          if (!catByName.has(res.data.kategori.toLowerCase())) {
            errors.push(`Kategori "${res.data.kategori}" belum terdaftar`);
          }
        }

        if (!res.ok || errors.length > 0) {
          dilewati += 1;
          continue;
        }

        const kategori = catByName.get(res.data.kategori.toLowerCase())!;
        const existing = menuByName.get(res.data.nama.toLowerCase());
        if (existing) {
          await db.menuItem.update({
            where: { id: existing.id },
            data: {
              categoryId: kategori.id,
              name: res.data.nama,
              description: res.data.deskripsi,
              price: res.data.harga,
              status: res.data.status,
              isFeatured: res.data.unggulan,
              sortOrder: res.data.urutan,
            },
          });
          diperbarui += 1;
        } else {
          const created = await db.menuItem.create({
            data: {
              categoryId: kategori.id,
              name: res.data.nama,
              description: res.data.deskripsi,
              price: res.data.harga,
              status: res.data.status,
              isFeatured: res.data.unggulan,
              sortOrder: res.data.urutan,
            },
            select: { id: true, name: true },
          });
          menuByName.set(created.name.toLowerCase(), created);
          diimpor += 1;
        }
      }

      await logActivity({
        session,
        action: "DATA_IMPORT",
        entity: "MenuItem",
        detail: { type, diimpor, diperbarui, dilewati },
      });
    } else {
      const cats = await db.category.findMany({ select: { id: true, name: true } });
      const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c]));

      for (const raw of rawRows) {
        const values = toStringRecord(raw);
        const res = validateKategoriRow(values);
        const errors: string[] = res.ok ? [] : [...res.errors];

        if (res.ok) {
          const key = res.data.nama.toLowerCase();
          if (seenNama.has(key)) {
            errors.push(`Nama "${res.data.nama}" duplikat dalam data impor`);
          } else {
            seenNama.add(key);
          }
        }

        if (!res.ok || errors.length > 0) {
          dilewati += 1;
          continue;
        }

        const existing = catByName.get(res.data.nama.toLowerCase());
        if (existing) {
          await db.category.update({
            where: { id: existing.id },
            data: {
              name: res.data.nama,
              sortOrder: res.data.urutan,
              isArchived: res.data.diarsipkan,
            },
          });
          diperbarui += 1;
        } else {
          const created = await db.category.create({
            data: {
              name: res.data.nama,
              sortOrder: res.data.urutan,
              isArchived: res.data.diarsipkan,
            },
            select: { id: true, name: true },
          });
          catByName.set(created.name.toLowerCase(), created);
          diimpor += 1;
        }
      }

      await logActivity({
        session,
        action: "DATA_IMPORT",
        entity: "Category",
        detail: { type, diimpor, diperbarui, dilewati },
      });
    }

    return NextResponse.json({
      diimpor,
      diperbarui,
      dilewati,
      total: rawRows.length,
    });
  } catch (e) {
    console.error("[api/data/import/commit]", e);
    return NextResponse.json(
      { error: "Gagal menyimpan data impor. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
