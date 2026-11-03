import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { hashPassword } from "@/lib/auth";
import { logActivity } from "@/lib/logger";
import { ROLES } from "@/lib/constants";

/**
 * PATCH /api/admin/pengguna/[id] — ubah profil/role/status/reset sandi.
 *  - Tidak boleh menonaktifkan / menurunkan role diri sendiri.
 *  - Tidak boleh menonaktifkan / menurunkan admin aktif terakhir.
 * DELETE /api/admin/pengguna/[id] — hanya bila tanpa riwayat shift/aktivitas.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  try {
    const existing = await db.user.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }

    const data: Record<string, unknown> = {};
    const perubahan: string[] = [];

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      if (!name) return NextResponse.json({ error: "Nama wajib diisi." }, { status: 400 });
      if (name.length > 60) {
        return NextResponse.json({ error: "Nama maksimal 60 karakter." }, { status: 400 });
      }
      data.name = name;
      perubahan.push("nama");
    }

    if (body.username !== undefined) {
      const username = String(body.username).trim().toLowerCase();
      if (!/^[a-z0-9._]+$/.test(username)) {
        return NextResponse.json(
          { error: "Username hanya boleh huruf kecil, angka, titik, dan underscore." },
          { status: 400 }
        );
      }
      const duplikat = await db.user.count({
        where: { username, id: { not: id } },
      });
      if (duplikat > 0) {
        return NextResponse.json({ error: `Username "${username}" sudah dipakai.` }, { status: 400 });
      }
      data.username = username;
      perubahan.push("username");
    }

    if (body.role !== undefined) {
      const role = String(body.role);
      if (!ROLES.includes(role as (typeof ROLES)[number])) {
        return NextResponse.json({ error: "Role tidak valid." }, { status: 400 });
      }
      // Cegah menurunkan admin aktif terakhir (termasuk diri sendiri)
      if (existing.role === "ADMIN" && role !== "ADMIN" && existing.isActive) {
        const adminLain = await db.user.count({
          where: { role: "ADMIN", isActive: true, id: { not: id } },
        });
        if (adminLain === 0) {
          return NextResponse.json(
            { error: "Tidak bisa menurunkan role admin aktif terakhir." },
            { status: 400 }
          );
        }
      }
      data.role = role;
      perubahan.push("role");
    }

    if (body.isActive !== undefined) {
      const isActive = Boolean(body.isActive);
      if (existing.id === session.userId && !isActive) {
        return NextResponse.json(
          { error: "Anda tidak bisa menonaktifkan akun sendiri." },
          { status: 400 }
        );
      }
      if (!isActive && existing.role === "ADMIN" && existing.isActive) {
        const adminLain = await db.user.count({
          where: { role: "ADMIN", isActive: true, id: { not: id } },
        });
        if (adminLain === 0) {
          return NextResponse.json(
            { error: "Tidak bisa menonaktifkan admin aktif terakhir." },
            { status: 400 }
          );
        }
      }
      data.isActive = isActive;
      perubahan.push(isActive ? "aktifkan" : "nonaktifkan");
    }

    if (body.password !== undefined && body.password !== "") {
      const password = String(body.password);
      if (password.length < 8) {
        return NextResponse.json({ error: "Kata sandi minimal 8 karakter." }, { status: 400 });
      }
      data.passwordHash = await hashPassword(password);
      perubahan.push("reset kata sandi");
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan untuk disimpan." }, { status: 400 });
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: { id: true, name: true, username: true, role: true, isActive: true, createdAt: true },
    });

    await logActivity({
      session,
      action: "USER_UPDATE",
      entity: "User",
      entityId: id,
      detail: { name: user.name, username: user.username, role: user.role, perubahan },
    });

    return NextResponse.json({ user });
  } catch (e) {
    console.error("[admin/pengguna PATCH]", e);
    return NextResponse.json({ error: "Gagal memperbarui pengguna." }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const { id } = await params;

  try {
    const existing = await db.user.findUnique({
      where: { id },
      include: { _count: { select: { shifts: true, activities: true } } },
    });
    if (!existing) {
      return NextResponse.json({ error: "Pengguna tidak ditemukan." }, { status: 404 });
    }
    if (existing.id === session.userId) {
      return NextResponse.json(
        { error: "Anda tidak bisa menghapus akun sendiri." },
        { status: 400 }
      );
    }
    if (existing.role === "ADMIN" && existing.isActive) {
      const adminLain = await db.user.count({
        where: { role: "ADMIN", isActive: true, id: { not: id } },
      });
      if (adminLain === 0) {
        return NextResponse.json(
          { error: "Tidak bisa menghapus admin aktif terakhir." },
          { status: 400 }
        );
      }
    }
    if (existing._count.shifts > 0 || existing._count.activities > 0) {
      return NextResponse.json(
        {
          error:
            "Pengguna masih memiliki riwayat shift/aktivitas — cukup nonaktifkan agar jejak audit tetap utuh.",
        },
        { status: 400 }
      );
    }

    await db.user.delete({ where: { id } });
    await logActivity({
      session,
      action: "USER_DELETE",
      entity: "User",
      entityId: id,
      detail: { name: existing.name, username: existing.username, role: existing.role },
    });

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[admin/pengguna DELETE]", e);
    return NextResponse.json({ error: "Gagal menghapus pengguna." }, { status: 500 });
  }
}
