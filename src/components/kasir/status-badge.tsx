"use client";

/**
 * Badge status khas modul kasir — memakai kelas warna dari @/lib/constants
 * agar konsisten dengan modul lain.
 */
import { cn } from "@/lib/utils";
import {
  CHANNEL_LABEL,
  FULFILLMENT_LABEL,
  MENU_STATUS_BADGE,
  MENU_STATUS_LABEL,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  PAYMENT_STATUS_LABEL,
} from "@/lib/constants";

const BASE =
  "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap";

export function OrderStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn(BASE, ORDER_STATUS_BADGE[status] ?? "", className)}>
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  UNPAID: "bg-red-100 text-red-700 border-red-300",
  PAID: "bg-emerald-100 text-emerald-800 border-emerald-300",
  CANCELLED: "bg-stone-100 text-stone-500 border-stone-300",
};

export function PaymentStatusBadge({
  status,
  className,
}: {
  status: string | null;
  className?: string;
}) {
  if (!status) return <span className={cn(BASE, "bg-muted text-muted-foreground")}>-</span>;
  return (
    <span className={cn(BASE, PAYMENT_STATUS_COLOR[status] ?? "", className)}>
      {PAYMENT_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function PaymentMethodBadge({
  method,
  className,
}: {
  method: string | null;
  className?: string;
}) {
  if (!method) return <span className={cn(BASE, "bg-muted text-muted-foreground")}>-</span>;
  const color =
    method === "CASH"
      ? "bg-[#efe4d3] text-[#5a4326] border-[#d9c5a3]"
      : "bg-teal-100 text-teal-800 border-teal-300";
  return (
    <span className={cn(BASE, color, className)}>{PAYMENT_METHOD_LABEL[method] ?? method}</span>
  );
}

const CHANNEL_COLOR: Record<string, string> = {
  ONLINE: "bg-rose-100 text-rose-800 border-rose-300",
  POS: "bg-[#efe4d3] text-[#5a4326] border-[#d9c5a3]",
};

export function ChannelBadge({ channel, className }: { channel: string; className?: string }) {
  return (
    <span className={cn(BASE, CHANNEL_COLOR[channel] ?? "", className)}>
      {CHANNEL_LABEL[channel] ?? channel}
    </span>
  );
}

export function MenuStatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <span className={cn(BASE, MENU_STATUS_BADGE[status] ?? "", className)}>
      {MENU_STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function FulfillmentBadge({
  fulfillment,
  className,
}: {
  fulfillment: string;
  className?: string;
}) {
  return (
    <span
      className={cn(BASE, "bg-secondary text-secondary-foreground border-transparent", className)}
    >
      {FULFILLMENT_LABEL[fulfillment] ?? fulfillment}
    </span>
  );
}

/** Teks ringkas lokasi penerimaan: meja / lokasi antar / bawa pulang */
export function fulfillmentLocationText(order: {
  fulfillment: string;
  tableNumber?: string | null;
  deliveryBuilding?: string | null;
  deliveryRoom?: string | null;
}): string {
  if (order.fulfillment === "DINE_IN")
    return order.tableNumber ? `Meja ${order.tableNumber}` : "Meja belum diisi";
  if (order.fulfillment === "DELIVERY") {
    const parts = [order.deliveryBuilding, order.deliveryRoom].filter(Boolean);
    return parts.length ? parts.join(" · ") : "Lokasi antar belum diisi";
  }
  return "Bawa pulang";
}
