"use client";

/**
 * Pesanan Masuk — pantau pesanan aktif hari ini (polling 10 detik).
 * Bagian: Menunggu Pembayaran → Sedang Diproses → Siap (serah terima) → Sedang Diantar.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bike,
  CheckCheck,
  ClipboardList,
  HandCoins,
  Loader2,
  MapPin,
  PackageCheck,
  RefreshCw,
  Truck,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah, formatWibTime, timeAgo } from "@/lib/format";
import { FULFILLMENT_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { PaymentDialog } from "@/components/kasir/payment-dialog";
import {
  ChannelBadge,
  FulfillmentBadge,
  OrderStatusBadge,
  fulfillmentLocationText,
} from "@/components/kasir/status-badge";
import { ReceiptButton } from "@/components/receipt/receipt-print";
import type { CafeInfo, KasirOrder } from "@/components/kasir/types";

const POLL_MS = 10_000;

function SectionTitle({
  icon: Icon,
  title,
  count,
  hint,
}: {
  icon: typeof ClipboardList;
  title: string;
  count: number;
  hint: string;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
        <Icon className="h-4.5 w-4.5" />
      </span>
      <div>
        <h2 className="font-display text-base leading-tight font-bold">
          {title}{" "}
          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground tabular-nums">
            {count}
          </span>
        </h2>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

function EmptyBox({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

function ItemRows({ order }: { order: KasirOrder }) {
  return (
    <ul className="space-y-1">
      {order.items.map((it) => (
        <li key={it.id} className="text-sm leading-tight">
          <span className="font-semibold tabular-nums">{it.qty}×</span> {it.name}
          {it.options.length ? (
            <span className="text-[11px] text-muted-foreground">
              {" "}
              ({it.options.map((o) => o.optionName).join(", ")})
            </span>
          ) : null}
          {it.note ? (
            <span className="block pl-4 text-[11px] italic text-amber-700 dark:text-amber-400">
              catatan: {it.note}
            </span>
          ) : null}
        </li>
      ))}
    </ul>
  );
}

export default function PesananMasukPage() {
  const [orders, setOrders] = useState<KasirOrder[]>([]);
  const [cafe, setCafe] = useState<CafeInfo | null>(null);
  const [hasShift, setHasShift] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // aksi
  const [payTarget, setPayTarget] = useState<KasirOrder | null>(null);
  const [paying, setPaying] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<KasirOrder | null>(null);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);
  const [paidSuccess, setPaidSuccess] = useState<{ orderNumber: string; total: number } | null>(null);

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
      const [ordersRes, cafeRes] = await Promise.all([
        fetch("/api/kasir/pesanan?scope=aktif"),
        fetch("/api/public/cafe"),
      ]);
      if (ordersRes.ok) {
        const json = await ordersRes.json();
        if (mounted.current) {
          setOrders(json.orders as KasirOrder[]);
          setLastRefresh(new Date());
        }
      }
      if (cafeRes.ok) {
        const j = await cafeRes.json();
        if (mounted.current) setCafe(j.cafe as CafeInfo);
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

  const checkShift = useCallback(async () => {
    try {
      const res = await fetch("/api/kasir/shift");
      const json = await res.json();
      setHasShift(Boolean(json.shift));
    } catch {
      setHasShift(null);
    }
  }, []);

  useEffect(() => {
    void load(true);
    void checkShift();
    const t = setInterval(() => void load(), POLL_MS);
    return () => clearInterval(t);
  }, [load, checkShift]);

  /* ===== kelompok pesanan ===== */
  const unpaid = useMemo(
    () => orders.filter((o) => o.paymentStatus === "UNPAID" && o.status !== "CANCELLED"),
    [orders]
  );
  const processing = useMemo(
    () => orders.filter((o) => o.status === "QUEUED" || o.status === "PREPARING"),
    [orders]
  );
  const ready = useMemo(() => orders.filter((o) => o.status === "READY"), [orders]);
  const delivering = useMemo(() => orders.filter((o) => o.status === "DELIVERING"), [orders]);

  /* ===== aksi ===== */

  const openPay = (order: KasirOrder) => {
    if (hasShift === false) {
      toast.error("Buka shift kasir dulu di halaman POS/Shift sebelum menerima pembayaran.");
      return;
    }
    setPayTarget(order);
  };

  const submitPay = async (method: "CASH" | "QRIS", cashReceived: number | null) => {
    if (!payTarget) return;
    setPaying(true);
    try {
      const res = await fetch(`/api/kasir/pesanan/${payTarget.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bayar", method, cashReceived }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menerima pembayaran.");
      toast.success(`Pembayaran ${payTarget.orderNumber} diterima. Pesanan masuk antrean dapur.`);
      setPaidSuccess({ orderNumber: payTarget.orderNumber, total: payTarget.total });
      setPayTarget(null);
      void checkShift();
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menerima pembayaran.");
    } finally {
      setPaying(false);
    }
  };

  const submitCancel = async () => {
    if (!cancelTarget) return;
    const reason = cancelReason.trim();
    if (reason.length < 3) {
      toast.error("Isi alasan pembatalan (min. 3 karakter).");
      return;
    }
    setCancelling(true);
    try {
      const res = await fetch(`/api/kasir/pesanan/${cancelTarget.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "batal", reason }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal membatalkan pesanan.");
      toast.info(`Pesanan ${cancelTarget.orderNumber} dibatalkan.`);
      setCancelTarget(null);
      setCancelReason("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membatalkan pesanan.");
    } finally {
      setCancelling(false);
    }
  };

  const doAction = async (order: KasirOrder, action: "serahkan" | "antar" | "diterima") => {
    setActionBusy(`${order.id}-${action}`);
    try {
      const res = await fetch(`/api/kasir/pesanan/${order.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Aksi gagal.");
      const messages: Record<string, string> = {
        serahkan: `Pesanan ${order.orderNumber} selesai — sudah diserahkan.`,
        antar: `Pesanan ${order.orderNumber} sedang diantar. Semoga lancar!`,
        diterima: `Pesanan ${order.orderNumber} sampai tujuan. Selesai!`,
      };
      toast.success(messages[action]);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Aksi gagal.");
    } finally {
      setActionBusy(null);
    }
  };

  /* ===== render ===== */

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold">Pesanan Masuk</h1>
          <p className="text-xs text-muted-foreground">
            Diperbarui otomatis tiap 10 detik
            {lastRefresh ? ` · terakhir ${formatWibTime(lastRefresh)} WIB` : ""}
            {hasShift === false ? (
              <span className="ml-1 font-semibold text-red-600">· shift belum dibuka</span>
            ) : null}
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => void load(true)}
          disabled={refreshing}
        >
          {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
          Segarkan
        </Button>
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat pesanan…
        </div>
      ) : (
        <>
          {/* ============ MENUNGGU PEMBAYARAN ============ */}
          <section className="space-y-3" aria-label="Menunggu pembayaran">
            <SectionTitle
              icon={HandCoins}
              title="Menunggu Pembayaran"
              count={unpaid.length}
              hint="Pesanan yang belum dibayar — terima pembayaran atau batalkan."
            />
            {unpaid.length === 0 ? (
              <EmptyBox text="Tidak ada pesanan yang menunggu pembayaran. 🙂" />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {unpaid.map((o) => (
                  <Card key={o.id} className="border-amber-300/70 shadow-sm">
                    <CardContent className="space-y-2.5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-sm font-bold tracking-wide">{o.orderNumber}</p>
                        <div className="flex items-center gap-1.5">
                          <ChannelBadge channel={o.channel} />
                          <OrderStatusBadge status={o.status} />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Masuk {formatWibTime(o.createdAt)} WIB ({timeAgo(o.createdAt)}) ·{" "}
                        {o.customerName}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <FulfillmentBadge fulfillment={o.fulfillment} />
                        <span className="text-xs text-muted-foreground">
                          {fulfillmentLocationText(o)}
                        </span>
                      </div>
                      <ItemRows order={o} />
                      {o.note ? (
                        <p className="rounded-md bg-muted px-2 py-1 text-xs italic text-muted-foreground">
                          Catatan: {o.note}
                        </p>
                      ) : null}
                      <div className="flex items-baseline justify-between border-t pt-2">
                        <span className="text-xs text-muted-foreground">Total tagihan</span>
                        <span className="font-display text-lg font-bold tabular-nums">
                          {formatRupiah(o.total)}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <Button className="col-span-2 h-11 font-bold" onClick={() => openPay(o)}>
                          <HandCoins className="h-4.5 w-4.5" /> Terima Pembayaran
                        </Button>
                        <Button
                          variant="outline"
                          className="h-10 text-destructive hover:text-destructive"
                          onClick={() => {
                            setCancelTarget(o);
                            setCancelReason("");
                          }}
                        >
                          <XCircle className="h-4 w-4" /> Batalkan
                        </Button>
                        <ReceiptButton
                          orderNumber={o.orderNumber}
                          type="customer"
                          className="h-10"
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ============ SEDANG DIPROSES ============ */}
          <section className="space-y-3" aria-label="Sedang diproses">
            <SectionTitle
              icon={ClipboardList}
              title="Sedang Diproses"
              count={processing.length}
              hint="Dikerjakan barista — pantau progres pembuatan item."
            />
            {processing.length === 0 ? (
              <EmptyBox text="Tidak ada pesanan dalam pengerjaan." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {processing.map((o) => {
                  const done = o.items.filter((i) => i.isDone).length;
                  const totalItems = o.items.length;
                  const pct = totalItems ? Math.round((done / totalItems) * 100) : 0;
                  return (
                    <Card key={o.id} className="shadow-sm">
                      <CardContent className="space-y-2.5 p-4">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-mono text-sm font-bold tracking-wide">{o.orderNumber}</p>
                          <div className="flex items-center gap-1.5">
                            <ChannelBadge channel={o.channel} />
                            <OrderStatusBadge status={o.status} />
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {o.customerName} · {formatWibTime(o.createdAt)} WIB
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          <FulfillmentBadge fulfillment={o.fulfillment} />
                          <span className="text-xs text-muted-foreground">
                            {fulfillmentLocationText(o)}
                          </span>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Progres item</span>
                            <span className="font-semibold tabular-nums">
                              {done}/{totalItems} selesai
                            </span>
                          </div>
                          <Progress value={pct} className="h-2" aria-label={`Progres ${pct}%`} />
                        </div>
                        <ItemRows order={o} />
                        <div className="flex justify-between border-t pt-2 text-sm">
                          <span className="text-muted-foreground">Total</span>
                          <span className="font-bold tabular-nums">{formatRupiah(o.total)}</span>
                        </div>
                        <ReceiptButton orderNumber={o.orderNumber} type="kitchen" className="h-10 w-full" />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* ============ SIAP — SERAH TERIMA ============ */}
          <section className="space-y-3" aria-label="Siap serah terima">
            <SectionTitle
              icon={PackageCheck}
              title="Siap — Serah Terima"
              count={ready.length}
              hint="Selesai dibuat — serahkan ke pembeli atau kirim ke lokasi antar."
            />
            {ready.length === 0 ? (
              <EmptyBox text="Belum ada pesanan yang siap." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {ready.map((o) => (
                  <Card key={o.id} className="border-emerald-300/70 shadow-sm">
                    <CardContent className="space-y-2.5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-base font-bold tracking-wide">{o.orderNumber}</p>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <p className="text-sm font-semibold">
                        {o.customerName}
                        <span className="ml-2 text-xs font-normal text-muted-foreground">
                          {timeAgo(o.createdAt)}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <FulfillmentBadge fulfillment={o.fulfillment} />
                        <span className="text-xs text-muted-foreground">
                          {fulfillmentLocationText(o)}
                        </span>
                      </div>
                      {o.fulfillment === "DELIVERY" && o.deliveryNote ? (
                        <p className="rounded-md bg-gold-soft/70 px-2 py-1 text-xs font-medium">
                          Catatan antar: {o.deliveryNote}
                        </p>
                      ) : null}
                      <ItemRows order={o} />
                      {o.fulfillment === "DELIVERY" ? (
                        <Button
                          className="h-11 w-full font-bold"
                          disabled={actionBusy === `${o.id}-antar`}
                          onClick={() => void doAction(o, "antar")}
                        >
                          {actionBusy === `${o.id}-antar` ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                          ) : (
                            <Truck className="h-4.5 w-4.5" />
                          )}
                          Kirim Sekarang
                        </Button>
                      ) : (
                        <Button
                          className="h-11 w-full font-bold"
                          disabled={actionBusy === `${o.id}-serahkan`}
                          onClick={() => void doAction(o, "serahkan")}
                        >
                          {actionBusy === `${o.id}-serahkan` ? (
                            <Loader2 className="h-4.5 w-4.5 animate-spin" />
                          ) : (
                            <CheckCheck className="h-4.5 w-4.5" />
                          )}
                          Sudah Diserahkan
                        </Button>
                      )}
                      <div className="grid grid-cols-2 gap-2">
                        <ReceiptButton orderNumber={o.orderNumber} type="customer" className="h-9" />
                        <ReceiptButton orderNumber={o.orderNumber} type="kitchen" className="h-9" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          {/* ============ SEDANG DIANTAR ============ */}
          <section className="space-y-3" aria-label="Sedang diantar">
            <SectionTitle
              icon={Bike}
              title="Sedang Diantar"
              count={delivering.length}
              hint="Pesanan antar dalam perjalanan — konfirmasi saat sampai tujuan."
            />
            {delivering.length === 0 ? (
              <EmptyBox text="Tidak ada pesanan yang sedang diantar." />
            ) : (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {delivering.map((o) => (
                  <Card key={o.id} className="border-teal-300/70 shadow-sm">
                    <CardContent className="space-y-2.5 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-base font-bold tracking-wide">{o.orderNumber}</p>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <p className="text-sm font-semibold">{o.customerName}</p>
                      <div className="flex items-start gap-2 rounded-lg border border-teal-200 bg-teal-50 p-2.5 text-sm dark:border-teal-800 dark:bg-teal-950/40">
                        <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" />
                        <div className="min-w-0 leading-tight">
                          <p className="font-semibold">
                            {[o.deliveryBuilding, o.deliveryRoom].filter(Boolean).join(" · ") || "-"}
                          </p>
                          {o.deliveryNote ? (
                            <p className="text-xs text-muted-foreground">{o.deliveryNote}</p>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        className="h-11 w-full font-bold"
                        disabled={actionBusy === `${o.id}-diterima`}
                        onClick={() => void doAction(o, "diterima")}
                      >
                        {actionBusy === `${o.id}-diterima` ? (
                          <Loader2 className="h-4.5 w-4.5 animate-spin" />
                        ) : (
                          <CheckCheck className="h-4.5 w-4.5" />
                        )}
                        Sampai Tujuan
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {/* ===== Dialog pembayaran ===== */}
      <PaymentDialog
        open={payTarget !== null}
        onOpenChange={(o) => {
          if (!o) setPayTarget(null);
        }}
        total={payTarget?.total ?? 0}
        title={`Terima Pembayaran — ${payTarget?.orderNumber ?? ""}`}
        description={
          payTarget
            ? `${payTarget.customerName} · ${FULFILLMENT_LABEL[payTarget.fulfillment]} · ${payTarget.items.length} jenis menu`
            : undefined
        }
        cashEnabled={cafe?.cashEnabled ?? true}
        qrisEnabled={cafe?.qrisEnabled ?? true}
        submitting={paying}
        onConfirm={(method, cashReceived) => void submitPay(method, cashReceived)}
      />

      {/* ===== Dialog pembatalan ===== */}
      <Dialog
        open={cancelTarget !== null}
        onOpenChange={(o) => {
          if (!o) setCancelTarget(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Batalkan Pesanan?</DialogTitle>
            <DialogDescription>
              {cancelTarget?.orderNumber} — {cancelTarget?.customerName}. Pesanan yang dibatalkan
              tidak bisa dikembalikan. Beri alasan untuk catatan aktivitas.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="cancel-reason">Alasan pembatalan</Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              maxLength={200}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Contoh: pembeli membatalkan, salah pesan…"
              className="min-h-20"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              disabled={cancelling || cancelReason.trim().length < 3}
              onClick={() => void submitCancel()}
            >
              {cancelling ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Ya, Batalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Sukses pembayaran → tawarkan cetak struk ===== */}
      <Dialog
        open={paidSuccess !== null}
        onOpenChange={(o) => {
          if (!o) setPaidSuccess(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader className="items-center text-center sm:text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60">
              <CheckCheck className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
            </div>
            <DialogTitle className="font-display text-xl">Pembayaran Diterima</DialogTitle>
            <DialogDescription asChild>
              <div>
                <p className="font-mono text-lg font-bold tracking-widest text-foreground">
                  {paidSuccess?.orderNumber}
                </p>
                <p>Total {formatRupiah(paidSuccess?.total ?? 0)} — pesanan masuk antrean dapur.</p>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            {paidSuccess ? (
              <div className="grid w-full grid-cols-2 gap-2">
                <ReceiptButton
                  orderNumber={paidSuccess.orderNumber}
                  type="customer"
                  label="Struk Pelanggan"
                  className="h-11"
                />
                <ReceiptButton
                  orderNumber={paidSuccess.orderNumber}
                  type="kitchen"
                  label="Struk Dapur"
                  className="h-11"
                />
              </div>
            ) : null}
            <Button className="h-11 w-full font-bold" onClick={() => setPaidSuccess(null)}>
              Selesai
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
