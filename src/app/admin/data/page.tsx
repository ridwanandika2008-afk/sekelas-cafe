import type { Metadata } from "next";
import { ExportSection } from "@/components/admin/data/export-section";
import { ImportSection } from "@/components/admin/data/import-section";

export const metadata: Metadata = {
  title: "Import & Export Data — Sekelas Cafe",
};

export default function Page() {
  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">
          Import &amp; Export Data
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Kelola data menu, kategori, dan transaksi Sekelas Cafe lewat berkas Excel/CSV.
        </p>
      </div>
      <ExportSection />
      <ImportSection />
    </main>
  );
}
