import type { Metadata } from "next";
import Link from "next/link";
import { Coffee, Instagram, MapPin, MessageCircle } from "lucide-react";
import { Logo } from "@/components/logo";
import { PublicNavbar } from "@/components/public-navbar";

export const metadata: Metadata = {
  title: {
    default: "Sekelas Cafe — Kafe Siswa SMKN 1 Boyolangu",
    template: "%s · Sekelas Cafe",
  },
};

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <PublicNavbar />
      <main className="flex-1">{children}</main>
      {/* Footer menempel bawah saat kont pendek (sticky footer) */}
      <footer className="mt-auto border-t bg-card">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-3">
            <Logo />
            <p className="text-sm leading-relaxed text-muted-foreground">
              Kafe yang dikelola siswa-siswi SMKN 1 Boyolangu. Ngopi asik, harga
              bersahabat, dan antar sampai area sekolah.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Jelajahi</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <Link href="/" className="hover:text-foreground">
                  Beranda
                </Link>
              </li>
              <li>
                <Link href="/menu" className="hover:text-foreground">
                  Menu
                </Link>
              </li>
              <li>
                <Link href="/pesanan-saya" className="hover:text-foreground">
                  Pesanan Saya
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 flex items-center gap-1.5 text-sm font-semibold">
              <MapPin className="h-4 w-4 text-gold" /> Lokasi
            </h3>
            <p className="text-sm leading-relaxed text-muted-foreground">
              Jl. Ki Mangun Sarkoro No.VI/3, Dusun Talun, Beji, Kec. Boyolangu,
              Kab. Tulungagung, Jawa Timur 66233
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold">Hubungi Kami</h3>
            <div className="flex flex-col gap-2 text-sm">
              <a
                href="https://wa.me/6285151823036?text=Halo%20Sekelas%20Cafe!%20Saya%20mau%20tanya-tanya%20dong."
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <MessageCircle className="h-4 w-4 text-gold" />
                0851-5182-3036 (WhatsApp)
              </a>
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Coffee className="h-4 w-4 text-gold" />
                Setiap hari 07.00–14.00 WIB
              </span>
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Instagram className="h-4 w-4 text-gold" />
                @sekelascafe
              </span>
            </div>
          </div>
        </div>
        <div className="border-t py-4 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Sekelas Cafe — SMKN 1 Boyolangu. Dibuat
          dengan sepenuh hati oleh pelajar.
        </div>
      </footer>
    </div>
  );
}
