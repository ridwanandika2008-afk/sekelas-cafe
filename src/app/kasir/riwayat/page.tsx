"use client";

/**
 * Riwayat Transaksi Kasir — daftar transaksi per tanggal dengan filter
 * (tanggal, metode bayar, status, pencarian) + ringkasan total.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { formatRupiah, formatWibDateTime, formatWibTime, wibDateKey } from "@/lib/format";
import { ORDER_STATUS_LABEL } from "@/lib/constants";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  ChannelBadge,
  FulfillmentBadge,
  OrderStatusBadge,
  PaymentMethodBadge,
  PaymentStatusBadge,
} from "@/components/kasir/status-badge";
import { ReceiptButton } from "@/components/receipt/receipt-print";
import type { RiwayatOrder } from "@/components/kasir/types";

type RiwayatResponse = {
  tanggal: string | null;
  ringkasan: { jumlah: number; totalTunai: number; totalQris: number; total: number };
  orders: RiwayatOrder[];
};

function SummaryCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-3.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 font-display text-xl font-bold tabular-nums ${accent ?? ""}`}>{value}</p>
    </div>
  );
}

export default function RiwayatKasirPage() {
  const [tanggal, setTanggal] = useState(() => wibDateKey());
  const [metode, setMetode] = useState("semua");
  const [status, setStatus] = useState("semua");
  const [q, setQ] = useState("");
  const [data, setData] = useState<RiwayatResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<RiwayatOrder | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (tanggal) params.set("tanggal", tanggal);
      if (metode !== "semua") params.set("metode", metode);
      if (status !== "semua") params.set("status", status);
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/kasir/riwayat?${params.toString()}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memuat riwayat.");
      setData(json as RiwayatResponse);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memuat riwayat.");
    } finally {
      setLoading(false);
    }
  }, [tanggal, metode, status, q]);

  // debounce pencarian
  const [debouncedQ, setDebouncedQ] = useState(q);
  useEffect(() => {
    const t = setTimeout(() => setQ(debouncedQ), 400);
    return () => clearTimeout(t);
  }, [debouncedQ]);

  useEffect(() => {
    void load();
  }, [load]);

  const orders = data?.orders ?? [];
  const ringkasan = data?.ringkasan;

  const statusOptions = useMemo(() => Object.entries(ORDER_STATUS_LABEL), []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-xl font-bold">Riwayat Transaksi</h1>
        <p className="text-xs text-muted-foreground">
          Semua transaksi pada tanggal terpilih — termasuk yang dibatalkan. Riwayat shift tertutup
          ada di halaman Shift Kas.
        </p>
      </div>

      {/* ===== Filter ===== */}
      <div className="grid gap-2.5 rounded-xl border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1.5">
          <Label htmlFor="filter-tanggal" className="flex items-center gap-1.5 text-xs">
            <CalendarDays className="h-3.5 w-3.5" /> Tanggal
          </Label>
          <Input
            id="filter-tanggal"
            type="date"
            value={tanggal}
            onChange={(e) => setTanggal(e.target.value)}
            className="h-10"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Metode bayar</Label>
          <Select value={metode} onValueChange={setMetode}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua metode</SelectItem>
              <SelectItem value="CASH">Tunai</SelectItem>
              <SelectItem value="QRIS">QRIS</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="h-10 w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semua">Semua status</SelectItem>
              {statusOptions.map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="filter-q" className="flex items-center gap-1.5 text-xs">
            <Search className="h-3.5 w-3.5" /> Cari
          </Label>
          <Input
            id="filter-q"
            value={debouncedQ}
            onChange={(e) => setDebouncedQ(e.target.value)}
            placeholder="Nomor / nama pelanggan…"
            className="h-10"
          />
        </div>
      </div>

      {/* ===== Ringkasan ===== */}
      {ringkasan ? (
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <SummaryCard
            label="Transaksi valid"
            value={`${ringkasan.jumlah} pesanan`}
          />
          <SummaryCard label="Total tunai" value={formatRupiah(ringkasan.totalTunai)} />
          <SummaryCard label="Total QRIS" value={formatRupiah(ringkasan.totalQris)} />
          <SummaryCard
            label="Total keseluruhan"
            value={formatRupiah(ringkasan.total)}
            accent="text-primary dark:text-gold"
          />
        </div>
      ) : null}

      {/* ===== Daftar ===== */}
      {loading ? (
        <div className="flex min-h-[30vh] items-center justify-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Memuat riwayat…
        </div>
      ) : orders.length === 0 ? (
        <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
          Tidak ada transaksi yang cocok dengan filter ini.
        </div>
      ) : (
        <>
          {/* Tabel (desktop) */}
          <div className="hidden overflow-hidden rounded-xl border md:block">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/60 hover:bg-muted/60">
                  <TableHead className="min-w-32">Nomor</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Channel</TableHead>
                  <TableHead className="text-center">Item</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Kasir</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((o) => (
                  <TableRow
                    key={o.id}
                    className="cursor-pointer"
                    onClick={() => setDetail(o)}
                  >
                    <TableCell className="font-mono text-xs font-semibold">{o.orderNumber}</TableCell>
                    <TableCell className="text-xs whitespace-nowrap">
                      {formatWibTime(o.createdAt)} WIB
                    </TableCell>
                    <TableCell className="max-w-32 truncate text-sm">{o.customerName}</TableCell>
                    <TableCell>
                      <ChannelBadge channel={o.channel} />
                    </TableCell>
                    <TableCell className="text-center text-sm tabular-nums">{o.itemCount}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <PaymentMethodBadge method={o.paymentMethod} />
                        <PaymentStatusBadge status={o.paymentStatus} />
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-sm font-bold tabular-nums">
                      {formatRupiah(o.total)}
                    </TableCell>
                    <TableCell>
                      <OrderStatusBadge status={o.status} />
                    </TableCell>
                    <TableCell className="text-xs">{o.kasirName ?? "-"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Kartu (mobile) */}
          <div className="space-y-2.5 md:hidden">
            {orders.map((o) => (
              <Card key={o.id} className="shadow-sm">
                <CardContent
                  className="space-y-2 p-3.5"
                  role="button"
                  tabIndex={0}
                  onClick={() => setDetail(o)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") setDetail(o);
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-mono text-sm font-bold">{o.orderNumber}</p>
                    <OrderStatusBadge status={o.status} />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatWibDateTime(o.createdAt)} WIB · {o.customerName}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ChannelBadge channel={o.channel} />
                    <PaymentMethodBadge method={o.paymentMethod} />
                    <span className="text-xs text-muted-foreground">{o.itemCount} item</span>
                  </div>
                  <div className="flex items-baseline justify-between border-t pt-1.5">
                    <span className="text-xs text-muted-foreground">Total</span>
                    <span className="font-bold tabular-nums">{formatRupiah(o.total)}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}

      {/* ===== Dialog detail ===== */}
      <Dialog
        open={detail !== null}
        onOpenChange={(o) => {
          if (!o) setDetail(null);
        }}
      >
        <DialogContent className="sm:max-w-md">
          {detail ? (
            <>
              <DialogHeader>
                <DialogTitle className="font-mono text-lg tracking-wide">
                  {detail.orderNumber}
                </DialogTitle>
                <DialogDescription>
                  {formatWibDateTime(detail.createdAt)} WIB · kasir {detail.kasirName ?? "-"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-2 text-sm">
                <div className="flex flex-wrap items-center gap-1.5">
                  <OrderStatusBadge status={detail.status} />
                  <PaymentStatusBadge status={detail.paymentStatus} />
                  <PaymentMethodBadge method={detail.paymentMethod} />
                  <ChannelBadge channel={detail.channel} />
                </div>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 rounded-lg bg-muted/50 p-3">
                  <span className="text-xs text-muted-foreground">Pelanggan</span>
                  <span className="text-right font-semibold">{detail.customerName}</span>
                  <span className="text-xs text-muted-foreground">Penerimaan</span>
                  <span className="flex flex-wrap justify-end gap-1.5 text-right">
                    <FulfillmentBadge fulfillment={detail.fulfillment} />
                  </span>
                  <span className="text-xs text-muted-foreground">Jumlah item</span>
                  <span className="text-right tabular-nums">{detail.itemCount} jenis</span>
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-right font-bold tabular-nums">
                    {formatRupiah(detail.total)}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Rincian lengkap item & lokasi tersedia di struk.
                </p>
                {detail.cancelReason ? (
                  <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
                    Dibatalkan: {detail.cancelReason}
                  </p>
                ) : null}
              </div>
              <DialogFooter className="gap-2 sm:justify-between">
                <ReceiptButton
                  orderNumber={detail.orderNumber}
                  type="kitchen"
                  label="Struk Dapur"
                  className="h-10"
                />
                <ReceiptButton
                  orderNumber={detail.orderNumber}
                  type="customer"
                  label="Cetak Struk Pelanggan"
                  variant="default"
                  className="h-10"
                />
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
