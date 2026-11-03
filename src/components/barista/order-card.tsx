"use client";

/**
 * Kartu pesanan besar untuk kolom "Harus Dikerjakan".
 * Inti: checklist item optimistic + progres + tombol tandai siap.
 */
import {
  AlertTriangle,
  Bike,
  Check,
  CheckCircle2,
  ListChecks,
  Loader2,
  Lock,
  MapPin,
  ShoppingBag,
  Store,
  User,
  Utensils,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatWibTime, timeAgo } from "@/lib/format";
import { CHANNEL_LABEL } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  type BaristaItem,
  type BaristaOrder,
  itemProgress,
  optionSummary,
  orderSeq,
} from "./types";

const FULFILLMENT_BADGE: Record<
  string,
  { label: string; icon: typeof Utensils; className: string }
> = {
  DINE_IN: {
    label: "Di Tempat",
    icon: Utensils,
    className:
      "border-stone-300 bg-stone-100 text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300",
  },
  TAKEAWAY: {
    label: "Bawa Pulang",
    icon: ShoppingBag,
    className:
      "border-[#d9c5a3] bg-[#efe4d3] text-[#5a4326] dark:border-[#5a4326] dark:bg-[#33271a] dark:text-[#e5d5b8]",
  },
  DELIVERY: {
    label: "ANTAR",
    icon: Bike,
    className:
      "border-teal-400 bg-teal-100 font-bold text-teal-900 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-200",
  },
};

function ChecklistRow({
  item,
  pending,
  onToggle,
}: {
  item: BaristaItem;
  pending: boolean;
  onToggle: () => void;
}) {
  const summary = optionSummary(item);
  return (
    <button
      type="button"
      aria-pressed={item.isDone}
      aria-label={`Tandai ${item.name}${item.isDone ? " belum selesai" : " selesai dibuat"}`}
      disabled={pending}
      onClick={onToggle}
      className={cn(
        "group flex min-h-14 w-full items-start gap-3 rounded-xl border-2 p-3 text-left outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50",
        item.isDone
          ? "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
          : "border-border bg-card hover:border-gold hover:bg-gold-soft/50 active:scale-[0.99]"
      )}
    >
      <span
        aria-hidden
        className={cn(
          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-2 transition-colors",
          item.isDone
            ? "border-emerald-600 bg-emerald-600 text-white"
            : "border-input bg-background text-transparent group-hover:border-gold dark:bg-input/30"
        )}
      >
        {pending ? (
          <Loader2 className="h-4.5 w-4.5 animate-spin text-muted-foreground" />
        ) : (
          <Check className="h-5 w-5" strokeWidth={3.5} />
        )}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-2">
          <span
            className={cn(
              "text-base font-bold leading-snug sm:text-lg",
              item.isDone &&
                "text-muted-foreground line-through decoration-emerald-600/70 decoration-2"
            )}
          >
            {item.name}
          </span>
          <span
            className={cn(
              "shrink-0 font-display text-xl font-extrabold leading-none",
              item.isDone ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"
            )}
          >
            ×{item.qty}
          </span>
        </span>
        {summary && (
          <span className="mt-0.5 block truncate text-xs leading-relaxed text-muted-foreground sm:text-[13px]">
            {summary}
          </span>
        )}
        {item.note && (
          <span className="mt-1.5 flex items-start gap-1.5 rounded-md border border-amber-300 bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200">
            <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" aria-hidden />
            {item.note}
          </span>
        )}
      </span>
    </button>
  );
}

