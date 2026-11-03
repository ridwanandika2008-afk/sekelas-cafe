"use client";

import { useState, useSyncExternalStore } from "react";
import { Coffee, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cartSubtotal, cartTotalUnits, useCart } from "@/lib/cart-store";
import { formatRupiah } from "@/lib/format";

const emptySubscribe = () => () => {};

/** Baris-baris item keranjang + stepper qty + hapus. Dipakai panel & sheet. */
export function CartLines() {
  const items = useCart((s) => s.items);
  const setQty = useCart((s) => s.setQty);
  const removeItem = useCart((s) => s.removeItem);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-10 text-center text-muted-foreground">
        <Coffee className="h-9 w-9" aria-hidden />
        <p className="text-sm">Keranjang masih kosong.</p>
        <p className="text-xs">Yuk pilih menu favoritmu dulu!</p>
      </div>
    );
  }

  return (
    <ul className="divide-y">
      {items.map((line) => (
        <li key={line.uid} className="flex gap-3 py-3.5 first:pt-0 last:pb-0">
          {line.imageUrl ? (
            <img
              src={line.imageUrl}
              alt=""
              className="h-14 w-14 shrink-0 rounded-lg border object-cover"
              loading="lazy"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Coffee className="h-5 w-5" aria-hidden />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <p className="truncate text-sm font-semibold">{line.name}</p>
              <p className="whitespace-nowrap text-sm font-semibold tabular-nums">
                {formatRupiah(line.unitPrice * line.qty)}
              </p>
            </div>
            {line.selectedOptions.length > 0 && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {line.selectedOptions.map((o) => o.optionName).join(" · ")}
              </p>
            )}
            {line.note && (
              <p className="truncate text-xs italic text-muted-foreground">“{line.note}”</p>
            )}
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQty(line.uid, line.qty - 1)}
                  aria-label={`Kurangi ${line.name}`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span className="w-7 text-center text-sm font-semibold tabular-nums">
                  {line.qty}
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setQty(line.uid, line.qty + 1)}
                  aria-label={`Tambah ${line.name}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeItem(line.uid)}
                aria-label={`Hapus ${line.name} dari keranjang`}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** Panel keranjang sticky di sisi kanan (desktop). */
export function CartSidebar({ onCheckout }: { onCheckout: () => void }) {
  const items = useCart((s) => s.items);
  // Aman hidrasi: selama SSR keranjang dianggap kosong.
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const list = mounted ? items : [];
  const subtotal = cartSubtotal(list);
  const units = cartTotalUnits(list);

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <ShoppingBag className="h-5 w-5 text-gold" aria-hidden />
          Keranjang
        </h2>
        <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold tabular-nums text-muted-foreground">
          {units} item
        </span>
      </div>
      <Separator className="my-4" />
      <div className="max-h-[44vh] overflow-y-auto pr-1">
        <CartLines />
      </div>
      <Separator className="my-4" />
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">Subtotal</span>
        <span className="text-base font-semibold tabular-nums">{formatRupiah(subtotal)}</span>
      </div>
      <Button className="mt-3 w-full" size="lg" disabled={list.length === 0} onClick={onCheckout}>
        Checkout
      </Button>
      <p className="mt-2.5 text-center text-xs text-muted-foreground">
        Pembayaran tunai / QRIS di kasir.
      </p>
    </div>
  );
}

/** Bar bawah sticky (mobile) + Sheet keranjang. */
export function MobileCartBar({ onCheckout }: { onCheckout: () => void }) {
  const items = useCart((s) => s.items);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [open, setOpen] = useState(false);
  const list = mounted ? items : [];
  const subtotal = cartSubtotal(list);
  const units = cartTotalUnits(list);

  if (list.length === 0) return null;

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-40 border-t bg-card/95 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-[0_-4px_20px_oklch(0.3_0.06_45/0.08)] backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-xl bg-accent px-4 py-3 text-left transition-colors hover:bg-accent/80"
            aria-label="Buka keranjang"
          >
            <span className="relative shrink-0">
              <ShoppingBag className="h-5 w-5" aria-hidden />
              <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold tabular-nums text-primary-foreground">
                {units}
              </span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold tabular-nums">
                {formatRupiah(subtotal)}
              </span>
              <span className="block truncate text-xs text-muted-foreground">Lihat keranjang</span>
            </span>
          </button>
          <Button size="lg" className="rounded-xl" onClick={onCheckout}>
            Checkout
          </Button>
        </div>
      </div>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side="bottom"
          className="flex max-h-[85vh] flex-col rounded-t-3xl pb-[max(1.5rem,env(safe-area-inset-bottom))]"
        >
          <SheetHeader className="px-0 pt-1">
            <SheetTitle className="font-display text-xl">
              Keranjang <span className="text-sm font-normal text-muted-foreground">({units} item)</span>
            </SheetTitle>
            <SheetDescription>Periksa pesananmu sebelum checkout ya.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-4">
            <CartLines />
          </div>
          <div className="space-y-3 px-4 pt-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-base font-semibold tabular-nums">
                {formatRupiah(subtotal)}
              </span>
            </div>
            <Button
              className="w-full"
              size="lg"
              onClick={() => {
                setOpen(false);
                onCheckout();
              }}
            >
              Checkout
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
