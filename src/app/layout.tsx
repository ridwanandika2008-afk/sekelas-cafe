import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Fraunces } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Sekelas Cafe — Kafe Siswa SMKN 1 Boyolangu",
    template: "%s · Sekelas Cafe",
  },
  description:
    "Platform pemesanan & manajemen kafe siswa-siswi SMKN 1 Boyolangu. Ngopi asik, harga bersahabat — pesan mudah, antar sampai area sekolah.",
  keywords: [
    "Sekelas Cafe",
    "kafe",
    "SMKN 1 Boyolangu",
    "Tulungagung",
    "kopi",
    "pesan antar",
  ],
  applicationName: "Sekelas Cafe",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F8F2E7" },
    { media: "(prefers-color-scheme: dark)", color: "#221710" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${jakarta.variable} ${fraunces.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <Sonner position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
