import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireApiRole } from "@/lib/api-guard";
import { logActivity } from "@/lib/logger";
import { getSettings, getSchedules, invalidateSettingsCache } from "@/lib/settings";

/**
 * GET /api/admin/pengaturan — ambil settings + jadwal 7 hari.
 * PUT /api/admin/pengaturan — update parsial field settings (upsert singleton),
 *   lalu INVALIDATE cache agar /api/public/cafe langsung segar.
 */
export async function GET() {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  try {
    const [settings, schedules] = await Promise.all([getSettings(), getSchedules()]);
    return NextResponse.json({ settings, schedules });
  } catch (e) {
    console.error("[admin/pengaturan GET]", e);
    return NextResponse.json({ error: "Gagal memuat pengaturan." }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const { session, error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Data tidak valid." }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  const perubahan: string[] = [];

  const str = (v: unknown): string | null => {
    const s = String(v ?? "").trim();
    return s === "" ? null : s;
  };

  try {
    if (body.cafeName !== undefined) {
      const v = str(body.cafeName);
      if (!v) return NextResponse.json({ error: "Nama kafe wajib diisi." }, { status: 400 });
      if (v.length > 60) {
        return NextResponse.json({ error: "Nama kafe maksimal 60 karakter." }, { status: 400 });
      }
      data.cafeName = v;
      perubahan.push("nama kafe");
    }
    if (body.address !== undefined) {
      data.address = str(body.address) ?? "";
      perubahan.push("alamat");
    }
    if (body.whatsapp !== undefined) {
      data.whatsapp = str(body.whatsapp) ?? "";
      perubahan.push("whatsapp");
    }
    if (body.heroHeadline !== undefined) {
      data.heroHeadline = str(body.heroHeadline) ?? "";
      perubahan.push("headline");
    }
    if (body.heroSubheadline !== undefined) {
      data.heroSubheadline = str(body.heroSubheadline) ?? "";
      perubahan.push("subheadline");
    }
    if (body.aboutText !== undefined) {
      data.aboutText = str(body.aboutText);
      perubahan.push("teks tentang");
    }
    if (body.mapQuery !== undefined) {
      data.mapQuery = str(body.mapQuery) ?? "";
      perubahan.push("peta");
    }
    if (body.deliveryFee !== undefined) {
      const fee = Number(body.deliveryFee);
      if (!Number.isFinite(fee) || fee < 0) {
        return NextResponse.json({ error: "Biaya antar harus angka ≥ 0." }, { status: 400 });
      }
      data.deliveryFee = Math.round(fee);
      perubahan.push("biaya antar");
    }
    if (body.deliveryEnabled !== undefined) {
      data.deliveryEnabled = Boolean(body.deliveryEnabled);
      perubahan.push("pengantaran");
    }
    if (body.qrisImageUrl !== undefined) {
      data.qrisImageUrl = str(body.qrisImageUrl);
      perubahan.push("gambar QRIS");
    }
    if (body.qrisEnabled !== undefined) {
      data.qrisEnabled = Boolean(body.qrisEnabled);
      perubahan.push("QRIS");
    }
    if (body.cashEnabled !== undefined) {
      data.cashEnabled = Boolean(body.cashEnabled);
      perubahan.push("tunai");
    }
    if (body.receiptFooter !== undefined) {
      const v = str(body.receiptFooter) ?? "";
      if (v.length > 200) {
        return NextResponse.json({ error: "Footer struk maksimal 200 karakter." }, { status: 400 });
      }
      data.receiptFooter = v;
      perubahan.push("footer struk");
    }
    if (body.temporarilyClosed !== undefined) {
      data.temporarilyClosed = Boolean(body.temporarilyClosed);
      perubahan.push(body.temporarilyClosed ? "tutup sementara ON" : "tutup sementara OFF");
    }
    if (body.closedMessage !== undefined) {
      data.closedMessage = str(body.closedMessage) ?? "";
      perubahan.push("pesan tutup");
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "Tidak ada perubahan untuk disimpan." }, { status: 400 });
    }

    const settings = await db.setting.upsert({
      where: { id: "singleton" },
      update: data,
      create: { id: "singleton", ...data },
    });

    invalidateSettingsCache();

    await logActivity({
      session,
      action: "SETTINGS_UPDATE",
      entity: "Setting",
      entityId: "singleton",
      detail: { perubahan },
    });

    return NextResponse.json({
      settings: {
        cafeName: settings.cafeName,
        address: settings.address,
        whatsapp: settings.whatsapp,
        heroHeadline: settings.heroHeadline,
        heroSubheadline: settings.heroSubheadline,
        heroImageUrl: settings.heroImageUrl,
        aboutText: settings.aboutText,
        deliveryFee: settings.deliveryFee,
        deliveryEnabled: settings.deliveryEnabled,
        qrisImageUrl: settings.qrisImageUrl,
        qrisEnabled: settings.qrisEnabled,
        cashEnabled: settings.cashEnabled,
        receiptFooter: settings.receiptFooter,
        temporarilyClosed: settings.temporarilyClosed,
        closedMessage: settings.closedMessage,
        mapQuery: settings.mapQuery,
      },
    });
  } catch (e) {
    console.error("[admin/pengaturan PUT]", e);
    return NextResponse.json({ error: "Gagal menyimpan pengaturan." }, { status: 500 });
  }
}
