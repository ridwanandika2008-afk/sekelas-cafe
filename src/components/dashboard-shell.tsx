"use client";

/**
 * Shell dashboard (sidebar untuk admin, top-nav untuk kasir/barista).
 * Termasuk lonceng notifikasi, menu pengguna (keluar, tema).
 */
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { LayoutDashboard, LogOut, Menu, Moon, Sun, X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { NotificationBell } from "@/components/notification-bell";
import { ROLE_LABEL } from "@/lib/constants";
import { Button } from "@/components/ui/button";

export type NavItem = { href: string; label: string; icon: LucideIcon };

function NavLinks({
  nav,
  isActive,
  onNavigate,
}: {
  nav: NavItem[];
  isActive: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Navigasi dashboard">
      {nav.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
            aria-current={active ? "page" : undefined}
          >
            <item.icon className="h-4.5 w-4.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

function UserBlock({
  user,
  onLogout,
}: {
  user: { name: string; role: string };
  onLogout: () => void;
}) {
  const { theme, setTheme } = useTheme();
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Ganti tema"
        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      >
        <Sun className="h-4.5 w-4.5 dark:hidden" />
        <Moon className="hidden h-4.5 w-4.5 dark:block" />
      </Button>
      <NotificationBell />
      <div className="hidden items-center gap-2.5 rounded-full border bg-card py-1 pl-1 pr-3 sm:flex">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div className="leading-tight">
          <p className="text-xs font-semibold">{user.name}</p>
          <p className="text-[10px] text-muted-foreground">{ROLE_LABEL[user.role] ?? user.role}</p>
        </div>
      </div>
      <Button variant="ghost" size="icon" aria-label="Keluar" onClick={onLogout}>
        <LogOut className="h-4.5 w-4.5" />
      </Button>
    </div>
  );
}

export function DashboardShell({
  variant,
  nav,
  user,
  children,
}: {
  variant: "sidebar" | "top";
  nav: NavItem[];
  user: { name: string; role: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (href: string) =>
    pathname === href ||
    (href !== "/admin" && href !== "/kasir" && href !== "/barista" && pathname.startsWith(`${href}/`));

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/masuk");
    router.refresh();
  };

  if (variant === "top") {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60">
          <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4">
            <Link href="/" className="flex items-center gap-2" aria-label="Beranda Sekelas Cafe">
              <Logo markClassName="h-7 w-7" compact />
              <span className="hidden font-display text-lg font-semibold sm:inline">
                Sekelas <span className="italic text-gold">Cafe</span>
              </span>
            </Link>
            <nav className="hidden items-center gap-1 md:flex" aria-label="Navigasi utama">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors",
                    isActive(item.href)
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-1">
              <UserBlock user={user} onLogout={logout} />
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                aria-label="Buka menu"
                onClick={() => setMobileOpen((v) => !v)}
              >
                {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
          {mobileOpen && (
            <div className="border-t px-4 py-3 md:hidden">
              <NavLinks
                nav={nav}
                isActive={isActive}
                onNavigate={() => setMobileOpen(false)}
              />
            </div>
          )}
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-5">{children}</main>
        <footer className="border-t py-3 text-center text-xs text-muted-foreground">
          Sekelas Cafe · SMKN 1 Boyolangu
        </footer>
      </div>
    );
  }

  // Sidebar (admin)
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r bg-sidebar lg:flex">
        <div className="flex h-14 items-center border-b px-4">
          <Link href="/admin" aria-label="Dashboard admin">
            <Logo markClassName="h-7 w-7" compact />
          </Link>
          <div className="ml-2 leading-tight">
            <p className="font-display text-sm font-semibold">Sekelas Cafe</p>
            <p className="text-[10px] text-muted-foreground">Panel Admin</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <NavLinks nav={nav} isActive={isActive} />
        </div>
        <div className="border-t p-3">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          >
            <LayoutDashboard className="h-4.5 w-4.5" />
            Lihat Situs Publik
          </Link>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-card/80 px-4 backdrop-blur">
          <div className="flex items-center gap-2 lg:hidden">
            <Button variant="ghost" size="icon" aria-label="Buka menu" onClick={() => setMobileOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <Logo markClassName="h-6 w-6" compact />
          </div>
          <div className="hidden lg:block" />
          <UserBlock user={user} onLogout={logout} />
        </header>

        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
            <div
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
              aria-hidden
            />
            <div className="absolute inset-y-0 left-0 flex w-64 flex-col bg-sidebar shadow-xl">
              <div className="flex h-14 items-center justify-between border-b px-4">
                <Logo markClassName="h-7 w-7" compact />
                <Button variant="ghost" size="icon" aria-label="Tutup menu" onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>
              <div className="flex-1 overflow-y-auto p-3">
                <NavLinks nav={nav} isActive={isActive} onNavigate={() => setMobileOpen(false)} />
              </div>
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
        <footer className="border-t py-3 text-center text-xs text-muted-foreground">
          Sekelas Cafe · SMKN 1 Boyolangu
        </footer>
      </div>
    </div>
  );
}
