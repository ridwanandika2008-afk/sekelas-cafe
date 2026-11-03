import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { signSession, setSessionCookie, verifyPassword } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const username = String(body?.username ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    if (!username || !password) {
      return NextResponse.json({ error: "Isi username dan kata sandi." }, { status: 400 });
    }

    const user = await db.user.findUnique({ where: { username } });
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Username atau kata sandi salah." }, { status: 401 });
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json({ error: "Username atau kata sandi salah." }, { status: 401 });
    }

    const sessionUser = {
      userId: user.id,
      name: user.name,
      username: user.username,
      role: user.role as "ADMIN" | "KASIR" | "BARISTA",
    };
    const token = await signSession(sessionUser);
    await setSessionCookie(token);

    await logActivity({
      session: sessionUser,
      action: "LOGIN",
      entity: "User",
      entityId: user.id,
    });

    return NextResponse.json({
      user: sessionUser,
      redirect: sessionUser.role === "ADMIN" ? "/admin" : `/${sessionUser.role.toLowerCase()}`,
    });
  } catch (e) {
    console.error("[login]", e);
    return NextResponse.json({ error: "Terjadi kesalahan server." }, { status: 500 });
  }
}
