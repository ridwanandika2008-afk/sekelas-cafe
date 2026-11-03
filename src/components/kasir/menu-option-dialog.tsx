"use client";

/**
 * Dialog pemilih opsi menu untuk POS.
 * Grup wajib maxSelect=1 → radio; maxSelect>1 → checkbox (dibatasi maksimal).
 * Dilengkapi stepper jumlah & catatan item — UX setara pembeli.
 *
 * State form hidup di <OptionFormInner> yang ter-mount saat dialog terbuka
 * dan di-key per menu — selalu segar tanpa effect reset.
 */
import { useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { MAX_QTY_PER_ITEM } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { PublicMenuItem } from "./types";

export type OptionAddPayload = {
  menuItemId: string;
  name: string;
  qty: number;
  note: string;
  optionIds: string[];
  unitPrice: number;
  options: {
    groupId: string;
    groupName: string;
    optionId: string;
    optionName: string;
    priceDelta: number;
  }[];
};

function OptionFormInner({
  item,
  onAdd,
  onClose,
}: {
  item: PublicMenuItem;
  onAdd: (payload: OptionAddPayload) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<Record<string, string[]>>({});
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const groups = item.optionGroups;

  const toggle = (groupId: string, optionId: string, maxSelect: number) => {
    setSelected((prev) => {
      const current = prev[groupId] ?? [];
      if (current.includes(optionId)) {
        return { ...prev, [groupId]: current.filter((i) => i !== optionId) };
      }
      if (maxSelect === 1) return { ...prev, [groupId]: [optionId] };
      if (current.length >= maxSelect) return prev; // batasi jumlah pilihan
      return { ...prev, [groupId]: [...current, optionId] };
    });
  };

  const chosen = useMemo(() => {
    const out: OptionAddPayload["options"] = [];
    for (const g of groups) {
      for (const o of g.options) {
        if ((selected[g.id] ?? []).includes(o.id)) {
          out.push({
            groupId: g.id,
            groupName: g.name,
            optionId: o.id,
            optionName: o.name,
            priceDelta: o.priceDelta,
          });
        }
      }
    }
    return out;
  }, [groups, selected]);

  const missingRequired = groups.filter((g) => g.isRequired && (selected[g.id] ?? []).length < 1);
  const unitPrice = item.price + chosen.reduce((s, o) => s + o.priceDelta, 0);

  const add = () => {
    if (missingRequired.length) return;
    onAdd({
      menuItemId: item.id,
      name: item.name,
      qty,
      note: note.trim(),
      optionIds: chosen.map((o) => o.optionId),
      unitPrice,
      options: chosen,
    });
    onClose();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{item.name}</DialogTitle>
        <DialogDescription>
          Harga dasar {formatRupiah(item.price)} · pilih opsi lalu tambahkan ke keranjang.
        </DialogDescription>
      </DialogHeader>

      <div className="-mx-1 flex-1 space-y-4 overflow-y-auto px-1">
        {groups.map((g) => {
          const sel = selected[g.id] ?? [];
          const atMax = g.maxSelect > 1 && sel.length >= g.maxSelect;
          return (
            <div key={g.id} className="rounded-lg border p-3">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold">{g.name}</p>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[10px] font-semibold",
                    g.isRequired
                      ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                      : "border-border bg-muted text-muted-foreground"
                  )}
                >
                  {g.isRequired ? "Wajib" : `Opsional · maks ${g.maxSelect}`}
                </span>
                {missingRequired.includes(g) ? (
                  <span className="text-[10px] font-semibold text-red-600">Belum dipilih</span>
                ) : null}
              </div>

              {g.maxSelect === 1 ? (
                <RadioGroup
                  value={sel[0] ?? ""}
                  onValueChange={(v) => toggle(g.id, v, 1)}
                  className="gap-2"
                >
                  {g.options.map((o) => (
                    <Label
                      key={o.id}
                      htmlFor={`opt-${o.id}`}
                      className={cn(
                        "flex min-h-11 flex-1 cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm font-normal transition-colors",
                        sel.includes(o.id) && "border-primary bg-accent",
                        !o.isAvailable && "cursor-not-allowed opacity-50"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <RadioGroupItem id={`opt-${o.id}`} value={o.id} disabled={!o.isAvailable} />
                        {o.name}
                        {!o.isAvailable ? (
                          <span className="text-[10px] text-muted-foreground">(habis)</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {o.priceDelta > 0 ? `+${formatRupiah(o.priceDelta)}` : "Gratis"}
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              ) : (
                <div className="grid gap-2">
                  {g.options.map((o) => (
                    <Label
                      key={o.id}
                      htmlFor={`opt-${o.id}`}
                      className={cn(
                        "flex min-h-11 flex-1 cursor-pointer items-center justify-between gap-3 rounded-md border px-3 py-2.5 text-sm font-normal transition-colors",
                        sel.includes(o.id) && "border-primary bg-accent",
                        (!o.isAvailable || (atMax && !sel.includes(o.id))) &&
                          "cursor-not-allowed opacity-50"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <Checkbox
                          id={`opt-${o.id}`}
                          checked={sel.includes(o.id)}
                          disabled={!o.isAvailable || (atMax && !sel.includes(o.id))}
                          onCheckedChange={() => toggle(g.id, o.id, g.maxSelect)}
                        />
                        {o.name}
                        {!o.isAvailable ? (
                          <span className="text-[10px] text-muted-foreground">(habis)</span>
                        ) : null}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {o.priceDelta > 0 ? `+${formatRupiah(o.priceDelta)}` : "Gratis"}
                      </span>
                    </Label>
                  ))}
                  {atMax ? (
                    <p className="text-[11px] text-muted-foreground">
                      Maksimal {g.maxSelect} pilihan untuk {g.name.toLowerCase()}.
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          );
        })}

        <div className="rounded-lg border p-3">
          <Label htmlFor="item-note" className="text-sm font-semibold">
            Catatan untuk item ini{" "}
            <span className="font-normal text-muted-foreground">(opsional)</span>
          </Label>
          <Textarea
            id="item-note"
            value={note}
            maxLength={200}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Contoh: pakai gelas biasa, jangan terlalu manis…"
            className="mt-2 min-h-16"
          />
        </div>
      </div>

      <DialogFooter className="mt-2 flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11"
            aria-label="Kurangi jumlah"
            disabled={qty <= 1}
            onClick={() => setQty((q) => Math.max(1, q - 1))}
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="w-8 text-center text-lg font-bold tabular-nums">{qty}</span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-11 w-11"
            aria-label="Tambah jumlah"
            disabled={qty >= MAX_QTY_PER_ITEM}
            onClick={() => setQty((q) => Math.min(MAX_QTY_PER_ITEM, q + 1))}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button
          type="button"
          className="h-12 flex-1 text-base font-bold"
          disabled={missingRequired.length > 0}
          onClick={add}
        >
          Tambahkan · {formatRupiah(unitPrice * qty)}
        </Button>
      </DialogFooter>
    </>
  );
}

export function MenuOptionDialog({
  item,
  open,
  onOpenChange,
  onAdd,
}: {
  item: PublicMenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAdd: (payload: OptionAddPayload) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] flex-col overflow-hidden sm:max-w-lg">
        {item ? (
          <OptionFormInner
            key={item.id}
            item={item}
            onAdd={onAdd}
            onClose={() => onOpenChange(false)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
