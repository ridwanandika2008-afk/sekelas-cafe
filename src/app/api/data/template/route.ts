import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireApiRole } from "@/lib/api-guard";

export const dynamic = "force-dynamic";

function styleHeaderRow(ws: ExcelJS.Worksheet) {
  const header = ws.getRow(1);
  header.font = { bold: true, color: { argb: "FF3D2C12" }, size: 11 };
  header.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFEFE4D3" },
  };
  header.alignment = { vertical: "middle" };
  header.height = 20;
}

function autoWidth(ws: ExcelJS.Worksheet, minWidth = 10, maxWidth = 64) {
  ws.columns?.forEach((col) => {
    let max = minWidth;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, maxWidth);
  });
}

function addPetunjukSheet(wb: ExcelJS.Workbook, rows: [string, string][]) {
  const ws = wb.addWorksheet("Petunjuk");
  ws.columns = [
    { header: "Hal", key: "hal", width: 20 },
    { header: "Keterangan", key: "ket", width: 80 },
  ];
  rows.forEach(([hal, ket]) => ws.addRow({ hal, ket }));
  styleHeaderRow(ws);
  ws.getColumn("ket").alignment = { wrapText: true, vertical: "top" };
  autoWidth(ws, 10, 96);
}

/**
 * GET /api/data/template?type=menu|kategori
 * Template impor xlsx: sheet data (header + 2 baris contoh) + sheet "Petunjuk".
 */
export async function GET(req: NextRequest) {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const type = req.nextUrl.searchParams.get("type");
  if (type !== "menu" && type !== "kategori") {
    return NextResponse.json(
      { error: "Jenis template tidak dikenal — gunakan menu atau kategori." },
      { status: 400 }
    );
  }

  try {
    const wb = new ExcelJS.Workbook();
    wb.creator = "Sekelas Cafe";

    if (type === "menu") {
      const ws = wb.addWorksheet("Menu");
      ws.columns = [
        { header: "Nama*", key: "nama", width: 28 },
        { header: "Kategori*", key: "kategori", width: 16 },
        { header: "Harga*", key: "harga", width: 12 },
        { header: "Deskripsi", key: "deskripsi", width: 40 },
        { header: "Status", key: "status", width: 14 },
        { header: "Unggulan", key: "unggulan", width: 12 },
        { header: "Urutan", key: "urutan", width: 10 },
      ];
      ws.addRow({
        nama: "Es Kopi Susu Contoh",
        kategori: "Kopi",
        harga: 8000,
        deskripsi: "Kopi susu segar dengan gula aren asli (contoh — ganti dengan data Anda).",
        status: "Tersedia",
        unggulan: "ya",
        urutan: 1,
      });
      ws.addRow({
        nama: "Roti Bakar Contoh",
        kategori: "Makanan",
        harga: 10000,
        deskripsi: "Roti bakar mentega dengan lelehan cokelat (contoh — ganti dengan data Anda).",
        status: "Habis",
        unggulan: "tidak",
        urutan: 2,
      });
      styleHeaderRow(ws);
      autoWidth(ws);

      addPetunjukSheet(wb, [
        ["Cara pakai", "Isi sheet Menu, lalu unggah di halaman Import Data. Dua baris pertama adalah contoh — ganti dengan data Anda."],
        ["Nama*", "Wajib. Nama menu; tidak boleh duplikat di dalam file (pencocokan mengabaikan huruf besar/kecil)."],
        ["Kategori*", "Wajib. Harus sudah terdaftar di menu Kategori (huruf besar/kecil diabaikan)."],
        ["Harga*", "Wajib. Angka bulat Rupiah ≥ 0 tanpa titik/koma — contoh: 8000."],
        ["Deskripsi", "Opsional. Keterangan singkat menu."],
        ["Status", "Opsional. Salah satu: Tersedia / Habis / Dijeda / Tidak Aktif. Kosong = Tersedia."],
        ["Unggulan", "Opsional. ya / tidak. Kosong = tidak."],
        ["Urutan", "Opsional. Angka urutan tampil. Kosong = 0."],
        ["Impor", "Menu yang sudah ada (nama sama) akan diperbarui — grup opsi & foto tidak diubah. Menu baru dibuat tanpa opsi."],
        ["Batas", "Maksimal 500 baris data & ukuran file 2MB. Format .xlsx atau .csv."],
      ]);
    } else {
      const ws = wb.addWorksheet("Kategori");
      ws.columns = [
        { header: "Nama*", key: "nama", width: 28 },
        { header: "Urutan", key: "urutan", width: 12 },
        { header: "Diarsipkan", key: "diarsipkan", width: 14 },
      ];
      ws.addRow({ nama: "Minuman Dingin", urutan: 1, diarsipkan: "tidak" });
      ws.addRow({ nama: "Camilan", urutan: 2, diarsipkan: "tidak" });
      styleHeaderRow(ws);
      autoWidth(ws);

      addPetunjukSheet(wb, [
        ["Cara pakai", "Isi sheet Kategori, lalu unggah di halaman Import Data. Dua baris pertama adalah contoh — ganti dengan data Anda."],
        ["Nama*", "Wajib. Nama kategori."],
        ["Urutan", "Opsional. Angka urutan tampil. Kosong = 0."],
        ["Diarsipkan", "Opsional. ya / tidak. Kosong = tidak. Kategori terarsip disembunyikan dari daftar pembeli."],
        ["Impor", "Kategori yang sudah ada (nama sama, huruf besar/kecil diabaikan) akan diperbarui."],
        ["Batas", "Maksimal 500 baris data & ukuran file 2MB. Format .xlsx atau .csv."],
      ]);
    }

    const buffer = await wb.xlsx.writeBuffer();
    const filename = `template-import-${type}.xlsx`;
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("[api/data/template]", e);
    return NextResponse.json(
      { error: "Gagal membuat berkas template. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
