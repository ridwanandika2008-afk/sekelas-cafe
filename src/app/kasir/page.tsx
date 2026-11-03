"use client";

/**
 * POS Kasir — halaman utama kasir.
 * Layout 2 kolom: pemilih menu (kiri) + panel keranjang (kanan, sticky).
 * Mobile: tab bawah untuk berpindah Menu ⇄ Keranjang.
 * Tanpa shift terbuka, kasir hanya disuguhkan kartu pembuka shift
 * (backend menolak transaksi berbayar tanpa shift).
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Banknote,
  Bike,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Search,
  ShoppingBasket,
  ShoppingCart,
  Store,
  Timer,
  Trash2,
  Utensils,
} from "lucide-react";
import { toast } from "sonner";
import { formatRupiah, formatWibTime, timeAgo } from "@/lib/format";
import { FULFILLMENT_LABEL, MAX_NAME_LENGTH } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MenuOptionDialog } from "@/components/kasir/menu-option-dialog";
import { PaymentDialog } from "@/components/kasir/payment-dialog";
import { MenuStatusBadge } from "@/components/kasir/status-badge";
import { ReceiptDialog } from "@/components/receipt/receipt-print";
import type {
  CafeInfo,
  OpenShift,
  PosOrderResult,
  PromoItem,
  PublicMenuItem,
  PublicMenuResponse,
} from "@/components/kasir/types";

type CartLine = {
  key: string;
  menuItemId: string;
  name: string;
  unitPrice: number;
  qty: number;
  note: string;
  optionIds: string[];
  options: { groupName: string; optionName: string; priceDelta: number }[];
};

type Fulfillment = "DINE_IN" | "TAKEAWAY" | "DELIVERY";

const FULFILLMENT_TABS: { value: Fulfillment; label: string; icon: typeof Utensils }[] = [
  { value: "DINE_IN", label: "Di Tempat", icon: Utensils },
  { value: "TAKEAWAY", label: "Bawa Pulang", icon: ShoppingBasket },
  { value: "DELIVERY", label: "Antar", icon: Bike },
];

function cartLineKey(menuItemId: string, optionIds: string[], note: string) {
  return `${menuItemId}|${[...optionIds].sort().join(",")}|${note.trim().toLowerCase()}`;
}

export default function PosKasirPage() {
  // data
  const [shift, setShift] = useState<OpenShift | null>(null);
  const [menu, setMenu] = useState<PublicMenuResponse | null>(null);
  const [cafe, setCafe] = useState<CafeInfo | null>(null);
  const [promos, setPromos] = useState<PromoItem[]>([]);
  const [bootLoading, setBootLoading] = useState(true);
  const [openingCash, setOpeningCash] = useState("");
  const [openingShift, setOpeningShift] = useState(false);

  // pemilih menu
  const [activeCat, setActiveCat] = useState<string>("semua");
  const [search, setSearch] = useState("");

  // keranjang & formulir
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerName, setCustomerName] = useState("Pelanggan");
  const [fulfillment, setFulfillment] = useState<Fulfillment>("DINE_IN");
  const [tableNumber, setTableNumber] = useState("");
  const [deliveryBuilding, setDeliveryBuilding] = useState("");
  const [deliveryRoom, setDeliveryRoom] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [orderNote, setOrderNote] = useState("");
  const [promoId, setPromoId] = useState<string>("");

  // dialog
  const [optionItem, setOptionItem] = useState<PublicMenuItem | null>(null);
  const [payOpen, setPayOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<
    (PosOrderResult & { method: "CASH" | "QRIS"; customerName: string }) | null
  >(null);
  const [receiptType, setReceiptType] = useState<"customer" | "kitchen" | null>(null);

  // tampilan mobile
  const [mobileTab, setMobileTab] = useState<"menu" | "cart">("menu");

  const loadCore = useCallback(async () => {
    try {
      const [shiftRes, menuRes, cafeRes, promoRes] = await Promise.all([
        fetch("/api/kasir/shift"),
        fetch("/api/public/menu"),
        fetch("/api/public/cafe"),
        fetch("/api/public/promos"),
      ]);
      const shiftJson = await shiftRes.json();
      setShift(shiftJson.shift ?? null);
      if (menuRes.ok) setMenu(await menuRes.json());
      if (cafeRes.ok) {
        const j = await cafeRes.json();
        setCafe(j.cafe as CafeInfo);
      }
      if (promoRes.ok) {
        const j = await promoRes.json();
        setPromos(j.promos as PromoItem[]);
      }
    } catch {
      toast.error("Gagal memuat data POS. Periksa koneksi lalu muat ulang.");
    } finally {
      setBootLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCore();
  }, [loadCore]);

  const refreshShift = useCallback(async () => {
    try {
      const res = await fetch("/api/kasir/shift");
      const json = await res.json();
      setShift(json.shift ?? null);
    } catch {
      /* abaikan */
    }
  }, []);

  /* ============ Keranjang ============ */

  const addToCart = (
    item: PublicMenuItem,
    qty: number,
    note: string,
    optionIds: string[],
    unitPrice: number,
    options: CartLine["options"]
  ) => {
    const key = cartLineKey(item.id, optionIds, note);
    setCart((prev) => {
      const existing = prev.find((l) => l.key === key);
      if (existing) {
        return prev.map((l) => (l.key === key ? { ...l, qty: Math.min(50, l.qty + qty) } : l));
      }
      return [...prev, { key, menuItemId: item.id, name: item.name, unitPrice, qty, note, optionIds, options }];
    });
  };

  const handleTileClick = (item: PublicMenuItem) => {
    if (item.status !== "AVAILABLE") return;
    if (item.optionGroups.length > 0) {
      setOptionItem(item);
      return;
    }
    addToCart(item, 1, "", [], item.price, []);
    toast.success(`${item.name} masuk keranjang`, { duration: 1500 });
  };

  const changeQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((l) => (l.key === key ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  };

  const removeLine = (key: string) => setCart((prev) => prev.filter((l) => l.key !== key));

  /* ============ Ringkasan harga ============ */

  const subtotal = useMemo(() => cart.reduce((s, l) => s + l.unitPrice * l.qty, 0), [cart]);

  const eligiblePromos = useMemo(
    () => promos.filter((p) => subtotal >= p.minOrder),
    [promos, subtotal]
  );
  const activePromo = useMemo(
    () => eligiblePromos.find((p) => p.id === promoId) ?? null,
    [eligiblePromos, promoId]
  );
  const discount = useMemo(() => {
    if (!activePromo) return 0;
    return activePromo.type === "PERCENT"
      ? Math.floor((subtotal * activePromo.value) / 100)
      : Math.min(activePromo.value, subtotal);
  }, [activePromo, subtotal]);

  const deliveryFee =
    fulfillment === "DELIVERY" && cafe?.deliveryEnabled ? (cafe?.deliveryFee ?? 0) : 0;
  const total = Math.max(0, subtotal - discount + deliveryFee);

  /* ============ Buka shift ============ */

  const openShiftNow = async () => {
    const cash = Math.floor(Number(openingCash) || 0);
    if (cash < 0) {
      toast.error("Saldo awal kas tidak valid.");
      return;
    }
    setOpeningShift(true);
    try {
      const res = await fetch("/api/kasir/shift", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openingCash: cash }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal membuka shift.");
      toast.success("Shift dibuka. Selamat bertugas!");
      setOpeningCash("");
      await refreshShift();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal membuka shift.");
    } finally {
      setOpeningShift(false);
    }
  };

  /* ============ Pembayaran ============ */

  const startPayment = () => {
    if (!shift) {
      toast.error("Buka shift kasir dulu sebelum transaksi berbayar.");
      return;
    }
    if (!cart.length) {
      toast.error("Keranjang masih kosong.");
      return;
    }
    const name = customerName.trim();
    if (name.length < 2) {
      toast.error("Isi nama pelanggan (min. 2 karakter).");
      return;
    }
    if (fulfillment === "DELIVERY" && !deliveryBuilding.trim()) {
      toast.error("Isi lokasi antar (gedung/ruang) untuk pesanan diantar.");
      return;
    }
    setPayOpen(true);
  };

  const submitPayment = async (method: "CASH" | "QRIS", cashReceived: number | null) => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/kasir/pos/pesanan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: customerName.trim(),
          fulfillment,
          tableNumber: fulfillment === "DINE_IN" ? tableNumber.trim() || null : null,
          deliveryBuilding: fulfillment === "DELIVERY" ? deliveryBuilding.trim() : null,
          deliveryRoom: fulfillment === "DELIVERY" ? deliveryRoom.trim() : null,
          deliveryNote: fulfillment === "DELIVERY" ? deliveryNote.trim() : null,
          note: orderNote.trim() || null,
          items: cart.map((l) => ({
            menuItemId: l.menuItemId,
            qty: l.qty,
            note: l.note || null,
            optionIds: l.optionIds,
          })),
          promoId: activePromo?.id ?? null,
          payment: { method, cashReceived: method === "CASH" ? cashReceived : null },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal memproses transaksi.");
      const result = json.order as PosOrderResult;
      setSuccess({ ...result, method, customerName: customerName.trim() });
      setPayOpen(false);
      resetForm();
      toast.success(`Transaksi ${result.orderNumber} berhasil!`);
      void refreshShift();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal memproses transaksi.");
      void refreshShift();
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setCart([]);
    setCustomerName("Pelanggan");
    setFulfillment("DINE_IN");
    setTableNumber("");
    setDeliveryBuilding("");
    setDeliveryRoom("");
    setDeliveryNote("");
    setOrderNote("");
    setPromoId("");
    setMobileTab("menu");
  };

  /* ============ Render ============ */

  const filteredItems = useMemo(() => {
    if (!menu) return [];
    const q = search.trim().toLowerCase();
    return menu.items.filter((it) => {
      if (activeCat !== "semua" && it.categoryId !== activeCat) return false;
      if (q && !it.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [menu, activeCat, search]);

  const cartCount = cart.reduce((s, l) => s + l.qty, 0);

  if (bootLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Menyiapkan POS…
      </div>
    );
  }

  /* ---- Belum buka shift ---- */
  if (!shift) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-2 py-6">
        <Card className="w-full max-w-md">
          <CardHeader className="items-center text-center">
            <div className="mx-auto mb-1 flex h-14 w-14 items-center justify-center rounded-full bg-gold-soft">
              <Timer className="h-7 w-7 text-gold-foreground" />
            </div>
            <CardTitle className="font-display text-xl">Buka Shift Dulu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-center text-sm text-muted-foreground">
              Shift kas belum dibuka. Kasir wajib membuka shift — dengan mencatat saldo awal kas —
              sebelum melayani transaksi berbayar. Saldo ini dipakai menghitung pertanggungjawaban
              kas saat shift ditutup.
            </p>
            <div className="space-y-2">
              <Label htmlFor="opening-cash">Saldo awal kas (Rp)</Label>
              <Input
                id="opening-cash"
                type="number"
                inputMode="numeric"
                min={0}
                placeholder="Contoh: 50000"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                className="h-12 text-lg font-semibold tabular-nums"
              />
            </div>
            <Button
              className="h-12 w-full text-base font-bold"
              disabled={openingShift}
              onClick={() => void openShiftNow()}
            >
              {openingShift ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Membuka shift…
                </>
              ) : (
                "Buka Shift & Mulai Transaksi"
              )}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              Ingin lihat riwayat shift dan kelola kas?{" "}
              <Link href="/kasir/shift" className="font-semibold text-primary underline underline-offset-2">
                Halaman Shift Kas
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-24 lg:pb-0">
      {/* Status shift */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold">POS Kasir</h1>
          <p className="text-xs text-muted-foreground">
            Shift dibuka {formatWibTime(shift.openedAt)} WIB ({timeAgo(shift.openedAt)}) ·{" "}
            {shift.ringkasan.jumlahTransaksi} transaksi
          </p>
        </div>
        <Badge variant="outline" className="h-auto gap-1.5 border-emerald-300 bg-emerald-50 py-1 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
          <Timer className="h-3.5 w-3.5" /> Kas seharusnya {formatRupiah(shift.ringkasan.expectedCash)}
        </Badge>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {/* ================= KOLOM KIRI: PEMILIH MENU ================= */}
        <section
          className={cn("space-y-3", mobileTab !== "menu" && "hidden lg:block")}
          aria-label="Pemilih menu"
        >
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari menu… (nama)"
              className="h-11 pl-9"
              aria-label="Cari menu"
            />
          </div>

          <div
            className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="tablist"
            aria-label="Kategori menu"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeCat === "semua"}
              onClick={() => setActiveCat("semua")}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                activeCat === "semua"
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card text-muted-foreground hover:border-primary/40"
              )}
            >
              Semua
            </button>
            {(menu?.categories ?? []).map((c) => (
              <button
                key={c.id}
                type="button"
                role="tab"
                aria-selected={activeCat === c.id}
                onClick={() => setActiveCat(c.id)}
                className={cn(
                  "min-h-11 shrink-0 rounded-full border px-4 text-sm font-semibold transition-colors",
                  activeCat === c.id
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40"
                )}
              >
                {c.name}
              </button>
            ))}
          </div>

          {filteredItems.length === 0 ? (
            <div className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
              Tidak ada menu yang cocok. Coba kata kunci atau kategori lain.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
              {filteredItems.map((item) => {
                const disabled = item.status !== "AVAILABLE";
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => handleTileClick(item)}
                    className={cn(
                      "flex min-h-[88px] items-center gap-3 rounded-xl border-2 bg-card p-3 text-left transition-all",
                      disabled
                        ? "cursor-not-allowed border-border opacity-60"
                        : "border-border hover:-translate-y-0.5 hover:border-gold hover:shadow-md active:translate-y-0"
                    )}
                    aria-label={`${item.name}, ${formatRupiah(item.price)}`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="h-16 w-16 shrink-0 rounded-lg border object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border bg-muted">
                        <Store className="h-6 w-6 text-muted-foreground" />
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col justify-between gap-1.5 self-stretch py-0.5">
                      <span className="flex items-start justify-between gap-2">
                        <span className="line-clamp-2 text-sm leading-tight font-bold">{item.name}</span>
                        {disabled ? (
                          <MenuStatusBadge status={item.status} />
                        ) : item.optionGroups.length > 0 ? (
                          <span className="shrink-0 rounded-full bg-gold-soft px-2 py-0.5 text-[10px] font-semibold text-gold-foreground">
                            pilih opsi
                          </span>
                        ) : null}
                      </span>
                      <span className="font-display text-base font-bold tabular-nums text-primary dark:text-gold">
                        {formatRupiah(item.price)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* ================= KOLOM KANAN: KERANJANG ================= */}
        <aside
          className={cn("space-y-3 lg:sticky lg:top-[70px]", mobileTab !== "cart" && "hidden lg:block")}
          aria-label="Panel keranjang"
        >
          <Card>
            <CardHeader className="flex-row items-center justify-between py-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <ShoppingCart className="h-4.5 w-4.5" /> Keranjang
                {cartCount > 0 ? (
                  <Badge className="ml-0.5 rounded-full px-2">{cartCount}</Badge>
                ) : null}
              </CardTitle>
              {cart.length > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 text-destructive hover:text-destructive"
                  onClick={() => {
                    setCart([]);
                    toast.info("Keranjang dikosongkan");
                  }}
                >
                  <Trash2 className="h-4 w-4" /> Kosongkan
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-3">
              {cart.length === 0 ? (
                <div className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
                  Belum ada item. Klik menu di sebelah kiri untuk menambahkan.
                </div>
              ) : (
                <div className="max-h-64 space-y-2 overflow-y-auto pr-0.5 lg:max-h-72">
                  {cart.map((line) => (
                    <div key={line.key} className="rounded-lg border bg-background p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm leading-tight font-semibold">{line.name}</p>
                        <button
                          type="button"
                          onClick={() => removeLine(line.key)}
                          className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          aria-label={`Hapus ${line.name} dari keranjang`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {line.options.length ? (
                        <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">
                          + {line.options.map((o) => o.optionName).join(" · ")}
                        </p>
                      ) : null}
                      {line.note ? (
                        <p className="mt-0.5 text-[11px] leading-tight italic text-muted-foreground">
                          “{line.note}”
                        </p>
                      ) : null}
                      <div className="mt-1.5 flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            aria-label="Kurangi jumlah"
                            onClick={() => changeQty(line.key, -1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-7 text-center text-sm font-bold tabular-nums">
                            {line.qty}
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-9 w-9"
                            aria-label="Tambah jumlah"
                            onClick={() => changeQty(line.key, 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                        <p className="text-sm font-bold tabular-nums">
                          {formatRupiah(line.unitPrice * line.qty)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Formulir pesanan */}
              <div className="space-y-2.5 border-t pt-3">
                <div className="grid gap-2.5 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-name">Nama pelanggan</Label>
                    <Input
                      id="cust-name"
                      value={customerName}
                      maxLength={MAX_NAME_LENGTH}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Pelanggan"
                      className="h-10"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Penerimaan</Label>
                    <div className="grid grid-cols-3 gap-1">
                      {FULFILLMENT_TABS.map((f) => (
                        <button
                          key={f.value}
                          type="button"
                          onClick={() => setFulfillment(f.value)}
                          className={cn(
                            "flex min-h-10 flex-col items-center justify-center gap-0.5 rounded-md border px-1 py-1.5 text-[10px] leading-tight font-semibold transition-colors",
                            fulfillment === f.value
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card text-muted-foreground hover:border-primary/40"
                          )}
                          aria-pressed={fulfillment === f.value}
                        >
                          <f.icon className="h-4 w-4" />
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {fulfillment === "DINE_IN" ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="table-no">
                      Nomor meja <span className="font-normal text-muted-foreground">(opsional)</span>
                    </Label>
                    <Input
                      id="table-no"
                      value={tableNumber}
                      maxLength={20}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Contoh: 4"
                      className="h-10"
                    />
                  </div>
                ) : null}

                {fulfillment === "DELIVERY" ? (
                  <div className="space-y-2 rounded-lg border border-gold/40 bg-gold-soft/40 p-2.5">
                    <p className="text-xs font-semibold">Lokasi antar (area sekolah)</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="del-building" className="text-xs">
                          Gedung/titik *
                        </Label>
                        <Input
                          id="del-building"
                          value={deliveryBuilding}
                          maxLength={100}
                          onChange={(e) => setDeliveryBuilding(e.target.value)}
                          placeholder="Gedung IPA"
                          className="h-9"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="del-room" className="text-xs">
                          Ruang/kelas
                        </Label>
                        <Input
                          id="del-room"
                          value={deliveryRoom}
                          maxLength={100}
                          onChange={(e) => setDeliveryRoom(e.target.value)}
                          placeholder="R. 12"
                          className="h-9"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="del-note" className="text-xs">
                        Catatan antar <span className="font-normal text-muted-foreground">(opsional)</span>
                      </Label>
                      <Input
                        id="del-note"
                        value={deliveryNote}
                        maxLength={200}
                        onChange={(e) => setDeliveryNote(e.target.value)}
                        placeholder="Titip di meja guru piket…"
                        className="h-9"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="space-y-1.5">
                  <Label htmlFor="promo-select">Promo</Label>
                  <Select value={activePromo ? activePromo.id : "none"} onValueChange={(v) => setPromoId(v === "none" ? "" : v)}>
                    <SelectTrigger id="promo-select" className="h-10 w-full">
                      <SelectValue placeholder="Tanpa promo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Tanpa promo</SelectItem>
                      {eligiblePromos.length === 0 ? (
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                          Belum ada promo yang memenuhi minimum belanja.
                        </div>
                      ) : (
                        eligiblePromos.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}{" "}
                            <span className="text-xs text-muted-foreground">
                              ({p.type === "PERCENT" ? `${p.value}%` : formatRupiah(p.value)} · min.{" "}
                              {formatRupiah(p.minOrder)})
                            </span>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="order-note">
                    Catatan pesanan <span className="font-normal text-muted-foreground">(opsional)</span>
                  </Label>
                  <Textarea
                    id="order-note"
                    value={orderNote}
                    maxLength={200}
                    onChange={(e) => setOrderNote(e.target.value)}
                    placeholder="Catatan umum untuk pesanan ini…"
                    className="min-h-9 py-2 text-sm"
                    rows={2}
                  />
                </div>
              </div>

              {/* Ringkasan */}
              <div className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span className="tabular-nums">{formatRupiah(subtotal)}</span>
                </div>
                {discount > 0 && activePromo ? (
                  <div className="flex justify-between text-emerald-700 dark:text-emerald-400">
                    <span>Diskon ({activePromo.name})</span>
                    <span className="tabular-nums">-{formatRupiah(discount)}</span>
                  </div>
                ) : null}
                {deliveryFee > 0 ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Biaya antar</span>
                    <span className="tabular-nums">{formatRupiah(deliveryFee)}</span>
                  </div>
                ) : null}
                <div className="flex items-baseline justify-between border-t pt-2">
                  <span className="font-display text-base font-bold">Total</span>
                  <span className="font-display text-2xl font-bold tabular-nums text-primary dark:text-gold">
                    {formatRupiah(total)}
                  </span>
                </div>
              </div>

              <Button
                className="h-13 w-full text-base font-bold"
                disabled={cart.length === 0}
                onClick={startPayment}
              >
                <Banknote className="h-5 w-5" /> Bayar · {formatRupiah(total)}
              </Button>
            </CardContent>
          </Card>
        </aside>
      </div>

      {/* ================= TAB BAWAH (MOBILE) ================= */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-2 gap-2 border-t bg-card/95 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] backdrop-blur lg:hidden"
        aria-label="Beralih tampilan POS"
      >
        <Button
          variant={mobileTab === "menu" ? "default" : "secondary"}
          className="h-12"
          onClick={() => setMobileTab("menu")}
        >
          <Store className="h-4.5 w-4.5" /> Pilih Menu
        </Button>
        <Button
          variant={mobileTab === "cart" ? "default" : "secondary"}
          className="h-12"
          onClick={() => setMobileTab("cart")}
        >
          <ShoppingCart className="h-4.5 w-4.5" /> Keranjang
          {cartCount > 0 ? ` (${cartCount})` : ""}
        </Button>
      </nav>

      {/* ================= DIALOG OPSI MENU ================= */}
      <MenuOptionDialog
        item={optionItem}
        open={optionItem !== null}
        onOpenChange={(o) => {
          if (!o) setOptionItem(null);
        }}
        onAdd={(payload) => {
          if (!optionItem) return;
          addToCart(
            optionItem,
            payload.qty,
            payload.note,
            payload.optionIds,
            payload.unitPrice,
            payload.options.map((o) => ({
              groupName: o.groupName,
              optionName: o.optionName,
              priceDelta: o.priceDelta,
            }))
          );
          toast.success(`${payload.qty}× ${payload.name} masuk keranjang`, { duration: 1500 });
        }}
      />

      {/* ================= DIALOG PEMBAYARAN ================= */}
      <PaymentDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        total={total}
        title="Bayar Transaksi"
        description={`Keranjang ${cartCount} item${fulfillment === "DELIVERY" ? ` · ${FULFILLMENT_LABEL.DELIVERY}` : ""}`}
        cashEnabled={cafe?.cashEnabled ?? true}
        qrisEnabled={cafe?.qrisEnabled ?? true}
        submitting={submitting}
        onConfirm={(method, cashReceived) => void submitPayment(method, cashReceived)}
      />

      {/* ================= DIALOG SUKSES ================= */}
      <Dialog
        open={success !== null}
        onOpenChange={(o) => {
          if (!o) setSuccess(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          {success ? (
            <>
              <DialogHeader className="items-center text-center sm:text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/60">
                  <CheckCircle2 className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                </div>
                <DialogTitle className="font-display text-xl">Transaksi Berhasil</DialogTitle>
                <DialogDescription asChild>
                  <div className="space-y-2">
                    <p className="font-mono text-lg font-bold tracking-widest text-foreground">
                      {success.orderNumber}
                    </p>
                    <p className="text-sm">
                      Pembeli {success.customerName} · {success.method === "CASH" ? "Tunai" : "QRIS"}
                    </p>
                  </div>
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-1.5 rounded-lg bg-muted/60 p-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Total tagihan</span>
                  <span className="font-bold tabular-nums text-foreground">
                    {formatRupiah(success.total)}
                  </span>
                </div>
                {success.method === "CASH" ? (
                  <div className="flex justify-between text-muted-foreground">
                    <span>Kembalian</span>
                    <span className="font-bold tabular-nums text-emerald-700 dark:text-emerald-400">
                      {formatRupiah(success.cashChange ?? 0)}
                    </span>
                  </div>
                ) : null}
              </div>
              <DialogFooter className="flex-col gap-2 sm:flex-col">
                <div className="grid w-full grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => setReceiptType("customer")}
                  >
                    Cetak Struk Pelanggan
                  </Button>
                  <Button
                    variant="outline"
                    className="h-11"
                    onClick={() => setReceiptType("kitchen")}
                  >
                    Cetak Struk Dapur
                  </Button>
                </div>
                <Button className="h-11 w-full font-bold" onClick={() => setSuccess(null)}>
                  Transaksi Baru
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Struk dari dialog sukses */}
      {success && receiptType ? (
        <ReceiptDialog
          orderNumber={success.orderNumber}
          type={receiptType}
          accessKey={success.accessKey}
          open={receiptType !== null}
          onOpenChange={(o) => {
            if (!o) setReceiptType(null);
          }}
        />
      ) : null}
    </div>
  );
}
