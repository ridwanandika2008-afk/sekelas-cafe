/**
 * Parser & validator impor data (Menu / Kategori) — dipakai bersama oleh
 * /api/data/import/validate dan /api/data/import/commit (server WAJIB
 * revalidasi saat commit). Bukan route — hanya modul bantu.
 */
import ExcelJS from "exceljs";

export const IMPORT_MAX_FILE_BYTES = 2 * 1024 * 1024; // 2MB
export const IMPORT_MAX_ROWS = 500;

// ---------- Tipe ----------

export type ImportType = "menu" | "kategori";

/** Baris mentah hasil parsing file: no = nomor baris asli di file. */
export type RawRow = { no: number; values: Record<string, string> };

export type MenuParsed = {
  nama: string;
  kategori: string;
  harga: number;
  deskripsi: string | null;
  status: string; // AVAILABLE | SOLD_OUT | PAUSED | INACTIVE
  unggulan: boolean;
  urutan: number;
};

export type KategoriParsed = {
  nama: string;
  urutan: number;
  diarsipkan: boolean;
};

export type RowValidation<T> = { ok: true; data: T } | { ok: false; errors: string[] };

// ---------- Pemetaan header kolom ----------

/** Header (huruf kecil) → field internal. Kolom tak dikenal diabaikan. */
const HEADER_MAP: Record<string, string> = {
  nama: "nama",
  "nama menu": "nama",
  "nama kategori": "nama",
  kategori: "kategori",
  harga: "harga",
  deskripsi: "deskripsi",
  status: "status",
  unggulan: "unggulan",
  urutan: "urutan",
  diarsipkan: "diarsipkan",
};

export const REQUIRED_HEADERS: Record<ImportType, { field: string; label: string }[]> = {
  menu: [
    { field: "nama", label: "Nama" },
    { field: "kategori", label: "Kategori" },
    { field: "harga", label: "Harga" },
  ],
  kategori: [{ field: "nama", label: "Nama" }],
};

export function headerToField(header: string): string | null {
  // Buang tanda "*" (penanda wajib) & rapikan spasi sebelum mencocokkan.
  const key = header
    .trim()
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\s+/g, " ");
  return HEADER_MAP[key] ?? null;
}

// ---------- Ekstraksi nilai sel Excel ----------

function cellText(v: ExcelJS.CellValue): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v.trim();
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (typeof v === "object") {
    if ("richText" in v && Array.isArray(v.richText)) {
      return v.richText.map((r) => r.text).join("").trim();
    }
    if ("result" in v) return cellText(v.result as ExcelJS.CellValue);
    if ("text" in v) return String(v.text).trim();
    if ("error" in v) return "";
  }
  return String(v).trim();
}

/** Parser CSV kecil: dukung pemisah "," atau ";" (dipilih dari baris header), kutip ganda, CRLF. */
export function parseCsv(text: string): string[][] {
  const t = text.startsWith("\uFEFF") ? text.slice(1) : text;
  const firstBreak = t.indexOf("\n");
  const firstLine = firstBreak === -1 ? t : t.slice(0, firstBreak);
  const sep =
    (firstLine.split(";").length - 1) > (firstLine.split(",").length - 1) ? ";" : ",";

  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (inQuotes) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === sep) {
      row.push(cur);
      cur = "";
    } else if (c === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
    } else if (c !== "\r") {
      cur += c;
    }
  }
  if (cur !== "" || row.length > 0) {
    row.push(cur);
    rows.push(row);
  }
  // Buang baris yang seluruhnya kosong.
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Susun RawRow dari matriks string (CSV) — baris pertama = header. */
export function rawRowsFromMatrix(
  matrix: string[][]
): { rows: RawRow[]; foundFields: Set<string> } {
  const [headerCells, ...dataRows] = matrix;
  if (!headerCells) return { rows: [], foundFields: new Set() };

  const colToField: { col: number; field: string }[] = [];
  headerCells.forEach((h, idx) => {
    const field = headerToField(h);
    if (field) colToField.push({ col: idx, field });
  });

  const rows: RawRow[] = [];
  for (const cells of dataRows) {
    const values: Record<string, string> = {};
    let adaIsi = false;
    for (const { col, field } of colToField) {
      const v = (cells[col] ?? "").trim();
      values[field] = v;
      if (v !== "") adaIsi = true;
    }
    if (adaIsi) rows.push({ no: rows.length + 2, values }); // +2: header = baris 1
  }

  return { rows, foundFields: new Set(colToField.map((c) => c.field)) };
}

/** Baca baris data dari workbook exceljs (sheet pertama, baris 1 = header). */
export function rawRowsFromWorksheet(
  ws: ExcelJS.Worksheet
): { rows: RawRow[]; foundFields: Set<string> } {
  const headerRow = ws.getRow(1);
  const colCount = Math.max(headerRow.cellCount, 1);
  const colToField: { col: number; field: string }[] = [];
  for (let col = 1; col <= colCount; col++) {
    const field = headerToField(cellText(headerRow.getCell(col).value));
    if (field) colToField.push({ col, field });
  }

  const rows: RawRow[] = [];
  for (let rowNumber = 2; rowNumber <= ws.rowCount; rowNumber++) {
    const row = ws.getRow(rowNumber);
    const values: Record<string, string> = {};
    let adaIsi = false;
    for (const { col, field } of colToField) {
      const v = cellText(row.getCell(col).value);
      values[field] = v;
      if (v !== "") adaIsi = true;
    }
    if (adaIsi) rows.push({ no: rowNumber, values });
  }

  return { rows, foundFields: new Set(colToField.map((c) => c.field)) };
}

