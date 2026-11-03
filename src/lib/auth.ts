/**
 * Autentikasi Sekelas Cafe — sesi JWT (jose) + cookie httpOnly.
 * Password di-hash bcryptjs. Role: ADMIN | KASIR | BARISTA.
 */
import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { Role } from "./constants";
import { ORDER_COOKIE } from "./constants";

export type SessionUser = {
  userId: string;
  name: string;
  username: string;
  role: Role;
};

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-ganti-di-produksi"
);
const SESSION_HOURS = 12;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function signSession(user: SessionUser): Promise<string> {
  return new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_HOURS}h`)
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.userId || !payload.role) return null;
    return {
      userId: String(payload.userId),
      name: String(payload.name ?? ""),
      username: String(payload.username ?? ""),
      role: payload.role as Role,
    };
  } catch {
    return null;
  }
}

/** Ambil sesi dari cookie (server component / route handler) */
export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(ORDER_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(token: string) {
  const store = await cookies();
  store.set(ORDER_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_HOURS * 3600,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(ORDER_COOKIE);
}
