/**
 * Guard otorisasi untuk API routes & halaman server.
 * Aturan penting: pemeriksaan otorisasi SELALU di server,
 * menyembunyikan tombol di frontend tidak cukup.
 */
import { NextResponse } from "next/server";
import { getSession, type SessionUser } from "./auth";
import type { Role } from "./constants";

/**
 * Untuk API route. Mengembalikan sesi bila valid,
 * atau NextResponse 401/403 yang langsung bisa di-return.
 */
export async function requireApiRole(
  roles: Role[]
): Promise<{ session: SessionUser; error: null } | { session: null; error: NextResponse }> {
  const session = await getSession();
  if (!session) {
    return {
      session: null,
      error: NextResponse.json({ error: "Sesi berakhir. Silakan masuk kembali." }, { status: 401 }),
    };
  }
  if (!roles.includes(session.role)) {
    return {
      session: null,
      error: NextResponse.json(
        { error: "Anda tidak memiliki akses untuk aksi ini." },
        { status: 403 }
      ),
    };
  }
  return { session, error: null };
}

/** Admin boleh masuk semua seksi; role lain sesuai bagiannya */
export function canAccess(role: Role, section: "admin" | "kasir" | "barista"): boolean {
  if (role === "ADMIN") return true;
  if (section === "kasir") return role === "KASIR";
  if (section === "barista") return role === "BARISTA";
  return false;
}