export function OrderCard({
  order,
  pendingItems,
  onToggleItem,
  onMarkReady,
  markingReady,
}: {
  order: BaristaOrder;
  pendingItems: Set<string>;
  onToggleItem: (order: BaristaOrder, item: BaristaItem) => void;
  onMarkReady: (order: BaristaOrder) => void;
  markingReady: boolean;
}) {
  const progress = itemProgress(order.items);
  const allDone = progress.total > 0 && progress.done >= progress.total;
  const sisa = Math.max(progress.total - progress.done, 0);
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const isNew = Date.now() - new Date(order.createdAt).getTime() < 60_000;
  const fulfillment = FULFILLMENT_BADGE[order.fulfillment];
  const FulfillmentIcon = fulfillment?.icon ?? Store;

  return (
    <article
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm sm:p-5",
        isNew ? "border-gold ring-2 ring-gold/60" : "border-border"
      )}
    >
      {/* Baris atas: nomor pesanan besar + badge + waktu */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-[11px] tracking-wide text-muted-foreground">
            {order.orderNumber}
          </p>
          <p className="font-display text-4xl font-bold leading-none tracking-tight sm:text-5xl">
            <span className="text-gold">#</span>
            {orderSeq(order.orderNumber)}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          {isNew && (
            <Badge className="border-gold bg-gold font-bold uppercase tracking-widest text-gold-foreground">
              Baru
            </Badge>
          )}
          <div className="flex flex-wrap items-center justify-end gap-1.5">
            <Badge variant="outline" className="text-[11px]">
              {CHANNEL_LABEL[order.channel] ?? order.channel}
            </Badge>
            {fulfillment && (
              <Badge className={cn("gap-1 text-[11px]", fulfillment.className)}>
                <FulfillmentIcon className="h-3.5 w-3.5" aria-hidden />
                {fulfillment.label}
              </Badge>
            )}
          </div>
          <p className="whitespace-nowrap text-xs text-muted-foreground">
            {timeAgo(order.createdAt)} · masuk {formatWibTime(order.createdAt)}
          </p>
        </div>
      </div>

      {/* Pelanggan + lokasi */}
      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl bg-muted/70 px-3 py-2.5">
        <span className="flex items-center gap-1.5 text-sm font-bold sm:text-base">
          <User className="h-4 w-4 text-muted-foreground" aria-hidden />
          {order.customerName || "Tanpa Nama"}
        </span>
        {order.fulfillment === "DINE_IN" && order.tableNumber && (
          <span className="flex items-center gap-1 rounded-md border border-stone-300 bg-stone-100 px-2 py-0.5 text-xs font-bold text-stone-700 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-300">
            <Utensils className="h-3.5 w-3.5" aria-hidden /> Meja {order.tableNumber}
          </span>
        )}
        {order.fulfillment === "DELIVERY" && order.deliveryBuilding && (
          <span className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
            <MapPin
              className="h-4 w-4 shrink-0 text-teal-700 dark:text-teal-400"
              aria-hidden
            />
            <span className="font-extrabold text-teal-800 dark:text-teal-300">
              {[order.deliveryBuilding, order.deliveryRoom].filter(Boolean).join(" — ")}
            </span>
          </span>
        )}
      </div>
      {order.fulfillment === "DELIVERY" && order.deliveryNote && (
        <p className="mt-1.5 rounded-lg border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 dark:border-teal-800 dark:bg-teal-950/50 dark:text-teal-300">
          Catatan antar: {order.deliveryNote}
        </p>
      )}

      {/* Catatan pesanan (peringatan) */}
      {order.note && (
        <div
          role="note"
          className="mt-2.5 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-100 px-3 py-2 text-amber-900 dark:border-amber-700 dark:bg-amber-950/60 dark:text-amber-200"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <div className="min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">
              Catatan Pesanan
            </p>
            <p className="text-sm font-semibold leading-snug">{order.note}</p>
          </div>
        </div>
      )}

      {/* Checklist item */}
      <div className="mb-2 mt-4 flex items-center gap-2">
        <ListChecks className="h-4 w-4 text-muted-foreground" aria-hidden />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
          Checklist Menu
        </p>
      </div>
      <div className="space-y-2">
        {order.items.map((item) => (
          <ChecklistRow
            key={item.id}
            item={item}
            pending={pendingItems.has(item.id)}
            onToggle={() => onToggleItem(order, item)}
          />
        ))}
      </div>

      {/* Progres */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-base font-bold sm:text-lg">
            {progress.done}{" "}
            <span className="font-normal text-muted-foreground">
              dari {progress.total} porsi selesai dibuat
            </span>
          </p>
          {allDone ? (
            <span className="flex items-center gap-1 text-sm font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="h-4.5 w-4.5" aria-hidden /> Semua selesai
            </span>
          ) : (
            <span className="text-sm font-semibold text-muted-foreground">
              sisa {sisa} porsi
            </span>
          )}
        </div>
        <div
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={progress.total}
          aria-valuenow={progress.done}
          aria-label={`Progres pesanan ${order.orderNumber}`}
          className="h-3 w-full overflow-hidden rounded-full bg-muted dark:bg-white/15"
        >
          <div
            className="h-full rounded-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Tombol tandai siap */}
      <Button
        type="button"
        size="lg"
        disabled={!allDone || markingReady}
        onClick={() => onMarkReady(order)}
        className={cn(
          "mt-3 min-h-14 w-full rounded-xl px-3 text-center text-base font-bold leading-snug whitespace-normal",
          allDone
            ? "bg-emerald-600 text-white shadow-md hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-500"
            : "bg-secondary text-muted-foreground"
        )}
      >
        {markingReady ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden /> Menandai siap…
          </>
        ) : allDone ? (
          <>
            <CheckCircle2 className="h-5 w-5" aria-hidden /> Tandai Pesanan Siap
          </>
        ) : (
          <>
            <Lock className="h-4 w-4" aria-hidden /> Selesaikan semua menu dulu (sisa {sisa}{" "}
            porsi)
          </>
        )}
      </Button>
    </article>
  );
}
