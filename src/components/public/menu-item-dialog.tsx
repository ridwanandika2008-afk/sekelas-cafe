"use client";

import { useMemo, useState } from "react";
import { Coffee, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { cn } from "@/lib/utils";
import { useCart, type CartOption } from "@/lib/cart-store";
import { formatRupiah } from "@/lib/format";
import type { PublicMenuItem, PublicOptionGroup } from "./types";

/**
 * Dialog kustomisasi menu: grup opsi (radio/checkbox), catatan, jumlah.
 * Seluruh state form hidup di <ItemForm> yang ikut ter-unmount saat dialog
 * tertutup — jadi state reset otomatis setiap kali dialog dibuka.
 */
export function MenuItemDialog({
  item,
  open,
  onOpenChange,
}: {
  item: PublicMenuItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        {item && <ItemForm key={item.id} item={item} onDone={() => onOpenChange(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ItemForm({
  item,
  onDone,
}: {
  item: PublicMenuItem;
  onDone: () => void;
}) {
  const addItem = useCart((s) => s.addItem);
  // Grup radio wajib diisi otomatis opsi pertama yang tersedia (kenyamanan pembeli).
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const init: Record<string, string[]> = {};
    for (const g of item.optionGroups) {
      if (g.isRequired && g.maxSelect === 1) {
        const first = g.options.find((o) => o.isAvailable);
        init[g.id] = first ? [first.id] : [];
      } else {
        init[g.id] = [];
      }
    }
    return init;
  });
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState("");

  const chosen: CartOption[] = useMemo(() => {
    const out: CartOption[] = [];
    for (const g of item.optionGroups) {
      for (const oid of selected[g.id] ?? []) {
        const opt = g.options.find((o) => o.id === oid);
        if (opt) {
          out.push({
            groupId: g.id,
            groupName: g.name,
            optionId: opt.id,
            optionName: opt.name,
            priceDelta: opt.priceDelta,
          });
        }
      }
    }
    return out;
  }, [item, selected]);

  const unitPrice = item.price + chosen.reduce((s, o) => s + o.priceDelta, 0);
  const missingRequired = item.optionGroups.filter(
    (g) => g.isRequired && (selected[g.id]?.length ?? 0) === 0
  );

  const selectRadio = (groupId: string, optionId: string) =>
    setSelected((s) => ({ ...s, [groupId]: [optionId] }));

  const toggleMulti = (group: PublicOptionGroup, optionId: string) =>
    setSelected((s) => {
      const cur = s[group.id] ?? [];
      if (cur.includes(optionId)) {
        return { ...s, [group.id]: cur.filter((id) => id !== optionId) };
      }
      if (cur.length >= group.maxSelect) return s; // sudah maksimal
      return { ...s, [group.id]: [...cur, optionId] };
    });

  const handleAdd = () => {
    if (missingRequired.length > 0) return;
    addItem({
      menuItemId: item.id,
      name: item.name,
      imageUrl: item.imageUrl,
      basePrice: item.price,
      unitPrice,
      qty,
      note: note.trim() || undefined,
      selectedOptions: chosen,
    });
    toast.success(`${item.name} masuk keranjang`);
    onDone();
  };

  return (
    <>
      {item.imageUrl && (
        <div className="overflow-hidden rounded-xl border bg-muted">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="aspect-[16/9] w-full object-cover"
          />
        </div>
      )}

      <DialogHeader className="text-left">
        <DialogTitle className="font-display text-2xl leading-tight">{item.name}</DialogTitle>
        <DialogDescription className="leading-relaxed">
          {item.description ?? "Enaknya poll, dicoba dulu deh."}
        </DialogDescription>
      </DialogHeader>
      <p className="-mt-2 font-display text-xl font-semibold text-primary">
        {formatRupiah(item.price)}
      </p>

      <div className="space-y-5">
        {item.optionGroups.map((g) => {
          const selectedIds = selected[g.id] ?? [];
          const isRadio = g.maxSelect === 1;
          const atMax = !isRadio && selectedIds.length >= g.maxSelect;
          return (
            <fieldset key={g.id}>
              <div className="mb-2 flex items-center justify-between gap-2">
                <legend className="text-sm font-semibold">{g.name}</legend>
                <span className="text-xs text-muted-foreground">
                  {g.isRequired ? "Wajib" : "Opsional"}
                  {!isRadio && ` · maks ${g.maxSelect} pilihan`}
                </span>
              </div>

              {isRadio ? (
                <RadioGroup
                  value={selectedIds[0] ?? ""}
                  onValueChange={(v) => selectRadio(g.id, v)}
                  className="grid gap-2"
                >
                  {g.options.map((o) => (
                    <Label
                      key={o.id}
                      className={cn(
                        "flex cursor-pointer items-center justify-between rounded-xl border px-3.5 py-3 font-normal transition-colors",
                        "has-[button[data-state=checked]]:border-primary has-[button[data-state=checked]]:bg-primary/5",
                        !o.isAvailable && "cursor-not-allowed opacity-60"
                      )}
                    >
                      <span className="flex items-center gap-2.5">
                        <RadioGroupItem value={o.id} disabled={!o.isAvailable} />
                        <span
                          className={cn(
                            "text-sm font-medium",
                            !o.isAvailable && "text-muted-foreground line-through"
                          )}
                        >
                          {o.name}
                          {!o.isAvailable && " (habis)"}
                        </span>
                      </span>
                      {o.priceDelta > 0 && (
                        <span className="text-xs font-semibold text-gold">
                          +{formatRupiah(o.priceDelta)}
                        </span>
                      )}
                    </Label>
                  ))}
                </RadioGroup>
              ) : (
                <div className="grid gap-2">
                  {g.options.map((o) => {
                    const checked = selectedIds.includes(o.id);
                    const disabled = !o.isAvailable || (atMax && !checked);
                    return (
                      <Label
                        key={o.id}
                        className={cn(
                          "flex items-center justify-between rounded-xl border px-3.5 py-3 font-normal transition-colors",
                          checked && "border-primary bg-primary/5",
                          disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                        )}
                      >
                        <span className="flex items-center gap-2.5">
                          <Checkbox
                            checked={checked}
                            disabled={disabled}
                            onCheckedChange={() => toggleMulti(g, o.id)}
                            aria-label={o.name}
                          />
                          <span className="text-sm font-medium">
                            {o.name}
                            {!o.isAvailable && (
                              <span className="text-muted-foreground"> (habis)</span>
                            )}
                          </span>
                        </span>
                        {o.priceDelta > 0 && (
                          <span className="text-xs font-semibold text-gold">
                            +{formatRupiah(o.priceDelta)}
                          </span>
                        )}
                      </Label>
                    );
                  })}
                </div>
              )}

              {g.isRequired && selectedIds.length === 0 && (
                <p className="mt-1.5 text-xs font-medium text-destructive">
                  Pilih minimal satu ya.
                </p>
              )}
            </fieldset>
          );
        })}

        <div className="space-y-1.5">
          <Label htmlFor="item-note">Catatan untuk menu ini (opsional)</Label>
          <Input
            id="item-note"
            value={note}
            maxLength={200}
            placeholder="mis. less sugar, jangan terlalu manis…"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <Separator />

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            disabled={qty <= 1}
            aria-label="Kurangi jumlah"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span
            className="w-9 text-center font-semibold tabular-nums"
            aria-live="polite"
            aria-label={`Jumlah ${qty}`}
          >
            {qty}
          </span>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-10 w-10 shrink-0 rounded-full"
            onClick={() => setQty((q) => Math.min(99, q + 1))}
            disabled={qty >= 99}
            aria-label="Tambah jumlah"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="lg"
          className="min-w-0 flex-1"
          onClick={handleAdd}
          disabled={missingRequired.length > 0}
        >
          {missingRequired.length > 0 ? (
            <>
              <Coffee className="h-4 w-4 shrink-0" aria-hidden />
              Pilih {missingRequired[0].name} dulu
            </>
          ) : (
            `Tambahkan — ${formatRupiah(unitPrice * qty)}`
          )}
        </Button>
      </div>
    </>
  );
}
