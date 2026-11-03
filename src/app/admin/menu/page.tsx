"use client";

/**
 * Kelola Menu — tabel responsif + dialog editor lengkap (buat/edit)
 * dengan unggah foto, editor grup opsi, dan "Salin opsi dari…" menu lain.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  ArchiveRestore,
  Copy,
  Loader2,
  PackageX,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah } from "@/lib/format";
import { MENU_STATUS_BADGE, MENU_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/admin/image-upload";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type AdminOption = {
  id: string;
  name: string;
  priceDelta: number;
  isAvailable: boolean;
};

type AdminOptionGroup = {
  id: string;
  name: string;
  isRequired: boolean;
  maxSelect: number;
  options: AdminOption[];
};

type AdminMenuItem = {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  price: number;
  status: string;
  sortOrder: number;
  isFeatured: boolean;
  isArchived: boolean;
  categoryId: string;
  category: { id: string; name: string; isArchived: boolean };
  optionGroups: AdminOptionGroup[];
  orderItemCount: number;
};

type AdminCategory = { id: string; name: string; isArchived: boolean; sortOrder: number };

type OptionForm = { name: string; priceDelta: string; isAvailable: boolean };
type GroupForm = { name: string; isRequired: boolean; maxSelect: string; options: OptionForm[] };

type MenuForm = {
  name: string;
  categoryId: string;
  description: string;
  price: string;
  status: string;
  isFeatured: boolean;
  sortOrder: string;
  imageUrl: string;
  groups: GroupForm[];
};

const STATUS_OPTIONS = ["AVAILABLE", "SOLD_OUT", "PAUSED", "INACTIVE"];

function emptyForm(categories: AdminCategory[]): MenuForm {
  const aktif = categories.filter((c) => !c.isArchived);
  return {
    name: "",
    categoryId: aktif[0]?.id ?? categories[0]?.id ?? "",
    description: "",
    price: "0",
    status: "AVAILABLE",
    isFeatured: false,
    sortOrder: "0",
    imageUrl: "",
    groups: [],
  };
}

function itemToForm(item: AdminMenuItem): MenuForm {
  return {
    name: item.name,
    categoryId: item.categoryId,
    description: item.description ?? "",
    price: String(item.price),
    status: item.status,
    isFeatured: item.isFeatured,
    sortOrder: String(item.sortOrder),
    imageUrl: item.imageUrl ?? "",
    groups: item.optionGroups.map((g) => ({
      name: g.name,
      isRequired: g.isRequired,
      maxSelect: String(g.maxSelect),
      options: g.options.map((o) => ({
        name: o.name,
        priceDelta: String(o.priceDelta),
        isAvailable: o.isAvailable,
      })),
    })),
  };
}

function formToPayload(form: MenuForm) {
  return {
    name: form.name.trim(),
    categoryId: form.categoryId,
    description: form.description.trim() || null,
    price: Math.round(Number(form.price) || 0),
    status: form.status,
    isFeatured: form.isFeatured,
    sortOrder: Math.round(Number(form.sortOrder) || 0),
    imageUrl: form.imageUrl.trim() || null,
    optionGroups: form.groups.map((g) => ({
      name: g.name.trim(),
      isRequired: g.isRequired,
      maxSelect: Math.round(Number(g.maxSelect) || 1),
      options: g.options.map((o) => ({
        name: o.name.trim(),
        priceDelta: Math.round(Number(o.priceDelta) || 0),
        isAvailable: o.isAvailable,
      })),
    })),
  };
}

/** Validasi sisi klien — server memvalidasi ulang */
function validateForm(form: MenuForm, categories: AdminCategory[]): string | null {
  if (!form.name.trim()) return "Nama menu wajib diisi.";
  if (form.name.trim().length > 100) return "Nama menu maksimal 100 karakter.";
  if (!form.categoryId || !categories.some((c) => c.id === form.categoryId)) {
    return "Kategori wajib dipilih.";
  }
  const price = Number(form.price);
  if (!Number.isFinite(price) || price < 0) return "Harga harus angka ≥ 0.";
  for (const [gi, g] of form.groups.entries()) {
    if (!g.name.trim()) return `Grup opsi ke-${gi + 1}: nama wajib diisi.`;
    const max = Number(g.maxSelect);
    if (!Number.isInteger(max) || max < 1 || max > 5) {
      return `Grup opsi "${g.name.trim()}": maksimal pilih harus 1–5.`;
    }
    if (g.options.length === 0) {
      return `Grup opsi "${g.name.trim()}": minimal 1 opsi.`;
    }
    for (const [oi, o] of g.options.entries()) {
      if (!o.name.trim()) return `Grup "${g.name.trim()}": nama opsi ke-${oi + 1} wajib diisi.`;
      const d = Number(o.priceDelta);
      if (!Number.isFinite(d) || d < 0) {
        return `Opsi "${o.name.trim()}": tambahan harga harus ≥ 0.`;
      }
    }
  }
  return null;
}

