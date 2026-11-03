"use client";

/**
 * Dialog buat/edit promo — jenis diskon dengan preview hasil langsung,
 * periode (datetime-local, disimpan sebagai momen waktu absolut), dan status aktif.
 */
import { useEffect, useMemo, useState } from "react";
import { Loader2, TicketPercent } from "lucide-react";
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { formatRupiah } from "@/lib/format";
import { hitungPotongan, toLocalInputValue, type AdminPromo } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: AdminPromo | null;
  onSaved: () => Promise<void> | void;
};

const PREVIEW_SUBTOTAL = 20000;

export function PromoDialog({ open, onOpenChange, editing, onSaved }: Props) {
  const [name, setName] = useState("");
  const [type, setType] = useState<"PERCENT" | "NOMINAL">("PERCENT");
  const [value, setValue] = useState("10");
  const [minOrder, setMinOrder] = useState("0");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setType(editing.type === "NOMINAL" ? "NOMINAL" : "PERCENT");
      setValue(String(editing.value));
      setMinOrder(String(editing.minOrder));
      setStartsAt(toLocalInputValue(editing.startsAt));
      setEndsAt(toLocalInputValue(editing.endsAt));
      setIsActive(editing.isActive);
    } else {
      setName("");
      setType("PERCENT");
      setValue("10");
      setMinOrder("0");
      const now = new Date();
      const nextWeek = new Date(now.getTime() + 7 * 24 * 3600 * 1000);
      setStartsAt(toLocalInputValue(now.toISOString()));
      setEndsAt(toLocalInputValue(nextWeek.toISOString()));
      setIsActive(true);
    }
  }, [open, editing]);

  const preview = useMemo(() => {
    const v = Number(value);
    if (!Number.isFinite(v) || v <= 0) return null;
    const potongan = hitungPotongan(type, v, PREVIEW_SUBTOTAL);
    return { potongan, bayar: PREVIEW_SUBTOTAL - potongan };
  }, [type, value]);

  const save = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error("Nama promo wajib diisi.");
      return;
    }
    const valueNum = Number(value);
    if (!Number.isInteger(valueNum)) {
      toast.error("Nilai promo harus angka bulat.");
      return;
    }
    if (type === "PERCENT" && (valueNum < 1 || valueNum > 100)) {
      toast.error("Diskon persen harus di antara 1–100%.");
      return;
    }
    if (type === "NOMINAL" && valueNum < 1000) {
      toast.error("Potongan nominal minimal Rp1.000.");
      return;
    }
    const minOrderNum = Number(minOrder);
    if (!Number.isInteger(minOrderNum) || minOrderNum < 0) {
      toast.error("Minimum belanja harus angka ≥ 0.");
      return;
    }
    if (!startsAt || !endsAt) {
      toast.error("Waktu mulai dan berakhir wajib diisi.");
      return;
    }
    const start = new Date(startsAt);
    const end = new Date(endsAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      toast.error("Waktu periode tidak valid.");
      return;
    }
    if (end.getTime() <= start.getTime()) {
      toast.error("Waktu berakhir harus setelah waktu mulai.");
      return;
    }

    setSaving(true);
    try {
      const body = {
        name: trimmedName,
        type,
        value: valueNum,
        minOrder: minOrderNum,
        startsAt: start.toISOString(),
        endsAt: end.toISOString(),
        isActive,
      };
      const res = editing
        ? await fetch(`/api/admin/promo/${editing.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          })
        : await fetch("/api/admin/promo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan promo.");
      toast.success(
        editing ? `Promo "${trimmedName}" berhasil diperbarui.` : `Promo "${trimmedName}" berhasil dibuat.`
      );
      onOpenChange(false);
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan promo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <TicketPercent className="h-5 w-5 text-[#8a6a33] dark:text-[#d9c5a3]" aria-hidden />
            {editing ? `Edit Promo — ${editing.name}` : "Promo Baru"}
          </DialogTitle>
          <DialogDescription>
            Promo berlaku untuk seluruh pesanan (semua channel) selama periode aktifnya.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="promo-nama">Nama Promo *</Label>
            <Input
              id="promo-nama"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="cth. Promo Hangat Pekan Ini"
              maxLength={60}
            />
          </div>

          <div className="space-y-2">
            <Label>Jenis Promo *</Label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as "PERCENT" | "NOMINAL")}
              className="gap-3"
            >
              <Label
                htmlFor="promo-percent"
                className="flex flex-1 cursor-pointer items-start gap-3 rounded-lg border p-3 leading-tight normal-case [&:has([data-state=checked])]:border-gold [&:has([data-state=checked])]:bg-[#f5ead6]/60 dark:[&:has([data-state=checked])]:bg-[#2c2013]/60"
              >
                <RadioGroupItem id="promo-percent" value="PERCENT" className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">Diskon Persen</span>
                  <span className="block text-xs text-muted-foreground">
                    Potong persentase dari subtotal (1–100%)
                  </span>
                </span>
              </Label>
              <Label
                htmlFor="promo-nominal"
                className="flex flex-1 cursor-pointer items-start gap-3 rounded-lg border p-3 leading-tight normal-case [&:has([data-state=checked])]:border-gold [&:has([data-state=checked])]:bg-[#f5ead6]/60 dark:[&:has([data-state=checked])]:bg-[#2c2013]/60"
              >
                <RadioGroupItem id="promo-nominal" value="NOMINAL" className="mt-0.5" />
                <span>
                  <span className="block text-sm font-medium">Potongan Nominal</span>
                  <span className="block text-xs text-muted-foreground">
                    Potong sejumlah Rupiah (min. Rp1.000)
                  </span>
                </span>
              </Label>
            </RadioGroup>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="promo-nilai">
                Nilai {type === "PERCENT" ? "(%)" : "(Rp)"} *
              </Label>
              <Input
                id="promo-nilai"
                type="number"
                min={type === "PERCENT" ? 1 : 1000}
                max={type === "PERCENT" ? 100 : undefined}
                step={1}
                inputMode="numeric"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-min">Minimum Belanja</Label>
              <Input
                id="promo-min"
                type="number"
                min={0}
                step={1000}
                inputMode="numeric"
                value={minOrder}
                onChange={(e) => setMinOrder(e.target.value)}
              />
            </div>
          </div>

          {/* Preview hasil promo */}
          <div className="rounded-lg border border-[#d9c5a3] bg-[#f5ead6]/70 p-3 text-sm dark:border-[#5a4326] dark:bg-[#2c2013]/60" aria-live="polite">
            {preview ? (
              <p>
                Contoh: subtotal <strong>{formatRupiah(PREVIEW_SUBTOTAL)}</strong> →{" "}
                potongan <strong>−{formatRupiah(preview.potongan)}</strong> → bayar{" "}
                <strong className="text-emerald-700 dark:text-emerald-400">
                  {formatRupiah(preview.bayar)}
                </strong>
              </p>
            ) : (
              <p className="text-muted-foreground">Isi nilai promo untuk melihat contoh hasil.</p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="promo-mulai">Mulai *</Label>
              <Input
                id="promo-mulai"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="promo-selesai">Berakhir *</Label>
              <Input
                id="promo-selesai"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Waktu mengikuti jam browser Anda dan ditampilkan kembali dalam WIB.
          </p>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div>
              <Label htmlFor="promo-aktif" className="text-sm font-medium">
                Promo Aktif
              </Label>
              <p className="text-xs text-muted-foreground">
                Nonaktif = tidak muncul di pilihan pembeli &amp; kasir.
              </p>
            </div>
            <Switch id="promo-aktif" checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="h-11">
            Batal
          </Button>
          <Button onClick={() => void save()} disabled={saving} className="h-11">
            {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Buat Promo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
