"use client";

/**
 * Tabel-tabel laporan: menu terlaris, menu kurang diminati, kinerja kasir,
 * dan ringkasan per metode penerimaan.
 */
import { Coffee, TrendingDown, UserCog, UtensilsCrossed } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { FULFILLMENT_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { LaporanData } from "./types";

function EmptyTabel({ pesan }: { pesan: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{pesan}</p>;
}

export function MenuTerlarisTabel({ data }: { data: LaporanData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Coffee className="h-4.5 w-4.5 text-primary" aria-hidden />
          Menu Terlaris
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.menuTerlaris.length === 0 ? (
          <EmptyTabel pesan="Belum ada menu terjual pada periode ini." />
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Nama Menu</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.menuTerlaris.map((m, i) => (
                  <TableRow key={m.nama}>
                    <TableCell className="text-center">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold",
                          i === 0
                            ? "bg-gold text-[#3d2c12]"
                            : "bg-secondary text-secondary-foreground"
                        )}
                        aria-label={`Peringkat ${i + 1}`}
                      >
                        {i + 1}
                      </span>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate font-medium" title={m.nama}>
                      {m.nama}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.qty}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(m.pendapatan)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MenuKurangDiminatiTabel({ data }: { data: LaporanData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingDown className="h-4.5 w-4.5 text-primary" aria-hidden />
          Menu Kurang Diminati
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.menuKurangDiminati.length === 0 ? (
          <EmptyTabel pesan="Belum ada menu terjual pada periode ini." />
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead>Nama Menu</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.menuKurangDiminati.map((m, i) => (
                  <TableRow key={m.nama}>
                    <TableCell className="text-center text-xs text-muted-foreground">
                      {i + 1}
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate font-medium" title={m.nama}>
                      {m.nama}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{m.qty}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(m.pendapatan)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">
          10 menu dengan penjualan terendah (dari menu yang pernah terjual di periode ini).
        </p>
      </CardContent>
    </Card>
  );
}

export function KinerjaKasirTabel({ data }: { data: LaporanData }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UserCog className="h-4.5 w-4.5 text-primary" aria-hidden />
          Kinerja Kasir
        </CardTitle>
      </CardHeader>
      <CardContent>
        {data.perKasir.length === 0 ? (
          <EmptyTabel pesan="Belum ada transaksi pada periode ini." />
        ) : (
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama Kasir</TableHead>
                  <TableHead className="text-right">Transaksi</TableHead>
                  <TableHead className="text-right">Tunai</TableHead>
                  <TableHead className="text-right">QRIS</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.perKasir.map((k) => (
                  <TableRow key={k.nama}>
                    <TableCell className="font-medium">{k.nama}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {k.jumlahTransaksi}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(k.tunai)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatRupiah(k.qris)}
                    </TableCell>
                    <TableCell className="text-right font-semibold tabular-nums">
                      {formatRupiah(k.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function MetodePenerimaanTabel({ data }: { data: LaporanData }) {
  const total = data.perMetodePenerimaan.reduce((s, m) => s + m.jumlah, 0);
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <UtensilsCrossed className="h-4.5 w-4.5 text-primary" aria-hidden />
          Metode Penerimaan
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metode</TableHead>
              <TableHead className="text-right">Jumlah Pesanan</TableHead>
              <TableHead className="text-right">Porsi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.perMetodePenerimaan.map((m) => (
              <TableRow key={m.fulfillment}>
                <TableCell className="font-medium">
                  {FULFILLMENT_LABEL[m.fulfillment] ?? m.fulfillment}
                </TableCell>
                <TableCell className="text-right tabular-nums">{m.jumlah}</TableCell>
                <TableCell className="text-right">
                  <Badge variant={m.jumlah > 0 ? "default" : "secondary"}>
                    {total > 0 ? Math.round((m.jumlah / total) * 100) : 0}%
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
