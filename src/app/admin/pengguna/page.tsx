"use client";

/**
 * Kelola Pengguna — kelola staf (admin/kasir/barista): buat, edit,
 * aktif/nonaktif cepat, reset kata sandi, hapus (dengan pengaman).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Pencil, ShieldCheck, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";
import { formatWibDate } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/constants";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";

type AdminUser = {
  id: string;
  name: string;
  username: string;
  role: "ADMIN" | "KASIR" | "BARISTA" | string;
  isActive: boolean;
  createdAt: string;
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "border-[#d9c5a3] bg-[#efe4d3] text-[#5a4326]",
  KASIR: "bg-teal-100 text-teal-800 border-teal-300",
  BARISTA: "bg-orange-100 text-orange-800 border-orange-300",
};

type UserForm = {
  name: string;
  username: string;
  role: string;
  password: string;
  isActive: boolean;
};

const emptyForm: UserForm = {
  name: "",
  username: "",
  role: "KASIR",
  password: "",
  isActive: true,
};

export default function AdminPenggunaPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pengguna");
      if (res.ok && mounted.current) {
        const json = (await res.json()) as { users: AdminUser[] };
        setUsers(json.users);
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

  /* ===== dialog ===== */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setEditing(u);
    setForm({
      name: u.name,
      username: u.username,
      role: u.role,
      password: "",
      isActive: u.isActive,
    });
    setDialogOpen(true);
  };

  const save = async () => {
    const name = form.name.trim();
    const username = form.username.trim().toLowerCase();
    if (!name) {
      toast.error("Nama wajib diisi.");
      return;
    }
    if (!/^[a-z0-9._]+$/.test(username)) {
      toast.error("Username hanya boleh huruf kecil, angka, titik, dan underscore.");
      return;
    }
    if (!editing && form.password.length < 8) {
      toast.error("Kata sandi minimal 8 karakter.");
      return;
    }
    if (editing && form.password !== "" && form.password.length < 8) {
      toast.error("Kata sandi baru minimal 8 karakter.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = { name, username, role: form.role };
      if (!editing) {
        payload.password = form.password;
      } else {
        payload.isActive = form.isActive;
        if (form.password !== "") payload.password = form.password;
      }
      const res = await fetch(
        editing ? `/api/admin/pengguna/${editing.id}` : "/api/admin/pengguna",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan pengguna.");
      toast.success(editing ? "Data pengguna berhasil diperbarui." : `Pengguna "${name}" berhasil dibuat.`);
      setDialogOpen(false);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengguna.");
    } finally {
      setSaving(false);
    }
  };

  /* ===== aksi ===== */
  const quickToggle = async (u: AdminUser, isActive: boolean) => {
    setBusyId(u.id);
    try {
      const res = await fetch(`/api/admin/pengguna/${u.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal mengubah status pengguna.");
      toast.success(`"${u.name}" ${isActive ? "diaktifkan" : "dinonaktifkan"}.`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah status pengguna.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/pengguna/${deleteTarget.id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus pengguna.");
      toast.success(`Pengguna "${deleteTarget.name}" dihapus.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus pengguna.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Kelola Pengguna</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola akun staf kafe — admin, kasir, dan barista.
          </p>
        </div>
        <Button onClick={openCreate} className="h-11">
          <UserPlus className="h-4 w-4" aria-hidden />
          Pengguna Baru
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-16 rounded-xl" />
          ))}
        </div>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3 font-semibold">Nama</th>
                  <th className="px-4 py-3 font-semibold">Username</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Dibuat</th>
                  <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                          {u.name.slice(0, 1).toUpperCase()}
                        </span>
                        <span className="font-medium">{u.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono text-muted-foreground">{u.username}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                          ROLE_BADGE[u.role] ?? ""
                        )}
                      >
                        {u.role === "ADMIN" && <ShieldCheck className="mr-1 h-3 w-3" aria-hidden />}
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={u.isActive}
                          disabled={busyId === u.id}
                          onCheckedChange={(v) => void quickToggle(u, v)}
                          aria-label={`${u.isActive ? "Nonaktifkan" : "Aktifkan"} ${u.name}`}
                        />
                        <span className={cn("text-xs", u.isActive ? "text-emerald-700 dark:text-emerald-400" : "text-muted-foreground")}>
                          {u.isActive ? "Aktif" : "Nonaktif"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatWibDate(u.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          aria-label={`Edit ${u.name}`}
                          onClick={() => openEdit(u)}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-red-600 hover:text-red-700"
                          aria-label={`Hapus ${u.name}`}
                          onClick={() => setDeleteTarget(u)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Users className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Pengguna dengan riwayat shift/aktivitas tidak bisa dihapus — cukup nonaktifkan agar jejak
        audit tetap utuh. Akun sendiri &amp; admin aktif terakhir selalu dilindungi.
      </p>

      {/* Dialog buat/edit */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editing ? `Edit Pengguna — ${editing.name}` : "Pengguna Baru"}
            </DialogTitle>
            <DialogDescription>
              {editing
                ? "Perbarui data staf. Kosongkan kata sandi bila tidak ingin mengubahnya."
                : "Buat akun staf baru beserta kata sandi awal (minimal 8 karakter)."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="pg-nama">Nama Lengkap *</Label>
              <Input
                id="pg-nama"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="cth. Sinta Permata"
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg-username">Username * (huruf kecil)</Label>
              <Input
                id="pg-username"
                value={form.username}
                onChange={(e) =>
                  setForm((f) => ({ ...f, username: e.target.value.toLowerCase() }))
                }
                placeholder="cth. sinta"
                autoComplete="off"
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm((f) => ({ ...f, role: v }))}
              >
                <SelectTrigger aria-label="Pilih role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="KASIR">Kasir</SelectItem>
                  <SelectItem value="BARISTA">Barista</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="pg-sandi">
                {editing ? "Kata Sandi Baru (opsional — reset)" : "Kata Sandi Awal *"}
              </Label>
              <Input
                id="pg-sandi"
                type="password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Minimal 8 karakter"
                autoComplete="new-password"
              />
            </div>
            {editing && (
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label htmlFor="pg-aktif" className="cursor-pointer">
                    Akun Aktif
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Nonaktif = tidak bisa masuk sama sekali
                  </p>
                </div>
                <Switch
                  id="pg-aktif"
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                />
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDialogOpen(false)} className="h-11">
              Batal
            </Button>
            <Button onClick={() => void save()} disabled={saving} className="h-11">
              {saving && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              {saving ? "Menyimpan…" : editing ? "Simpan Perubahan" : "Buat Pengguna"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus pengguna "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Akun tanpa riwayat shift/aktivitas akan dihapus permanen. Pengguna lain cukup
              dinonaktifkan agar jejak transaksinya tetap terjaga.
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
