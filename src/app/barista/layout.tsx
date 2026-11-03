import { redirect } from "next/navigation";
import { Coffee } from "lucide-react";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/api-guard";
import { DashboardShell, type NavItem } from "@/components/dashboard-shell";

const NAV: NavItem[] = [{ href: "/barista", label: "Antrean Dapur", icon: Coffee }];

export default async function BaristaLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/barista");
  if (!canAccess(session.role, "barista")) redirect(session.role === "ADMIN" ? "/admin" : "/kasir");

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
