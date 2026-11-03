"use client";

/**
 * Grafik laporan (recharts + ui/chart.tsx) — palet hangat via token
 * --color-chart-1..5. Semua responsif & tooltip berformat Rupiah.
 */
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatRupiah } from "@/lib/format";
import type { LaporanData } from "./types";

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

/** "2026-11-03" → "3 Nov" */
function shortDate(key: string): string {
  const [, m, d] = key.split("-");
  const bulan = MONTHS_SHORT[parseInt(m ?? "1", 10) - 1] ?? "";
  return `${parseInt(d ?? "0", 10)} ${bulan}`;
}

/** Rupiah ringkas untuk sumbu: 285900 → "286rb", 1500000 → "1,5jt". */
function rupiahCompact(v: number): string {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1).replace(".", ",")}jt`;
  if (v >= 1000) return `${Math.round(v / 1000)}rb`;
  return String(v);
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1)}…` : s;
}

const pendapatanConfig = {
  pendapatan: { label: "Pendapatan", color: "var(--chart-1)" },
} satisfies ChartConfig;

const jamConfig = {
  jumlahPesanan: { label: "Pesanan", color: "var(--chart-2)" },
} satisfies ChartConfig;

const menuConfig = {
  qty: { label: "Terjual", color: "var(--chart-4)" },
} satisfies ChartConfig;

export function PendapatanPerHariChart({ data }: { data: LaporanData }) {
  return (
    <ChartContainer
      config={pendapatanConfig}
      className="aspect-auto h-64 w-full sm:h-72"
    >
      <AreaChart data={data.perHari} margin={{ left: 4, right: 12, top: 8 }}>
        <defs>
          <linearGradient id="fillPendapatan" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-pendapatan)" stopOpacity={0.65} />
            <stop offset="95%" stopColor="var(--color-pendapatan)" stopOpacity={0.06} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="tanggal"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={28}
          tickFormatter={(v) => shortDate(String(v))}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(v) => rupiahCompact(Number(v))}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => shortDate(String(label))}
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-6 leading-none">
                  <span className="text-muted-foreground">Pendapatan</span>
                  <span className="font-mono font-medium tabular-nums">
                    {formatRupiah(Number(value))}
                  </span>
                </div>
              )}
            />
          }
        />
        <Area
          dataKey="pendapatan"
          type="monotone"
          stroke="var(--color-pendapatan)"
          strokeWidth={2}
          fill="url(#fillPendapatan)"
          dot={{ r: 2.5, fill: "var(--color-pendapatan)" }}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}

export function JamRamaiChart({ data }: { data: LaporanData }) {
  return (
    <ChartContainer config={jamConfig} className="aspect-auto h-64 w-full sm:h-72">
      <BarChart data={data.perJam} margin={{ left: -12, right: 8, top: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="jam"
          tickLine={false}
          axisLine={false}
          tickMargin={6}
          minTickGap={4}
          tickFormatter={(v) => `${String(v).padStart(2, "0")}`}
        />
        <YAxis tickLine={false} axisLine={false} width={32} allowDecimals={false} />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(label) => `Pukul ${String(label).padStart(2, "0")}.00 WIB`}
              formatter={(value) => (
                <div className="flex w-full items-center justify-between gap-6 leading-none">
                  <span className="text-muted-foreground">Pesanan</span>
                  <span className="font-mono font-medium tabular-nums">
                    {Number(value)}
                  </span>
                </div>
              )}
            />
          }
        />
        <Bar dataKey="jumlahPesanan" fill="var(--color-jumlahPesanan)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}

export function MenuTerlarisChart({ data }: { data: LaporanData }) {
  const top8 = data.menuTerlaris.slice(0, 8);
  return (
    <ChartContainer config={menuConfig} className="aspect-auto h-64 w-full sm:h-72">
      <BarChart
        data={top8}
        layout="vertical"
        margin={{ left: 8, right: 16, top: 4 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="nama"
          width={132}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => truncate(String(v), 19)}
        />
        <ChartTooltip
          cursor={{ fill: "var(--muted)" }}
          content={
            <ChartTooltipContent
              hideLabel
              formatter={(value, _name, item) => {
                const d = item?.payload as { nama: string; qty: number; pendapatan: number };
                return (
                  <div className="grid gap-1">
                    <span className="font-medium">{d?.nama}</span>
                    <div className="flex items-center justify-between gap-6 leading-none">
                      <span className="text-muted-foreground">Terjual</span>
                      <span className="font-mono font-medium tabular-nums">
                        {Number(value)} porsi
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-6 leading-none">
                      <span className="text-muted-foreground">Pendapatan</span>
                      <span className="font-mono font-medium tabular-nums">
                        {formatRupiah(d?.pendapatan ?? 0)}
                      </span>
                    </div>
                  </div>
                );
              }}
            />
          }
        />
        <Bar dataKey="qty" fill="var(--color-qty)" radius={[0, 4, 4, 0]} barSize={18} />
      </BarChart>
    </ChartContainer>
  );
}
