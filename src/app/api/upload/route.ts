import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-guard";

/**
 * Upload gambar (foto menu / QRIS) ke Supabase Storage bucket "uploads".
 * Body: multipart/form-data dengan field "file" (jpg/png/webp, maks 2MB).
 * Return URL publik CDN Supabase.
 */
export async function POST(req: NextRequest) {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "File tidak ditemukan." }, { status: 400 });
    }
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      return NextResponse.json(
        { error: "Format harus JPG, PNG, atau WebP." },
        { status: 400 }
      );
    }
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json({ error: "Ukuran maksimal 2MB." }, { status: 400 });
    }

    const ref = process.env.SUPABASE_PROJECT_REF!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `uploads/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const up = await fetch(`https://${ref}.supabase.co/storage/v1/object/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: file,
    });
    if (!up.ok) {
      console.error("[upload] supabase:", await up.text());
      return NextResponse.json({ error: "Gagal mengunggah ke storage." }, { status: 502 });
    }

    return NextResponse.json({
      url: `https://${ref}.supabase.co/storage/v1/object/public/${path}`,
    });
  } catch (e) {
    console.error("[upload]", e);
    return NextResponse.json({ error: "Gagal mengunggah file." }, { status: 500 });
  }
}
