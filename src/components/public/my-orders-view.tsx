"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { ChevronRight, Clock3, Coffee, ReceiptText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatRupiah, formatWibDateTime } from "@/lib/format";
import {
  getOrderHistoryServerSnapshot,
  getOrderHistorySnapshot,
  removeOrderEntry,
  subscribeOrderHistory,
  type SavedOrder,
} from "./order-history";

const emptySubscribe = () => () => {};

export function MyOrdersView() {
  // Pola seperti public-navbar: false saat SSR/hidrasi, true di client.
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  // External store localStorage — snapshot server = kosong.
  const orders = useSyncExternalStore(
    subscribeOrderHistory,
    getOrderHistorySnapshot,
    getOrderHistoryServerSnapshot
  );

  const sorted = useMemo(
    () =>
      [...orders].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ),
    [orders]
  );

  const hapus = (orderNumber: string) => {
    removeOrderEntry(orderNumber);
    toast.success(`Pesanan ${orderNumber} dihapus dari riwayat.`);
  };

  if (!mounted) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
        <div className="h-10 w-52 animate-pulse rounded-lg bg-muted" />
        <div className="mt-2 h-4 w-72 animate-pulse rounded bg-muted" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-2xl bg-muted" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
          Pesanan Saya
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Riwayat pesanan di perangkat ini — klik untuk melihat status terbaru.
        </p>
      </header>

      {sorted.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed py-16 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-gold-soft text-gold-foreground">
            <Coffee className="h-8 w-8" aria-hidden />
          </span>
          <p className="mt-4 font-display text-xl font-semibold">Belum ada pesanan</p>
          <p className="mt-1.5 max-w-xs text-sm leading-relaxed text-muted-foreground">
            Yuk pesan menu favoritmu sekarang — ngopi asik, harga bersahabat!
          </p>
          <Button asChild className="mt-6 rounded-full">
            <Link href="/menu">Lihat Menu &amp; Pesan</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {sorted.map((o: SavedOrder) => (
              <Card key={o.orderNumber} className="p-5 transition-shadow hover:shadow-md">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gold-soft text-gold-foreground">
                      <ReceiptText className="h-5 w-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="font-display text-lg font-bold leading-tight">
                        {o.orderNumber}
                      </p>
                      <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        a.n. {o.customerName}
                      </p>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                        {formatWibDateTime(o.createdAt)} WIB
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => hapus(o.orderNumber)}
                    aria-label={`Hapus ${o.orderNumber} dari riwayat`}
                    title="Hapus dari riwayat"
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-4 flex items-center justify-between border-t pt-4">
                  <span className="font-display text-lg font-semibold tabular-nums">
                    {formatRupiah(o.total)}
                  </span>
                  <Button asChild size="sm" variant="outline" className="gap-1 rounded-full">
                    <Link
                      href={`/pesanan/${o.orderNumber}?k=${encodeURIComponent(o.accessKey)}`}
                    >
                      Lihat Status
                      <ChevronRight className="h-4 w-4" aria-hidden />
                    </Link>
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          <p className="mt-8 text-center text-xs leading-relaxed text-muted-foreground">
            Hanya pesanan yang dibuat atau dilacak dari perangkat &amp; browser ini yang
            tersimpan di sini.
          </p>
        </>
      )}
    </div>
  );
}
