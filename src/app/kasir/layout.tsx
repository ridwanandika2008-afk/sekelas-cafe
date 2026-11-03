import { redirect } from "next/navigation";
import { ClipboardList, History, ShoppingBasket, Timer } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/api-guard";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/kasir", label: "POS Kasir", icon: ShoppingBasket },
  { href: "/kasir/pesanan", label: "Pesanan Masuk", icon: ClipboardList },
  { href: "/kasir/riwayat", label: "Riwayat", icon: History },
  { href: "/kasir/shift", label: "Shift Kas", icon: Timer },
];

export default async function KasirLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/kasir");
  if (!canAccess(session.role, "kasir")) redirect(session.role === "ADMIN" ? "/admin" : "/barista");

  return (
    <DashboardShell
      variant="top"
      nav={NAV}
      user={{ name: session.name, role: session.role }}
    >
      {children}
    </DashboardShell>
  );
}
