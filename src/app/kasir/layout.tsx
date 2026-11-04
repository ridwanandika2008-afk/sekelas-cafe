import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { canAccess } from "@/lib/api-guard";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function KasirLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/masuk?next=/kasir");
  if (!canAccess(session.role, "kasir")) redirect(session.role === "ADMIN" ? "/admin" : "/barista");

  return (
    <DashboardShell
      variant="top"
      section="kasir"
      user={{ name: session.name, role: session.role }}
    >
      {children}
    </DashboardShell>
  );
}
