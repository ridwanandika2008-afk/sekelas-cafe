"use client";

/**
 * Laporan & Analisis — filter rentang tanggal (WIB), kartu metrik, grafik,
 * tabel, dan ekspor Excel/CSV. Transaksi valid = PAID & tidak dibatalkan.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BadgePercent,
  Ban,
  Banknote,
  Bike,
  ClipboardList,
  FileSpreadsheet,
  FileText,
  Loader2,
  QrCode,
  ReceiptText,
  RefreshCw,
  Sigma,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah, wibDateKey, wibDayStartFromKey } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  JamRamaiChart,
  MenuTerlarisChart,
  PendapatanPerHariChart,
} from "./laporan-charts";
import {
  KinerjaKasirTabel,
  MenuKurangDiminatiTabel,
  MenuTerlarisTabel,
  MetodePenerimaanTabel,
} from "./laporan-tables";
import { downloadFile, type LaporanData } from "./types";

type Preset = "harian" | "kemarin" | "7hari" | "30hari" | "bulan";

function shiftKey(key: string, days: number): string {
  return wibDateKey(new Date(wibDayStartFromKey(key).getTime() + days * 24 * 3600 * 1000));
}

function rangePreset(preset: Preset): { dari: string; sampai: string } {
  const today = wibDateKey();
  switch (preset) {
    case "harian":
      return { dari: today, sampai: today };
    case "kemarin": {
      const kemarin = shiftKey(today, -1);
      return { dari: kemarin, sampai: kemarin };
    }
    case "7hari":
      return { dari: shiftKey(today, -6), sampai: today };
    case "30hari":
      return { dari: shiftKey(today, -29), sampai: today };
    case "bulan":
      return { dari: `${today.slice(0, 8)}01`, sampai: today };
  }
}

const PRESET_LABEL: { key: Preset; label: string }[] = [
  { key: "harian", label: "Hari Ini" },
  { key: "kemarin", label: "Kemarin" },
  { key: "7hari", label: "7 Hari" },
  { key: "30hari", label: "30 Hari" },
  { key: "bulan", label: "Bulan Ini" },
];

export function LaporanView() {
  const [dari, setDari] = useState(() => rangePreset("7hari").dari);
  const [sampai, setSampai] = useState(() => rangePreset("7hari").sampai);
  const [data, setData] = useState<LaporanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [gagal, setGagal] = useState(false);
  const [exporting, setExporting] = useState<"xlsx" | "csv" | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (d: string, s: string) => {
    setLoading(true);
    setGagal(false);
    try {
      const res = await fetch(`/api/laporan?dari=${d}&sampai=${s}`);
      const json = (await res.json()) as LaporanData & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat laporan.");
      if (mounted.current) setData(json);
    } catch (e) {
      if (mounted.current) {
        setGagal(true);
        toast.error(e instanceof Error ? e.message : "Gagal memuat laporan.");
      }
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(rangePreset("7hari").dari, rangePreset("7hari").sampai);
  }, [load]);

  const rentangValid = useMemo(
    () => dari !== "" && sampai !== "" && dari <= sampai,
    [dari, sampai]
  );

  const terapkanPreset = (preset: Preset) => {
    const { dari: d, sampai: s } = rangePreset(preset);
    setDari(d);
    setSampai(s);
    void load(d, s);
  };

  const exportLaporan = async (format: "xlsx" | "csv") => {
    if (!rentangValid) {
      toast.error("Perbaiki rentang tanggal terlebih dahulu.");
      return;
    }
    setExporting(format);
    try {
      await downloadFile(
        `/api/laporan/export?dari=${dari}&sampai=${sampai}&format=${format}`,
        `laporan-sekelas-cafe-${dari}-${sampai}.${format}`
      );
      toast.success(`Laporan ${format === "xlsx" ? "Excel" : "CSV"} berhasil diunduh.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh laporan.");
    } finally {
      setExporting(null);
    }
  };

  const kosong =
    data !== null &&
    data.ringkasan.jumlahPesanan === 0 &&
    data.ringkasan.jumlahPembatalan === 0;

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">
            Laporan &amp; Analisis
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Analisis penjualan Sekelas Cafe berdasarkan rentang tanggal (WIB).
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() => void exportLaporan("xlsx")}
            disabled={!rentangValid || exporting !== null || loading}
          >
            {exporting === "xlsx" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
            )}
            Export Excel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10"
            onClick={() => void exportLaporan("csv")}
            disabled={!rentangValid || exporting !== null || loading}
          >
            {exporting === "csv" ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <FileText className="h-4 w-4" aria-hidden />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="space-y-3 p-4 sm:p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
            <div className="flex flex-wrap items-end gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="laporan-dari">Dari Tanggal</Label>
                <Input
                  id="laporan-dari"
                  type="date"
                  value={dari}
                  max={sampai}
                  onChange={(e) => setDari(e.target.value)}
                  className="h-10 w-40"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="laporan-sampai">Sampai Tanggal</Label>
                <Input
                  id="laporan-sampai"
                  type="date"
                  value={sampai}
                  min={dari}
                  onChange={(e) => setSampai(e.target.value)}
                  className="h-10 w-40"
                />
              </div>
              <Button
                onClick={() => void load(dari, sampai)}
                disabled={!rentangValid || loading}
                className="h-10"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden />
                )}
                Muat Laporan
              </Button>
            </div>
            <div
              className="flex flex-wrap items-center gap-2"
              role="group"
              aria-label="Preset rentang cepat"
            >
              {PRESET_LABEL.map((p) => (
                <Button
                  key={p.key}
                  variant="secondary"
                  size="sm"
                  className="h-9"
                  onClick={() => terapkanPreset(p.key)}
                  disabled={loading}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>
          {!rentangValid && (
            <p className="text-sm text-destructive" role="alert">
              Tanggal mulai tidak boleh melewati tanggal akhir.
            </p>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-28 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-2xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      ) : gagal || !data ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-medium">Gagal memuat laporan.</p>
            <Button onClick={() => void load(dari, sampai)} variant="outline">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Kartu metrik */}
          <section aria-label="Ringkasan metrik" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Card className="border-gold/40 bg-gradient-to-br from-card to-[#f5ead6]/60 dark:to-[#2c2013]/60">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">Pendapatan</p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-primary sm:text-3xl">
                  {formatRupiah(data.ringkasan.totalPendapatan)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Pesanan lunas &amp; tidak batal
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ReceiptText className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">Pesanan</p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  {data.ringkasan.jumlahPesanan}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">transaksi valid</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Banknote className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">Tunai</p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  {formatRupiah(data.ringkasan.totalTunai)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">pembayaran tunai</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <QrCode className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">QRIS</p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  {formatRupiah(data.ringkasan.totalQris)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">pembayaran QRIS</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Sigma className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Rata-rata / Pesanan
                  </p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  {formatRupiah(data.ringkasan.rataRataPerPesanan)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">nilai rata-rata transaksi</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Bike className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">Biaya Antar</p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  {formatRupiah(data.ringkasan.totalBiayaAntar)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">total ongkos pengantaran</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BadgePercent className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">Diskon</p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  {formatRupiah(data.ringkasan.totalDiskon)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">potongan promo</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Ban className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">Pembatalan</p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  {data.ringkasan.jumlahPembatalan}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  senilai {formatRupiah(data.ringkasan.totalDibatalkan)}
                </p>
              </CardContent>
            </Card>
          </section>

          {kosong ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-14 text-center">
                <ClipboardList className="h-10 w-10 text-muted-foreground" aria-hidden />
                <p className="font-medium">Belum ada transaksi pada periode ini.</p>
                <p className="text-sm text-muted-foreground">
                  Coba pilih rentang tanggal lain atau preset yang lebih panjang (mis. 30 Hari).
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Grafik */}
              <section aria-label="Grafik laporan" className="grid gap-4 lg:grid-cols-2">
                <Card className="lg:col-span-2">
                  <CardHeader className="pb-2">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Pendapatan per Hari
                    </p>
                  </CardHeader>
                  <CardContent>
                    <PendapatanPerHariChart data={data} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Jam Ramai (WIB)
                    </p>
                  </CardHeader>
                  <CardContent>
                    <JamRamaiChart data={data} />
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <p className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      Menu Terlaris — Top 8
                    </p>
                  </CardHeader>
                  <CardContent>
                    <MenuTerlarisChart data={data} />
                  </CardContent>
                </Card>
              </section>

              {/* Tabel */}
              <section aria-label="Tabel rincian" className="grid gap-4 lg:grid-cols-2">
                <MenuTerlarisTabel data={data} />
                <MenuKurangDiminatiTabel data={data} />
                <KinerjaKasirTabel data={data} />
                <MetodePenerimaanTabel data={data} />
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
