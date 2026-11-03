import { redirect } from "next/navigation";
import {
  BarChart3,
  Boxes,
  FileSpreadsheet,
  History,
  LayoutDashboard,
  Percent,
  Settings,
  Tags,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/api-guard";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed },
  { href: "/admin/kategori", label: "Kategori", icon: Tags },
  { href: "/admin/stok", label: "Stok & Bahan", icon: Boxes },
  { href: "/admin/promo", label: "Promo", icon: Percent },
  { href: "/admin/laporan", label: "Laporan", icon: BarChart3 },
  { href: "/admin/data", label: "Data (Excel)", icon: FileSpreadsheet },
  { href: "/admin/pengguna", label: "Pengguna", icon: Users },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
  { href: "/admin/aktivitas", label: "Aktivitas", icon: History },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/admin");
  if (!canAccess(session.role, "admin")) redirect(session.role === "KASIR" ? "/kasir" : "/barista");

  return (
    <DashboardShell
      variant="sidebar"
      nav={NAV}
      user={{ name: session.name, role: session.role }}
    >
      {children}
    </DashboardShell>
  );
}