export default function AdminMenuPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [items, setItems] = useState<AdminMenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  // filter
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState("semua");
  const [statusFilter, setStatusFilter] = useState("semua");

  // dialog editor
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminMenuItem | null>(null);
  const [form, setForm] = useState<MenuForm | null>(null);
  const [saving, setSaving] = useState(false);
  const [copySource, setCopySource] = useState("");

  // aksi baris
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminMenuItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/menu");
      if (res.ok && mounted.current) {
        const json = (await res.json()) as { categories: AdminCategory[]; items: AdminMenuItem[] };
        setCategories(json.categories);
        setItems(json.items);
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

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter((m) => {
      if (q && !m.name.toLowerCase().includes(q)) return false;
      if (statusFilter === "ARSIP") {
        if (!m.isArchived) return false;
      } else if (m.isArchived) {
        return false;
      } else if (statusFilter !== "semua" && m.status !== statusFilter) {
        return false;
      }
      if (catFilter !== "semua" && m.categoryId !== catFilter) return false;
      return true;
    });
  }, [items, search, catFilter, statusFilter]);

  /* ===== Dialog editor ===== */

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(categories));
    setCopySource("");
    setDialogOpen(true);
  };

  const openEdit = (item: AdminMenuItem) => {
    setEditing(item);
    setForm(itemToForm(item));
    setCopySource("");
    setDialogOpen(true);
  };

  const patchForm = (patch: Partial<MenuForm>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
  };

  const patchGroup = (gi: number, patch: Partial<GroupForm>) => {
    setForm((f) => {
      if (!f) return f;
      const groups = f.groups.map((g, i) => (i === gi ? { ...g, ...patch } : g));
      return { ...f, groups };
    });
  };

  const patchOption = (gi: number, oi: number, patch: Partial<OptionForm>) => {
    setForm((f) => {
      if (!f) return f;
      const groups = f.groups.map((g, i) =>
        i === gi
          ? { ...g, options: g.options.map((o, j) => (j === oi ? { ...o, ...patch } : o)) }
          : g
      );
      return { ...f, groups };
    });
  };

  const addGroup = () => {
    setForm((f) =>
      f
        ? {
            ...f,
            groups: [
              ...f.groups,
              { name: "", isRequired: false, maxSelect: "1", options: [{ name: "", priceDelta: "0", isAvailable: true }] },
            ],
          }
        : f
    );
  };

  const removeGroup = (gi: number) => {
    setForm((f) => (f ? { ...f, groups: f.groups.filter((_, i) => i !== gi) } : f));
  };

  const addOption = (gi: number) => {
    setForm((f) => {
      if (!f) return f;
      const groups = f.groups.map((g, i) =>
        i === gi ? { ...g, options: [...g.options, { name: "", priceDelta: "0", isAvailable: true }] } : g
      );
      return { ...f, groups };
    });
  };

  const removeOption = (gi: number, oi: number) => {
    setForm((f) => {
      if (!f) return f;
      const groups = f.groups.map((g, i) =>
        i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g
      );
      return { ...f, groups };
    });
  };

  /** Salin struktur grup opsi dari menu lain ke form (client-side copy) */
  const copyOptions = (menuId: string) => {
    const sumber = items.find((m) => m.id === menuId);
    if (!sumber || !form) return;
    if (sumber.optionGroups.length === 0) {
      toast.info(`Menu "${sumber.name}" tidak punya grup opsi.`);
      setCopySource("");
      return;
    }
    patchForm({
      groups: sumber.optionGroups.map((g) => ({
        name: g.name,
        isRequired: g.isRequired,
        maxSelect: String(g.maxSelect),
        options: g.options.map((o) => ({
          name: o.name,
          priceDelta: String(o.priceDelta),
          isAvailable: o.isAvailable,
        })),
      })),
    });
    toast.success(`Opsi disalin dari "${sumber.name}". Tersimpan saat Anda menyimpan menu.`);
    setCopySource("");
  };

  const save = async () => {
    if (!form) return;
    const invalid = validateForm(form, categories);
    if (invalid) {
      toast.error(invalid);
      return;
    }
    setSaving(true);
    try {
      const payload = formToPayload(form);
      const res = await fetch(
        editing ? `/api/admin/menu/${editing.id}` : "/api/admin/menu",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan menu.");
      toast.success(editing ? "Menu berhasil diperbarui." : `Menu "${payload.name}" berhasil dibuat.`);
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan menu.");
    } finally {
      setSaving(false);
    }
  };

  /* ===== Aksi baris ===== */

  const quickStatus = async (item: AdminMenuItem, status: string) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal mengubah status.");
      toast.success(`Status "${item.name}" → ${MENU_STATUS_LABEL[status]}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah status.");
    } finally {
      setBusyId(null);
    }
  };

  const toggleArchive = async (item: AdminMenuItem) => {
    setBusyId(item.id);
    try {
      const res = await fetch(`/api/admin/menu/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ archive: !item.isArchived }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal mengarsipkan menu.");
      toast.success(
        item.isArchived ? `"${item.name}" dipulihkan dari arsip.` : `"${item.name}" diarsipkan.`
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah arsip menu.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/menu/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus menu.");
      toast.success(`Menu "${deleteTarget.name}" dihapus.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus menu.");
    } finally {
      setDeleting(false);
    }
  };

  const salinOpsiCandidates = useMemo(
    () => items.filter((m) => m.id !== editing?.id && m.optionGroups.length > 0),
    [items, editing]
  );

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Kelola Menu</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur menu, harga, foto, dan grup opsi pembeli.
          </p>
        </div>
        <Button onClick={openCreate} className="h-11">
          <Plus className="h-4 w-4" aria-hidden />
          Menu Baru
        </Button>
      </div>

      {/* Toolbar */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama menu…"
              className="h-11 pl-9"
              aria-label="Cari nama menu"
            />
          </div>
          <Select value={catFilter} onValueChange={setCatFilter}>
            <SelectTrigger className="h-11" aria-label="Filter kategori">
              <SelectValue placeholder="Semua kategori" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Kategori</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name}
                  {c.isArchived ? " (arsip)" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-11" aria-label="Filter status">
              <SelectValue placeholder="Semua status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua Status</SelectItem>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {MENU_STATUS_LABEL[s]}
                </SelectItem>
              ))}
              <SelectItem value="ARSIP">Arsip</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center text-sm text-muted-foreground">
            {loading ? "Memuat…" : `${filtered.length} dari ${items.length} menu`}
          </div>
        </CardContent>
      </Card>

      {/* Tabel */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageX className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-medium">Tidak ada menu yang cocok.</p>
            <p className="text-sm text-muted-foreground">
              Coba ubah filter pencarian, atau tambahkan menu baru.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Menu</th>
                  <th className="px-4 py-3 font-semibold">Kategori</th>
                  <th className="px-4 py-3 font-semibold">Harga</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Urutan</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((m) => (
                  <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {m.imageUrl ? (
                          <img
                            src={m.imageUrl}
                            alt={`Foto ${m.name}`}
                            className="h-11 w-11 shrink-0 rounded-lg border object-cover"
                          />
                        ) : (
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border bg-muted/50 text-xs text-muted-foreground">
                            —
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="truncate font-medium">{m.name}</p>
                            {m.isFeatured && (
                              <Badge className="gap-0.5 border-[#d9c5a3] bg-[#efe4d3] text-[#5a4326]">
                                <Star className="h-3 w-3 fill-current" aria-hidden />
                                Unggulan
                              </Badge>
                            )}
                            {m.isArchived && (
                              <Badge variant="secondary" className="text-stone-500">
                                Arsip
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {m.optionGroups.length} grup opsi · {m.orderItemCount}× terjual
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-muted-foreground">{m.category?.name ?? "-"}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold">{formatRupiah(m.price)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            "hidden inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold lg:inline-flex",
                            MENU_STATUS_BADGE[m.status] ?? ""
                          )}
                        >
                          {MENU_STATUS_LABEL[m.status] ?? m.status}
                        </span>
                        <Select
                          value={m.status}
                          onValueChange={(v) => void quickStatus(m, v)}
                          disabled={busyId === m.id}
                        >
                          <SelectTrigger
                            className="h-9 w-[130px] text-xs"
                            aria-label={`Ubah status ${m.name}`}
                          >
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>
                                {MENU_STATUS_LABEL[s]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.sortOrder}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          aria-label={`Edit ${m.name}`}
                          onClick={() => openEdit(m)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          aria-label={m.isArchived ? `Pulihkan ${m.name}` : `Arsipkan ${m.name}`}
                          disabled={busyId === m.id}
                          onClick={() => void toggleArchive(m)}
                        >
                          {m.isArchived ? (
                            <ArchiveRestore className="h-4 w-4" aria-hidden />
                          ) : (
                            <Archive className="h-4 w-4" aria-hidden />
                          )}
                        </Button>
                        {m.orderItemCount === 0 && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-red-600 hover:text-red-700"
                            aria-label={`Hapus ${m.name}`}
                            disabled={busyId === m.id}
                            onClick={() => setDeleteTarget(m)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden />
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Dialog editor menu */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[88vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing ? `Edit Menu — ${editing.name}` : "Menu Baru"}
            </DialogTitle>
            <DialogDescription>
              Lengkapi detail menu. Perubahan langsung tampil bagi pembeli setelah disimpan.
            </DialogDescription>
          </DialogHeader>

          {form && (
            <div className="space-y-5">
              {/* Detail utama */}
              <section className="grid gap-4 sm:grid-cols-2" aria-label="Detail menu">
                <div className="space-y-2">
                  <Label htmlFor="menu-nama">Nama Menu *</Label>
                  <Input
                    id="menu-nama"
                    value={form.name}
                    onChange={(e) => patchForm({ name: e.target.value })}
                    placeholder="cth. Es Kopi Susu Gula Aren"
                    maxLength={100}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kategori *</Label>
                  <Select
                    value={form.categoryId}
                    onValueChange={(v) => patchForm({ categoryId: v })}
                  >
                    <SelectTrigger aria-label="Pilih kategori">
                      <SelectValue placeholder="Pilih kategori" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                          {c.isArchived ? " (arsip)" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label htmlFor="menu-deskripsi">Deskripsi</Label>
                  <Textarea
                    id="menu-deskripsi"
                    value={form.description}
                    onChange={(e) => patchForm({ description: e.target.value })}
                    placeholder="Deskripsi singkat yang menarik untuk pembeli…"
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="menu-harga">Harga (Rupiah) *</Label>
                  <Input
                    id="menu-harga"
                    type="number"
                    min={0}
                    step={500}
                    value={form.price}
                    onChange={(e) => patchForm({ price: e.target.value })}
                    inputMode="numeric"
                  />
                  <p className="text-xs text-muted-foreground">
                    Tampil sebagai {formatRupiah(Number(form.price) || 0)}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => patchForm({ status: v })}>
                    <SelectTrigger aria-label="Pilih status menu">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((s) => (
                        <SelectItem key={s} value={s}>
                          {MENU_STATUS_LABEL[s]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="menu-urutan">Urutan Tampil</Label>
                  <Input
                    id="menu-urutan"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => patchForm({ sortOrder: e.target.value })}
                    inputMode="numeric"
                  />
                </div>
                <div className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <Label htmlFor="menu-unggulan" className="cursor-pointer">
                      Menu Unggulan
                    </Label>
                    <p className="text-xs text-muted-foreground">Ditandai bintang &amp; diprioritaskan</p>
                  </div>
                  <Switch
                    id="menu-unggulan"
                    checked={form.isFeatured}
                    onCheckedChange={(v) => patchForm({ isFeatured: v })}
                  />
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Foto Menu</Label>
                  <ImageUpload
                    value={form.imageUrl || null}
                    onChange={(url) => patchForm({ imageUrl: url ?? "" })}
                    label="Unggah Foto"
                    hint="JPG/PNG/WebP maks 2MB. Tampil sebagai gambar kecil menarik bagi pembeli."
                  />
                </div>
              </section>

              {/* Grup opsi */}
              <section className="space-y-3" aria-label="Grup opsi">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold">Grup Opsi</h3>
                    <p className="text-xs text-muted-foreground">
                      Cth. Ukuran, Tingkat Gula, Topping. Opsi wajib = pembeli harus memilih.
                    </p>
                  </div>
                  <Button type="button" variant="outline" size="sm" className="h-10" onClick={addGroup}>
                    <Plus className="h-4 w-4" aria-hidden />
                    Tambah Grup
                  </Button>
                </div>

                {salinOpsiCandidates.length > 0 && (
                  <div className="flex items-center gap-2 rounded-lg border border-dashed p-3">
                    <Copy className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                    <Select value={copySource} onValueChange={copyOptions}>
                      <SelectTrigger className="h-10" aria-label="Salin opsi dari menu lain">
                        <SelectValue placeholder="Salin opsi dari…" />
                      </SelectTrigger>
                      <SelectContent>
                        {salinOpsiCandidates.map((m) => (
                          <SelectItem key={m.id} value={m.id}>
                            {m.name} ({m.optionGroups.length} grup)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {form.groups.length === 0 ? (
                  <p className="rounded-lg border border-dashed py-6 text-center text-sm text-muted-foreground">
                    Belum ada grup opsi — menu ini dijual tanpa pilihan tambahan.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {form.groups.map((g, gi) => (
                      <div key={gi} className="rounded-xl border p-4">
                        <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
                          <div className="space-y-1.5">
                            <Label htmlFor={`grup-nama-${gi}`}>Nama Grup *</Label>
                            <Input
                              id={`grup-nama-${gi}`}
                              value={g.name}
                              onChange={(e) => patchGroup(gi, { name: e.target.value })}
                              placeholder="cth. Ukuran"
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label htmlFor={`grup-maks-${gi}`}>Maks Pilih</Label>
                            <Input
                              id={`grup-maks-${gi}`}
                              type="number"
                              min={1}
                              max={5}
                              value={g.maxSelect}
                              onChange={(e) => patchGroup(gi, { maxSelect: e.target.value })}
                              className="w-24"
                              inputMode="numeric"
                            />
                          </div>
                          <div className="flex h-11 items-center gap-2 pb-1">
                            <Switch
                              id={`grup-wajib-${gi}`}
                              checked={g.isRequired}
                              onCheckedChange={(v) => patchGroup(gi, { isRequired: v })}
                              aria-label={`Grup ${g.name || gi + 1} wajib`}
                            />
                            <Label
                              htmlFor={`grup-wajib-${gi}`}
                              className="cursor-pointer text-sm text-muted-foreground"
                            >
                              Wajib
                            </Label>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-10 w-10 text-red-600 hover:text-red-700"
                            aria-label={`Hapus grup ${g.name || gi + 1}`}
                            onClick={() => removeGroup(gi)}
                          >
                            <X className="h-4 w-4" aria-hidden />
                          </Button>
                        </div>

                        <div className="mt-3 space-y-2">
                          {g.options.map((o, oi) => (
                            <div
                              key={oi}
                              className="grid grid-cols-[1fr_110px_auto_auto] items-center gap-2"
                            >
                              <Input
                                value={o.name}
                                onChange={(e) => patchOption(gi, oi, { name: e.target.value })}
                                placeholder="Nama opsi"
                                aria-label={`Opsi ${oi + 1} grup ${g.name || gi + 1}`}
                              />
                              <div className="relative">
                                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                                  +Rp
                                </span>
                                <Input
                                  type="number"
                                  min={0}
                                  step={500}
                                  value={o.priceDelta}
                                  onChange={(e) =>
                                    patchOption(gi, oi, { priceDelta: e.target.value })
                                  }
                                  className="pl-11"
                                  aria-label={`Tambahan harga opsi ${oi + 1}`}
                                  inputMode="numeric"
                                />
                              </div>
                              <div className="flex items-center gap-1.5">
                                <Switch
                                  id={`opsi-tersedia-${gi}-${oi}`}
                                  checked={o.isAvailable}
                                  onCheckedChange={(v) =>
                                    patchOption(gi, oi, { isAvailable: v })
                                  }
                                  aria-label={`Opsi ${o.name || oi + 1} tersedia`}
                                />
                                <Label
                                  htmlFor={`opsi-tersedia-${gi}-${oi}`}
                                  className="hidden cursor-pointer text-xs text-muted-foreground sm:block"
                                >
                                  Aktif
                                </Label>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-10 w-10 text-red-600 hover:text-red-700"
                                aria-label={`Hapus opsi ${o.name || oi + 1}`}
                                onClick={() => removeOption(gi, oi)}
                              >
                                <Trash2 className="h-4 w-4" aria-hidden />
                              </Button>
                            </div>
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-10"
                            onClick={() => addOption(gi)}
                          >
                            <Plus className="h-4 w-4" aria-hidden />
                            Tambah Opsi
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11">
              Batal
            </Button>
            <Button onClick={() => void save()} disabled={saving} className="h-11">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Buat Menu"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus menu "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Menu yang dihapus tidak bisa dikembalikan. Menu ini belum punya riwayat
              transaksi sehingga aman dihapus. Bila ragu, pertimbangkan mengarsipkan saja.
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
