"use client";

/**
 * Komponen struk (thermal 58mm) untuk pelanggan & dapur.
 * Mengambil data dari GET /api/receipt/{orderNumber}?type=…&k=…
 * Dicetak via window.print() — area struk ber-class `print-area`,
 * tombol/chrome dialog ber-class `no-print` (CSS cetak disediakan globals.css
 * + isolasi tambahan di bawah agar hanya struk yang tercetak).
 */
import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, Loader2, Printer } from "lucide-react";
import { formatRupiah, formatWibDateTime } from "@/lib/format";
import { FULFILLMENT_LABEL, PAYMENT_METHOD_LABEL, PAYMENT_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export type ReceiptType = "customer" | "kitchen";

export type ReceiptData = {
  type: ReceiptType;
  cafe: { name: string; address: string; footer: string; whatsapp: string };
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
    cashReceived: number | null;
    cashChange: number | null;
    createdAt: string;
    items: {
      name: string;
      qty: number;
      unitPrice: number;
      note: string | null;
      isDone: boolean;
      options: { groupName: string; optionName: string }[];
    }[];
  };
};

/** Isolasi cetak: hanya struk (dan portal yang memuatnya) yang tampil. */
const PRINT_CSS = `
@media print {
  body:has(.print-area) > *:not(:has(.print-area)) { display: none !important; }
  body:has(.print-area) [data-slot="dialog-overlay"] { display: none !important; }
  body:has(.print-area) [data-slot="dialog-close"] { display: none !important; }
  body:has(.print-area) [data-slot="dialog-content"]:has(.print-area) {
    position: static !important;
    transform: none !important;
    translate: none !important;
    width: 72mm !important;
    max-width: 72mm !important;
    max-height: none !important;
    height: auto !important;
    overflow: visible !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    background: transparent !important;
    gap: 0 !important;
    display: block !important;
  }
}
`;

