"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { Coffee, RefreshCw, Search, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { MENU_STATUS_BADGE, MENU_STATUS_LABEL } from "@/lib/constants";
import { formatRupiah } from "@/lib/format";
import { useCart } from "@/lib/cart-store";
import {
  fetchCafe,
  fetchMenu,
  fetchPromos,
  type CafeResponse,
  type MenuResponse,
  type PublicMenuItem,
  type PublicPromo,
} from "./types";
import { MenuItemDialog } from "./menu-item-dialog";
import { CartSidebar, MobileCartBar } from "./cart-panel";
import { CheckoutDialog } from "./checkout-dialog";

const emptySubscribe = () => () => {};

function MenuCard({ item, onPick }: { item: PublicMenuItem; onPick: () => void }) {
  const orderable = item.status === "AVAILABLE";
  const hasOptions = item.optionGroups.length > 0;

  return (
    <button
      type="button"
      onClick={orderable ? onPick : undefined}
      disabled={!orderable}
      aria-disabled={!orderable}
      className={cn(
        "group flex h-full flex-col rounded-2xl border bg-card p-3 text-left transition-all",
        orderable
          ? "cursor-pointer hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-md"
          : "cursor-not-allowed opacity-80"
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-muted">
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.name}
            loading="lazy"
            className={cn(
              "h-full w-full object-cover transition-transform duration-300",
              orderable && "group-hover:scale-105"
            )}
          />
        ) : (
          <div className="flex h-full items-center justify-center text-muted-foreground">
            <Coffee className="h-10 w-10" aria-hidden />
          </div>
        )}
        {!orderable && (
          <>
            <span className="absolute inset-0 bg-black/35" aria-hidden />
            <span
              className={cn(
                "absolute left-2 top-2 rounded-full border px-2.5 py-1 text-xs font-semibold shadow-sm",
                MENU_STATUS_BADGE[item.status]
              )}
            >
              {MENU_STATUS_LABEL[item.status]}
            </span>
          </>
        )}
      </div>
      <div className="flex flex-1 flex-col px-1 pb-1 pt-3">
        <h3 className="font-semibold leading-snug">{item.name}</h3>
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          {item.description ?? ""}
        </p>
        <div className="mt-auto flex items-center justify-between gap-2 pt-3">
          <span className="font-display text-lg font-semibold text-primary tabular-nums">
            {formatRupiah(item.price)}
          </span>
          {orderable && (
            <span className="rounded-full bg-gold-soft px-3 py-1.5 text-xs font-semibold text-gold-foreground transition-colors group-hover:bg-gold group-hover:text-primary-foreground">
              {hasOptions ? "Pilih Opsi" : "+ Pesan"}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}

export function MenuView({ initialCategory }: { initialCategory?: string }) {
  const [cafe, setCafe] = useState<CafeResponse | null>(null);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [promos, setPromos] = useState<PublicPromo[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [category, setCategory] = useState(initialCategory ?? "Semua");
  const [search, setSearch] = useState("");
  const [dialogItem, setDialogItem] = useState<PublicMenuItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);

  const cartItems = useCart((s) => s.items);
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const hasCart = mounted && cartItems.length > 0;

  useEffect(() => {
    let active = true;
    Promise.all([fetchCafe(), fetchMenu(), fetchPromos()])
      .then(([c, m, p]) => {
        if (!active) return;
        setCafe(c);
        setMenu(m);
        setPromos(p);
        // Kategori dari query string tidak valid → kembali ke "Semua"
        if (initialCategory && !m.categories.some((x) => x.name === initialCategory)) {
          setCategory("Semua");
        }
      })
      .catch(() => {
        if (active) setLoadError(true);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [initialCategory]);

  const countsByCategory = useMemo(() => {
    if (!menu) return new Map<string, number>();
    const map = new Map<string, number>();
    for (const it of menu.items) {
      map.set(it.categoryId, (map.get(it.categoryId) ?? 0) + 1);
    }
    return map;
  }, [menu]);

  const filtered = useMemo(() => {
    if (!menu) return [];
    const q = search.trim().toLowerCase();
    return menu.items.filter((i) => {
      const catName = menu.categories.find((c) => c.id === i.categoryId)?.name;
      const inCategory = category === "Semua" || catName === category;
      const inSearch =
        !q ||
        i.name.toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q);
      return inCategory && inSearch;
    });
  }, [menu, category, search]);

  const status = cafe?.status;
  const isOpen = status?.isOpen ?? true;

  const openItem = (item: PublicMenuItem) => {
    setDialogItem(item);
    setDialogOpen(true);
  };

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <Coffee className="h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="mt-4 font-display text-lg font-semibold">Gagal memuat menu</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Periksa koneksi internetmu lalu coba lagi ya.
        </p>
        <Button className="mt-5 rounded-full" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4" aria-hidden /> Coba Lagi
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "mx-auto max-w-6xl px-4 pt-6 lg:pt-10",
        hasCart ? "pb-32 lg:pb-10" : "pb-10"
      )}
    >
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Menu Kami
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pilih, kustom, pesan — bayar nanti di kasir.
          </p>
        </div>
        <div
          className={cn(
            "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-medium",
            isOpen
              ? "border-emerald-300 bg-emerald-50 text-emerald-800"
              : "border-amber-300 bg-amber-50 text-amber-800"
          )}
          role="status"
        >
          <span className="relative flex h-2.5 w-2.5">
            {isOpen && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-60" />
            )}
            <span
              className={cn(
                "relative inline-flex h-2.5 w-2.5 rounded-full",
                isOpen ? "bg-emerald-500" : "bg-amber-500"
              )}
            />
          </span>
          {isOpen ? "Buka — bisa pesan sekarang" : (status?.message ?? "Kafe sedang tutup")}
        </div>
      </div>

      {/* Pencarian + kategori */}
      {loading || !menu ? (
        <div className="mt-6 space-y-3">
          <Skeleton className="h-11 w-full rounded-full" />
          <div className="flex gap-2">
            {[64, 52, 60].map((w, i) => (
              <Skeleton key={i} className="h-10 rounded-full" style={{ width: w * 4 }} />
            ))}
          </div>
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          <div className="relative">
            <Search
              className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu… (mis. kopi, matcha, goreng)"
              className="rounded-full py-4 pl-11 text-base"
              aria-label="Cari menu"
            />
          </div>
          <nav
            className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0"
            aria-label="Filter kategori"
          >
            {["Semua", ...menu.categories.map((c) => c.name)].map((name) => {
              const active = category === name;
              const count =
                name === "Semua"
                  ? menu.items.length
                  : countsByCategory.get(
                      menu.categories.find((c) => c.name === name)?.id ?? ""
                    ) ?? 0;
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCategory(name)}
                  aria-pressed={active}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "bg-card text-muted-foreground hover:border-gold hover:text-foreground"
                  )}
                >
                  {name}{" "}
                  <span className={cn("tabular-nums", active ? "opacity-80" : "opacity-60")}>
                    ({count})
                  </span>
                </button>
              );
            })}
          </nav>
        </div>
      )}

      {/* Konten utama */}
      <div className="mt-6 lg:grid lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start lg:gap-8">
        <div>
          {loading || !menu ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-72 rounded-2xl" />
              ))}
            </div>
          ) : menu.items.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
              <Coffee className="h-10 w-10" aria-hidden />
              <p className="mt-3 font-semibold text-foreground">Menu belum tersedia</p>
              <p className="mt-1 text-sm">Cek lagi nanti ya — kami siapkan yang terbaik buatmu.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center rounded-2xl border border-dashed py-16 text-center text-muted-foreground">
              <SearchX className="h-10 w-10" aria-hidden />
              <p className="mt-3 font-semibold text-foreground">
                Tidak ada menu yang cocok dengan pencarianmu
              </p>
              <p className="mt-1 text-sm">Coba kata kunci lain atau lihat semua menu.</p>
              <Button
                variant="outline"
                className="mt-4 rounded-full"
                onClick={() => {
                  setSearch("");
                  setCategory("Semua");
                }}
              >
                Reset Pencarian
              </Button>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((item) => (
                <MenuCard key={item.id} item={item} onPick={() => openItem(item)} />
              ))}
            </div>
          )}
        </div>

        {/* Panel keranjang desktop */}
        <aside className="mt-10 hidden lg:mt-0 lg:block">
          <div className="sticky top-24">
            <CartSidebar onCheckout={() => setCheckoutOpen(true)} />
          </div>
        </aside>
      </div>

      {/* Bar keranjang mobile */}
      <MobileCartBar onCheckout={() => setCheckoutOpen(true)} />

      {/* Dialog kustomisasi menu */}
      <MenuItemDialog item={dialogItem} open={dialogOpen} onOpenChange={setDialogOpen} />

      {/* Dialog checkout */}
      <CheckoutDialog
        open={checkoutOpen}
        onOpenChange={setCheckoutOpen}
        cafe={cafe}
        promos={promos}
      />
    </div>
  );
}
