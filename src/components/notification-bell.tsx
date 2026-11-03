"use client";

/**
 * Lonceng notifikasi dashboard — polling ringan tiap 20 detik.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/format";

const emptySubscribe = () => () => {};
/** false saat SSR/hidrasi, true di client — hindari mismatch timeAgo */
const useMounted = () =>
  useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

type Notif = {
  id: string;
  type: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: string;
};

const iconFor = (type: string) => {
  switch (type) {
    case "NEW_ORDER":
    case "ORDER_QUEUED":
      return "🧾";
    case "PAYMENT_CONFIRMED":
      return "💵";
    case "ORDER_READY":
      return "☕";
    case "ORDER_CANCELLED":
      return "✖";
    case "LOW_STOCK":
      return "📦";
    default:
      return "🔔";
  }
};

export function NotificationBell() {
  const mounted = useMounted();
  const [items, setItems] = useState<Notif[]>([]);
  const [unread, setUnread] = useState(0);
  const [tick, setTick] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/notifikasi", { cache: "no-store" });
        if (!res.ok || !active) return;
        const data = await res.json();
        setItems(data.notifications ?? []);
        setUnread(data.unread ?? 0);
      } catch {
        /* diam */
      }
    })();
    const t = setInterval(() => setTick((v) => v + 1), 20000);
    return () => {
      active = false;
      clearInterval(t);
    };
  }, [tick]);

  const markAllRead = async () => {
    await fetch("/api/notifikasi", { method: "POST", body: "{}" });
    setTick((v) => v + 1);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifikasi">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <p className="text-sm font-semibold">Notifikasi</p>
          {unread > 0 && (
            <button
              onClick={markAllRead}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Tandai semua dibaca
            </button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              Belum ada notifikasi.
            </p>
          ) : (
            <div className="divide-y">
              {items.map((n) => (
                <div key={n.id} className={cn("flex gap-3 px-4 py-3", !n.isRead && "bg-accent/40")}>
                  <span className="text-base leading-6">{iconFor(n.type)}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium leading-snug">{n.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground/70">
                      {mounted ? timeAgo(n.createdAt) : "…"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
