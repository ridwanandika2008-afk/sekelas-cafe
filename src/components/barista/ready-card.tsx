"use client";

/**
 * Kartu ringkas untuk bagian "Siap / Penyerahan" (status READY & DELIVERING).
 * Tanpa tombol aksi — penyerahan dilakukan kasir.
 */
import { Bike, CheckCircle2, Clock, MapPin, Utensils } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatWibTime } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { type BaristaOrder, orderSeq } from "./types";

/** Durasi menunggu sejak pesanan dibuat: "3 mnt" / "2 jam" */
function waitDuration(createdAt: string): string {
  const diff = Math.floor((Date.now() - new Date(createdAt).getTime()) / 1000);
  if (diff < 60) return "< 1 mnt";
  if (diff < 3600) return `${Math.floor(diff / 60)} mnt`;
  return `${Math.floor(diff / 3600)} jam`;
}

export function ReadyCard({
  order,
  readyAt,
}: {
  order: BaristaOrder;
  readyAt: Date | null;
}) {
  const isDelivering = order.status === "DELIVERING";
  const timeLabel = readyAt
    ? `siap ${formatWibTime(readyAt)}`
    : `masuk ${formatWibTime(order.createdAt)}`;
  const itemsLine = order.items.map((i) => `${i.name} ×${i.qty}`).join(", ");

  return (
    <article
      className={cn(
        "rounded-xl border bg-card p-3.5 shadow-sm",
        isDelivering ? "border-teal-200 dark:border-teal-800" : "border-emerald-200 dark:border-emerald-800"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-mono text-[10px] tracking-wide text-muted-foreground">
            {order.orderNumber}
          </p>
          <p className="font-display text-2xl font-bold leading-none">
            <span className="text-gold">#</span>
            {orderSeq(order.orderNumber)}
          </p>
        </div>
        {isDelivering ? (
          <Badge className="gap-1 border-teal-300 bg-teal-100 text-xs text-teal-900 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-200">
            <Bike className="h-3.5 w-3.5" aria-hidden /> Sedang Diantar
          </Badge>
        ) : (
          <Badge className="gap-1 border-emerald-300 bg-emerald-100 text-xs text-emerald-800 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden />
            {order.fulfillment === "DELIVERY" ? "Siap Diantar" : "Siap Diambil"}
          </Badge>
        )}
      </div>

      <p className="mt-1.5 text-sm font-bold">{order.customerName || "Tanpa Nama"}</p>

      {isDelivering && order.deliveryBuilding && (
        <p className="mt-1 flex items-center gap-1 text-xs font-bold text-teal-800 dark:text-teal-300">
          <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
          {[order.deliveryBuilding, order.deliveryRoom].filter(Boolean).join(" — ")}
        </p>
      )}
      {order.fulfillment === "DINE_IN" && order.tableNumber && (
        <p className="mt-1 flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <Utensils className="h-3.5 w-3.5 shrink-0" aria-hidden /> Meja {order.tableNumber}
        </p>
      )}

      <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
        {itemsLine}
      </p>
      <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
        <Clock className="h-3 w-3 shrink-0" aria-hidden />
        {timeLabel} · menunggu {waitDuration(order.createdAt)}
      </p>
    </article>
  );
}
