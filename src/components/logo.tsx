import { cn } from "@/lib/utils";

/**
 * Logo resmi Sekelas Cafe.
 * Mark: cangkir espresso dengan uap caramel gold.
 * Digunakan sebagai identitas visual — jangan diubah proporsinya.
 */
export function LogoMark({
  className,
  mono = false,
}: {
  className?: string;
  mono?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      role="img"
      aria-label="Logo Sekelas Cafe"
      className={cn("h-8 w-8", className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Uap */}
      <g
        stroke={mono ? "currentColor" : "var(--gold, #C98A3F)"}
        strokeWidth="2.4"
        strokeLinecap="round"
        fill="none"
      >
        <path d="M19.5 5.5 C18 8 21 9.5 19.5 12" />
        <path d="M28 5.5 C26.5 8 29.5 9.5 28 12" />
      </g>
      {/* Gagang cangkir */}
      <path
        d="M35 21.5 C39 21.5 41.5 23.8 41.5 26.7 C41.5 29.6 39 31.9 35 31.9"
        stroke={mono ? "currentColor" : "var(--primary, #4A3220)"}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
      {/* Badan cangkir */}
      <path
        d="M13 18.5 L35 18.5 L33.1 31.3 C32.7 34.3 30.1 36.5 27 36.5 L21 36.5 C17.9 36.5 15.3 34.3 14.9 31.3 Z"
        fill={mono ? "currentColor" : "var(--primary, #4A3220)"}
      />
      {/* Aksen rim caramel */}
      <path
        d="M14.8 23 L33.2 23"
        stroke={mono ? "transparent" : "var(--gold, #C98A3F)"}
        strokeWidth="2"
        strokeLinecap="round"
        fill="none"
      />
      {/* Tatakan */}
      <path
        d="M11 41.5 L37 41.5"
        stroke={mono ? "currentColor" : "var(--primary, #4A3220)"}
        strokeWidth="2.6"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
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
      <LogoMark className={cn("h-8 w-8 shrink-0", markClassName)} />
      {!compact && (
        <span className="font-display text-xl font-semibold leading-none tracking-tight text-primary">
          Sekelas{" "}
          <span className="italic font-medium text-gold">Cafe</span>
        </span>
      )}
    </span>
  );
}
