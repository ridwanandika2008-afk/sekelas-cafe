import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/logger";
import { ROLES } from "@/lib/constants";

/**
 * GET /api/admin/pengguna — semua user (tanpa passwordHash).
 * POST /api/admin/pengguna — buat user baru (password di-hash bcrypt).
 */
export async function GET() {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        name: true,
        username: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
    return NextResponse.json({ users });
  } catch (e) {
    console.error("[admin/pengguna GET]", e);
    return NextResponse.json({ error: "Gagal memuat pengguna." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const name = String(body.name ?? "").trim();
  const username = String(body.username ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const role = String(body.role ?? "");

  if (!name) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
  if (name.length > 60) {
    return NextResponse.json({ error: "Nama maksimal 60 karakter." }, { status: 400 });
  }
  if (!/^[a-z0-9._]+$/.test(username)) {
    return NextResponse.json(
      { error: "Username hanya boleh huruf kecil, angka, titik, dan underscore." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Kata sandi minimal 8 karakter." },
      { status: 400 }
    );
  }
  if (!ROLES.includes(role as (typeof ROLES)[number])) {
    return NextResponse.json({ error: "Role tidak valid." }, { status: 400 });
  }

  try {
    const duplikat = await db.user.count({ where: { username } });
    if (duplikat > 0) {
      return NextResponse.json({ error: `Username "${username}" sudah dipakai.` }, { status: 400 });
    }

    const user = await db.user.create({
      data: { name, username, role, passwordHash: await hashPassword(password) },
      select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true },
    });

    await logActivity({
      session,
      action: "USER_CREATE",
      entity: "User",
      entityId: user.id,
      detail: { name, username, role },
    });

    return NextResponse.json({ user }, { status: 201 });
  } catch (e) {
    console.error("[admin/pengguna POST]", e);
    return NextResponse.json({ error: "Gagal membuat pengguna." }, { status: 500 });
  }
}
