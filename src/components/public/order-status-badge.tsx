import { ORDER_STATUS_BADGE, ORDER_STATUS_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";

/** Badge status pesanan (warna & label terpusat dari @/lib/constants). */
export function OrderStatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        ORDER_STATUS_BADGE[status] ?? "bg-stone-100 text-stone-700 border-stone-300",
        className
      )}
    >
      {ORDER_STATUS_LABEL[status] ?? status}
    </span>
  );
}
