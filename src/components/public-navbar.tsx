"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { cartTotalUnits, useCart } from "@/lib/cart-store";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const emptySubscribe = () => () => {};

export function PublicNavbar() {
  const pathname = usePathname();
  const items = useCart((s) => s.items);
  // false saat SSR/hidrasi, true di client — aman untuk localStorage
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const total = mounted ? cartTotalUnits(items) : 0;

  const links = [
    { href: "/", label: "Beranda" },
    { href: "/menu", label: "Menu" },
    { href: "/pesanan-saya", label: "Pesanan Saya" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4">
        <Link href="/" aria-label="Beranda Sekelas Cafe">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 sm:flex" aria-label="Navigasi utama">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                pathname === l.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <Button asChild className="rounded-full" size="sm">
          <Link href="/menu" className="gap-2">
            <ShoppingBag className="h-4 w-4" />
            {total > 0 ? `Keranjang (${total})` : "Pesan Sekarang"}
          </Link>
        </Button>
      </div>
      {/* Navigasi mobile */}
      <nav className="flex border-t sm:hidden" aria-label="Navigasi mobile">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={cn(
              "flex-1 py-2.5 text-center text-sm font-medium",
              pathname === l.href
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground"
            )}
          >
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
