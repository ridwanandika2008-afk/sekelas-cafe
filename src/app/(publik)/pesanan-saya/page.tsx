import type { Metadata } from "next";
import { MyOrdersView } from "@/components/public/my-orders-view";

export const metadata: Metadata = {
  title: "Pesanan Saya",
  description: "Riwayat pesananmu di Sekelas Cafe pada perangkat ini.",
};

export default function Page() {
  return <MyOrdersView />;
}
