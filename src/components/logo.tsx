import { cn } from "@/lib/utils";

/**
 * Logo resmi Sekelas Cafe (by Esemkita — est 2026).
 * - `LogoMark`: monogram "S" + cangkir kopi — versi logo saja (`/images/logo-mark.png`).
 * - `LogoFull`: logo + teks "SEKELAS CAFE" (`/images/logo-full.png`).
 * - `Logo`: mark + wordmark teks — untuk navbar (teks tetap terbaca di ukuran kecil).
 * Berkas asli logo resmi tidak diubah — jangan diubah proporsinya.
 */

export function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src="/images/logo-mark.png"
      alt="Logo Sekelas Cafe"
      width={429}
      height={595}
      className={cn("h-8 w-auto shrink-0 object-contain", className)}
    />
  );
}

export function LogoFull({ className }: { className?: string }) {
  return (
    <img
      src="/images/logo-full.png"
      alt="Sekelas Cafe — By Esemkita"
      width={1440}
      height={688}
      className={cn("h-14 w-auto object-contain", className)}
    />
  );
}

export function Logo({
  className,
  markClassName,
  compact = false,
}: {
  className?: string;
  markClassName?: string;
  compact?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LogoMark className={cn("h-8 w-auto shrink-0", markClassName)} />
      {!compact && (
        <span className="font-display text-xl font-semibold leading-none tracking-tight text-primary">
          Sekelas{" "}
          <span className="italic font-medium text-gold">Cafe</span>
        </span>
      )}
    </span>
  );
}
