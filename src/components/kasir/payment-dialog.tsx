"use client";

/**
 * Dialog pembayaran bersama (dipakai POS & halaman pesanan masuk).
 * Tunai: input uang diterima + tombol cepat + kembalian real-time.
 * QRIS: instruksi verifikasi manual oleh kasir.
 *
 * State form hidup di <PaymentFormInner> yang hanya ter-mount saat dialog
 * terbuka (Radix me-unmount konten tertutup) — jadi selalu segar tanpa effect.
 */
import { useState } from "react";
import { Banknote, Loader2, QrCode, ShieldCheck } from "lucide-react";
import { formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
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

export type PaymentSubmit = (method: "CASH" | "QRIS", cashReceived: number | null) => void;

const QUICK_AMOUNTS = [20000, 50000, 100000];

function PaymentFormInner({
  total,
  title,
  description,
  cashEnabled,
  qrisEnabled,
  submitting,
  onConfirm,
}: {
  total: number;
  title?: string;
  description?: string;
  cashEnabled: boolean;
  qrisEnabled: boolean;
  submitting: boolean;
  onConfirm: PaymentSubmit;
}) {
  const [method, setMethod] = useState<"CASH" | "QRIS">(() =>
    !cashEnabled && qrisEnabled ? "QRIS" : "CASH"
  );
  const [cashInput, setCashInput] = useState("");

  const received = Math.max(0, Math.floor(Number(cashInput) || 0));
  const change = method === "CASH" ? received - total : 0;
  const cashReady = method === "CASH" && received >= total;
  const canSubmit = method === "QRIS" || cashReady;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="font-display">{title ?? "Pembayaran"}</DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-1">
            <p>Total tagihan</p>
            <p className="text-2xl font-bold tracking-tight text-foreground">
              {formatRupiah(total)}
            </p>
            {description ? <p className="text-xs">{description}</p> : null}
          </div>
        </DialogDescription>
      </DialogHeader>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={!cashEnabled}
          onClick={() => setMethod("CASH")}
          className={cn(
            "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            method === "CASH"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card hover:border-primary/50"
          )}
        >
          <Banknote className="h-5 w-5" />
          Tunai
        </button>
        <button
          type="button"
          disabled={!qrisEnabled}
          onClick={() => setMethod("QRIS")}
          className={cn(
            "flex min-h-11 flex-col items-center justify-center gap-1 rounded-lg border-2 px-3 py-3 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
            method === "QRIS"
              ? "border-primary bg-primary text-primary-foreground"
              : "border-border bg-card hover:border-primary/50"
          )}
        >
          <QrCode className="h-5 w-5" />
          QRIS
        </button>
      </div>
      {!cashEnabled || !qrisEnabled ? (
        <p className="text-xs text-muted-foreground">
          Metode yang dinonaktifkan pengaturan kafe tidak dapat dipilih.
        </p>
      ) : null}

      {method === "CASH" ? (
        <div className="space-y-2">
          <Label htmlFor="cash-received">Uang diterima</Label>
          <Input
            id="cash-received"
            type="number"
            inputMode="numeric"
            min={0}
            placeholder="0"
            value={cashInput}
            onChange={(e) => setCashInput(e.target.value)}
            className="h-12 text-lg font-semibold tabular-nums"
            autoFocus
          />
          <div className="grid grid-cols-4 gap-2">
            <Button
              type="button"
              variant="secondary"
              className="h-11"
              onClick={() => setCashInput(String(total))}
            >
              Pas
            </Button>
            {QUICK_AMOUNTS.map((a) => (
              <Button
                key={a}
                type="button"
                variant="secondary"
                className="h-11 text-xs tabular-nums"
                onClick={() => setCashInput(String(a))}
              >
                {a.toLocaleString("id-ID")}
              </Button>
            ))}
          </div>
          <div
            className={cn(
              "flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm font-semibold",
              received === 0
                ? "bg-muted text-muted-foreground"
                : change < 0
                  ? "border-red-300 bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300"
                  : "border-emerald-300 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
            )}
          >
            <span>{received === 0 ? "Kembalian" : change < 0 ? "Uang kurang" : "Kembalian"}</span>
            <span className="tabular-nums">
              {received === 0
                ? "-"
                : change < 0
                  ? formatRupiah(Math.abs(change))
                  : formatRupiah(change)}
            </span>
          </div>
        </div>
      ) : (
        <div className="space-y-2 rounded-lg border border-dashed border-gold bg-gold-soft/60 p-3 text-sm">
          <p className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="h-4 w-4 text-gold-foreground" />
            Verifikasi QRIS
          </p>
          <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
            <li>Minta pembeli scan QRIS yang terpasang di counter kasir.</li>
            <li>Pastikan notifikasi pembayaran masuk (aplikasi bank/e-wallet pembeli).</li>
            <li>Periksa nominal sesuai tagihan, lalu konfirmasi di bawah.</li>
          </ol>
        </div>
      )}

      <DialogFooter>
        <Button
          type="button"
          className="h-12 w-full text-base font-bold sm:w-auto sm:px-8"
          disabled={!canSubmit || submitting}
          onClick={() => onConfirm(method, method === "CASH" ? received : null)}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Memproses…
            </>
          ) : method === "CASH" ? (
            "Terima Pembayaran Tunai"
          ) : (
            "Konfirmasi QRIS Masuk"
          )}
        </Button>
      </DialogFooter>
    </>
  );
}

export function PaymentDialog({
  open,
  onOpenChange,
  total,
  title,
  description,
  cashEnabled,
  qrisEnabled,
  submitting = false,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  total: number;
  title?: string;
  description?: string;
  cashEnabled: boolean;
  qrisEnabled: boolean;
  submitting?: boolean;
  onConfirm: PaymentSubmit;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <PaymentFormInner
          total={total}
          title={title}
          description={description}
          cashEnabled={cashEnabled}
          qrisEnabled={qrisEnabled}
          submitting={submitting}
          onConfirm={onConfirm}
        />
      </DialogContent>
    </Dialog>
  );
}
