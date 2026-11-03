import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { MENU_STATUS_LABEL } from "@/lib/constants";
import {
  IMPORT_MAX_FILE_BYTES,
  IMPORT_MAX_ROWS,
  REQUIRED_HEADERS,
  parseCsv,
  rawRowsFromMatrix,
  rawRowsFromWorksheet,
  validateKategoriRow,
  validateMenuRow,
  type ImportType,
  type MenuParsed,
  type KategoriParsed,
} from "../helpers";

export const dynamic = "force-dynamic";

type PreviewBaris = {
  no: number;
  data: Record<string, string>;
  status: "ok" | "error";
  pesanError: string | null;
  payload?: MenuParsed | KategoriParsed;
};

/**
 * POST /api/data/import/validate — multipart "file" + "type" (menu|kategori).
 * Memvalidasi berkas impor tanpa menulis ke DB; mengembalikan pratinjau per baris.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Permintaan tidak valid — unggah berkas dengan form data." },
      { status: 400 }
    );
  }

  const type = String(form.get("type") ?? "");
  if (type !== "menu" && type !== "kategori") {
    return NextResponse.json(
      { error: "Jenis impor tidak dikenal — gunakan menu atau kategori." },
      { status: 400 }
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Berkas wajib diunggah." }, { status: 400 });
  }
  if (file.size > IMPORT_MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: "Ukuran berkas melebihi batas 2MB." },
      { status: 400 }
    );
  }
  const lowerName = file.name.toLowerCase();
  if (!lowerName.endsWith(".xlsx") && !lowerName.endsWith(".csv")) {
    return NextResponse.json(
      { error: "Format berkas harus .xlsx atau .csv sesuai template." },
      { status: 400 }
    );
  }

  // ---- Parsing berkas → baris mentah ----
  let rows: Awaited<ReturnType<typeof rawRowsFromWorksheet>>["rows"];
  let foundFields: Set<string>;
  try {
    if (lowerName.endsWith(".csv")) {
      const matrix = parseCsv(await file.text());
      const parsed = rawRowsFromMatrix(matrix);
      rows = parsed.rows;
      foundFields = parsed.foundFields;
    } else {
      const wb = new ExcelJS.Workbook();
      await wb.xlsx.load(await file.arrayBuffer());
      const ws = wb.worksheets[0];
      if (!ws) throw new Error("worksheet kosong");
      const parsed = rawRowsFromWorksheet(ws);
      rows = parsed.rows;
      foundFields = parsed.foundFields;
    }
  } catch (e) {
    console.error("[api/data/import/validate] parse gagal:", e);
    return NextResponse.json(
      { error: "File tidak dapat dibaca — pastikan format .xlsx/.csv sesuai template." },
      { status: 400 }
    );
  }

  const wajib = REQUIRED_HEADERS[type as ImportType].filter((h) => !foundFields.has(h.field));
  if (wajib.length > 0) {
    return NextResponse.json(
      {
        error: `Kolom wajib tidak ditemukan: ${wajib
          .map((h) => h.label)
          .join(", ")} — unduh dan ikuti template yang tersedia.`,
      },
      { status: 400 }
    );
  }
  if (rows.length === 0) {
    return NextResponse.json(
      { error: "Berkas tidak berisi baris data — isi sesuai template lalu unggah lagi." },
      { status: 400 }
    );
  }
  if (rows.length > IMPORT_MAX_ROWS) {
    return NextResponse.json(
      { error: `Berkas berisi ${rows.length} baris data — batas maksimal ${IMPORT_MAX_ROWS} baris.` },
      { status: 400 }
    );
  }

  // ---- Validasi tiap baris ----
  const catSet =
    type === "menu"
      ? new Set(
          (await db.category.findMany({ select: { name: true } })).map((c) =>
            c.name.toLowerCase()
          )
        )
      : null;

  const seenNama = new Map<string, number>(); // nama (lowercase) → no baris pertama
  const baris: PreviewBaris[] = [];
  let valid = 0;
  let bermasalah = 0;

  for (const row of rows) {
    const errors: string[] = [];

    if (type === "menu") {
      const res = validateMenuRow(row.values);
      if (res.ok) {
        const key = res.data.nama.toLowerCase();
        const pertama = seenNama.get(key);
        if (pertama !== undefined) {
          errors.push(`Nama "${res.data.nama}" duplikat — sama dengan baris ${pertama}`);
        } else {
          seenNama.set(key, row.no);
        }
        if (catSet && !catSet.has(res.data.kategori.toLowerCase())) {
          errors.push(
            `Kategori "${res.data.kategori}" belum terdaftar — buat dulu di menu Kategori`
          );
        }
        if (errors.length === 0) {
          valid += 1;
          baris.push({
            no: row.no,
            data: {
              nama: res.data.nama,
              kategori: res.data.kategori,
              harga: String(res.data.harga),
              deskripsi: res.data.deskripsi ?? "",
              status: MENU_STATUS_LABEL[res.data.status] ?? res.data.status,
              unggulan: res.data.unggulan ? "ya" : "tidak",
              urutan: String(res.data.urutan),
            },
            status: "ok",
            pesanError: null,
            payload: res.data,
          });
          continue;
        }
      } else {
        errors.push(...res.errors);
      }
      baris.push({
        no: row.no,
        data: {
          nama: row.values.nama ?? "",
          kategori: row.values.kategori ?? "",
          harga: row.values.harga ?? "",
          deskripsi: row.values.deskripsi ?? "",
          status: row.values.status ?? "",
          unggulan: row.values.unggulan ?? "",
          urutan: row.values.urutan ?? "",
        },
        status: "error",
        pesanError: `Baris ${row.no}: ${errors.join("; ")}`,
      });
      bermasalah += 1;
    } else {
      const res = validateKategoriRow(row.values);
      if (res.ok) {
        const key = res.data.nama.toLowerCase();
        const pertama = seenNama.get(key);
        if (pertama !== undefined) {
          errors.push(`Nama "${res.data.nama}" duplikat — sama dengan baris ${pertama}`);
        } else {
          seenNama.set(key, row.no);
        }
        if (errors.length === 0) {
          valid += 1;
          baris.push({
            no: row.no,
            data: {
              nama: res.data.nama,
              urutan: String(res.data.urutan),
              diarsipkan: res.data.diarsipkan ? "ya" : "tidak",
            },
            status: "ok",
            pesanError: null,
            payload: res.data,
          });
          continue;
        }
      } else {
        errors.push(...res.errors);
      }
      baris.push({
        no: row.no,
        data: {
          nama: row.values.nama ?? "",
          urutan: row.values.urutan ?? "",
          diarsipkan: row.values.diarsipkan ?? "",
        },
        status: "error",
        pesanError: `Baris ${row.no}: ${errors.join("; ")}`,
      });
      bermasalah += 1;
    }
  }

  const ringkasan =
    bermasalah === 0
      ? `Semua ${valid} baris valid dan siap diimpor.`
      : `${valid} baris valid, ${bermasalah} baris bermasalah — periksa baris bertanda merah sebelum melanjutkan.`;

  return NextResponse.json({
    totalBaris: rows.length,
    valid,
    bermasalah,
    baris,
    ringkasan,
  });
}
