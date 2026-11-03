import type { Metadata } from "next";
import { BaristaQueue } from "@/components/barista/barista-queue";

export const metadata: Metadata = {
  title: "Antrean Dapur",
};

export default function BaristaPage() {
  return <BaristaQueue />;
}
