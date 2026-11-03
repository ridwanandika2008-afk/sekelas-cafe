"use client";

/**
 * Stok & Bahan Baku — pengelolaan bahan, penyesuaian stok bernilai jejak,
 * riwayat pergerakan, dan resep per menu (dengan ketersediaan teoretis).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ChefHat,
  History,
  Loader2,
  Package,
  PackageX,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Scale,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { BahanDialog } from "@/components/admin/stok/bahan-dialog";
import { PenyesuaianDialog } from "@/components/admin/stok/penyesuaian-dialog";
import { RiwayatDialog } from "@/components/admin/stok/riwayat-dialog";
import { ResepTab } from "@/components/admin/stok/resep-tab";
import {
  formatAmount,
  stockBadgeTone,
  type AdminIngredient,
  type MenuLite,
} from "@/components/admin/stok/types";

export default function AdminStokPage() {
  const [ingredients, setIngredients] = useState<AdminIngredient[]>([]);
  const [menus, setMenus] = useState<MenuLite[]>([]);
  const [loading, setLoading] = useState(true);

  // dialog buat/edit bahan
  const [bahanOpen, setBahanOpen] = useState(false);
  const [editing, setEditing] = useState<AdminIngredient | null>(null);

  // dialog penyesuaian & riwayat
  const [adjustTarget, setAdjustTarget] = useState<AdminIngredient | null>(null);
  const [historyTarget, setHistoryTarget] = useState<AdminIngredient | null>(null);

  // aksi baris
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminIngredient | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/stok");
      if (res.ok) {
        const json = (await res.json()) as {
          ingredients: AdminIngredient[];
          menus: MenuLite[];
        };
        setIngredients(json.ingredients);
        setMenus(json.menus);
      }
    } catch {
      /* coba lagi saat aksi berikutnya */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const perluRestock = useMemo(
    () => ingredients.filter((i) => i.isActive && i.minStock > 0 && i.stock < i.minStock),
    [ingredients]
  );

  const toggleActive = async (b: AdminIngredient) => {
    setBusyId(b.id);
    try {
      const res = await fetch(`/api/admin/stok/${b.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !b.isActive }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal mengubah status bahan.");
      toast.success(
        b.isActive
          ? `Bahan "${b.name}" dinonaktifkan — tidak bisa dipilih untuk resep baru.`
          : `Bahan "${b.name}" diaktifkan kembali.`
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah status bahan.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/stok/${deleteTarget.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus bahan.");
      toast.success(`Bahan "${deleteTarget.name}" dihapus.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus bahan.");
    } finally {
      setDeleting(false);
    }
  };

  const stockCell = (b: AdminIngredient) => {
    const tone = stockBadgeTone(b.stock, b.minStock);
    const text = `${formatAmount(b.stock)} ${b.unit}`;
    if (tone === "red")
      return (
        <Badge className="border-red-300 bg-red-100 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {text}
        </Badge>
      );
    if (tone === "amber")
      return (
        <Badge className="border-amber-300 bg-amber-100 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300">
          {text}
        </Badge>
      );
    return <span className="font-medium">{text}</span>;
  };

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Stok &amp; Bahan Baku</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pantau stok dapur, catat penyesuaian, dan atur resep tiap menu.{" "}
            {ingredients.filter((i) => i.isActive).length} bahan aktif ·{" "}
            {perluRestock.length} perlu restock.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setBahanOpen(true);
          }}
          className="h-11"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Bahan Baru
        </Button>
      </div>

      {/* Peringatan bahan di bawah batas minimum */}
      {perluRestock.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-red-300 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/40"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="font-semibold text-red-800 dark:text-red-300">
                {perluRestock.length} bahan perlu restock!
              </p>
              <ul className="flex flex-wrap gap-2">
                {perluRestock.map((b) => (
                  <li
                    key={b.id}
                    className="rounded-md border border-red-200 bg-white px-2 py-1 text-xs text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300"
                  >
                    <span className="font-medium">{b.name}</span> — tersisa{" "}
                    {formatAmount(b.stock)} {b.unit} (min {formatAmount(b.minStock)} {b.unit})
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      <Tabs defaultValue="bahan">
        <TabsList className="h-11">
          <TabsTrigger value="bahan" className="px-4">
            <Package className="h-4 w-4" aria-hidden />
            Bahan Baku
          </TabsTrigger>
          <TabsTrigger value="resep" className="px-4">
            <ChefHat className="h-4 w-4" aria-hidden />
            Resep Menu
          </TabsTrigger>
        </TabsList>

        <TabsContent value="bahan" className="mt-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[0, 1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 rounded-xl" />
              ))}
            </div>
          ) : ingredients.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <PackageX className="h-10 w-10 text-muted-foreground" aria-hidden />
                <p className="font-medium">Belum ada bahan.</p>
                <p className="text-sm text-muted-foreground">
                  Catat bahan pertama untuk mulai memantau stok dapur.
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden py-0">
              <Table className="min-w-[820px]">
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-4">Nama Bahan</TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead>Stok</TableHead>
                    <TableHead>Batas Min.</TableHead>
                    <TableHead>Dipakai</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="pr-4 text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ingredients.map((b) => (
                    <TableRow
                      key={b.id}
                      className={cn(!b.isActive && "bg-muted/30")}
                    >
                      <TableCell className="pl-4 font-medium">{b.name}</TableCell>
                      <TableCell className="text-muted-foreground">{b.unit}</TableCell>
                      <TableCell>{stockCell(b)}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {formatAmount(b.minStock)} {b.unit}
                      </TableCell>
                      <TableCell>
                        {b.menuLinks > 0 ? (
                          <span>{b.menuLinks} menu</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {b.isActive ? (
                          <Badge className="border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                            Aktif
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="text-stone-500">
                            Nonaktif
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="pr-2">
                        <div className="flex items-center justify-end gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            aria-label={`Penyesuaian stok ${b.name}`}
                            title="Penyesuaian stok"
                            onClick={() => setAdjustTarget(b)}
                          >
                            <Scale className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            aria-label={`Riwayat stok ${b.name}`}
                            title="Riwayat stok"
                            onClick={() => setHistoryTarget(b)}
                          >
                            <History className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            aria-label={`Edit ${b.name}`}
                            title="Edit bahan"
                            onClick={() => {
                              setEditing(b);
                              setBahanOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" aria-hidden />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10"
                            aria-label={b.isActive ? `Nonaktifkan ${b.name}` : `Aktifkan ${b.name}`}
                            title={b.isActive ? "Nonaktifkan" : "Aktifkan"}
                            disabled={busyId === b.id}
                            onClick={() => void toggleActive(b)}
                          >
                            {b.isActive ? (
                              <PowerOff className="h-4 w-4" aria-hidden />
                            ) : (
                              <Power className="h-4 w-4" aria-hidden />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-red-600 hover:text-red-700"
                            aria-label={`Hapus ${b.name}`}
                            title="Hapus bahan"
                            onClick={() => setDeleteTarget(b)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="resep" className="mt-4">
          <ResepTab menus={menus} onChanged={load} />
        </TabsContent>
      </Tabs>

      {/* Dialog buat/edit bahan */}
      <BahanDialog
        open={bahanOpen}
        onOpenChange={setBahanOpen}
        editing={editing}
        onSaved={load}
      />

      {/* Dialog penyesuaian stok */}
      <PenyesuaianDialog
        open={!!adjustTarget}
        onOpenChange={(v) => !v && setAdjustTarget(null)}
        ingredient={adjustTarget}
        onSaved={load}
      />

      {/* Dialog riwayat stok */}
      <RiwayatDialog
        open={!!historyTarget}
        onOpenChange={(v) => !v && setHistoryTarget(null)}
        ingredientId={historyTarget?.id ?? null}
        ingredientName={historyTarget?.name ?? ""}
      />

      {/* Konfirmasi hapus bahan */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus bahan "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Bahan hanya bisa dihapus bila tidak dipakai resep menu dan belum pernah tercatat di
              transaksi pesanan. Tindakan ini tidak bisa dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Batal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDelete();
              }}
              disabled={deleting}
              className="h-11 bg-red-600 text-white hover:bg-red-700"
            >
              {deleting && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
