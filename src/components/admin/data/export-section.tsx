"use client";

/**
 * Kartu Export Data — unduh daftar menu, kategori, dan transaksi
 * dalam format Excel (xlsx) / CSV.
 */
import { useState } from "react";
import {
  Coffee,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  ReceiptText,
  Tags,
} from "lucide-react";
import { toast } from "sonner";
import { wibDateKey } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadFile } from "./types";

type ExportKey = "menu" | "kategori" | "transaksi";

export function ExportSection() {
  const today = wibDateKey();
  const [trxFormat, setTrxFormat] = useState<"xlsx" | "csv">("xlsx");
  const [trxDari, setTrxDari] = useState(today);
  const [trxSampai, setTrxSampai] = useState(today);
  const [sedangUnduh, setSedangUnduh] = useState<ExportKey | null>(null);

  const rentangValid = trxDari !== "" && trxSampai !== "" && trxDari <= trxSampai;

  const unduh = async (key: ExportKey, url: string, fallback: string) => {
    if (key === "transaksi" && !rentangValid) {
      toast.error("Perbaiki rentang tanggal transaksi terlebih dahulu.");
      return;
    }
    setSedangUnduh(key);
    try {
      await downloadFile(url, fallback);
      toast.success("Berkas berhasil diunduh.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh berkas.");
    } finally {
      setSedangUnduh(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Download className="h-5 w-5 text-primary" aria-hidden />
          Export Data
        </CardTitle>
        <CardDescription>
          Unduh data Sekelas Cafe sebagai berkas Excel (xlsx) atau CSV untuk diarsipkan
          atau diolah lebih lanjut.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Daftar Menu */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-[#5a4326] dark:text-gold">
              <Coffee className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-medium">Daftar Menu</p>
              <p className="text-xs text-muted-foreground">
                Seluruh menu beserta kategori, harga, status, dan urutan — siap diimpor
                ulang (format .xlsx).
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-10 shrink-0"
            onClick={() => void unduh("menu", "/api/data/export?type=menu&format=xlsx", "sekelas-cafe-daftar-menu.xlsx")}
            disabled={sedangUnduh !== null}
          >
            {sedangUnduh === "menu" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
            )}
            Unduh Excel
          </Button>
        </div>

        {/* Daftar Kategori */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
          <div className="flex min-w-0 items-start gap-3">
            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-[#5a4326] dark:text-gold">
              <Tags className="h-4.5 w-4.5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className="font-medium">Daftar Kategori</p>
              <p className="text-xs text-muted-foreground">
                Seluruh kategori menu beserta urutan &amp; status arsip (format .xlsx).
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="h-10 shrink-0"
            onClick={() =>
              void unduh(
                "kategori",
                "/api/data/export?type=kategori&format=xlsx",
                "sekelas-cafe-daftar-kategori.xlsx"
              )
            }
            disabled={sedangUnduh !== null}
          >
            {sedangUnduh === "kategori" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
            )}
            Unduh Excel
          </Button>
        </div>

        {/* Transaksi & Penjualan */}
        <div className="space-y-3 rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gold-soft text-[#5a4326] dark:text-gold">
                <ReceiptText className="h-4.5 w-4.5" aria-hidden />
              </span>
              <div className="min-w-0">
                <p className="font-medium">Transaksi &amp; Penjualan</p>
                <p className="text-xs text-muted-foreground">
                  Semua pesanan pada rentang tanggal — termasuk item ringkas, metode
                  bayar, status, dan kasir.
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="exp-trx-dari">Dari</Label>
              <Input
                id="exp-trx-dari"
                type="date"
                value={trxDari}
                max={trxSampai}
                onChange={(e) => setTrxDari(e.target.value)}
                className="h-10 w-38"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-trx-sampai">Sampai</Label>
              <Input
                id="exp-trx-sampai"
                type="date"
                value={trxSampai}
                min={trxDari}
                onChange={(e) => setTrxSampai(e.target.value)}
                className="h-10 w-38"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="exp-trx-format">Format</Label>
              <Select
                value={trxFormat}
                onValueChange={(v) => setTrxFormat(v === "csv" ? "csv" : "xlsx")}
              >
                <SelectTrigger id="exp-trx-format" className="h-10 w-28">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                  <SelectItem value="csv">CSV (.csv)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="h-10"
              onClick={() =>
                void unduh(
                  "transaksi",
                  `/api/data/export?type=transaksi&format=${trxFormat}&dari=${trxDari}&sampai=${trxSampai}`,
                  `sekelas-cafe-transaksi-${trxDari}-${trxSampai}.${trxFormat}`
                )
              }
              disabled={!rentangValid || sedangUnduh !== null}
            >
              {sedangUnduh === "transaksi" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : trxFormat === "xlsx" ? (
                <FileSpreadsheet className="h-4 w-4" aria-hidden />
              ) : (
                <FileText className="h-4 w-4" aria-hidden />
              )}
              Unduh
            </Button>
          </div>
          {!rentangValid && (
            <p className="text-sm text-destructive" role="alert">
              Tanggal mulai tidak boleh melewati tanggal akhir.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