// ---------- Validasi per baris ----------

const STATUS_LABEL_TO_ENUM: Record<string, string> = {
  tersedia: "AVAILABLE",
  habis: "SOLD_OUT",
  dijeda: "PAUSED",
  "dijeda sementara": "PAUSED",
  "tidak aktif": "INACTIVE",
  // Terima juga nilai enum mentah (payload commit sudah berupa enum).
  available: "AVAILABLE",
  sold_out: "SOLD_OUT",
  paused: "PAUSED",
  inactive: "INACTIVE",
};

function parseYaTidak(v: string): boolean | null {
  const s = v.trim().toLowerCase();
  if (s === "") return false; // default: tidak
  if (["ya", "y", "true", "1", "benar"].includes(s)) return true;
  if (["tidak", "t", "no", "false", "0", "salah"].includes(s)) return false;
  return null; // tidak valid
}

function parseIntStrict(v: string): number | null {
  const s = v.trim().replace(/\s/g, "");
  if (s === "" || !/^-?\d+$/.test(s)) return null;
  return parseInt(s, 10);
}

/** Validasi satu baris Menu. Pesan error spesifik per kolom. */
export function validateMenuRow(values: Record<string, string>): RowValidation<MenuParsed> {
  const errors: string[] = [];

  const nama = (values.nama ?? "").trim();
  if (!nama) errors.push("kolom Nama wajib diisi");

  const kategori = (values.kategori ?? "").trim();
  if (!kategori) errors.push("kolom Kategori wajib diisi");

  const hargaRaw = (values.harga ?? "").trim();
  let harga: number | null = null;
  if (hargaRaw === "") {
    errors.push("kolom Harga wajib diisi");
  } else {
    harga = parseIntStrict(hargaRaw);
    if (harga === null || harga < 0) {
      errors.push(`kolom Harga wajib angka bulat ≥ 0 (ditemukan: "${hargaRaw}")`);
      harga = null;
    }
  }

  const statusRaw = (values.status ?? "").trim();
  let status = "AVAILABLE";
  if (statusRaw !== "") {
    const mapped = STATUS_LABEL_TO_ENUM[statusRaw.toLowerCase()];
    if (!mapped) {
      errors.push(
        `kolom Status tidak valid: "${statusRaw}" — gunakan Tersedia / Habis / Dijeda / Tidak Aktif`
      );
    } else {
      status = mapped;
    }
  }

  const unggulan = parseYaTidak((values.unggulan ?? "").trim());
  if (unggulan === null) {
    errors.push(`kolom Unggulan hanya menerima ya / tidak (ditemukan: "${values.unggulan ?? ""}")`);
  }

  const urutanRaw = (values.urutan ?? "").trim();
  let urutan = 0;
  if (urutanRaw !== "") {
    const parsed = parseIntStrict(urutanRaw);
    if (parsed === null) {
      errors.push(`kolom Urutan wajib angka bulat (ditemukan: "${urutanRaw}")`);
    } else {
      urutan = parsed;
    }
  }

  if (errors.length > 0 || harga === null) {
    return { ok: false, errors };
  }
  return {
    ok: true,
    data: {
      nama,
      kategori,
      harga,
      deskripsi: (values.deskripsi ?? "").trim() || null,
      status,
      unggulan: unggulan === true,
      urutan,
    },
  };
}

/** Validasi satu baris Kategori. */
export function validateKategoriRow(
  values: Record<string, string>
): RowValidation<KategoriParsed> {
  const errors: string[] = [];

  const nama = (values.nama ?? "").trim();
  if (!nama) errors.push("kolom Nama wajib diisi");

  const urutanRaw = (values.urutan ?? "").trim();
  let urutan = 0;
  if (urutanRaw !== "") {
    const parsed = parseIntStrict(urutanRaw);
    if (parsed === null) {
      errors.push(`kolom Urutan wajib angka bulat (ditemukan: "${urutanRaw}")`);
    } else {
      urutan = parsed;
    }
  }

  const diarsipkan = parseYaTidak((values.diarsipkan ?? "").trim());
  if (diarsipkan === null) {
    errors.push(
      `kolom Diarsipkan hanya menerima ya / tidak (ditemukan: "${values.diarsipkan ?? ""}")`
    );
  }

  if (errors.length > 0 || diarsipkan === null) {
    return { ok: false, errors };
  }
  return { ok: true, data: { nama, urutan, diarsipkan: diarsipkan === true } };
}

/** Ubah payload commit (unknown) kembali menjadi Record<string,string> untuk revalidasi. */
export function toStringRecord(row: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (row && typeof row === "object") {
    for (const [k, v] of Object.entries(row as Record<string, unknown>)) {
      out[k] = v === null || v === undefined ? "" : String(v).trim();
    }
  }
  return out;
}
