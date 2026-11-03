import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";
import {
  CHANNEL_LABEL,
  FULFILLMENT_LABEL,
  MENU_STATUS_LABEL,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/constants";
import { formatWibDateTime, wibDateKey, wibDayStartFromKey } from "@/lib/format";

export const dynamic = "force-dynamic";

const MONEY_FMT = "#,##0";

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

function csvEscape(v: string | number | null | undefined): string {
  const s = v === null || v === undefined ? "" : String(v);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

const KEY_RE = /^\d{4}-\d{2}-\d{2}$/;
function validKey(key: string | null): key is string {
  return !!key && KEY_RE.test(key);
}

type TransaksiRow = {
  nomor: string;
  waktu: string;
  channel: string;
  pelanggan: string;
  penerimaan: string;
  item: string;
  subtotal: number;
  diskon: number;
  biayaAntar: number;
  total: number;
  metode: string;
  statusBayar: string;
  status: string;
  kasir: string;
};

const TRX_HEADERS = [
  "Nomor",
  "Waktu (WIB)",
  "Channel",
  "Pelanggan",
  "Penerimaan",
  "Item",
  "Subtotal",
  "Diskon",
  "Biaya Antar",
  "Total",
  "Metode",
  "Status Bayar",
  "Status",
  "Kasir",
];

async function buildTransaksiRows(dari: string, sampai: string): Promise<TransaksiRow[]> {
  const rangeStart = wibDayStartFromKey(dari);
  const rangeEnd = new Date(wibDayStartFromKey(sampai).getTime() + 24 * 3600 * 1000);
  const orders = await db.order.findMany({
    where: { createdAt: { gte: rangeStart, lt: rangeEnd } },
    include: {
      kasir: { select: { name: true } },
      items: { select: { nameSnapshot: true, qty: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { createdAt: "asc" },
  });
  return orders.map((o) => ({
    nomor: o.orderNumber,
    waktu: formatWibDateTime(o.createdAt),
    channel: CHANNEL_LABEL[o.channel] ?? o.channel,
    pelanggan: o.customerName,
    penerimaan: FULFILLMENT_LABEL[o.fulfillment] ?? o.fulfillment,
    item: o.items.map((it) => `${it.qty}× ${it.nameSnapshot}`).join("; "),
    subtotal: o.subtotal,
    diskon: o.discount,
    biayaAntar: o.deliveryFee,
    total: o.total,
    metode: o.paymentMethod ? PAYMENT_METHOD_LABEL[o.paymentMethod] ?? o.paymentMethod : "-",
    statusBayar: PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus,
    status: ORDER_STATUS_LABEL[o.status] ?? o.status,
    kasir: o.kasir?.name ?? "-",
  }));
}

/**
 * GET /api/data/export?type=menu|kategori|transaksi&format=xlsx|csv&dari=&sampai=
 * Unduh data sebagai Excel/CSV. Rentang tanggal hanya berlaku untuk transaksi.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const type = sp.get("type");
  const format = sp.get("format") === "csv" ? "csv" : "xlsx";
  if (type !== "menu" && type !== "kategori" && type !== "transaksi") {
    return NextResponse.json(
      { error: "Jenis ekspor tidak dikenal — gunakan menu, kategori, atau transaksi." },
      { status: 400 }
    );
  }

  try {
    let filename: string;
    let workbook: ExcelJS.Workbook | null = null;
    let csvLines: string[] | null = null;

    if (type === "menu") {
      const menus = await db.menuItem.findMany({
        include: { category: { select: { name: true } } },
        orderBy: [{ category: { name: "asc" } }, { sortOrder: "asc" }, { name: "asc" }],
      });
      const rows = menus.map((m) => ({
        nama: m.name,
        kategori: m.category.name,
        harga: m.price,
        deskripsi: m.description ?? "",
        status: MENU_STATUS_LABEL[m.status] ?? m.status,
        unggulan: m.isFeatured ? "ya" : "tidak",
        urutan: m.sortOrder,
      }));
      filename = `sekelas-cafe-daftar-menu.${format}`;

      if (format === "xlsx") {
        workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet("Menu");
        ws.columns = [
          { header: "Nama", key: "nama", width: 30 },
          { header: "Kategori", key: "kategori", width: 16 },
          { header: "Harga", key: "harga", width: 12 },
          { header: "Deskripsi", key: "deskripsi", width: 40 },
          { header: "Status", key: "status", width: 16 },
          { header: "Unggulan", key: "unggulan", width: 12 },
          { header: "Urutan", key: "urutan", width: 10 },
        ];
        rows.forEach((r) => ws.addRow(r));
        styleHeaderRow(ws);
        ws.getColumn("harga").numFmt = MONEY_FMT;
        autoWidth(ws);
      } else {
        csvLines = [
          "Nama,Kategori,Harga,Deskripsi,Status,Unggulan,Urutan",
          ...rows.map((r) =>
            [r.nama, r.kategori, r.harga, r.deskripsi, r.status, r.unggulan, r.urutan]
              .map(csvEscape)
              .join(",")
          ),
        ];
      }
    } else if (type === "kategori") {
      const cats = await db.category.findMany({
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      });
      const rows = cats.map((c) => ({
        nama: c.name,
        urutan: c.sortOrder,
        diarsipkan: c.isArchived ? "ya" : "tidak",
      }));
      filename = `sekelas-cafe-daftar-kategori.${format}`;

      if (format === "xlsx") {
        workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet("Kategori");
        ws.columns = [
          { header: "Nama", key: "nama", width: 28 },
          { header: "Urutan", key: "urutan", width: 12 },
          { header: "Diarsipkan", key: "diarsipkan", width: 14 },
        ];
        rows.forEach((r) => ws.addRow(r));
        styleHeaderRow(ws);
        autoWidth(ws);
      } else {
        csvLines = [
          "Nama,Urutan,Diarsipkan",
          ...rows.map((r) =>
            [r.nama, r.urutan, r.diarsipkan].map(csvEscape).join(",")
          ),
        ];
      }
    } else {
      // transaksi
      const todayKey = wibDateKey();
      const dari = validKey(sp.get("dari")) ? (sp.get("dari") as string) : todayKey;
      const sampai = validKey(sp.get("sampai")) ? (sp.get("sampai") as string) : todayKey;
      if (dari > sampai) {
        return NextResponse.json(
          { error: "Tanggal mulai tidak boleh melewati tanggal akhir." },
          { status: 400 }
        );
      }
      const rows = await buildTransaksiRows(dari, sampai);
      filename = `sekelas-cafe-transaksi-${dari}-${sampai}.${format}`;

      if (format === "xlsx") {
        workbook = new ExcelJS.Workbook();
        const ws = workbook.addWorksheet("Transaksi");
        ws.columns = TRX_HEADERS.map((h, i) => ({
          header: h,
          key: `c${i}`,
          width: 14,
        }));
        rows.forEach((r) => {
          ws.addRow([
            r.nomor,
            r.waktu,
            r.channel,
            r.pelanggan,
            r.penerimaan,
            r.item,
            r.subtotal,
            r.diskon,
            r.biayaAntar,
            r.total,
            r.metode,
            r.statusBayar,
            r.status,
            r.kasir,
          ]);
        });
        styleHeaderRow(ws);
        // Kolom uang: Subtotal, Diskon, Biaya Antar, Total (kunci c6..c9).
        ["c6", "c7", "c8", "c9"].forEach((key) => {
          ws.getColumn(key).numFmt = MONEY_FMT;
        });
        autoWidth(ws);
      } else {
        csvLines = [
          TRX_HEADERS.join(","),
          ...rows.map((r) =>
            [
              r.nomor,
              r.waktu,
              r.channel,
              r.pelanggan,
              r.penerimaan,
              r.item,
              r.subtotal,
              r.diskon,
              r.biayaAntar,
              r.total,
              r.metode,
              r.statusBayar,
              r.status,
              r.kasir,
            ]
              .map(csvEscape)
              .join(",")
          ),
        ];
      }
    }

    await logActivity({
      session,
      action: "DATA_EXPORT",
      entity: type === "transaksi" ? "Order" : type === "menu" ? "MenuItem" : "Category",
      detail: { jenis: "data", type, format },
    });

    if (format === "csv" && csvLines) {
      return new NextResponse(`\uFEFF${csvLines.join("\r\n")}`, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    if (workbook) {
      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer as ArrayBuffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    }

    return NextResponse.json({ error: "Gagal membuat berkas ekspor." }, { status: 500 });
  } catch (e) {
    console.error("[api/data/export]", e);
    return NextResponse.json(
      { error: "Gagal membuat berkas ekspor. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
