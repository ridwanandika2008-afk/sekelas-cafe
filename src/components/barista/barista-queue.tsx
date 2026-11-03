"use client";

/**
 * Halaman Antrean Dapur (barista).
 * - Polling GET /api/barista/antrean tiap 5 detik (pola efek `tick`).
 * - Checklist item optimistic: toggle langsung, revert + toast bila API gagal.
 * - Toggle in-flight dipertahankan saat data polling masuk (reconcile via override).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Coffee, Flame } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatWibTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { OrderCard } from "./order-card";
import { ReadyCard } from "./ready-card";
import {
  type AntreanResponse,
  type BaristaItem,
  type BaristaOrder,
  applyOverrides,
  itemProgress,
  orderSeq,
} from "./types";

function AntreanSkeleton() {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-10 w-24" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <Skeleton className="mt-4 h-10 w-full rounded-xl" />
      <div className="mt-4 space-y-2">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
      <Skeleton className="mt-4 h-3 w-full" />
      <Skeleton className="mt-4 h-14 w-full rounded-xl" />
    </div>
  );
}

export function BaristaQueue() {
  const [tick, setTick] = useState(0);
  /** null = belum termuat (tampilkan skeleton awal) */
  const [antrean, setAntrean] = useState<BaristaOrder[] | null>(null);
  const [siap, setSiap] = useState<BaristaOrder[]>([]);
  const [selesaiHariIni, setSelesaiHariIni] = useState(0);
  const [connError, setConnError] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  /** override optimistic itemId → target isDone (hanya yang sedang in-flight) */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const [markingReadyId, setMarkingReadyId] = useState<string | null>(null);
  /** waktu lokal pesanan ditandai siap (API tidak menyediakan readyAt) */
  const readyAtRef = useRef<Map<string, Date>>(new Map());

  // Polling tiap 5 detik (pola notification-bell).
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/barista/antrean", { cache: "no-store" });
        if (!active) return;
        if (!res.ok) {
          setConnError(true);
          return;
        }
        const data = (await res.json()) as AntreanResponse;
        if (!active) return;
        setAntrean(data.antrean ?? []);
        setSiap(data.siap ?? []);
        setSelesaiHariIni(data.selesaiHariIni ?? 0);
        setConnError(false);
        setLastUpdate(new Date());
      } catch {
        if (active) setConnError(true);
      }
    })();
    const t = setInterval(() => setTick((v) => v + 1), 5000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [tick]);

  /** Data efektif = data server + override in-flight (agar polling tidak menimpa toggle) */
  const effAntrean = useMemo(
    () => (antrean ? applyOverrides(antrean, overrides) : null),
    [antrean, overrides]
  );
  const effSiap = useMemo(() => applyOverrides(siap, overrides), [siap, overrides]);
  const pendingItems = useMemo(() => new Set(Object.keys(overrides)), [overrides]);

  /** Urut waktu masuk — terlama di atas */
  const sortedAntrean = useMemo(
    () =>
      effAntrean
        ? [...effAntrean].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        : null,
    [effAntrean]
  );

  const toggleItem = async (order: BaristaOrder, item: BaristaItem) => {
    if (overrides[item.id] !== undefined) return; // sedang in-flight
    const target = !item.isDone;
    setOverrides((prev) => ({ ...prev, [item.id]: target }));
    try {
      const res = await fetch(`/api/barista/item/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: target ? "selesai" : "batal" }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Gagal memperbarui item.");
        return; // revert: override dihapus, tampilan kembali ke data server
      }
      // Sukses: terapkan ke data lokal agar tidak berkedip menunggu polling
      const apply = (orders: BaristaOrder[]) =>
        orders.map((o) => {
          if (o.id !== order.id) return o;
          const items = o.items.map((i) => (i.id === item.id ? { ...i, isDone: target } : i));
          return { ...o, items, progress: itemProgress(items) };
        });
      setAntrean((prev) => (prev ? apply(prev) : prev));
      setSiap((prev) => apply(prev));
    } catch {
      toast.error("Tidak dapat terhubung ke server.");
    } finally {
      setOverrides((prev) => {
        const next = { ...prev };
        delete next[item.id];
        return next;
      });
      setTick((v) => v + 1); // sinkronkan segera
    }
  };

  const markReady = async (order: BaristaOrder) => {
    setMarkingReadyId(order.id);
    try {
      const res = await fetch(`/api/barista/pesanan/${order.id}`, { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(data.error ?? "Gagal menandai pesanan siap.");
        return;
      }
      // Pindahkan kartu ke bagian Siap (optimistic, animasi keluar halus)
      readyAtRef.current.set(order.id, new Date());
      setAntrean((prev) => (prev ? prev.filter((o) => o.id !== order.id) : prev));
      setSiap((prev) => [
        { ...order, status: "READY" },
        ...prev.filter((o) => o.id !== order.id),
      ]);
      toast.success(
        `Pesanan #${orderSeq(order.orderNumber)} siap — menunggu penyerahan.`
      );
    } catch {
      toast.error("Tidak dapat terhubung ke server.");
    } finally {
      setMarkingReadyId(null);
      setTick((v) => v + 1); // sinkronkan segera
    }
  };

  const menunggu = sortedAntrean?.length ?? 0;

  return (
    <div>
      {/* Header ringkas */}
      <header className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Antrean Dapur</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
            <p>
              <span className="font-display text-xl font-bold text-foreground">{menunggu}</span>{" "}
              menunggu dikerjakan
            </p>
            <p>
              <span className="font-display text-xl font-bold text-foreground">
                {selesaiHariIni}
              </span>{" "}
              selesai hari ini
            </p>
          </div>
        </div>
        <div
          role="status"
          className={cn(
            "flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-semibold",
            connError
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/60 dark:text-red-300"
              : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
          )}
        >
          <span className="relative flex h-2.5 w-2.5" aria-hidden>
            <span
              className={cn(
                "absolute inline-flex h-full w-full animate-ping rounded-full opacity-75",
                connError ? "bg-red-500" : "bg-emerald-500"
              )}
            />
            <span
              className={cn(
                "relative inline-flex h-2.5 w-2.5 rounded-full",
                connError ? "bg-red-500" : "bg-emerald-500"
              )}
            />
          </span>
          {connError
            ? "Koneksi terputus — mencoba lagi…"
            : lastUpdate
              ? `Live — diperbarui otomatis ${formatWibTime(lastUpdate)}`
              : "Live — diperbarui otomatis"}
        </div>
      </header>

      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        {/* Kolom utama: harus dikerjakan */}
        <section aria-labelledby="judul-antrean" className="min-w-0">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2
              id="judul-antrean"
              className="flex items-center gap-2 font-display text-lg font-bold sm:text-xl"
            >
              <Flame className="h-5 w-5 text-primary" aria-hidden />
              Harus Dikerjakan
            </h2>
            <Badge variant="secondary" className="px-2.5 text-sm font-bold" aria-label={`${menunggu} pesanan menunggu`}>
              {menunggu}
            </Badge>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Urut dari yang paling lama masuk — kerjakan dari atas ke bawah.
          </p>

          {sortedAntrean === null ? (
            <div className="space-y-4" aria-label="Memuat antrean">
              <AntreanSkeleton />
              <div className="opacity-60">
                <AntreanSkeleton />
              </div>
            </div>
          ) : sortedAntrean.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card/60 px-6 py-14 text-center">
              <span className="text-5xl" aria-hidden>
                ☕
              </span>
              <p className="mt-3 font-display text-lg font-bold">
                Tidak ada antrean — saatnya bersih-bersih!
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Pesanan baru akan muncul otomatis di sini.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence mode="popLayout">
                {sortedAntrean.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 24, scale: 0.98 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{
                      opacity: 0,
                      x: 48,
                      scale: 0.96,
                      transition: { duration: 0.28, ease: "easeOut" },
                    }}
                    transition={{ type: "spring", stiffness: 320, damping: 32 }}
                  >
                    <OrderCard
                      order={order}
                      pendingItems={pendingItems}
                      onToggleItem={toggleItem}
                      onMarkReady={markReady}
                      markingReady={markingReadyId === order.id}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </section>

        {/* Bagian siap / penyerahan */}
        <aside
          aria-labelledby="judul-siap"
          className="min-w-0 lg:sticky lg:top-[4.5rem]"
        >
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2
              id="judul-siap"
              className="flex items-center gap-2 font-display text-base font-bold sm:text-lg"
            >
              <Coffee className="h-5 w-5 text-emerald-600" aria-hidden />
              Siap — menunggu diambil / diantar
            </h2>
            <Badge variant="secondary" className="px-2.5 text-sm font-bold">
              {effSiap.length}
            </Badge>
          </div>

          <div className="max-h-[calc(100vh-13rem)] space-y-2.5 overflow-y-auto pr-1">
            {sortedAntrean === null ? (
              <div className="space-y-2.5" aria-label="Memuat pesanan siap">
                <Skeleton className="h-32 w-full rounded-xl" />
                <Skeleton className="h-32 w-full rounded-xl opacity-60" />
              </div>
            ) : effSiap.length === 0 ? (
              <p className="rounded-xl border-2 border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                Belum ada pesanan siap.
              </p>
            ) : (
              <AnimatePresence initial={false}>
                {effSiap.map((order) => (
                  <motion.div
                    key={order.id}
                    layout
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                    transition={{ duration: 0.2 }}
                  >
                    <ReadyCard
                      order={order}
                      readyAt={readyAtRef.current.get(order.id) ?? null}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
