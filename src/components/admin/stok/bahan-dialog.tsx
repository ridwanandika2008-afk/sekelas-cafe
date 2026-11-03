"use client";

/**
 * Dialog buat/edit bahan baku.
 * Saat membuat: nama, satuan, stok awal, batas minimum.
 * Saat mengedit: stok dikunci (hanya lewat penyesuaian agar ada jejak).
 */
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
import type { AdminIngredient } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AdminIngredient | null;
  onSaved: () => Promise<void> | void;
};

export function BahanDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const [name, setName] = useState("");
  const [unit, setUnit] = useState("gr");
  const [stock, setStock] = useState("0");
  const [minStock, setMinStock] = useState("0");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name);
        setUnit(editing.unit);
        setStock(String(editing.stock));
        setMinStock(String(editing.minStock));
      } else {
        setName("");
        setUnit("gr");
        setStock("0");
        setMinStock("0");
      }
    }
  }, [open, editing]);

  const save = async () => {
    const trimmedName = name.trim();
    const trimmedUnit = unit.trim();
    if (!trimmedName) {
      toast.error("Nama bahan wajib diisi.");
      return;
    }
    if (!trimmedUnit) {
      toast.error("Satuan bahan wajib diisi (gr, ml, pcs, …).");
      return;
    }
    const minStockNum = Number(minStock);
    if (!Number.isFinite(minStockNum) || minStockNum < 0) {
      toast.error("Batas minimum harus angka ≥ 0.");
      return;
    }

    setSaving(true);
    try {
      let res: Response;
      if (editing) {
        res = await fetch(`/api/admin/stok/${editing.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmedName, unit: trimmedUnit, minStock: minStockNum }),
        });
      } else {
        const stockNum = Number(stock);
        if (!Number.isFinite(stockNum) || stockNum < 0) {
          toast.error("Stok awal harus angka ≥ 0.");
          setSaving(false);
          return;
        }
        res = await fetch("/api/admin/stok", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: trimmedName,
            unit: trimmedUnit,
            stock: stockNum,
            minStock: minStockNum,
          }),
        });
      }
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan bahan.");
      toast.success(
        editing ? `Bahan "${trimmedName}" berhasil diperbarui.` : `Bahan "${trimmedName}" berhasil dibuat.`
      );
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan bahan.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            {editing ? `Edit Bahan — ${editing.name}` : "Bahan Baru"}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? "Perubahan stok tidak bisa lewat sini — gunakan tombol Penyesuaian agar tercatat di riwayat."
              : "Catat bahan baku yang dipakai dapur beserta batas minimum untuk peringatan restock."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bahan-nama">Nama Bahan *</Label>
            <Input
              id="bahan-nama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Gula Merah"
              maxLength={60}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="bahan-satuan">Satuan *</Label>
              <Input
                id="bahan-satuan"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                placeholder="gr / ml / pcs"
                maxLength={20}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bahan-min">Batas Minimum</Label>
              <Input
                id="bahan-min"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={minStock}
                onChange={(e) => setMinStock(e.target.value)}
              />
            </div>
          </div>
          {!editing && (
            <div className="space-y-2">
              <Label htmlFor="bahan-stok">Stok Awal</Label>
              <Input
                id="bahan-stok"
                type="number"
                min={0}
                step="any"
                inputMode="decimal"
                value={stock}
                onChange={(e) => setStock(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Stok awal belum terekam di riwayat — lakukan penyesuaian pertama bila ingin tercatat.
              </p>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11">
            Batal
          </Button>
          <Button onClick={() => void save()} disabled={saving} className="h-11">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Buat Bahan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
