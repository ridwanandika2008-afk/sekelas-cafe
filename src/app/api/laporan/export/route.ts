import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";
import { formatWibDateTime } from "@/lib/format";
import { computeLaporan, parseRange, type LaporanData } from "../helpers";

export const dynamic = "force-dynamic";

const MONEY_FMT = "#,##0";

/** Header tebal + isian hangat + baris pertama dibekukan. */
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
  ws.views = [{ state: "frozen", ySplit: 1 }];
}

/** Lebar kolom otomatis dari isi terpanjang. */
function autoWidth(ws: ExcelJS.Worksheet, minWidth = 10, maxWidth = 60) {
  ws.columns?.forEach((col) => {
    let max = minWidth;
    col.eachCell?.({ includeEmpty: true }, (cell) => {
      const len = String(cell.value ?? "").length;
      if (len > max) max = len;
    });
    col.width = Math.min(max + 2, maxWidth);
  });
}

function buildWorkbook(data: LaporanData): ExcelJS.Workbook {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Sekelas Cafe";
  const { ringkasan } = data;

  // ---- Sheet Ringkasan ----
  const wsRingkasan = wb.addWorksheet("Ringkasan");
  wsRingkasan.columns = [
    { header: "Metrik", key: "metrik", width: 28 },
    { header: "Nilai", key: "nilai", width: 20 },
  ];
  const metrikRows: [string, string | number][] = [
    ["Periode", `${data.dari} s/d ${data.sampai}`],
    ["Dibuat", `${formatWibDateTime(new Date())} WIB`],
    ["Total Pendapatan", ringkasan.totalPendapatan],
    ["Jumlah Pesanan", ringkasan.jumlahPesanan],
    ["Total Tunai", ringkasan.totalTunai],
    ["Total QRIS", ringkasan.totalQris],
    ["Rata-rata per Pesanan", ringkasan.rataRataPerPesanan],
    ["Total Biaya Antar", ringkasan.totalBiayaAntar],
    ["Total Diskon", ringkasan.totalDiskon],
    ["Jumlah Pembatalan", ringkasan.jumlahPembatalan],
    ["Total Nilai Dibatalkan", ringkasan.totalDibatalkan],
  ];
  metrikRows.forEach(([metrik, nilai]) => {
    wsRingkasan.addRow({ metrik, nilai });
  });
  styleHeaderRow(wsRingkasan);
  // Baris numerik diberi format rupiah.
  wsRingkasan.eachRow((row, rowNumber) => {
    if (rowNumber > 1 && typeof row.getCell(2).value === "number") {
      row.getCell(2).numFmt = MONEY_FMT;
    }
  });
  autoWidth(wsRingkasan);

  // ---- Sheet Per Hari ----
  const wsHari = wb.addWorksheet("Per Hari");
  wsHari.columns = [
    { header: "Tanggal", key: "tanggal", width: 14 },
    { header: "Pendapatan", key: "pendapatan", width: 16 },
    { header: "Jumlah Pesanan", key: "jumlahPesanan", width: 16 },
  ];
  data.perHari.forEach((h) =>
    wsHari.addRow({ tanggal: h.tanggal, pendapatan: h.pendapatan, jumlahPesanan: h.jumlahPesanan })
  );
  styleHeaderRow(wsHari);
  wsHari.getColumn("pendapatan").numFmt = MONEY_FMT;
  autoWidth(wsHari);

  // ---- Sheet Menu Terlaris ----
  const wsMenu = wb.addWorksheet("Menu Terlaris");
  wsMenu.columns = [
    { header: "Peringkat", key: "rank", width: 12 },
    { header: "Nama Menu", key: "nama", width: 34 },
    { header: "Qty Terjual", key: "qty", width: 14 },
    { header: "Pendapatan", key: "pendapatan", width: 16 },
  ];
  data.menuTerlaris.forEach((m, i) =>
    wsMenu.addRow({ rank: i + 1, nama: m.nama, qty: m.qty, pendapatan: m.pendapatan })
  );
  styleHeaderRow(wsMenu);
  wsMenu.getColumn("pendapatan").numFmt = MONEY_FMT;
  autoWidth(wsMenu);

  // ---- Sheet Kasir ----
  const wsKasir = wb.addWorksheet("Kasir");
  wsKasir.columns = [
    { header: "Nama Kasir", key: "nama", width: 24 },
    { header: "Jumlah Transaksi", key: "jumlahTransaksi", width: 18 },
    { header: "Tunai", key: "tunai", width: 16 },
    { header: "QRIS", key: "qris", width: 16 },
    { header: "Total", key: "total", width: 16 },
  ];
  data.perKasir.forEach((k) =>
    wsKasir.addRow({
      nama: k.nama,
      jumlahTransaksi: k.jumlahTransaksi,
      tunai: k.tunai,
      qris: k.qris,
      total: k.total,
    })
  );
  styleHeaderRow(wsKasir);
  ["tunai", "qris", "total"].forEach((key) => {
    wsKasir.getColumn(key).numFmt = MONEY_FMT;
  });
  autoWidth(wsKasir);

  return wb;
}

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** CSV hanya berisi ringkasan + per hari. */
function buildCsv(data: LaporanData): string {
  const lines: string[] = [];
  const { ringkasan } = data;
  lines.push("LAPORAN SEKELAS CAFE");
  lines.push(`Periode,${csvEscape(`${data.dari} s/d ${data.sampai}`)}`);
  lines.push("");
  lines.push("RINGKASAN");
  lines.push("Metrik,Nilai");
  lines.push(`Total Pendapatan,${ringkasan.totalPendapatan}`);
  lines.push(`Jumlah Pesanan,${ringkasan.jumlahPesanan}`);
  lines.push(`Total Tunai,${ringkasan.totalTunai}`);
  lines.push(`Total QRIS,${ringkasan.totalQris}`);
  lines.push(`Rata-rata per Pesanan,${ringkasan.rataRataPerPesanan}`);
  lines.push(`Total Biaya Antar,${ringkasan.totalBiayaAntar}`);
  lines.push(`Total Diskon,${ringkasan.totalDiskon}`);
  lines.push(`Jumlah Pembatalan,${ringkasan.jumlahPembatalan}`);
  lines.push(`Total Nilai Dibatalkan,${ringkasan.totalDibatalkan}`);
  lines.push("");
  lines.push("PER HARI");
  lines.push("Tanggal,Pendapatan,Jumlah Pesanan");
  data.perHari.forEach((h) => {
    lines.push(`${h.tanggal},${h.pendapatan},${h.jumlahPesanan}`);
  });
  return lines.join("\r\n");
}

/**
 * GET /api/laporan/export?dari=&sampai=&format=xlsx|csv
 * Unduh laporan sebagai file (Content-Disposition: attachment).
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const format = sp.get("format") === "csv" ? "csv" : "xlsx";
  const range = parseRange(sp.get("dari"), sp.get("sampai"));
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  try {
    const data = await computeLaporan(range.dari, range.sampai);
    const filename = `laporan-sekelas-cafe-${data.dari}-${data.sampai}.${format}`;

    await logActivity({
      session,
      action: "DATA_EXPORT",
      entity: "Laporan",
      detail: { format, dari: data.dari, sampai: data.sampai },
    });

    if (format === "csv") {
      // BOM agar Excel membaca UTF-8 dengan benar.
      return new NextResponse(`\uFEFF${buildCsv(data)}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    const wb = buildWorkbook(data);
    const buffer = await wb.xlsx.writeBuffer();
    return new NextResponse(buffer as ArrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (e) {
    console.error("[api/laporan/export]", e);
    return NextResponse.json(
      { error: "Gagal membuat berkas laporan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
