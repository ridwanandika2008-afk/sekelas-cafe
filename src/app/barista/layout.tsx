import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/api-guard";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function BaristaLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/barista");
  if (!canAccess(session.role, "barista")) redirect(session.role === "ADMIN" ? "/admin" : "/kasir");

  return (
    <DashboardShell
      variant="top"
      section="barista"
      user={{ name: session.name, role: session.role }}
    >
      {children}
    </DashboardShell>
  );
}
