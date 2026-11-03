"use client";

/**
 * Riwayat Aktivitas — audit trail seluruh aksi staf.
 * Filter aksi/pencarian/tanggal, tabel dengan label ramah, detail JSON per baris.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  History,
  Loader2,
  PackageX,
  RotateCcw,
  Search,
} from "lucide-react";
import { formatWibDateTime } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { activityEntityLabel, activityLabel, ACTIVITY_ACTION_BADGE } from "@/components/admin/activity-labels";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type ActivityRow = {
  id: string;
  actorName: string | null;
  role: string | null;
  action: string;
  entity: string | null;
  entityId: string | null;
  detail: string | null;
  createdAt: string;
};

type AktivitasResponse = {
  logs: ActivityRow[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  actions: string[];
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "border-[#d9c5a3] bg-[#efe4d3] text-[#5a4326]",
  KASIR: "bg-teal-100 text-teal-800 border-teal-300",
  BARISTA: "bg-orange-100 text-orange-800 border-orange-300",
};

export default function AdminAktivitasPage() {
  const [data, setData] = useState<AktivitasResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPage, setLoadingPage] = useState(false);

  // filter
  const [action, setAction] = useState("semua");
  const [q, setQ] = useState("");
  const [dari, setDari] = useState("");
  const [sampai, setSampai] = useState("");
  const [page, setPage] = useState(1);

  const [detailRow, setDetailRow] = useState<ActivityRow | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(
    async (targetPage: number, showSpinner: boolean) => {
      if (showSpinner) setLoadingPage(true);
      try {
        const params = new URLSearchParams({ page: String(targetPage), limit: "30" });
        if (action !== "semua") params.set("action", action);
        if (q.trim()) params.set("q", q.trim());
        if (dari) params.set("dari", dari);
        if (sampai) params.set("sampai", sampai);
        const res = await fetch(`/api/admin/aktivitas?${params.toString()}`);
        if (res.ok && mounted.current) {
          setData((await res.json()) as AktivitasResponse);
          setPage(targetPage);
        }
      } catch {
        /* coba lagi saat aksi berikutnya */
      } finally {
        if (mounted.current) {
          setLoading(false);
          setLoadingPage(false);
        }
      }
    },
    [action, q, dari, sampai]
  );

  // muat ulang saat filter berubah (debounce ringan untuk pencarian)
  useEffect(() => {
    const t = setTimeout(() => void load(1, true), q ? 350 : 0);
    return () => clearTimeout(t);
  }, [load]);

  const resetFilter = () => {
    setAction("semua");
    setQ("");
    setDari("");
    setSampai("");
  };

  const parseDetail = (row: ActivityRow): unknown => {
    if (!row.detail) return null;
    try {
      return JSON.parse(row.detail);
    } catch {
      return row.detail;
    }
  };

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Riwayat Aktivitas</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Jejak audit semua aksi staf — siapa melakukan apa dan kapan (WIB).
        </p>
      </div>

      {/* Filter */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
          <div className="relative lg:col-span-2">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari nama pelaku / nomor pesanan…"
              className="h-11 pl-9"
              aria-label="Cari aktivitas"
            />
          </div>
          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-11" aria-label="Filter jenis aksi">
              <SelectValue placeholder="Semua aksi" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="semua">Semua Aksi</SelectItem>
              {(data?.actions ?? []).map((a) => (
                <SelectItem key={a} value={a}>
                  {activityLabel(a)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="space-y-1">
            <Input
              type="date"
              value={dari}
              onChange={(e) => setDari(e.target.value)}
              className="h-11"
              aria-label="Dari tanggal"
            />
          </div>
          <div className="flex gap-2">
            <Input
              type="date"
              value={sampai}
              onChange={(e) => setSampai(e.target.value)}
              className="h-11"
              aria-label="Sampai tanggal"
            />
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 shrink-0"
              aria-label="Reset filter"
              onClick={resetFilter}
            >
              <RotateCcw className="h-4 w-4" aria-hidden />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Tabel */}
      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 rounded-xl" />
          ))}
        </div>
      ) : !data || data.logs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <PackageX className="h-10 w-10 text-muted-foreground" aria-hidden />
            <p className="font-medium">Tidak ada aktivitas yang cocok.</p>
            <p className="text-sm text-muted-foreground">Coba longgarkan filter pencarian.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[820px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">Waktu</th>
                    <th className="px-4 py-3 font-semibold">Pelaku</th>
                    <th className="px-4 py-3 font-semibold">Aksi</th>
                    <th className="px-4 py-3 font-semibold">Entitas</th>
                    <th className="px-4 py-3 text-right font-semibold">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  {data.logs.map((row) => (
                    <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatWibDateTime(row.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{row.actorName ?? "Sistem"}</span>
                          {row.role && (
                            <span
                              className={cn(
                                "inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-semibold",
                                ROLE_BADGE[row.role] ?? "bg-muted text-muted-foreground"
                              )}
                            >
                              {ROLE_LABEL[row.role] ?? row.role}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-semibold",
                            ACTIVITY_ACTION_BADGE[row.action] ?? "bg-muted text-muted-foreground"
                          )}
                        >
                          {activityLabel(row.action)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-muted-foreground">
                          {activityEntityLabel(row.entity)}
                          {row.entityId ? (
                            <span className="ml-1 font-mono text-xs">{trimId(row.entityId)}</span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-10"
                          aria-label={`Lihat detail aktivitas ${activityLabel(row.action)}`}
                          onClick={() => setDetailRow(row)}
                        >
                          <Eye className="h-4 w-4" aria-hidden />
                          Lihat
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Pagination */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              Menampilkan {data.logs.length} dari {data.total} aktivitas · halaman {data.page} dari{" "}
              {data.totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                disabled={data.page <= 1 || loadingPage}
                onClick={() => void load(data.page - 1, true)}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden />
                Sebelumnya
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-11"
                disabled={data.page >= data.totalPages || loadingPage}
                onClick={() => void load(data.page + 1, true)}
              >
                {loadingPage ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <ChevronRight className="h-4 w-4" aria-hidden />
                )}
                Berikutnya
              </Button>
            </div>
          </div>
        </>
      )}

      {/* Dialog detail */}
      <Dialog open={!!detailRow} onOpenChange={(v) => !v && setDetailRow(null)}>
        <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-xl">
              <History className="h-5 w-5 text-primary" aria-hidden />
              {detailRow ? activityLabel(detailRow.action) : ""}
            </DialogTitle>
            <DialogDescription>
              {detailRow?.actorName ?? "Sistem"}
              {detailRow?.role ? ` (${ROLE_LABEL[detailRow.role] ?? detailRow.role})` : ""} ·{" "}
              {detailRow ? formatWibDateTime(detailRow.createdAt) : ""} WIB
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Entitas</p>
              <p className="mt-1">
                {detailRow ? activityEntityLabel(detailRow.entity) : "-"}
                {detailRow?.entityId && (
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    {detailRow.entityId}
                  </span>
                )}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Detail</p>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted/60 p-3 font-mono text-xs leading-relaxed">
                {detailRow?.detail
                  ? JSON.stringify(parseDetail(detailRow), null, 2)
                  : "— tidak ada detail —"}
              </pre>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}

/** Potong ID panjang (cuid) agar tabel rapi */
function trimId(entityId: string): string {
  if (entityId.length <= 14) return entityId;
  return `${entityId.slice(0, 8)}…`;
}
