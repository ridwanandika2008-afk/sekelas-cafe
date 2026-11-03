"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  ArrowLeft,
  Bike,
  Check,
  ChefHat,
  Clock,
  Loader2,
  MessageCircle,
  PackageCheck,
  Printer,
  RefreshCw,
  SearchX,
  ShoppingBag,
  Utensils,
  Wallet,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  FULFILLMENT_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
  QRIS_NOTE,
} from "@/lib/constants";
import { formatRupiah, formatWibDateTime, waLink } from "@/lib/format";
import { saveOrderEntry } from "./order-history";
import { OrderStatusBadge } from "./order-status-badge";
import type { TrackedOrder } from "./types";

type ReceiptData = {
  cafe: { name: string; address: string; footer: string | null; whatsapp: string };
  order: {
    orderNumber: string;
    customerName: string;
    fulfillment: string;
    tableNumber: string | null;
    deliveryBuilding: string | null;
    deliveryRoom: string | null;
    deliveryNote: string | null;
    note: string | null;
    status: string;
    paymentStatus: string;
    paymentMethod: string | null;
    subtotal: number;
    deliveryFee: number;
    discount: number;
    promoName: string | null;
    total: number;
    createdAt: string;
    items: {
      name: string;
      qty: number;
      unitPrice: number;
      note: string | null;
      options: { groupName: string; optionName: string }[];
    }[];
  };
};

const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED"];

