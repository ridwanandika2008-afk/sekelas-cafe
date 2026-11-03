import type { Metadata } from "next";
import { MenuView } from "@/components/public/menu-view";

export const metadata: Metadata = {
  title: "Menu",
  description:
    "Daftar menu Sekelas Cafe — kopi, non-kopi, dan makanan dengan harga bersahabat. Pesan online, bayar di kasir.",
};

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const kategori = typeof sp.kategori === "string" ? sp.kategori : undefined;
  return <MenuView initialCategory={kategori} />;
}
