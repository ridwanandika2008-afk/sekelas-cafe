"use client";

/**
 * Promo & Diskon — kelola promo persen/nominal: kartu ringkas status hari ini,
 * tabel dengan toggle aktif, edit, dan hapus (ditolak bila sudah dipakai transaksi).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  CalendarRange,
  Loader2,
  Pencil,
  Plus,
  Ticket,
  TicketPercent,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { formatRupiah, formatWibDate } from "@/lib/format";
import { PromoDialog } from "@/components/admin/promo/promo-dialog";
import {
  PROMO_STATE_BADGE,
  PROMO_STATE_LABEL,
  promoState,
  promoTypeLabel,
  type AdminPromo,
} from "@/components/admin/promo/types";

export default function AdminPromoPage() {
  const [promos, setPromos] = useState<AdminPromo[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<AdminPromo | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AdminPromo | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/promo");
      if (res.ok) {
        const json = (await res.json()) as { promos: AdminPromo[] };
        setPromos(json.promos);
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

  const now = useMemo(() => new Date(), [promos]);

  const ringkasan = useMemo(() => {
    let aktif = 0;
    let akanDatang = 0;
    let berakhir = 0;
    for (const p of promos) {
      const s = promoState(p, now);
      if (s === "AKTIF") aktif++;
      else if (s === "TERJADWAL") akanDatang++;
      else if (s === "BERAKHIR") berakhir++;
    }
    return { aktif, akanDatang, berakhir };
  }, [promos, now]);

  const toggleActive = async (p: AdminPromo) => {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/promo/${p.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !p.isActive }),
      });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal mengubah status promo.");
      toast.success(
        p.isActive
          ? `Promo "${p.name}" dinonaktifkan — hilang dari pilihan pembeli & kasir.`
          : `Promo "${p.name}" diaktifkan kembali.`
      );
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengubah status promo.");
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/promo/${deleteTarget.id}`, { method: "DELETE" });
      const json = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Gagal menghapus promo.");
      toast.success(`Promo "${deleteTarget.name}" dihapus.`);
      setDeleteTarget(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menghapus promo.");
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  const kartu = [
    {
      label: "Aktif Hari Ini",
      value: ringkasan.aktif,
      icon: TicketPercent,
      tone: "text-emerald-700 dark:text-emerald-400",
    },
    {
      label: "Akan Datang",
      value: ringkasan.akanDatang,
      icon: CalendarClock,
      tone: "text-amber-700 dark:text-amber-400",
    },
    {
      label: "Berakhir",
      value: ringkasan.berakhir,
      icon: CalendarRange,
      tone: "text-red-700 dark:text-red-400",
    },
  ];

  return (
    <main className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold sm:text-3xl">Promo &amp; Diskon</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atur promo yang bisa dipilih pembeli &amp; kasir saat checkout — berlaku untuk semua
            pesanan selama periode aktif.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setDialogOpen(true);
          }}
          className="h-11"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Promo Baru
        </Button>
      </div>

      {/* Kartu ringkas */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {kartu.map((k) => (
          <Card key={k.label}>
            <CardContent className="flex items-center gap-4 p-4 sm:p-6">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-secondary">
                <k.icon className={`h-5 w-5 ${k.tone}`} aria-hidden />
              </span>
              <div>
                <p className="font-display text-2xl font-semibold leading-none">{k.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">{k.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabel promo */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : promos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <Ticket className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-medium">Belum ada promo.</p>
            <p className="text-sm text-muted-foreground">
              Buat promo pertama untuk menarik pembeli datang kembali.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden py-0">
          <Table className="min-w-[760px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Nama Promo</TableHead>
                <TableHead>Jenis</TableHead>
                <TableHead>Minimum Belanja</TableHead>
                <TableHead>Periode</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Dipakai</TableHead>
                <TableHead className="pr-4 text-right">Aktif · Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {promos.map((p) => {
                const state = promoState(p, now);
                return (
                  <TableRow key={p.id}>
                    <TableCell className="pl-4 font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="border-[#d9c5a3] bg-[#f5ead6]/70 text-[#5a4326] dark:border-[#5a4326] dark:bg-[#2c2013]/60 dark:text-[#d9c5a3]">
                        {promoTypeLabel(p)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.minOrder > 0 ? formatRupiah(p.minOrder) : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {formatWibDate(p.startsAt)} – {formatWibDate(p.endsAt)}
                    </TableCell>
                    <TableCell>
                      <Badge className={PROMO_STATE_BADGE[state]}>
                        {PROMO_STATE_LABEL[state]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {p.orders > 0 ? (
                        <span>{p.orders} pesanan</span>
                      ) : (
                        <span className="text-muted-foreground">Belum</span>
                      )}
                    </TableCell>
                    <TableCell className="pr-2">
                      <div className="flex items-center justify-end gap-1">
                        <Switch
                          checked={p.isActive}
                          disabled={busyId === p.id}
                          onCheckedChange={() => void toggleActive(p)}
                          aria-label={`${p.isActive ? "Nonaktifkan" : "Aktifkan"} promo ${p.name}`}
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10"
                          aria-label={`Edit promo ${p.name}`}
                          title="Edit promo"
                          onClick={() => {
                            setEditing(p);
                            setDialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" aria-hidden />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-10 w-10 text-red-600 hover:text-red-700"
                          aria-label={`Hapus promo ${p.name}`}
                          title="Hapus promo"
                          onClick={() => setDeleteTarget(p)}
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Dialog buat/edit */}
      <PromoDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} onSaved={load} />

      {/* Konfirmasi hapus */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus promo "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Promo yang sudah dipakai transaksi tidak bisa dihapus — cukup nonaktifkan agar
              riwayat pesanan tetap lengkap. Tindakan ini tidak bisa dibatalkan.
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
