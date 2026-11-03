"use client";

/**
 * Dashboard Admin — ringkasan hari ini (batas WIB).
 * Metrik besar, baris status pesanan, menu terlaris, bahan hampir habis,
 * pesanan berjalan, dan aktivitas terbaru. Polling 30 detik.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  Banknote,
  ChefHat,
  Coffee,
  History,
  Loader2,
  PackageX,
  QrCode,
  RefreshCw,
  ReceiptText,
  TrendingUp,
} from "lucide-react";
import { formatRupiah, formatWibDateTime, timeAgo } from "@/lib/format";
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { activityLabel } from "@/components/admin/activity-labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const POLL_MS = 30_000;

type Stats = {
  hariIni: {
    pendapatan: number;
    jumlahPesanan: number;
    online: number;
    pos: number;
    tunai: { jumlah: number; total: number };
    qris: { jumlah: number; total: number };
    statusCounts: Record<string, number>;
  };
  menuTerlaris: { name: string; qty: number; total: number }[];
  bahanHampirHabis: { id: string; name: string; unit: string; stock: number; minStock: number }[];
  pesananAktif: {
    id: string;
    orderNumber: string;
    customerName: string;
    channel: string;
    status: string;
    paymentStatus: string;
    total: number;
    createdAt: string;
    itemCount: number;
    doneCount: number;
  }[];
  aktivitasTerbaru: {
    id: string;
    actorName: string | null;
    role: string | null;
    action: string;
    entity: string | null;
    entityId: string | null;
    createdAt: string;
  }[];
};

const STATUS_KEYS = [
  "NEW",
  "QUEUED",
  "PREPARING",
  "READY",
  "DELIVERING",
  "COMPLETED",
  "CANCELLED",
] as const;

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/stats");
      if (res.ok && mounted.current) {
        setStats((await res.json()) as Stats);
      }
    } catch {
      /* polling gagal — coba lagi di interval berikutnya */
    } finally {
      if (mounted.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    void load(true);
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load]);

  const hariIni = stats?.hariIni;
  const adaBahanKritis = useMemo(
    () => (stats?.bahanHampirHabis.length ?? 0) > 0,
    [stats]
  );

  return (
    <main className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ringkasan operasional Sekelas Cafe hari ini (WIB).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void load(true)}
          disabled={refreshing}
          className="h-10"
        >
          {refreshing ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="h-4 w-4" aria-hidden />
          )}
          Segarkan
        </Button>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-72 rounded-2xl" />
          </div>
        </div>
      ) : !hariIni ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageX className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-medium">Gagal memuat data dashboard.</p>
            <Button onClick={() => void load(true)} variant="outline">
              Coba Lagi
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Kartu metrik besar */}
          <section aria-label="Metrik hari ini" className="grid grid-cols-2 gap-4 xl:grid-cols-4">
            <Card className="border-gold/40 bg-gradient-to-br from-card to-[#f5ead6]/60 dark:to-[#2c2013]/60">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">
                    Pendapatan Hari Ini
                  </p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold text-primary sm:text-3xl">
                  {formatRupiah(hariIni.pendapatan)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Dari pesanan lunas &amp; tidak batal
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <ReceiptText className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">Pesanan Hari Ini</p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  {hariIni.jumlahPesanan}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Online {hariIni.online} · Kasir (POS) {hariIni.pos}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Banknote className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">Tunai</p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  {formatRupiah(hariIni.tunai.total)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hariIni.tunai.jumlah} transaksi tunai lunas
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <QrCode className="h-4 w-4" aria-hidden />
                  <p className="text-xs font-semibold uppercase tracking-wide">QRIS</p>
                </div>
                <p className="mt-2 font-display text-2xl font-bold sm:text-3xl">
                  {formatRupiah(hariIni.qris.total)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {hariIni.qris.jumlah} transaksi QRIS lunas
                </p>
              </CardContent>
            </Card>
          </section>

          {/* Baris kartu status pesanan */}
          <section aria-label="Status pesanan hari ini">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pesanan per Status (Hari Ini)
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
              {STATUS_KEYS.map((key) => (
                <div
                  key={key}
                  className={cn(
                    "rounded-xl border bg-card p-3 text-center",
                    hariIni.statusCounts[key] > 0 ? "border-gold/50" : "border-border"
                  )}
                >
                  <span
                    className={cn(
                      "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                      ORDER_STATUS_BADGE[key]
                    )}
                  >
                    {ORDER_STATUS_LABEL[key]}
                  </span>
                  <p className="mt-2 font-display text-2xl font-bold">
                    {hariIni.statusCounts[key] ?? 0}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Panel bawah */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Menu terlaris */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Coffee className="h-4.5 w-4.5 text-primary" aria-hidden />
                  Menu Terlaris Hari Ini
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.menuTerlaris.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada penjualan hari ini.
                  </p>
                ) : (
                  <ul className="space-y-2.5">
                    {stats.menuTerlaris.map((m, i) => (
                      <li key={m.name} className="flex items-center gap-3">
                        <span
                          className={cn(
                            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                            i === 0
                              ? "bg-gold text-[#3d2c12]"
                              : "bg-secondary text-secondary-foreground"
                          )}
                          aria-label={`Peringkat ${i + 1}`}
                        >
                          {i + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{m.name}</p>
                          <p className="text-xs text-muted-foreground">{formatRupiah(m.total)}</p>
                        </div>
                        <Badge variant="secondary" className="shrink-0">
                          {m.qty} terjual
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Bahan hampir habis */}
            <Card className={cn(adaBahanKritis && "border-red-300 bg-red-50/60 dark:bg-red-950/20")}>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <AlertTriangle
                    className={cn("h-4.5 w-4.5", adaBahanKritis ? "text-red-600" : "text-primary")}
                    aria-hidden
                  />
                  Bahan Hampir Habis
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.bahanHampirHabis.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Semua bahan masih di atas batas minimum. 👍
                  </p>
                ) : (
                  <>
                    <ul className="max-h-64 space-y-2.5 overflow-y-auto pr-1">
                      {stats.bahanHampirHabis.map((b) => (
                        <li key={b.id} className="flex items-center justify-between gap-3 text-sm">
                          <span className="truncate font-medium">{b.name}</span>
                          <span className="shrink-0 rounded-md border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700 dark:bg-red-950/50 dark:text-red-300">
                            {b.stock} / min {b.minStock} {b.unit}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button asChild variant="outline" size="sm" className="mt-4 h-10 w-full">
                      <Link href="/admin/stok">Kelola Stok &amp; Bahan</Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Pesanan berjalan */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ChefHat className="h-4.5 w-4.5 text-primary" aria-hidden />
                  Pesanan Berjalan
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.pesananAktif.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Tidak ada pesanan yang sedang berjalan.
                  </p>
                ) : (
                  <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                    {stats.pesananAktif.map((o) => (
                      <li key={o.id} className="rounded-lg border bg-card p-3">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-sm font-semibold">{o.orderNumber}</p>
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                              ORDER_STATUS_BADGE[o.status] ?? ""
                            )}
                          >
                            {ORDER_STATUS_LABEL[o.status] ?? o.status}
                          </span>
                        </div>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-1 text-xs text-muted-foreground">
                          <span className="truncate">
                            {o.customerName} · {o.doneCount}/{o.itemCount} porsi siap
                          </span>
                          <span className="font-semibold text-foreground">
                            {formatRupiah(o.total)}
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {timeAgo(o.createdAt)} · {formatWibDateTime(o.createdAt)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* Aktivitas terbaru */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <History className="h-4.5 w-4.5 text-primary" aria-hidden />
                  Aktivitas Terbaru
                </CardTitle>
              </CardHeader>
              <CardContent>
                {stats.aktivitasTerbaru.length === 0 ? (
                  <p className="py-6 text-center text-sm text-muted-foreground">
                    Belum ada aktivitas tercatat.
                  </p>
                ) : (
                  <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
                    {stats.aktivitasTerbaru.map((a) => (
                      <li key={a.id} className="flex items-start gap-3 text-sm">
                        <Activity className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                        <div className="min-w-0 flex-1">
                          <p className="truncate">
                            <span className="font-medium">{a.actorName ?? "Sistem"}</span>{" "}
                            <span className="text-muted-foreground">— {activityLabel(a.action)}</span>
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatWibDateTime(a.createdAt)} WIB
                            {a.entityId ? ` · ${a.entityId}` : ""}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
                <Button asChild variant="ghost" size="sm" className="mt-2 h-10 w-full">
                  <Link href="/admin/aktivitas">Lihat Semua Aktivitas</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </main>
  );
}
