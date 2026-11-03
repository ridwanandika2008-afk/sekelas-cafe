"use client";

/**
 * Kelola Kategori — daftar ringkas dengan urutan naik/turun,
 * arsip/pulihkan, dan hapus (hanya bila kosong).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  ChevronDown,
  ChevronUp,
  Info,
  Loader2,
  PackageX,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Skeleton } from "@/components/ui/skeleton";

type AdminCategory = {
  id: string;
  name: string;
  sortOrder: number;
  isArchived: boolean;
  createdAt: string;
  menuCount: number;
  menuAktif: number;
};

export default function AdminKategoriPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  // dialog buat/edit
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [name, setName] = useState("");
  const [sortOrder, setSortOrder] = useState("0");
  const [saving, setSaving] = useState(false);

  // aksi
  const [busyId, setBusyId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<AdminCategory | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/kategori");
      if (res.ok && mounted.current) {
        const json = (await res.json()) as { categories: AdminCategory[] };
        setCategories(json.categories);
      }
    } catch {
      /* coba lagi saat aksi berikutnya */
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const totalMenu = useMemo(
    () => categories.reduce((s, c) => s + c.menuAktif, 0),
    [categories]
  );

  /* ===== dialog ===== */
  const openCreate = () => {
    setEditing(null);
    setName("");
    setSortOrder(String((categories.at(-1)?.sortOrder ?? 0) + 1));
    setDialogOpen(true);
  };

  const openEdit = (c: AdminCategory) => {
    setEditing(c);
    setName(c.name);
    setSortOrder(String(c.sortOrder));
    setDialogOpen(true);
  };

  const save = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      toast.error("Nama kategori wajib diisi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(
        editing ? `/api/admin/kategori/${editing.id}` : "/api/admin/kategori",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: trimmed, sortOrder: Math.round(Number(sortOrder) || 0) }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan kategori.");
      toast.success(editing ? "Kategori berhasil diperbarui." : `Kategori "${trimmed}" berhasil dibuat.`);
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan kategori.");
    } finally {
      setSaving(false);
    }
  };

  /* ===== aksi baris ===== */

  const move = async (c: AdminCategory, dir: -1 | 1) => {
    const sorted = [...categories].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((x) => x.id === c.id);
    const neighbor = sorted[idx + dir];
    if (!neighbor) return;
    if (neighbor.sortOrder === c.sortOrder) {
      // urutan kembar — geser dengan offset agar urutannya jelas
      setBusyId(c.id);
      try {
        await fetch(`/api/admin/kategori/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: c.sortOrder + dir }),
        });
        await load();
      } catch {
        toast.error("Gagal memindahkan kategori.");
      } finally {
        setBusyId(null);
      }
      return;
    }
    setBusyId(c.id);
    try {
      await Promise.all([
        fetch(`/api/admin/kategori/${c.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: neighbor.sortOrder }),
        }),
        fetch(`/api/admin/kategori/${neighbor.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sortOrder: c.sortOrder }),
        }),
      ]);
      await load();
    } catch {
      toast.error("Gagal memindahkan kategori.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleArchive = async (c: AdminCategory) => {
    setBusyId(c.id);
    try {
      const res = await fetch(`/api/admin/kategori/${c.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !c.isArchived }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal mengubah arsip kategori.");
      toast.success(
        c.isArchived
          ? `Kategori "${c.name}" dipulihkan.`
          : `Kategori "${c.name}" diarsipkan — tersembunyi dari pembeli.`
      );
      setArchiveTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah arsip kategori.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/kategori/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus kategori.");
      toast.success(`Kategori "${deleteTarget.name}" dihapus.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus kategori.");
    } finally {
      setDeleting(false);
    }
  };

  const sorted = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories]
  );

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Kelola Kategori</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelompokkan menu agar pembeli mudah mencari. {totalMenu} menu aktif tersebar di{" "}
            {categories.filter((c) => !c.isArchived).length} kategori.
          </p>
        </div>
        <Button onClick={openCreate} className="h-11">
          <Plus className="h-4 w-4" aria-hidden />
          Kategori Baru
        </Button>
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-[#d9c5a3] bg-[#f5ead6]/70 p-4 text-sm dark:border-[#5a4326] dark:bg-[#2c2013]/60">
        <Info className="mt-0.5 h-4.5 w-4.5 shrink-0 text-[#8a6a33] dark:text-[#d9c5a3]" aria-hidden />
        <p>
          <strong>Mengarsipkan kategori</strong> menyembunyikannya dari pembeli; menu di dalamnya
          tetap utuh dan bisa dipindahkan kapan saja. Bila kategori arsip masih menampung menu
          aktif, menu tersebut juga ikut tersembunyi dari tampilan publik.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : sorted.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageX className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-medium">Belum ada kategori.</p>
            <p className="text-sm text-muted-foreground">Buat kategori pertama untuk mengelompokkan menu.</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {sorted.map((c, i) => (
              <li
                key={c.id}
                className={cn(
                  "flex flex-wrap items-center gap-3 px-4 py-3.5 hover:bg-muted/30",
                  c.isArchived && "bg-muted/20"
                )}
              >
                <div className="flex flex-col">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Naikkan ${c.name}`}
                    disabled={i === 0 || busyId === c.id}
                    onClick={() => void move(c, -1)}
                  >
                    <ChevronUp className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    aria-label={`Turunkan ${c.name}`}
                    disabled={i === sorted.length - 1 || busyId === c.id}
                    onClick={() => void move(c, 1)}
                  >
                    <ChevronDown className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-secondary-foreground">
                  <Tags className="h-4.5 w-4.5" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate font-medium">{c.name}</p>
                    {c.isArchived && (
                      <Badge variant="secondary" className="text-stone-500">
                        Arsip
                      </Badge>
                    )}
                    {c.menuAktif > 0 && c.isArchived && (
                      <Badge className="border-amber-300 bg-amber-100 text-amber-800">
                        Menyembunyikan {c.menuAktif} menu aktif
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Urutan {c.sortOrder} · {c.menuCount} menu ({c.menuAktif} aktif)
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label={`Edit ${c.name}`}
                    onClick={() => openEdit(c)}
                  >
                    <Pencil className="h-4 w-4" aria-hidden />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10"
                    aria-label={c.isArchived ? `Pulihkan ${c.name}` : `Arsipkan ${c.name}`}
                    disabled={busyId === c.id}
                    onClick={() => {
                      if (!c.isArchived && c.menuAktif > 0) {
                        setArchiveTarget(c);
                      } else {
                        void toggleArchive(c);
                      }
                    }}
                  >
                    {c.isArchived ? (
                      <ArchiveRestore className="h-4 w-4" aria-hidden />
                    ) : (
                      <Archive className="h-4 w-4" aria-hidden />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-10 w-10 text-red-600 hover:text-red-700"
                    aria-label={`Hapus ${c.name}`}
                    disabled={busyId === c.id || c.menuCount > 0}
                    title={c.menuCount > 0 ? "Kategori masih berisi menu" : `Hapus ${c.name}`}
                    onClick={() => setDeleteTarget(c)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {/* Dialog buat/edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing ? `Edit Kategori — ${editing.name}` : "Kategori Baru"}
            </DialogTitle>
            <DialogDescription>
              Nama kategori tampil sebagai tab/ kelompok di menu pembeli.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="kat-nama">Nama Kategori *</Label>
              <Input
                id="kat-nama"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="cth. Kopi"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="kat-urutan">Urutan Tampil</Label>
              <Input
                id="kat-urutan"
                type="number"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                inputMode="numeric"
              />
              <p className="text-xs text-muted-foreground">Angka kecil tampil lebih dulu.</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11">
              Batal
            </Button>
            <Button onClick={() => void save()} disabled={saving} className="h-11">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Buat Kategori"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi arsip (menyembunyikan menu aktif) */}
      <AlertDialog open={!!archiveTarget} onOpenChange={(v) => !v && setArchiveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Arsipkan kategori "{archiveTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori ini masih menampung {archiveTarget?.menuAktif} menu aktif. Menu tersebut
              akan ikut tersembunyi dari pembeli (data menu tetap aman). Lanjutkan?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11">Batal</AlertDialogCancel>
            <AlertDialogAction
              className="h-11"
              onClick={(e) => {
                e.preventDefault();
                if (archiveTarget) void toggleArchive(archiveTarget);
              }}
            >
              Ya, Arsipkan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus kategori "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Kategori kosong bisa dihapus permanen. Tindakan ini tidak bisa dibatalkan.
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
