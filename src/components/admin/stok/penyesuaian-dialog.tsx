"use client";

/**
 * Dialog Penyesuaian Stok — stok masuk / pemakaian manual / set ulang nilai.
 * Menampilkan preview hasil akhir secara real-time sebelum disimpan.
 */
import { useEffect, useMemo, useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Loader2, Scale } from "lucide-react";
import { toast } from "sonner";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { formatAmount, stockBadgeTone, type AdminIngredient } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredient: AdminIngredient | null;
  onSaved: () => Promise<void> | void;
};

const TYPE_OPTIONS = [
  { value: "IN", label: "Stok Masuk", hint: "tambah stok (belanja / kiriman)" },
  { value: "OUT", label: "Pemakaian Manual", hint: "kurangi stok (rusak / terpakai lain)" },
  { value: "ADJUST", label: "Set Ulang Nilai", hint: "tetapkan stok hasil opname fisik" },
] as const;

export function PenyesuaianDialog({ open, onOpenChange, ingredient, onSaved }: Props) {
  const [type, setType] = useState<"IN" | "OUT" | "ADJUST">("IN");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setType("IN");
      setAmount("");
      setNote("");
    }
  }, [open, ingredient]);

  const amountNum = Number(amount);
  const valid = Number.isFinite(amountNum) && amountNum > 0;

  const preview = useMemo(() => {
    if (!ingredient || !valid) return null;
    if (type === "IN") return ingredient.stock + amountNum;
    if (type === "OUT") return ingredient.stock - amountNum;
    return amountNum;
  }, [ingredient, type, amountNum, valid]);

  const tone = useMemo(() => {
    if (preview === null || !ingredient) return "plain";
    if (preview < 0) return "red";
    return stockBadgeTone(preview, ingredient.minStock);
  }, [preview, ingredient]);

  const save = async () => {
    if (!ingredient) return;
    if (!valid) {
      toast.error("Jumlah harus angka lebih dari 0.");
      return;
    }
    const trimmedNote = note.trim();
    if (!trimmedNote) {
      toast.error("Catatan wajib diisi agar penyesuaian punya jejak yang jelas.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/stok/${ingredient.id}/penyesuaian`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, amount: amountNum, note: trimmedNote }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        warnings?: string[];
      };
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan penyesuaian.");
      toast.success(
        `Stok ${ingredient.name} kini ${formatAmount(preview ?? 0)} ${ingredient.unit}.`
      );
      for (const w of json.warnings ?? []) toast.warning(w);
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan penyesuaian.");
    } finally {
      setSaving(false);
    }
  };

  const typeMeta = TYPE_OPTIONS.find((t) => t.value === type)!;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">
            Penyesuaian Stok — {ingredient?.name ?? ""}
          </DialogTitle>
          <DialogDescription>
            Setiap perubahan stok tercatat di riwayat beserta catatannya.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="penyesuaian-jenis">Jenis Penyesuaian</Label>
            <Select value={type} onValueChange={(v) => setType(v as "IN" | "OUT" | "ADJUST")}>
              <SelectTrigger id="penyesuaian-jenis" className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{typeMeta.hint}.</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="penyesuaian-jumlah">
              Jumlah {type === "ADJUST" ? "(nilai stok baru)" : `(${ingredient?.unit ?? ""})`} *
            </Label>
            <Input
              id="penyesuaian-jumlah"
              type="number"
              min={0}
              step="any"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="cth. 200"
            />
          </div>

          {/* Preview hasil akhir real-time */}
          <div
            className={cn(
              "flex items-center justify-between gap-3 rounded-lg border p-3 text-sm",
              tone === "red" && "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40",
              tone === "amber" &&
                "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40",
              tone === "plain" && "border-border bg-muted/40"
            )}
            aria-live="polite"
          >
            <span className="text-muted-foreground">
              {ingredient ? `${formatAmount(ingredient.stock)} ${ingredient.unit}` : "—"}
              {" → "}
              <span
                className={cn(
                  "font-semibold",
                  tone === "red" && "text-red-700 dark:text-red-400",
                  tone === "amber" && "text-amber-700 dark:text-amber-400",
                  tone === "plain" && "text-foreground"
                )}
              >
                {preview !== null ? `${formatAmount(preview)} ${ingredient?.unit ?? ""}` : "—"}
              </span>
            </span>
            {ingredient && (
              <span className="flex items-center gap-1.5 text-xs">
                {type === "IN" && <ArrowUpCircle className="h-4 w-4 text-emerald-600" aria-hidden />}
                {type === "OUT" && (
                  <ArrowDownCircle className="h-4 w-4 text-amber-600" aria-hidden />
                )}
                {type === "ADJUST" && <Scale className="h-4 w-4 text-stone-500" aria-hidden />}
                {tone === "red"
                  ? preview !== null && preview < 0
                    ? "Berakhir minus!"
                    : "Di bawah batas minimum"
                  : tone === "amber"
                    ? "Mendekati batas minimum"
                    : "Aman"}
              </span>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="penyesuaian-catatan">Catatan *</Label>
            <Textarea
              id="penyesuaian-catatan"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="cth. Belanja gula merah di pasar Boyolangu"
              maxLength={200}
              rows={2}
            />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11">
            Batal
          </Button>
          <Button onClick={() => void save()} disabled={saving} className="h-11">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {saving ? "Menyimpan…" : "Simpan Penyesuaian"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
