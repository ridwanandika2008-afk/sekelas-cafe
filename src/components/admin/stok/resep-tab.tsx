"use client";

/**
 * Tab Resep Menu — kelola resep per menu: bahan + jumlah per porsi.
 * Menampilkan ketersediaan teoretis (berapa porsi bisa dibuat dari stok).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChefHat, Info, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatAmount, type IngredientOption, type MenuLite } from "./types";

type Row = { ingredientId: string; amount: string };

type Props = {
  menus: MenuLite[];
  onChanged: () => Promise<void> | void;
};

export function ResepTab({ menus, onChanged }: Props) {
  const [menuId, setMenuId] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [ingredients, setIngredients] = useState<IngredientOption[]>([]);

  const loadRecipe = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/stok/resep/${id}`);
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
        ingredients?: IngredientOption[];
        items?: { ingredientId: string; amount: number }[];
      };
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat resep.");
      setIngredients(json.ingredients ?? []);
      setRows((json.items ?? []).map((it) => ({ ingredientId: it.ingredientId, amount: String(it.amount) })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat resep.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (menuId) void loadRecipe(menuId);
  }, [menuId, loadRecipe]);

  const ingMap = useMemo(() => new Map(ingredients.map((i) => [i.id, i])), [ingredients]);

  const addRow = () => {
    const used = new Set(rows.map((r) => r.ingredientId).filter(Boolean));
    const firstFree = ingredients.find((i) => !used.has(i.id));
    setRows((prev) => [...prev, { ingredientId: firstFree?.id ?? "", amount: "" }]);
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  /** Ketersediaan teoretis tiap baris: floor(stok / jumlah per porsi) */
  const portionPerRow = useMemo(() => {
    return rows.map((r) => {
      const ing = r.ingredientId ? ingMap.get(r.ingredientId) : undefined;
      const amount = Number(r.amount);
      if (!ing || !Number.isFinite(amount) || amount <= 0) return null;
      return Math.floor(ing.stock / amount);
    });
  }, [rows, ingMap]);

  const minPortion = useMemo(() => {
    const valid = portionPerRow.filter((v): v is number => v !== null);
    return valid.length ? Math.min(...valid) : null;
  }, [portionPerRow]);

  const limitingIngredient = useMemo(() => {
    if (minPortion === null) return null;
    const idx = portionPerRow.findIndex((v) => v === minPortion);
    return idx >= 0 && rows[idx]?.ingredientId ? ingMap.get(rows[idx].ingredientId) : null;
  }, [minPortion, portionPerRow, rows, ingMap]);

  const save = async () => {
    if (!menuId) return;
    const clean: { ingredientId: string; amount: number }[] = [];
    for (const r of rows) {
      if (!r.ingredientId) {
        toast.error("Ada baris resep yang belum dipilih bahannya.");
        return;
      }
      const amount = Number(r.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        const ing = ingMap.get(r.ingredientId);
        toast.error(`Jumlah untuk ${ing?.name ?? "salah satu bahan"} harus lebih dari 0.`);
        return;
      }
      clean.push({ ingredientId: r.ingredientId, amount });
    }
    const ids = new Set(clean.map((c) => c.ingredientId));
    if (ids.size !== clean.length) {
      toast.error("Satu bahan hanya boleh muncul sekali dalam resep.");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/stok/resep/${menuId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: clean }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan resep.");
      toast.success(`Resep tersimpan — ${clean.length} bahan per porsi.`);
      await loadRecipe(menuId);
      await onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan resep.");
    } finally {
      setSaving(false);
    }
  };

  const selectedMenu = menus.find((m) => m.id === menuId);

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-[#d9c5a3] bg-[#f5ead6]/70 p-4 text-sm dark:border-[#5a4326] dark:bg-[#2c2013]/60">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#8a6a33] dark:text-[#d9c5a3]" aria-hidden />
        <p>
          <strong>Stok berkurang otomatis</strong> saat barista menandai item pesanan selesai —
          sesuai jumlah resep dikali jumlah porsi. Menu tanpa resep tidak mengurangi stok bahan.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4 sm:p-6">
          <div className="space-y-2">
            <Label htmlFor="resep-menu">Pilih Menu</Label>
            <Select value={menuId} onValueChange={setMenuId}>
              <SelectTrigger id="resep-menu" className="h-11 w-full sm:max-w-md">
                <SelectValue placeholder={menus.length ? "Pilih menu…" : "Tidak ada menu aktif"} />
              </SelectTrigger>
              <SelectContent>
                {menus.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedMenu && (
              <p className="text-xs text-muted-foreground">
                Resep berlaku per 1 porsi {selectedMenu.name}.
              </p>
            )}
          </div>

          {!menuId ? (
            <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
              Pilih menu dulu untuk melihat / mengatur resepnya.
            </p>
          ) : loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-14 rounded-lg" />
              ))}
            </div>
          ) : (
            <>
              {rows.length === 0 && (
                <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                  Belum ada bahan pada resep menu ini — tambahkan bahan pertama.
                </p>
              )}

              <ul className="space-y-2">
                {rows.map((row, idx) => {
                  const ing = row.ingredientId ? ingMap.get(row.ingredientId) : undefined;
                  const portion = portionPerRow[idx];
                  const usedElsewhere = new Set(
                    rows.filter((_, i) => i !== idx).map((r) => r.ingredientId)
                  );
                  return (
                    <li
                      key={idx}
                      className="flex flex-wrap items-end gap-2 rounded-lg border bg-card p-3"
                    >
                      <div className="min-w-40 flex-1 space-y-1.5">
                        <span className="text-xs text-muted-foreground">Bahan</span>
                        <Select
                          value={row.ingredientId}
                          onValueChange={(v) =>
                            setRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, ingredientId: v } : r))
                            )
                          }
                        >
                          <SelectTrigger className="h-10 w-full" aria-label={`Bahan baris ${idx + 1}`}>
                            <SelectValue placeholder="Pilih bahan…" />
                          </SelectTrigger>
                          <SelectContent>
                            {ingredients.map((opt) => (
                              <SelectItem
                                key={opt.id}
                                value={opt.id}
                                disabled={usedElsewhere.has(opt.id)}
                              >
                                {opt.name} {!opt.isActive && "(nonaktif)"}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="w-32 space-y-1.5">
                        <span className="text-xs text-muted-foreground">Per porsi</span>
                        <Input
                          type="number"
                          min={0}
                          step={0.5}
                          inputMode="decimal"
                          value={row.amount}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r, i) => (i === idx ? { ...r, amount: e.target.value } : r))
                            )
                          }
                          placeholder="0"
                          className="h-10"
                          aria-label={`Jumlah per porsi baris ${idx + 1}`}
                        />
                      </div>
                      <div className="hidden w-28 space-y-1.5 sm:block">
                        <span className="text-xs text-muted-foreground">Satuan</span>
                        <p className="h-10 leading-10 text-sm text-muted-foreground">
                          {ing?.unit ?? "—"}
                        </p>
                      </div>
                      <div className="space-y-1.5">
                        <span className="text-xs text-muted-foreground">Cukup untuk</span>
                        <Badge
                          className={cn(
                            "h-10 justify-center px-3 text-xs",
                            portion === null
                              ? "border-stone-300 bg-stone-100 text-stone-600"
                              : portion <= 0
                                ? "border-red-300 bg-red-100 text-red-700"
                                : portion <= 5
                                  ? "border-amber-300 bg-amber-100 text-amber-800"
                                  : "border-emerald-300 bg-emerald-100 text-emerald-800"
                          )}
                        >
                          {portion === null ? "—" : `${portion} porsi`}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-10 w-10 text-red-600 hover:text-red-700"
                        aria-label={`Hapus baris resep ${ing?.name ?? idx + 1}`}
                        onClick={() => removeRow(idx)}
                      >
                        <Trash2 className="h-4 w-4" aria-hidden />
                      </Button>
                    </li>
                  );
                })}
              </ul>

              <div className="flex flex-wrap items-center justify-between gap-3">
                <Button
                  variant="outline"
                  onClick={addRow}
                  disabled={ingredients.length === 0 || rows.length >= ingredients.length}
                  className="h-11"
                >
                  <Plus className="h-4 w-4" aria-hidden />
                  Tambah Bahan
                </Button>
                <Button onClick={() => void save()} disabled={saving} className="h-11">
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  ) : (
                    <Save className="h-4 w-4" aria-hidden />
                  )}
                  {saving ? "Menyimpan…" : "Simpan Resep"}
                </Button>
              </div>

              {rows.length > 0 && (
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-xl border p-4 text-sm",
                    minPortion !== null && minPortion <= 0
                      ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                      : "border-[#d9c5a3] bg-[#f5ead6]/70 dark:border-[#5a4326] dark:bg-[#2c2013]/60"
                  )}
                  aria-live="polite"
                >
                  <ChefHat
                    className={cn(
                      "mt-0.5 h-4.5 w-4.5 shrink-0",
                      minPortion !== null && minPortion <= 0
                        ? "text-red-600"
                        : "text-[#8a6a33] dark:text-[#d9c5a3]"
                    )}
                    aria-hidden
                  />
                  {minPortion === null ? (
                    <p>Lengkapi jumlah per porsi untuk melihat ketersediaan.</p>
                  ) : minPortion <= 0 ? (
                    <p>
                      <strong>Menu berpotensi habis</strong> — {limitingIngredient?.name ?? "salah satu bahan"}{" "}
                      hanya cukup untuk {minPortion} porsi (stok{" "}
                      {formatAmount(limitingIngredient?.stock ?? 0)} {limitingIngredient?.unit ?? ""}
                      ). Segera restock bahan tersebut.
                    </p>
                  ) : (
                    <p>
                      Dengan stok saat ini, menu ini diperkirakan bisa dibuat{" "}
                      <strong>±{minPortion} porsi</strong> — dibatasi oleh{" "}
                      {limitingIngredient?.name ?? "bahan terbatas"} (
                      {formatAmount(limitingIngredient?.stock ?? 0)} {limitingIngredient?.unit ?? ""}).
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
