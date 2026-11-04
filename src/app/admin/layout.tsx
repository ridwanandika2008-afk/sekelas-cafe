import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/api-guard";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/admin");
  if (!canAccess(session.role, "admin")) redirect(session.role === "KASIR" ? "/kasir" : "/barista");

  return (
    <DashboardShell
      variant="sidebar"
      section="admin"
      user={{ name: session.name, role: session.role }}
    >
      {children}
    </DashboardShell>
  );
}
