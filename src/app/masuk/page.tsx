import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { Logo } from "@/components/logo";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = {
  title: "Masuk Staf",
  description: "Halaman masuk staf Sekelas Cafe — admin, kasir, dan barista.",
};

export default async function MasukPage() {
  const session = await getSession();
  if (session) {
    redirect(
      session.role === "ADMIN" ? "/admin" : session.role === "KASIR" ? "/kasir" : "/barista"
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      <div className="grain-bg pointer-events-none absolute inset-0" aria-hidden />
      <div
        className="pointer-events-none absolute -top-32 right-0 h-96 w-96 rounded-full bg-gold-soft blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-0 h-96 w-96 rounded-full bg-accent blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center gap-3 text-center">
          <Logo className="scale-110" />
          <p className="text-sm text-muted-foreground">
            Panel staf Sekelas Cafe — SMKN 1 Boyolangu
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm">
          <h1 className="font-display text-xl font-semibold">Masuk</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gunakan akun staf yang diberikan admin kafe.
          </p>
          <Suspense fallback={<div className="h-64" />}>
            <LoginForm />
          </Suspense>
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Pembeli tidak perlu masuk —{" "}
          <Link href="/" className="font-medium text-primary underline-offset-4 hover:underline">
            pesan langsung dari beranda
          </Link>
        </p>
      </div>
    </main>
  );
}
