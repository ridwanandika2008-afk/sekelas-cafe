import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE = "skls_session";

const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "dev-secret-ganti-di-produksi"
);

async function getSessionUser(token?: string) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.userId || !payload.role) return null;
    return { role: String(payload.role) };
  } catch {
    return null;
  }
}

function homeFor(role: string) {
  if (role === "ADMIN") return "/admin";
  if (role === "KASIR") return "/kasir";
  if (role === "BARISTA") return "/barista";
  return "/";
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const user = await getSessionUser(req.cookies.get(SESSION_COOKIE)?.value);

  // Sudah login → jangan tampilkan halaman masuk lagi
  if (pathname === "/masuk") {
    if (user) return NextResponse.redirect(new URL(homeFor(user.role), req.url));
    return NextResponse.next();
  }

  const sections: { prefix: string; roles: string[] }[] = [
    { prefix: "/admin", roles: ["ADMIN"] },
    { prefix: "/kasir", roles: ["KASIR", "ADMIN"] },
    { prefix: "/barista", roles: ["BARISTA", "ADMIN"] },
  ];

  const section = sections.find((s) => pathname === s.prefix || pathname.startsWith(`${s.prefix}/`));
  if (!section) return NextResponse.next();

  if (!user) {
    const url = new URL("/masuk", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (!section.roles.includes(user.role)) {
    return NextResponse.redirect(new URL(homeFor(user.role), req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/masuk", "/admin/:path*", "/kasir/:path*", "/barista/:path*"],
};
