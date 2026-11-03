"use client";

/**
 * Shift & Kas — buka shift, ringkasan kas berjalan, pengeluaran,
 * tutup shift dengan preview selisih real-time, + riwayat shift.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowDownCircle,
  Banknote,
  CheckCircle2,
  Coins,
  History,
  Loader2,
  Lock,
  QrCode,
  Timer,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah, formatWibDateTime, formatWibTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { OpenShift, ShiftHistory } from "@/components/kasir/types";

type ClosedShiftResult = {
  id: string;
  openingCash: number;
  closingCash: number;
  cashTotal: number;
  qrisTotal: number;
  expenseTotal: number;
  expectedCash: number;
  variance: number;
};

function StatTile({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Banknote;
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="h-4 w-4" /> {label}
      </div>
      <p className={cn("mt-1.5 font-display text-lg font-bold tabular-nums", accent)}>{value}</p>
    </div>
  );
}

function VarianceText({ value, big }: { value: number; big?: boolean }) {
  if (value === 0)
    return (
      <span
        className={cn(
          "font-bold text-emerald-700 dark:text-emerald-400",
          big && "text-xl"
        )}
      >
        Pas — kas cocok ✓
      </span>
    );
  if (value < 0)
    return (
      <span className={cn("font-bold text-red-600 dark:text-red-400", big && "text-xl")}>
        Kas kurang {formatRupiah(Math.abs(value))}
      </span>
    );
  return (
    <span
      className={cn("font-bold text-amber-700 dark:text-amber-400", big && "text-xl")}
    >
      Kas lebih {formatRupiah(value)}
    </span>
  );
}

export default function ShiftKasPage() {
  const [shift, setShift] = useState<OpenShift | null>(null);
  const [history, setHistory] = useState<ShiftHistory[]>([]);
  const [loading, setLoading] = useState(true);

  // form buka shift
  const [openingCash, setOpeningCash] = useState("");
  const [opening, setOpening] = useState(false);

  // form pengeluaran
  const [expAmount, setExpAmount] = useState("");
  const [expNote, setExpNote] = useState("");
  const [addingExpense, setAddingExpense] = useState(false);

  // tutup shift
  const [closingCash, setClosingCash] = useState("");
  const [confirmClose, setConfirmClose] = useState(false);
  const [closing, setClosing] = useState(false);
  const [closedResult, setClosedResult] = useState<ClosedShiftResult | null>(null);

  const load = useCallback(async () => {
    try {
      const [shiftRes, histRes] = await Promise.all([
        fetch("/api/kasir/shift"),
        fetch("/api/kasir/shift/riwayat"),
      ]);
      if (shiftRes.ok) {
        const json = await shiftRes.json();
        setShift(json.shift ?? null);
      }
      if (histRes.ok) {
        const json = await histRes.json();
        setHistory(json.shifts as ShiftHistory[]);
      }
    } catch {
      toast.error("Gagal memuat data shift.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const expected = shift?.ringkasan.expectedCash ?? 0;
  const closingNum = Math.max(0, Math.floor(Number(closingCash) || 0));
  const variancePreview = useMemo(() => closingNum - expected, [closingNum, expected]);

  /* ===== aksi ===== */

  const openShiftNow = async () => {
    const cash = Math.floor(Number(openingCash) || 0);
    if (cash < 0) {
      toast.error("Saldo awal kas tidak valid.");
      return;
    }
    setOpening(true);
    try {
      const res = await fetch("/api/kasir/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingCash: cash }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal membuka shift.");
      toast.success("Shift dibuka. Selamat bertugas!");
      setOpeningCash("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuka shift.");
    } finally {
      setOpening(false);
    }
  };

  const addExpense = async () => {
    if (!shift) return;
    const amount = Math.floor(Number(expAmount) || 0);
    if (amount <= 0) {
      toast.error("Nominal pengeluaran harus lebih dari 0.");
      return;
    }
    if (expNote.trim().length < 3) {
      toast.error("Isi keterangan pengeluaran (min. 3 karakter).");
      return;
    }
    setAddingExpense(true);
    try {
      const res = await fetch(`/api/kasir/shift/${shift.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "pengeluaran", amount, note: expNote.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menambah pengeluaran.");
      toast.success("Pengeluaran tercatat.");
      setExpAmount("");
      setExpNote("");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menambah pengeluaran.");
    } finally {
      setAddingExpense(false);
    }
  };

  const closeShiftNow = async () => {
    if (!shift) return;
    setClosing(true);
    try {
      const res = await fetch(`/api/kasir/shift/${shift.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "tutup", closingCash: closingNum }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal menutup shift.");
      const result = json.shift as ClosedShiftResult;
      setClosedResult(result);
      setConfirmClose(false);
      setClosingCash("");
      toast.success("Shift ditutup. Laporan kas tersimpan.");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menutup shift.");
    } finally {
      setClosing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Memuat shift…
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-xl font-bold">Shift & Kas</h1>
        <p className="text-xs text-muted-foreground">
          Pertanggungjawaban kas kasir — buka shift, catat pengeluaran, tutup dengan hitung fisik.
        </p>
      </div>

      {!shift ? (
        /* ===== Belum ada shift: form buka ===== */
        <Card className="max-w-lg">
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft">
              <Timer className="h-7 w-7 text-gold-foreground" />
            </div>
            <CardTitle className="font-display text-lg">Belum Ada Shift Aktif</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Hitung uang kas di laci sekarang, lalu catat saldonya sebagai saldo awal. Semua
              transaksi tunai & pengeluaran selama shift akan dihitung dari angka ini.
            </p>
            <div className="space-y-2">
              <Label htmlFor="opening-cash">Saldo awal kas (Rp)</Label>
              <Input
                id="opening-cash"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Contoh: 50000"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="h-12 text-lg font-semibold tabular-nums"
              />
            </div>
            <Button
              className="h-12 w-full text-base font-bold"
              disabled={opening}
              onClick={() => void openShiftNow()}
            >
              {opening ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Membuka…
                </>
              ) : (
                "Buka Shift"
              )}
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* ===== Shift terbuka ===== */
        <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
          {/* Ringkasan + pengeluaran */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex-row items-center justify-between py-3.5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Wallet className="h-4.5 w-4.5" /> Kas Berjalan
                </CardTitle>
                <Badge className="gap-1.5 border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                  </span>
                  Shift aktif
                </Badge>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Dibuka {formatWibDateTime(shift.openedAt)} WIB ·{" "}
                  {shift.kasir?.name ?? "Kasir"} · {shift.ringkasan.jumlahTransaksi} transaksi
                </p>
                <div className="grid grid-cols-2 gap-2.5 xl:grid-cols-3">
                  <StatTile icon={Coins} label="Saldo awal" value={formatRupiah(shift.openingCash)} />
                  <StatTile
                    icon={Banknote}
                    label="Tunai masuk"
                    value={formatRupiah(shift.ringkasan.cashTotal)}
                    accent="text-emerald-700 dark:text-emerald-400"
                  />
                  <StatTile
                    icon={QrCode}
                    label="QRIS masuk"
                    value={formatRupiah(shift.ringkasan.qrisTotal)}
                    accent="text-teal-700 dark:text-teal-400"
                  />
                  <StatTile
                    icon={TrendingDown}
                    label="Pengeluaran"
                    value={formatRupiah(shift.ringkasan.expenseTotal)}
                    accent="text-red-600 dark:text-red-400"
                  />
                  <StatTile
                    icon={Wallet}
                    label="Kas seharusnya"
                    value={formatRupiah(expected)}
                    accent="text-primary dark:text-gold"
                  />
                </div>
                <p className="rounded-lg bg-gold-soft/60 px-3 py-2 text-xs leading-relaxed text-gold-foreground">
                  <strong>Kas seharusnya</strong> = saldo awal + tunai masuk − pengeluaran. QRIS
                  masuk tidak ikut dihitung dalam kas laci. Bandingkan dengan hasil hitung fisik
                  saat menutup shift.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="py-3.5">
                <CardTitle className="flex items-center gap-2 text-base">
                  <ArrowDownCircle className="h-4.5 w-4.5" /> Pengeluaran Shift
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {shift.expenses.length === 0 ? (
                  <p className="rounded-lg border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
                    Belum ada pengeluaran tercatat shift ini.
                  </p>
                ) : (
                  <ul className="max-h-56 space-y-2 overflow-y-auto pr-0.5">
                    {shift.expenses.map((e) => (
                      <li
                        key={e.id}
                        className="flex items-start justify-between gap-3 rounded-lg border bg-background px-3 py-2.5"
                      >
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium">{e.note}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {formatWibTime(e.createdAt)} WIB
                          </p>
                        </div>
                        <p className="shrink-0 text-sm font-bold text-red-600 tabular-nums dark:text-red-400">
                          -{formatRupiah(e.amount)}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="grid gap-2.5 border-t pt-3 sm:grid-cols-[160px_1fr_auto]">
                  <div className="space-y-1.5">
                    <Label htmlFor="exp-amount" className="text-xs">
                      Nominal (Rp)
                    </Label>
                    <Input
                      id="exp-amount"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      placeholder="5000"
                      value={expAmount}
                      onChange={(e) => setExpAmount(e.target.value)}
                      className="h-10 tabular-nums"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="exp-note" className="text-xs">
                      Keterangan
                    </Label>
                    <Input
                      id="exp-note"
                      value={expNote}
                      maxLength={200}
                      onChange={(e) => setExpNote(e.target.value)}
                      placeholder="Beli gelas, ganti gas, dll."
                      className="h-10"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      className="h-10 w-full font-semibold sm:w-auto"
                      disabled={addingExpense}
                      onClick={() => void addExpense()}
                    >
                      {addingExpense ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ArrowDownCircle className="h-4 w-4" />
                      )}
                      Catat
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tutup shift */}
          <Card className="lg:sticky lg:top-[70px]">
            <CardHeader className="py-3.5">
              <CardTitle className="flex items-center gap-2 text-base">
                <Lock className="h-4.5 w-4.5" /> Tutup Shift
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Hitung fisik seluruh uang tunai di laci, lalu masukkan hasilnya di bawah.
              </p>
              <div className="space-y-2">
                <Label htmlFor="closing-cash">Saldo kas hasil hitung fisik (Rp)</Label>
                <Input
                  id="closing-cash"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={String(expected)}
                  value={closingCash}
                  onChange={(e) => setClosingCash(e.target.value)}
                  className="h-12 text-lg font-semibold tabular-nums"
                />
              </div>
              {closingCash !== "" ? (
                <div
                  className={cn(
                    "flex items-center justify-between gap-2 rounded-lg border px-3 py-2.5 text-sm",
                    variancePreview === 0
                      ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-950/40"
                      : variancePreview < 0
                        ? "border-red-300 bg-red-50 dark:bg-red-950/40"
                        : "border-amber-300 bg-amber-50 dark:bg-amber-950/40"
                  )}
                >
                  <span className="text-xs text-muted-foreground">
                    Selisih (fisik − seharusnya {formatRupiah(expected)})
                  </span>
                  <VarianceText value={variancePreview} />
                </div>
              ) : null}
              {closingCash !== "" && variancePreview < 0 ? (
                <p className="flex items-start gap-1.5 text-xs text-red-600 dark:text-red-400">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  Kas kurang — periksa kembali kembalian, struk, dan penerimaan tunai sebelum
                  menutup shift.
                </p>
              ) : null}
              <Button
                variant="destructive"
                className="h-12 w-full text-base font-bold"
                disabled={closingCash === "" || closingNum < 0}
                onClick={() => setConfirmClose(true)}
              >
                <Lock className="h-4.5 w-4.5" /> Tutup Shift Sekarang
              </Button>
              <p className="text-center text-[11px] text-muted-foreground">
                Setelah ditutup, shift tidak bisa dibuka kembali.
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ===== Riwayat shift ===== */}
      <section className="space-y-3" aria-label="Riwayat shift">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
            <History className="h-4.5 w-4.5" />
          </span>
          <div>
            <h2 className="font-display text-base font-bold">Riwayat Shift</h2>
            <p className="text-xs text-muted-foreground">20 shift terakhir yang sudah ditutup.</p>
          </div>
        </div>

        {history.length === 0 ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            Belum ada riwayat shift yang ditutup.
          </div>
        ) : (
          <>
            {/* Tabel desktop */}
            <div className="hidden overflow-hidden rounded-xl border md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 hover:bg-muted/60">
                    <TableHead>Dibuka</TableHead>
                    <TableHead>Ditutup</TableHead>
                    <TableHead>Kasir</TableHead>
                    <TableHead className="text-right">Tunai</TableHead>
                    <TableHead className="text-right">QRIS</TableHead>
                    <TableHead className="text-right">Pengeluaran</TableHead>
                    <TableHead className="text-right">Kas Seharusnya</TableHead>
                    <TableHead className="text-right">Selisih</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="text-xs whitespace-nowrap">
                        {formatWibDateTime(s.openedAt)}
                      </TableCell>
                      <TableCell className="text-xs whitespace-nowrap">
                        {s.closedAt ? formatWibDateTime(s.closedAt) : "-"}
                      </TableCell>
                      <TableCell className="text-xs">
                        {s.kasirName}
                        <span className="ml-1 text-muted-foreground">
                          ({s.jumlahTransaksi} trx)
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatRupiah(s.cashTotal)}
                      </TableCell>
                      <TableCell className="text-right text-sm tabular-nums">
                        {formatRupiah(s.qrisTotal)}
                      </TableCell>
                      <TableCell className="text-right text-sm text-red-600 tabular-nums dark:text-red-400">
                        -{formatRupiah(s.expenseTotal)}
                      </TableCell>
                      <TableCell className="text-right text-sm font-semibold tabular-nums">
                        {formatRupiah(s.expectedCash ?? 0)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "text-right text-sm font-bold tabular-nums",
                          (s.variance ?? 0) === 0
                            ? "text-emerald-700 dark:text-emerald-400"
                            : (s.variance ?? 0) < 0
                              ? "text-red-600 dark:text-red-400"
                              : "text-amber-700 dark:text-amber-400"
                        )}
                      >
                        {(s.variance ?? 0) === 0
                          ? "Pas"
                          : (s.variance ?? 0) > 0
                            ? `+${formatRupiah(s.variance ?? 0)}`
                            : formatRupiah(s.variance ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Kartu mobile */}
            <div className="space-y-2.5 md:hidden">
              {history.map((s) => (
                <Card key={s.id} className="shadow-sm">
                  <CardContent className="space-y-2 p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{s.kasirName}</p>
                      <p className="text-xs text-muted-foreground">
                        {s.closedAt ? formatWibDateTime(s.closedAt) : "-"}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Dibuka {formatWibDateTime(s.openedAt)} · {s.jumlahTransaksi} transaksi
                    </p>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                      <span className="text-muted-foreground">Tunai</span>
                      <span className="text-right font-semibold tabular-nums">
                        {formatRupiah(s.cashTotal)}
                      </span>
                      <span className="text-muted-foreground">QRIS</span>
                      <span className="text-right font-semibold tabular-nums">
                        {formatRupiah(s.qrisTotal)}
                      </span>
                      <span className="text-muted-foreground">Pengeluaran</span>
                      <span className="text-right font-semibold text-red-600 tabular-nums dark:text-red-400">
                        -{formatRupiah(s.expenseTotal)}
                      </span>
                      <span className="text-muted-foreground">Kas seharusnya</span>
                      <span className="text-right font-semibold tabular-nums">
                        {formatRupiah(s.expectedCash ?? 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-t pt-1.5 text-sm">
                      <span className="text-xs text-muted-foreground">Selisih</span>
                      <span className="font-bold">
                        <VarianceText value={s.variance ?? 0} />
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </section>

      {/* ===== Dialog konfirmasi tutup ===== */}
      <Dialog open={confirmClose} onOpenChange={setConfirmClose}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Konfirmasi Tutup Shift</DialogTitle>
            <DialogDescription>
              Pastikan seluruh uang sudah dihitung dan disimpan sesuai prosedur.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kas seharusnya</span>
              <span className="font-semibold tabular-nums">{formatRupiah(expected)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Hasil hitung fisik</span>
              <span className="font-semibold tabular-nums">{formatRupiah(closingNum)}</span>
            </div>
            <div className="flex justify-between border-t pt-1.5">
              <span className="text-muted-foreground">Selisih</span>
              <VarianceText value={variancePreview} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmClose(false)}>
              Kembali
            </Button>
            <Button
              variant="destructive"
              className="font-bold"
              disabled={closing}
              onClick={() => void closeShiftNow()}
            >
              {closing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Menutup…
                </>
              ) : (
                "Ya, Tutup Shift"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Dialog hasil tutup shift ===== */}
      <Dialog
        open={closedResult !== null}
        onOpenChange={(o) => {
          if (!o) setClosedResult(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {closedResult ? (
            <>
              <DialogHeader className="items-center text-center sm:text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <DialogTitle className="font-display text-xl">Shift Ditutup</DialogTitle>
                <DialogDescription>
                  Laporan pertanggungjawaban kas sudah tersimpan. Terima kasih, waktunya istirahat!
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 rounded-lg bg-muted/60 p-3.5 text-sm">
                {[
                  ["Saldo awal kas", formatRupiah(closedResult.openingCash)],
                  ["Transaksi tunai", formatRupiah(closedResult.cashTotal)],
                  ["Transaksi QRIS", formatRupiah(closedResult.qrisTotal)],
                  ["Pengeluaran", `-${formatRupiah(closedResult.expenseTotal)}`],
                  ["Kas seharusnya", formatRupiah(closedResult.expectedCash)],
                  ["Kas fisik dihitung", formatRupiah(closedResult.closingCash)],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="font-semibold tabular-nums">{value}</span>
                  </div>
                ))}
                <div className="flex items-baseline justify-between rounded-md border border-gold/50 bg-gold-soft/70 px-3 py-2.5">
                  <span className="text-sm font-bold text-gold-foreground">SELISIH AKHIR</span>
                  <VarianceText value={closedResult.variance} big />
                </div>
              </div>
              <DialogFooter>
                <Button className="h-11 w-full font-bold" onClick={() => setClosedResult(null)}>
                  Mengerti
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