function DashedLine({ className }: { className?: string }) {
  return <div className={cn("my-2 border-t border-dashed border-neutral-400", className)} />;
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-2", bold && "font-bold")}>
      <span className="shrink-0">{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}

function fulfillmentText(o: ReceiptData["order"]): string {
  if (o.fulfillment === "DINE_IN")
    return o.tableNumber ? `${FULFILLMENT_LABEL.DINE_IN} — Meja ${o.tableNumber}` : FULFILLMENT_LABEL.DINE_IN;
  if (o.fulfillment === "DELIVERY") return FULFILLMENT_LABEL.DELIVERY;
  return FULFILLMENT_LABEL.TAKEAWAY;
}

/** Struk pelanggan — lengkap dengan rincian uang. */
function CustomerReceipt({ data }: { data: ReceiptData }) {
  const { cafe, order: o } = data;
  return (
    <div className="font-mono text-[11px] leading-snug text-neutral-900">
      <div className="text-center">
        <p className="text-sm font-bold tracking-wider uppercase">{cafe.name}</p>
        <p className="mt-0.5 text-[9px] leading-tight text-neutral-600">{cafe.address}</p>
      </div>
      <DashedLine />
      <p className="text-center text-base font-bold tracking-widest">{o.orderNumber}</p>
      <p className="mt-0.5 text-center text-[10px] text-neutral-600">{formatWibDateTime(o.createdAt)} WIB</p>
      <DashedLine />
      <Row label="Pelanggan" value={o.customerName} />
      <Row label="Penerimaan" value={fulfillmentText(o)} />
      {o.fulfillment === "DELIVERY" ? (
        <p className="mt-0.5">
          → {[o.deliveryBuilding, o.deliveryRoom].filter(Boolean).join(" · ") || "-"}
        </p>
      ) : null}
      {o.note ? <p className="mt-0.5 italic text-neutral-700">Catatan: {o.note}</p> : null}
      <DashedLine />
      <div className="space-y-1.5">
        {o.items.map((it, i) => (
          <div key={i}>
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-semibold">
                {it.qty}× {it.name}
              </span>
              <span className="tabular-nums">{formatRupiah(it.unitPrice * it.qty)}</span>
            </div>
            {it.options.length ? (
              <p className="pl-2 text-[10px] text-neutral-600">
                + {it.options.map((op) => op.optionName).join(" · ")}
              </p>
            ) : null}
            {it.note ? (
              <p className="pl-2 text-[10px] italic text-neutral-600">Catatan: {it.note}</p>
            ) : null}
          </div>
        ))}
      </div>
      <DashedLine />
      <Row label="Subtotal" value={formatRupiah(o.subtotal)} />
      {o.discount > 0 ? (
        <Row label={`Diskon${o.promoName ? ` (${o.promoName})` : ""}`} value={`-${formatRupiah(o.discount)}`} />
      ) : null}
      {o.deliveryFee > 0 ? <Row label="Biaya antar" value={formatRupiah(o.deliveryFee)} /> : null}
      <div className="my-1.5 border-y-2 border-double border-neutral-800 py-1.5 text-sm font-bold">
        <Row label="TOTAL" value={formatRupiah(o.total)} bold />
      </div>
      <Row
        label={o.paymentMethod ? PAYMENT_METHOD_LABEL[o.paymentMethod] : "Pembayaran"}
        value={PAYMENT_STATUS_LABEL[o.paymentStatus] ?? o.paymentStatus}
      />
      {o.paymentMethod === "CASH" && o.cashReceived != null ? (
        <>
          <Row label="Tunai" value={formatRupiah(o.cashReceived)} />
          <Row label="Kembalian" value={formatRupiah(o.cashChange ?? 0)} />
        </>
      ) : null}
      <DashedLine />
      <p className="text-center text-[10px] leading-tight text-neutral-700">{cafe.footer}</p>
      {cafe.whatsapp ? (
        <p className="mt-0.5 text-center text-[9px] text-neutral-600">WA {cafe.whatsapp}</p>
      ) : null}
    </div>
  );
}

/** Struk dapur — fokus pesanan, tanpa info uang. */
function KitchenReceipt({ data }: { data: ReceiptData }) {
  const { cafe, order: o } = data;
  return (
    <div className="font-mono text-[11px] leading-snug text-neutral-900">
      <p className="text-center text-[10px] font-bold tracking-[0.3em] uppercase">« Struk Dapur »</p>
      <p className="mt-2 text-center text-2xl font-black tracking-widest">{o.orderNumber}</p>
      <DashedLine />
      <p className="text-center text-[10px] text-neutral-600">Masuk: {formatWibDateTime(o.createdAt)} WIB</p>
      <div className="mt-1 space-y-0.5">
        <Row label="Pelanggan" value={o.customerName} />
        <Row label="Penerimaan" value={FULFILLMENT_LABEL[o.fulfillment] ?? o.fulfillment} />
      </div>
      {o.fulfillment === "DINE_IN" && o.tableNumber ? (
        <p className="mt-1 text-center text-sm font-bold">MEJA {o.tableNumber}</p>
      ) : null}
      {o.fulfillment === "DELIVERY" ? (
        <div className="mt-1.5 border-2 border-neutral-900 p-1.5">
          <p className="text-[10px] font-bold uppercase">Antar ke:</p>
          <p className="text-sm font-bold leading-tight">
            {[o.deliveryBuilding, o.deliveryRoom].filter(Boolean).join(" · ") || "-"}
          </p>
          {o.deliveryNote ? (
            <p className="mt-0.5 text-[10px] font-bold">Catatan: {o.deliveryNote}</p>
          ) : null}
        </div>
      ) : null}
      {o.note ? <p className="mt-1 italic text-neutral-700">Catatan: {o.note}</p> : null}
      <DashedLine />
      <div className="space-y-2">
        {o.items.map((it, i) => (
          <div key={i}>
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-black tabular-nums">{it.qty}×</span>
              <span className="text-sm font-bold uppercase">{it.name}</span>
            </div>
            {it.options.length ? (
              <p className="pl-1 text-[10px] font-semibold text-neutral-700">
                {it.options.map((op) => op.optionName).join(" · ")}
              </p>
            ) : null}
            {it.note ? (
              <p className="mt-0.5 inline-block bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-950">
                CATATAN: {it.note}
              </p>
            ) : null}
          </div>
        ))}
      </div>
      <DashedLine />
      <p className="text-center text-[10px] font-semibold text-neutral-700">
        {cafe.name} — siapkan dengan cinta ☕
      </p>
    </div>
  );
}

export function ReceiptDialog({
  orderNumber,
  type,
  accessKey,
  open,
  onOpenChange,
}: {
  orderNumber: string;
  type: ReceiptType;
  accessKey?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams({ type });
      if (accessKey) qs.set("k", accessKey);
      const res = await fetch(`/api/receipt/${encodeURIComponent(orderNumber)}?${qs.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat struk.");
      setData(json as ReceiptData);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal memuat struk.");
    } finally {
      setLoading(false);
    }
  }, [orderNumber, type, accessKey]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  const isKitchen = type === "kitchen";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] sm:max-w-md">
        <style>{PRINT_CSS}</style>
        <DialogHeader className="no-print">
          <DialogTitle className="font-display">
            {isKitchen ? "Struk Dapur" : "Struk Pelanggan"}
          </DialogTitle>
          <DialogDescription>
            {orderNumber}
            {isKitchen
              ? " — tempel/fokus ke dapur, tanpa rincian uang."
              : " — untuk diserahkan ke pembeli."}
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto rounded-md border bg-neutral-100 p-3">
          {loading ? (
            <div className="flex min-h-40 items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Memuat struk…
            </div>
          ) : error ? (
            <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center text-sm">
              <p className="text-destructive">{error}</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void load()}>
                Coba lagi
              </Button>
            </div>
          ) : data ? (
            <div className="print-area mx-auto w-full max-w-[300px] bg-white px-4 py-3 shadow-sm">
              {isKitchen ? <KitchenReceipt data={data} /> : <CustomerReceipt data={data} />}
            </div>
          ) : null}
        </div>

        <DialogFooter className="no-print">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
          <Button type="button" disabled={!data} onClick={() => window.print()}>
            <Printer className="h-4 w-4" /> Cetak
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Tombol pintu cepat membuka dialog struk (dipakai di beberapa halaman). */
export function ReceiptButton({
  orderNumber,
  type,
  accessKey,
  label,
  variant = "outline",
  size = "sm",
  className,
}: {
  orderNumber: string;
  type: ReceiptType;
  accessKey?: string;
  label?: string;
  variant?: "outline" | "secondary" | "ghost" | "default" | "destructive" | "link";
  size?: "sm" | "default" | "lg" | "icon";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const isKitchen = type === "kitchen";
  return (
    <>
      <Button
        type="button"
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
      >
        {isKitchen ? <CheckCircle2 className="h-4 w-4" /> : <Printer className="h-4 w-4" />}
        {label ?? (isKitchen ? "Struk Dapur" : "Struk Pelanggan")}
      </Button>
      <ReceiptDialog
        orderNumber={orderNumber}
        type={type}
        accessKey={accessKey}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