export function TrackOrderView({
  nomor,
  accessKey,
}: {
  nomor: string;
  accessKey: string;
}) {
  const [order, setOrder] = useState<TrackedOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waNumber, setWaNumber] = useState("085151823036");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const latestRef = useRef<TrackedOrder | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/public/orders/${encodeURIComponent(nomor)}?k=${encodeURIComponent(accessKey)}`,
        { cache: "no-store" }
      );
      const data = (await res.json().catch(() => null)) as
        | { order?: TrackedOrder; error?: string }
        | null;
      if (!res.ok || !data?.order) {
        setError(data?.error ?? "Pesanan tidak ditemukan.");
        setOrder(null);
        latestRef.current = null;
        return;
      }
      const o = data.order;
      latestRef.current = o;
      setOrder(o);
      setError(null);
      // Simpan otomatis ke riwayat "Pesanan Saya" di perangkat ini
      saveOrderEntry({
        orderNumber: o.orderNumber,
        accessKey,
        total: o.total,
        customerName: o.customerName,
        createdAt: o.createdAt,
      });
    } catch {
      if (!latestRef.current) {
        setError("Gagal terhubung ke server. Periksa koneksi lalu muat ulang.");
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [nomor, accessKey]);

  // Nomor WhatsApp kafe (untuk tombol bantuan)
  useEffect(() => {
    fetch("/api/public/cafe", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.cafe?.whatsapp) setWaNumber(d.cafe.whatsapp);
      })
      .catch(() => {});
  }, []);

  // Polling tiap 10 detik (berhenti otomatis saat status final)
  useEffect(() => {
    load();
    const interval = setInterval(() => {
      const cur = latestRef.current;
      if (cur && TERMINAL_STATUSES.includes(cur.status)) return;
      load();
    }, 10000);
    return () => clearInterval(interval);
  }, [load]);

  const printReceipt = async () => {
    try {
      const res = await fetch(
        `/api/receipt/${encodeURIComponent(nomor)}?type=customer&k=${encodeURIComponent(accessKey)}`,
        { cache: "no-store" }
      );
      const data = (await res.json().catch(() => null)) as ReceiptData | { error?: string } | null;
      if (!res.ok || !data || !("order" in data)) {
        toast.error((data as { error?: string })?.error ?? "Gagal memuat struk.");
        return;
      }
      setReceipt(data as ReceiptData);
      // Sisipkan gaya cetak: saat print, hanya portal struk yang tampil
      // (navbar/footer bawaan layout ikut disembunyikan). Dihapus saat komponen lepas.
      if (!document.getElementById("skls-print-style")) {
        const style = document.createElement("style");
        style.id = "skls-print-style";
        style.textContent =
          "@media print { body > *:not(#skls-receipt-print) { display: none !important; } }";
        document.head.appendChild(style);
      }
      // Beri React waktu merender portal struk, lalu buka dialog cetak
      setTimeout(() => window.print(), 250);
    } catch {
      toast.error("Gagal memuat struk. Coba lagi ya.");
    }
  };

  // Bersihkan gaya cetak saat komponen dilepas (pindah halaman)
  useEffect(() => {
    return () => {
      document.getElementById("skls-print-style")?.remove();
    };
  }, []);

  if (loading && !order) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8 sm:py-12">
        <Skeleton className="h-10 w-56" />
        <Skeleton className="mt-2 h-4 w-80" />
        <Skeleton className="mt-6 h-64 rounded-2xl" />
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <Skeleton className="h-52 rounded-2xl" />
          <Skeleton className="h-52 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
        <SearchX className="h-12 w-12 text-muted-foreground" aria-hidden />
        <h1 className="mt-4 font-display text-2xl font-semibold">Pesanan tidak ditemukan</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {error ?? "Nomor pesanan atau kunci aksesnya tidak sesuai."}{" "}
          Periksa lagi tautanmu, atau cek daftar pesanan di perangkat ini.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <Button asChild className="rounded-full">
            <Link href="/menu">Lihat Menu</Link>
          </Button>
          <Button asChild variant="outline" className="rounded-full">
            <Link href="/pesanan-saya">Pesanan Saya</Link>
          </Button>
        </div>
      </div>
    );
  }

  const isDelivery = order.fulfillment === "DELIVERY";
  const isCancelled = order.status === "CANCELLED";
  const paid = order.paymentStatus === "PAID";
  const progressPct =
    order.progress.total > 0
      ? Math.round((order.progress.done / order.progress.total) * 100)
      : 0;

  const steps = [
    { key: "NEW", label: "Menunggu Pembayaran", icon: Wallet },
    { key: "QUEUED", label: "Dalam Antrean", icon: Clock },
    { key: "PREPARING", label: "Sedang Dibuat", icon: ChefHat },
    {
      key: "READY",
      label: isDelivery ? "Siap Diantar" : "Siap Diambil",
      icon: isDelivery ? PackageCheck : ShoppingBag,
    },
    ...(isDelivery ? [{ key: "DELIVERING", label: "Sedang Diantar", icon: Bike }] : []),
    { key: "COMPLETED", label: "Selesai", icon: Check },
  ];
  const currentIdx = steps.findIndex((s) => s.key === order.status);

  const fulfillmentIcon =
    order.fulfillment === "DINE_IN" ? Utensils : order.fulfillment === "TAKEAWAY" ? ShoppingBag : Bike;

  return (
    <div className="no-print mx-auto max-w-3xl px-4 py-8 sm:py-10">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">Lacak Pesanan</p>
          <h1 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {order.orderNumber}
          </h1>
          <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
            {formatWibDateTime(order.createdAt)} WIB · atas nama{" "}
            <strong className="text-foreground">{order.customerName}</strong>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <OrderStatusBadge status={order.status} className="px-4 py-1.5 text-sm" />
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-full"
            onClick={() => {
              setRefreshing(true);
              load();
            }}
            aria-label="Muat ulang status"
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Status diperbarui otomatis setiap 10 detik.
      </p>

      {/* Dibatalkan */}
      {isCancelled && (
        <Card className="mt-5 border-red-300 bg-red-50 dark:bg-red-950/40">
          <CardContent className="flex items-start gap-3.5 pt-6">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-red-100 text-red-700 dark:bg-red-900/60 dark:text-red-300">
              <XCircle className="h-6 w-6" aria-hidden />
            </span>
            <div>
              <p className="font-semibold text-red-800 dark:text-red-200">
                Pesanan dibatalkan
              </p>
              <p className="mt-1 text-sm leading-relaxed text-red-700 dark:text-red-300">
                {order.cancelReason ?? "Pesanan ini dibatalkan."}{" "}
                Ada pertanyaan? Hubungi kami via WhatsApp ya.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Timeline + progres */}
      {!isCancelled && (
        <Card className="mt-5">
          <CardHeader>
            <CardTitle className="text-base">Progres Pesanan</CardTitle>
          </CardHeader>
          <CardContent>
            <ol className="space-y-0">
              {steps.map((s, i) => {
                const done = i < currentIdx;
                const current = i === currentIdx;
                const StepIcon = s.icon;
                return (
                  <li key={s.key} className="relative flex gap-4 pb-7 last:pb-0">
                    {i < steps.length - 1 && (
                      <span
                        aria-hidden
                        className={cn(
                          "absolute left-[17px] top-10 h-[calc(100%-2.5rem)] w-0.5 rounded-full",
                          done || current ? "bg-primary/35" : "bg-border"
                        )}
                      />
                    )}
                    <span
                      className={cn(
                        "relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                        done
                          ? "border-primary bg-primary text-primary-foreground"
                          : current
                            ? "border-gold bg-gold-soft text-gold-foreground"
                            : "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {done ? (
                        <Check className="h-4 w-4" aria-hidden />
                      ) : (
                        <StepIcon className="h-4 w-4" aria-hidden />
                      )}
                    </span>
                    <div className="pt-1.5">
                      <p
                        className={cn(
                          "text-sm font-semibold leading-tight",
                          done || current ? "text-foreground" : "text-muted-foreground"
                        )}
                      >
                        {s.label}
                      </p>
                      {current && (
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Sedang berlangsung…
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>

            <Separator className="my-5" />

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pengerjaan menu</span>
                <span className="font-semibold tabular-nums">
                  {order.progress.done} dari {order.progress.total} porsi selesai
                </span>
              </div>
              <Progress value={progressPct} aria-label={`Progres ${progressPct}%`} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rincian pesanan */}
      <Card className="mt-5">
        <CardHeader>
          <CardTitle className="text-base">Rincian Pesanan</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3.5">
            {order.items.map((it, i) => (
              <li key={i} className="flex justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {it.qty}× {it.name}
                  </p>
                  {it.options.length > 0 && (
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {it.options.map((o) => o.optionName).join(" · ")}
                    </p>
                  )}
                  {it.note && (
                    <p className="text-xs italic text-muted-foreground">“{it.note}”</p>
                  )}
                </div>
                <p className="whitespace-nowrap text-sm font-medium tabular-nums">
                  {formatRupiah(it.unitPrice * it.qty)}
                </p>
              </li>
            ))}
          </ul>
          <Separator className="my-4" />
          <div className="space-y-2 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">{formatRupiah(order.subtotal)}</span>
            </div>
            {order.discount > 0 && (
              <div className="flex justify-between font-medium text-emerald-700 dark:text-emerald-400">
                <span>Diskon{order.promoName ? ` · ${order.promoName}` : ""}</span>
                <span className="tabular-nums">−{formatRupiah(order.discount)}</span>
              </div>
            )}
            {order.deliveryFee > 0 && (
              <div className="flex justify-between text-muted-foreground">
                <span>Biaya antar</span>
                <span className="tabular-nums">{formatRupiah(order.deliveryFee)}</span>
              </div>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="font-display text-xl font-bold tabular-nums text-primary">
                {formatRupiah(order.total)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Penerimaan & pembayaran */}
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Penerimaan</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-soft text-gold-foreground">
                {(() => {
                  const Icon = fulfillmentIcon;
                  return <Icon className="h-4 w-4" aria-hidden />;
                })()}
              </span>
              <span className="text-sm font-semibold">
                {FULFILLMENT_LABEL[order.fulfillment]}
              </span>
            </div>
            {order.fulfillment === "DINE_IN" && (
              <p className="text-sm text-muted-foreground">
                {order.tableNumber
                  ? `Meja ${order.tableNumber}`
                  : "Nomor meja tidak disebutkan — tunjukkan struk ke kasir."}
              </p>
            )}
            {order.fulfillment === "TAKEAWAY" && (
              <p className="text-sm text-muted-foreground">
                Ambil pesananmu di kasir ya. Jangan lupa bilang nomor pesanan!
              </p>
            )}
            {order.fulfillment === "DELIVERY" && (
              <div className="space-y-1 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">
                  {order.deliveryBuilding}
                  {order.deliveryRoom ? ` · ${order.deliveryRoom}` : ""}
                </p>
              </div>
            )}
            {order.note && (
              <div className="rounded-lg bg-muted p-3">
                <p className="text-xs font-semibold">Catatan pesanan</p>
                <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                  “{order.note}”
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Pembayaran</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2.5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Metode</span>
              <span className="font-semibold">
                {order.paymentMethod ? PAYMENT_METHOD_LABEL[order.paymentMethod] : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Status</span>
              <span
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold",
                  paid
                    ? "border-emerald-300 bg-emerald-100 text-emerald-800"
                    : "border-amber-300 bg-amber-100 text-amber-800"
                )}
              >
                {PAYMENT_STATUS_LABEL[order.paymentStatus] ?? order.paymentStatus}
              </span>
            </div>
            {!paid && (
              <p className="rounded-lg bg-amber-50 p-3 text-xs leading-relaxed text-amber-900 dark:bg-amber-950/40 dark:text-amber-200">
                {order.paymentMethod === "QRIS"
                  ? QRIS_NOTE
                  : "Bayar di kasir dulu ya — pesananmu mulai diproses setelah pembayaran."}
              </p>
            )}
            {paid && order.paidAt && (
              <p className="text-xs text-muted-foreground">
                Dibayar {formatWibDateTime(order.paidAt)} WIB.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Aksi */}
      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        {paid && (
          <Button variant="outline" className="gap-2 rounded-full" onClick={printReceipt}>
            <Printer className="h-4 w-4" aria-hidden /> Cetak Struk
          </Button>
        )}
        <Button variant="outline" asChild className="gap-2 rounded-full">
          <a
            href={waLink(
              waNumber,
              `Halo Sekelas Cafe! Saya mau tanya soal pesanan ${order.orderNumber}.`
            )}
            target="_blank"
            rel="noopener noreferrer"
          >
            <MessageCircle className="h-4 w-4" aria-hidden /> Butuh Bantuan
          </a>
        </Button>
        <Button variant="ghost" asChild className="gap-2 rounded-full">
          <Link href="/menu">
            <ArrowLeft className="h-4 w-4" aria-hidden /> Pesan Lagi
          </Link>
        </Button>
      </div>

      {/* Struk siap cetak (portal ke body; hanya tampil saat print) */}
      {receipt &&
        typeof document !== "undefined" &&
        createPortal(
          <div id="skls-receipt-print" className="hidden print:block">
            <div className="print-area bg-white p-3 font-mono text-[11px] leading-snug text-black">
              <div className="text-center">
                <p className="text-sm font-bold uppercase">{receipt.cafe.name}</p>
                <p className="mt-0.5">{receipt.cafe.address}</p>
              </div>
              <p className="my-2 text-center font-bold">{receipt.order.orderNumber}</p>
              <p>{formatWibDateTime(receipt.order.createdAt)} WIB</p>
              <p>
                {FULFILLMENT_LABEL[receipt.order.fulfillment] ?? receipt.order.fulfillment}
                {receipt.order.tableNumber ? ` · Meja ${receipt.order.tableNumber}` : ""}
                {receipt.order.deliveryBuilding
                  ? ` · ${receipt.order.deliveryBuilding}${receipt.order.deliveryRoom ? ` / ${receipt.order.deliveryRoom}` : ""}`
                  : ""}
              </p>
              <p>a.n. {receipt.order.customerName}</p>
              <p className="my-1">--------------------------------</p>
              {receipt.order.items.map((it, i) => (
                <div key={i}>
                  <div className="flex justify-between">
                    <span>
                      {it.qty}x {it.name}
                    </span>
                    <span>{formatRupiah(it.unitPrice * it.qty)}</span>
                  </div>
                  {it.options.map((o, j) => (
                    <p key={j} className="pl-3 text-[10px]">
                      + {o.optionName}
                    </p>
                  ))}
                  {it.note && (
                    <p className="pl-3 text-[10px] italic">Catatan: {it.note}</p>
                  )}
                </div>
              ))}
              <p className="my-1">--------------------------------</p>
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>{formatRupiah(receipt.order.subtotal)}</span>
              </div>
              {receipt.order.discount > 0 && (
                <div className="flex justify-between">
                  <span>Diskon{receipt.order.promoName ? ` (${receipt.order.promoName})` : ""}</span>
                  <span>-{formatRupiah(receipt.order.discount)}</span>
                </div>
              )}
              {receipt.order.deliveryFee > 0 && (
                <div className="flex justify-between">
                  <span>Biaya antar</span>
                  <span>{formatRupiah(receipt.order.deliveryFee)}</span>
                </div>
              )}
              <div className="flex justify-between font-bold">
                <span>TOTAL</span>
                <span>{formatRupiah(receipt.order.total)}</span>
              </div>
              <p className="mt-1">
                {receipt.order.paymentMethod
                  ? PAYMENT_METHOD_LABEL[receipt.order.paymentMethod]
                  : "—"}{" "}
                · {PAYMENT_STATUS_LABEL[receipt.order.paymentStatus] ?? ""}
              </p>
              {receipt.cafe.footer && (
                <p className="mt-3 text-center">{receipt.cafe.footer}</p>
              )}
              <p className="text-center">{receipt.cafe.whatsapp}</p>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
