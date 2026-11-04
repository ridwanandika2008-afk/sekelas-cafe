"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Bike,
  Coffee,
  MapPin,
  MessageCircle,
  PackageCheck,
  Sparkles,
  Utensils,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatRupiah, waLink, wibNowParts } from "@/lib/format";
import { fetchCafe, fetchMenu, type CafeResponse, type MenuResponse } from "./types";

/** Animasi fade/slide kecil yang halus, sekali jalan saat masuk viewport. */
function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.45, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-gold">{eyebrow}</p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h2>
      </div>
      {action}
    </div>
  );
}

export function HomeView() {
  const [cafe, setCafe] = useState<CafeResponse | null>(null);
  const [menu, setMenu] = useState<MenuResponse | null>(null);
  const [loadError, setLoadError] = useState(false);
  // Hari ini (WIB) dihitung di client agar tidak selisih dengan render server.
  const todayDow = useSyncExternalStore(
    () => () => {},
    () => wibNowParts().dayOfWeek,
    () => -1
  );

  useEffect(() => {
    let active = true;
    Promise.all([fetchCafe(), fetchMenu()])
      .then(([c, m]) => {
        if (!active) return;
        setCafe(c);
        setMenu(m);
      })
      .catch(() => {
        if (active) setLoadError(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const featured = useMemo(
    () => (menu ? menu.items.filter((i) => i.isFeatured).slice(0, 4) : []),
    [menu]
  );

  const categoriesWithCount = useMemo(() => {
    if (!menu) return [];
    return menu.categories.map((c) => ({
      ...c,
      count: menu.items.filter((i) => i.categoryId === c.id).length,
    }));
  }, [menu]);

  const schedulesMondayFirst = useMemo(() => {
    if (!cafe) return [];
    return [...cafe.schedules].sort((a, b) => ((a.day + 6) % 7) - ((b.day + 6) % 7));
  }, [cafe]);

  if (loadError) {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
        <Coffee className="h-10 w-10 text-muted-foreground" aria-hidden />
        <p className="mt-4 font-display text-lg font-semibold">Gagal memuat halaman</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Periksa koneksi internetmu lalu coba lagi ya.
        </p>
        <Button className="mt-5 rounded-full" onClick={() => window.location.reload()}>
          Coba Lagi
        </Button>
      </div>
    );
  }

  if (!cafe || !menu) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
          <div className="space-y-4">
            <Skeleton className="h-8 w-52 rounded-full" />
            <Skeleton className="h-12 w-full max-w-md" />
            <Skeleton className="h-12 w-3/4 max-w-sm" />
            <Skeleton className="h-5 w-full max-w-lg" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-12 w-44 rounded-full" />
              <Skeleton className="h-12 w-44 rounded-full" />
            </div>
          </div>
          <Skeleton className="aspect-[4/3] w-full rounded-[2rem]" />
        </div>
        <Skeleton className="mt-14 h-8 w-56" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const { cafe: info, status } = cafe;
  const isOpen = status.isOpen;
  const closeLabel = status.today?.closeTime
    ? status.today.closeTime.replace(":", ".")
    : "";

  return (
    <div>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden" aria-labelledby="hero-headline">
        <div
          aria-hidden
          className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-gold-soft opacity-80 blur-3xl"
        />
        <div
          aria-hidden
          className="absolute -left-32 bottom-0 h-64 w-64 rounded-full bg-accent opacity-60 blur-3xl"
        />
        <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-4 pb-14 pt-10 sm:pt-14 lg:grid-cols-2 lg:gap-12 lg:pb-20 lg:pt-16">
          <div>
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
              {isOpen
                ? `Buka sekarang · tutup ${closeLabel}`
                : status.message}
            </div>

            <h1
              id="hero-headline"
              className="mt-5 font-display text-4xl font-semibold leading-[1.1] tracking-tight sm:text-5xl"
            >
              {info.heroHeadline}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              {info.heroSubheadline}
            </p>

            <div className="mt-7 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" asChild className="rounded-full text-base">
                <Link href="/menu" className="gap-2">
                  Lihat Menu &amp; Pesan
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="rounded-full text-base">
                <a
                  href={waLink(
                    info.whatsapp,
                    "Halo Sekelas Cafe! Saya mau tanya-tanya dong."
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="gap-2"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Tanya via WhatsApp
                </a>
              </Button>
            </div>

            <ul className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-gold" aria-hidden /> Tunai &amp; QRIS di kasir
              </li>
              <li className="flex items-center gap-1.5">
                <Bike className="h-4 w-4 text-gold" aria-hidden /> Antar area sekolah
              </li>
              <li className="flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-gold" aria-hidden /> Dikelola siswa
              </li>
            </ul>
          </div>

          <div className="relative">
            <div
              aria-hidden
              className="absolute -inset-3 rotate-2 rounded-[2.2rem] border-2 border-gold/40 bg-gold-soft"
            />
            <div className="relative overflow-hidden rounded-[2rem] border shadow-lg">
              {info.heroImageUrl ? (
                <img
                  src={info.heroImageUrl}
                  alt={`Suasana ${info.name}`}
                  className="aspect-[4/3] w-full object-cover"
                />
              ) : (
                <div className="flex aspect-[4/3] w-full items-center justify-center bg-muted">
                  <Coffee className="h-16 w-16 text-muted-foreground" aria-hidden />
                </div>
              )}
            </div>
            {info.deliveryEnabled && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.45, ease: "easeOut" }}
                className="absolute -bottom-5 left-4 flex items-center gap-3 rounded-2xl border bg-card px-4 py-3 shadow-md"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gold-soft text-gold-foreground">
                  <Bike className="h-5 w-5" aria-hidden />
                </span>
                <span>
                  <span className="block text-sm font-semibold leading-tight">
                    Antar ke area sekolah
                  </span>
                  <span className="block text-xs text-muted-foreground">
                    Mulai {formatRupiah(info.deliveryFee)}
                  </span>
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* ===== MENU UNGGULAN ===== */}
      {featured.length > 0 && (
        <section className="mx-auto max-w-6xl px-4" aria-labelledby="unggulan">
          <Reveal>
            <SectionHeading
              eyebrow="Favorit pelanggan"
              title="Menu Unggulan"
              action={
                <Link
                  href="/menu"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
                >
                  Lihat semua menu
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden />
                </Link>
              }
            />
          </Reveal>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {featured.map((item, i) => (
              <Reveal key={item.id} delay={i * 0.07}>
                <Link
                  href="/menu"
                  className="group block h-full overflow-hidden rounded-2xl border bg-card transition-all hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-md"
                >
                  <div className="aspect-[4/3] overflow-hidden bg-muted">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Coffee className="h-10 w-10 text-muted-foreground" aria-hidden />
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold leading-snug">{item.name}</h3>
                    <div className="mt-2.5 flex items-center justify-between">
                      <span className="font-display text-lg font-semibold text-primary">
                        {formatRupiah(item.price)}
                      </span>
                      <span className="rounded-full bg-gold-soft px-3 py-1.5 text-xs font-semibold text-gold-foreground transition-colors group-hover:bg-gold group-hover:text-primary-foreground">
                        Pesan
                      </span>
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* ===== KATEGORI ===== */}
      {categoriesWithCount.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pt-14" aria-labelledby="kategori">
          <Reveal>
            <SectionHeading eyebrow="Jelajahi" title="Kategori Menu" />
            <div className="flex flex-wrap gap-2.5">
              {categoriesWithCount.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 10 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.06, duration: 0.35, ease: "easeOut" }}
                >
                  <Link
                    href={`/menu?kategori=${encodeURIComponent(c.name)}`}
                    className="inline-flex items-center gap-2 rounded-full border bg-card px-4 py-2.5 text-sm font-medium transition-colors hover:border-gold hover:bg-gold-soft"
                  >
                    {c.name}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {c.count}
                    </span>
                  </Link>
                </motion.div>
              ))}
            </div>
          </Reveal>
        </section>
      )}

      {/* ===== CARA PESAN ===== */}
      <section className="mx-auto max-w-6xl px-4 pt-14" aria-labelledby="cara-pesan">
        <Reveal>
          <SectionHeading eyebrow="Semudah itu" title="Cara Pesan" />
        </Reveal>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              icon: Utensils,
              title: "1 · Pilih Menu",
              desc: "Jelajahi menu dan kustomasi sesuai selera — ukuran, gula, es, sampai topping.",
            },
            {
              icon: Wallet,
              title: "2 · Checkout & Bayar di Kasir",
              desc: "Buat pesananmu, lalu bayar tunai atau QRIS langsung di kasir Sekelas Cafe.",
            },
            {
              icon: PackageCheck,
              title: "3 · Ambil / Diantar",
              desc: "Ambil pesananmu di kasir, atau minta diantar ke gedung dan ruang sekolahmu.",
            },
          ].map((s, i) => (
            <Reveal key={s.title} delay={i * 0.08}>
              <div className="h-full rounded-2xl border bg-card p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-soft text-gold-foreground">
                  <s.icon className="h-5 w-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ===== INFO: JAM, LOKASI, KONTAK ===== */}
      <section className="mx-auto max-w-6xl px-4 pt-14" aria-labelledby="info">
        <Reveal>
          <SectionHeading eyebrow="Kunjungi kami" title="Jam &amp; Lokasi" />
        </Reveal>
        <div className="grid gap-5 lg:grid-cols-2">
          <Reveal>
            <div className="h-full rounded-2xl border bg-card p-5 sm:p-6">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-soft text-gold-foreground">
                  <Utensils className="h-4 w-4" aria-hidden />
                </span>
                Jam Operasional
              </h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {isOpen ? (
                  <span className="font-medium text-emerald-700">Sedang buka sekarang.</span>
                ) : (
                  <span className="font-medium text-amber-700">{status.message}</span>
                )}
              </p>
              <ul className="mt-4 space-y-1">
                {schedulesMondayFirst.map((s) => {
                  const isToday = s.day === todayDow;
                  return (
                    <li
                      key={s.day}
                      className={cn(
                        "flex items-center justify-between rounded-lg px-3 py-2 text-sm",
                        isToday ? "bg-gold-soft font-semibold" : "text-muted-foreground"
                      )}
                    >
                      <span className="flex items-center gap-2">
                        {s.dayName}
                        {isToday && (
                          <span className="rounded-full bg-gold px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary-foreground">
                            Hari ini
                          </span>
                        )}
                      </span>
                      <span className={s.isOpen ? "text-foreground" : ""}>
                        {s.isOpen
                          ? `${s.openTime.replace(":", ".")}–${s.closeTime.replace(":", ".")}`
                          : "Tutup"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </Reveal>

          <Reveal delay={0.08}>
            <div className="flex h-full flex-col rounded-2xl border bg-card p-5 sm:p-6">
              <h3 className="flex items-center gap-2 font-display text-lg font-semibold">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-soft text-gold-foreground">
                  <MapPin className="h-4 w-4" aria-hidden />
                </span>
                Lokasi
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{info.address}</p>
              <div className="mt-4 flex-1 overflow-hidden rounded-xl border">
                <iframe
                  title={`Peta lokasi ${info.name}`}
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(info.mapQuery)}&output=embed`}
                  className="h-56 w-full sm:h-64"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <Button variant="outline" asChild className="mt-4 gap-2 rounded-full">
                <a
                  href={waLink(info.whatsapp, "Halo Sekelas Cafe! Saya mau tanya-tanya dong.")}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle className="h-4 w-4" aria-hidden />
                  Hubungi via WhatsApp
                </a>
              </Button>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== TENTANG ===== */}
      {info.aboutText && (
        <section className="grain-bg mt-14 border-y" aria-labelledby="tentang">
          <Reveal className="mx-auto max-w-3xl px-4 py-14 text-center">
            <img
              src="/images/logo-mark.png"
              alt="Logo Sekelas Cafe"
              className="mx-auto h-16 w-auto"
            />
            <h2 id="tentang" className="mt-4 font-display text-2xl font-semibold sm:text-3xl">
              Tentang {info.name}
            </h2>
            <p className="mt-4 leading-relaxed text-muted-foreground">{info.aboutText}</p>
          </Reveal>
        </section>
      )}

      {/* ===== CTA PENUTUP ===== */}
      <section className="mx-auto max-w-6xl px-4 py-14" aria-label="Ajakan memesan">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-primary px-6 py-12 text-center text-primary-foreground sm:px-10">
            <div
              aria-hidden
              className="absolute -left-16 -top-16 h-56 w-56 rounded-full bg-gold/20 blur-2xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-20 -right-10 h-64 w-64 rounded-full bg-gold/15 blur-2xl"
            />
            <h2 className="relative font-display text-2xl font-semibold sm:text-3xl">
              Ngantuk atau laper? Gas pesan sekarang.
            </h2>
            <p className="relative mx-auto mt-2 max-w-md text-sm opacity-80">
              Pesan dulu dari kelas, ambil saat istirahat — tanpa ngantre lama.
            </p>
            <Button
              size="lg"
              variant="secondary"
              asChild
              className="relative mt-6 rounded-full text-base"
            >
              <Link href="/menu" className="gap-2">
                Pesan Sekarang
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </Button>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
