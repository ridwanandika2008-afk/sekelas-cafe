import type { Metadata } from "next";
import { TrackOrderView } from "@/components/public/track-order-view";

export const metadata: Metadata = {
  title: "Lacak Pesanan",
  description: "Pantau status pesananmu di Sekelas Cafe secara real-time.",
};

export default async function TrackOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ nomor: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { nomor } = await params;
  const sp = await searchParams;
  const k = typeof sp.k === "string" ? sp.k : "";
  return <TrackOrderView nomor={nomor} accessKey={k} />;
}
