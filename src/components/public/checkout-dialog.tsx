"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Bike,
  CheckCircle2,
  Clock,
  Loader2,
  QrCode,
  ShoppingBag,
  Tag,
  Utensils,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { cartSubtotal, useCart } from "@/lib/cart-store";
import { formatRupiah } from "@/lib/format";
import { PAYMENT_METHOD_LABEL, QRIS_NOTE } from "@/lib/constants";
import { saveOrderEntry } from "./order-history";
import {
  promoDiscount,
  type CafeResponse,
  type CreateOrderResult,
  type Fulfillment,
  type PaymentMethod,
  type PublicPromo,
} from "./types";

const emptySubscribe = () => () => {};

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cafe: CafeResponse | null;
  promos: PublicPromo[];
};

/**
 * Dialog checkout: data pemesan → penerimaan → pembayaran → promo → ringkasan → sukses.
 * Seluruh state form hidup di <CheckoutBody> yang ter-unmount saat dialog tertutup,
 * sehingga setiap pembukaan dialog selalu mulai bersih.
 */
export function CheckoutDialog({ open, onOpenChange, cafe, promos }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <CheckoutBody cafe={cafe} promos={promos} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}

function CheckoutBody({
  cafe,
  promos,
  onClose,
}: {
  cafe: CafeResponse | null;
  promos: PublicPromo[];
  onClose: () => void;
}) {
  const items = useCart((s) => s.items);
  const clearCart = useCart((s) => s.clear);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const list = mounted ? items : [];

  const [name, setName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [fulfillment, setFulfillment] = useState<Fulfillment>("DINE_IN");
  const [tableNumber, setTableNumber] = useState("");
  const [deliveryBuilding, setDeliveryBuilding] = useState("");
  const [deliveryRoom, setDeliveryRoom] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [payment, setPayment] = useState<PaymentMethod>("CASH");
  const [promoId, setPromoId] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<CreateOrderResult | null>(null);
  const [statusNow, setStatusNow] = useState<{ isOpen: boolean; message: string } | null>(null);

  const subtotal = cartSubtotal(list);
  const deliveryInfo = cafe?.cafe;
  const deliveryEnabled = deliveryInfo?.deliveryEnabled ?? false;
  const deliveryFee =
    fulfillment === "DELIVERY" && deliveryEnabled ? (deliveryInfo?.deliveryFee ?? 0) : 0;

  const eligiblePromos = useMemo(
    () => promos.filter((p) => subtotal >= p.minOrder),
    [promos, subtotal]
  );
  const selectedPromo = eligiblePromos.find((p) => p.id === promoId) ?? null;
  const discount = selectedPromo ? promoDiscount(selectedPromo, subtotal) : 0;
  const total = subtotal - discount + deliveryFee;

  // Segarkan status buka kafe saat checkout dibuka (jam operasional bisa berubah).
  useEffect(() => {
    fetch("/api/public/cafe", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: CafeResponse | null) => {
        if (!d) return;
        setStatusNow({ isOpen: d.status.isOpen, message: d.status.message });
        if (!d.cafe.cashEnabled && d.cafe.qrisEnabled) setPayment("QRIS");
        if (d.cafe.cashEnabled && !d.cafe.qrisEnabled) setPayment("CASH");
      })
      .catch(() => {});
  }, []);

  const isOpen = statusNow?.isOpen ?? cafe?.status.isOpen ?? true;
  const closedMessage = statusNow?.message ?? cafe?.status.message ?? "";

  const nameValid = name.trim().length >= 2;
  const deliveryValid = fulfillment !== "DELIVERY" || deliveryBuilding.trim().length > 0;
  const canSubmit = list.length > 0 && nameValid && deliveryValid && !submitting && isOpen;

  const submit = async () => {
    if (!canSubmit || submitting) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/public/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          fulfillment,
          ...(fulfillment === "DINE_IN" && tableNumber.trim()
            ? { tableNumber: tableNumber.trim() }
            : {}),
          ...(fulfillment === "DELIVERY"
            ? {
                deliveryBuilding: deliveryBuilding.trim(),
                deliveryRoom: deliveryRoom.trim() || null,
                deliveryNote: deliveryNote.trim() || null,
              }
            : {}),
          note: note.trim() || null,
          items: list.map((l) => ({
            menuItemId: l.menuItemId,
            qty: l.qty,
            note: l.note ?? null,
            optionIds: l.selectedOptions.map((o) => o.optionId),
          })),
          promoId: selectedPromo?.id ?? null,
        }),
      });
      const data = (await res.json().catch(() => null)) as
        | (CreateOrderResult & { error?: string })
        | null;
      if (!res.ok || !data?.orderNumber) {
        toast.error(data?.error ?? "Gagal membuat pesanan. Coba lagi ya.");
        return;
      }
      saveOrderEntry({
        orderNumber: data.orderNumber,
        accessKey: data.accessKey,
        total: data.total,
        customerName: name.trim(),
        createdAt: new Date().toISOString(),
      });
      setSuccess({ orderNumber: data.orderNumber, accessKey: data.accessKey, total: data.total });
      clearCart();
      toast.success("Pesanan berhasil dibuat!");
    } catch {
      toast.error("Koneksi bermasalah. Coba lagi ya.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex flex-col items-center py-2 text-center">
        <DialogHeader className="sr-only">
          <DialogTitle>Pesanan Berhasil</DialogTitle>
          <DialogDescription>Pesanan berhasil dibuat.</DialogDescription>
        </DialogHeader>
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
          <CheckCircle2 className="h-9 w-9" aria-hidden />
        </div>
        <p className="mt-4 text-sm text-muted-foreground">Pesananmu berhasil dibuat!</p>
        <p className="mt-1 font-display text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          {success.orderNumber}
        </p>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted-foreground">
          Tunjukkan nomor pesanan ini ke kasir untuk{" "}
          <strong className="text-foreground">bayar</strong> dan{" "}
          <strong className="text-foreground">mengambil</strong> pesananmu ya.
        </p>
        <div className="mt-4 rounded-xl bg-muted px-4 py-2.5 text-sm">
          Total <strong className="tabular-nums">{formatRupiah(success.total)}</strong> ·{" "}
          {PAYMENT_METHOD_LABEL[payment]}
        </div>
        <div className="mt-6 grid w-full gap-2 sm:grid-cols-2">
          <Button asChild size="lg">
            <Link href={`/pesanan/${success.orderNumber}?k=${success.accessKey}`} onClick={onClose}>
              Lihat Status Pesanan
            </Link>
          </Button>
          <Button variant="outline" size="lg" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="flex flex-col items-center py-6 text-center">
        <DialogHeader className="sr-only">
          <DialogTitle>Checkout</DialogTitle>
          <DialogDescription>Keranjang kosong.</DialogDescription>
        </DialogHeader>
        <ShoppingBag className="h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="mt-3 font-semibold">Keranjangmu masih kosong</p>
        <p className="mt-1 text-sm text-muted-foreground">Pilih menu dulu yuk!</p>
        <Button asChild className="mt-5 rounded-full">
          <Link href="/menu" onClick={onClose}>
            Lihat Menu
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <>
      <DialogHeader className="text-left">
        <DialogTitle className="font-display text-2xl">Checkout</DialogTitle>
        <DialogDescription>
          Lengkapi datamu — bayar &amp; ambil pesanan di kasir Sekelas Cafe.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-5">
        {/* Nama pemesan */}
        <div className="space-y-1.5">
          <Label htmlFor="co-name">
            Nama Pemesan <span className="text-destructive">*</span>
          </Label>
          <Input
            id="co-name"
            value={name}
            maxLength={60}
            placeholder="mis. Rani kelas XI RPL"
            autoComplete="name"
            aria-invalid={nameTouched && !nameValid}
            onChange={(e) => setName(e.target.value)}
            onBlur={() => setNameTouched(true)}
          />
          {nameTouched && !nameValid && (
            <p className="text-xs font-medium text-destructive">
              Isi nama kamu dulu ya (min. 2 huruf).
            </p>
          )}
        </div>

        {/* Metode penerimaan */}
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">Metode Penerimaan</legend>
          <RadioGroup
            value={fulfillment}
            onValueChange={(v) => setFulfillment(v as Fulfillment)}
            className="grid gap-2"
          >
            {[
              {
                value: "DINE_IN" as const,
                icon: Utensils,
                title: "Makan di Tempat",
                desc: "Nikmati di kafe, santai sambil nunggu.",
              },
              {
                value: "TAKEAWAY" as const,
                icon: ShoppingBag,
                title: "Bawa Pulang",
                desc: "Dibungkus rapi, ambil di kasir.",
              },
              ...(deliveryEnabled
                ? [
                    {
                      value: "DELIVERY" as const,
                      icon: Bike,
                      title: "Antar ke Area Sekolah",
                      desc: `Biaya antar ${formatRupiah(deliveryInfo?.deliveryFee ?? 0)}`,
                    },
                  ]
                : []),
            ].map((opt) => (
              <Label
                key={opt.value}
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 font-normal transition-colors",
                  "has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/5"
                )}
              >
                <RadioGroupItem value={opt.value} className="mt-0.5" />
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <opt.icon className="h-4 w-4 text-gold" aria-hidden />
                    {opt.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{opt.desc}</span>
                </span>
              </Label>
            ))}
          </RadioGroup>
        </fieldset>

        {/* Field kondisional per metode */}
        {fulfillment === "DINE_IN" && (
          <div className="space-y-1.5">
            <Label htmlFor="co-table">Nomor Meja (opsional)</Label>
            <Input
              id="co-table"
              value={tableNumber}
              maxLength={20}
              placeholder="mis. Meja 4"
              onChange={(e) => setTableNumber(e.target.value)}
            />
          </div>
        )}

        {fulfillment === "DELIVERY" && (
          <div className="space-y-3 rounded-xl border border-dashed bg-gold-soft/50 p-4">
            <div className="space-y-1.5">
              <Label htmlFor="co-building">
                Gedung / Ruang / Titik Antar <span className="text-destructive">*</span>
              </Label>
              <Input
                id="co-building"
                value={deliveryBuilding}
                maxLength={100}
                placeholder="mis. Gedung Teknik / depan Lab Komputer"
                aria-invalid={!deliveryValid}
                onChange={(e) => setDeliveryBuilding(e.target.value)}
              />
              {!deliveryValid && (
                <p className="text-xs font-medium text-destructive">Isi lokasi antar dulu ya.</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-room">Detail Ruang / Kelas (opsional)</Label>
              <Input
                id="co-room"
                value={deliveryRoom}
                maxLength={100}
                placeholder="mis. Rpl 2 / lantai 2"
                onChange={(e) => setDeliveryRoom(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="co-dnote">Catatan Antar (opsional)</Label>
              <Input
                id="co-dnote"
                value={deliveryNote}
                maxLength={200}
                placeholder="mis. tolong titip ke satpam dulu"
                onChange={(e) => setDeliveryNote(e.target.value)}
              />
            </div>
          </div>
        )}

        {/* Metode pembayaran */}
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold">Metode Pembayaran</legend>
          <RadioGroup
            value={payment}
            onValueChange={(v) => setPayment(v as PaymentMethod)}
            className="grid gap-2"
          >
            {(cafe?.cafe.cashEnabled ?? true) && (
              <Label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 font-normal transition-colors",
                  "has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/5"
                )}
              >
                <RadioGroupItem value="CASH" className="mt-0.5" />
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <Wallet className="h-4 w-4 text-gold" aria-hidden />
                    Tunai
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Bayar di kasir saat ambil pesanan.
                  </span>
                </span>
              </Label>
            )}
            {(cafe?.cafe.qrisEnabled ?? true) && (
              <Label
                className={cn(
                  "flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 font-normal transition-colors",
                  "has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/5"
                )}
              >
                <RadioGroupItem value="QRIS" className="mt-0.5" />
                <span>
                  <span className="flex items-center gap-2 text-sm font-semibold">
                    <QrCode className="h-4 w-4 text-gold" aria-hidden />
                    QRIS
                  </span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    Scan di kasir, tunjukkan bukti ke kasir.
                  </span>
                </span>
              </Label>
            )}
          </RadioGroup>
          {payment === "QRIS" && (
            <p className="rounded-lg bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
              {QRIS_NOTE}
            </p>
          )}
        </fieldset>

        {/* Promo */}
        <fieldset className="space-y-2">
          <legend className="mb-1 flex items-center gap-1.5 text-sm font-semibold">
            <Tag className="h-4 w-4 text-gold" aria-hidden /> Promo
          </legend>
          {eligiblePromos.length > 0 ? (
            <RadioGroup value={promoId} onValueChange={setPromoId} className="grid gap-2">
              <Label
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3 font-normal transition-colors",
                  "has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/5"
                )}
              >
                <span className="flex items-center gap-2.5 text-sm font-medium">
                  <RadioGroupItem value="" />
                  Tanpa promo
                </span>
              </Label>
              {eligiblePromos.map((p) => (
                <Label
                  key={p.id}
                  className={cn(
                    "flex cursor-pointer items-center justify-between gap-2 rounded-xl border px-3.5 py-3 font-normal transition-colors",
                    "has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/5"
                  )}
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <RadioGroupItem value={p.id} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{p.name}</span>
                      <span className="block text-xs text-muted-foreground">
                        Min. belanja {formatRupiah(p.minOrder)}
                      </span>
                    </span>
                  </span>
                  <span className="whitespace-nowrap text-xs font-bold text-emerald-700">
                    −{formatRupiah(promoDiscount(p, subtotal))}
                  </span>
                </Label>
              ))}
            </RadioGroup>
          ) : promos.length > 0 ? (
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Ada promo menunggumu — belanja mulai{" "}
              {formatRupiah(Math.min(...promos.map((p) => p.minOrder)))} untuk membuka promo.
            </p>
          ) : (
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              Belum ada promo aktif saat ini.
            </p>
          )}
        </fieldset>

        {/* Catatan pesanan */}
        <div className="space-y-1.5">
          <Label htmlFor="co-note">Catatan Pesanan (opsional)</Label>
          <Textarea
            id="co-note"
            value={note}
            maxLength={200}
            rows={2}
            placeholder="mis. tolong dibuat lebih cepat, istirahat cuma 15 menit"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <Separator />

        {/* Ringkasan biaya */}
        <div className="space-y-2 rounded-xl bg-muted/60 p-4 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal ({list.reduce((s, l) => s + l.qty, 0)} item)</span>
            <span className="tabular-nums">{formatRupiah(subtotal)}</span>
          </div>
          {discount > 0 && (
            <div className="flex justify-between font-medium text-emerald-700">
              <span>Diskon {selectedPromo ? `· ${selectedPromo.name}` : ""}</span>
              <span className="tabular-nums">−{formatRupiah(discount)}</span>
            </div>
          )}
          {deliveryFee > 0 && (
            <div className="flex justify-between text-muted-foreground">
              <span>Biaya antar</span>
              <span className="tabular-nums">{formatRupiah(deliveryFee)}</span>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <span className="font-semibold">Total</span>
            <span className="font-display text-xl font-bold tabular-nums text-primary">
              {formatRupiah(total)}
            </span>
          </div>
        </div>

        {/* Status kafe tutup */}
        {!isOpen && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <Clock className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
            <div>
              <p className="font-semibold">Kafe sedang tidak menerima pesanan</p>
              <p className="mt-0.5 leading-relaxed">{closedMessage}</p>
            </div>
          </div>
        )}

        <Button size="lg" className="w-full" onClick={submit} disabled={!canSubmit}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Membuat pesanan…
            </>
          ) : !isOpen ? (
            "Kafe Sedang Tutup"
          ) : !nameValid ? (
            "Isi Nama Dulu"
          ) : !deliveryValid ? (
            "Isi Lokasi Antar Dulu"
          ) : (
            `Buat Pesanan — ${formatRupiah(total)}`
          )}
        </Button>
        {!isOpen && (
          <p className="text-center text-xs text-muted-foreground">
            Kamu tetap bisa menyiapkan pesanan — kembali lagi saat kafe buka ya.
          </p>
        )}
      </div>
    </>
  );
}
