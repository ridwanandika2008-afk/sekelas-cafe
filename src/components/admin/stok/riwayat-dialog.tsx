"use client";

/**
 * Dialog Riwayat Stok — 50 movement terakhir sebuah bahan,
 * list scrollable dengan badge warna per jenis (IN hijau, OUT amber, ADJUST abu).
 */
import { useEffect, useState } from "react";
import { History, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatWibDateTime } from "@/lib/format";
import { formatAmount, type MovementItem } from "./types";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ingredientId: string | null;
  ingredientName: string;
};

const TYPE_BADGE: Record<string, { label: string; className: string }> = {
  IN: {
    label: "Masuk",
    className: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800",
  },
  OUT: {
    label: "Keluar",
    className: "border-amber-300 bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800",
  },
  ADJUST: {
    label: "Set Ulang",
    className: "border-stone-300 bg-stone-100 text-stone-700 dark:bg-stone-900 dark:text-stone-300 dark:border-stone-700",
  },
};

export function RiwayatDialog({ open, onOpenChange, ingredientId, ingredientName }: Props) {
  const [movements, setMovements] = useState<MovementItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !ingredientId) return;
    let mounted = true;
    setLoading(true);
    setMovements([]);
    (async () => {
      try {
        const res = await fetch(`/api/admin/stok/${ingredientId}/riwayat`);
        const json = (await res.json().catch(() => ({}))) as {
          error?: string;
          movements?: MovementItem[];
        };
        if (!res.ok) throw new Error(json.error ?? "Gagal memuat riwayat.");
        if (mounted) setMovements(json.movements ?? []);
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Gagal memuat riwayat.");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [open, ingredientId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <History className="h-5 w-5 text-[#8a6a33] dark:text-[#d9c5a3]" aria-hidden />
            Riwayat Stok — {ingredientName}
          </DialogTitle>
          <DialogDescription>50 catatan pergerakan terakhir (WIB).</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-14 rounded-lg" />
            ))}
          </div>
        ) : movements.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            Belum ada pergerakan stok untuk bahan ini.
          </p>
        ) : (
          <ul className="max-h-96 space-y-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {movements.map((m) => {
              const badge = TYPE_BADGE[m.type] ?? TYPE_BADGE.ADJUST;
              const isNegativeEffect = m.type === "OUT";
              return (
                <li
                  key={m.id}
                  className="rounded-lg border bg-card p-3 text-sm shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge className={badge.className}>{badge.label}</Badge>
                      <span
                        className={cn(
                          "font-semibold",
                          isNegativeEffect ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"
                        )}
                      >
                        {isNegativeEffect ? "−" : m.type === "IN" ? "+" : "="}
                        {formatAmount(m.amount)}
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {formatWibDateTime(m.createdAt)}
                    </span>
                  </div>
                  {m.note && <p className="mt-1.5 text-muted-foreground">{m.note}</p>}
                  {(m.orderNumber || m.userName) && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {m.orderNumber && <>Pesanan {m.orderNumber} · </>}
                      {m.userName && <>oleh {m.userName}</>}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
