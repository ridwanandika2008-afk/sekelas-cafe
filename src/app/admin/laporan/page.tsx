import type { Metadata } from "next";
import { LaporanView } from "@/components/admin/laporan/laporan-view";

export const metadata: Metadata = {
  title: "Laporan & Analisis — Sekelas Cafe",
};

export default function Page() {
  return <LaporanView />;
}
