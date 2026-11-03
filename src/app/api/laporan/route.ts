import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-guard";
import { computeLaporan, parseRange } from "./helpers";

export const dynamic = "force-dynamic";

/**
 * GET /api/laporan?dari=YYYY-MM-DD&sampai=YYYY-MM-DD
 * Rentang WIB (wibDayStartFromKey(dari) s/d wibDayStartFromKey(sampai)+24 jam).
 * Transaksi valid = paymentStatus "PAID" dan status ≠ "CANCELLED".
 */
export async function GET(req: NextRequest) {
  const { error } = await requireApiRole(["ADMIN"]);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const range = parseRange(sp.get("dari"), sp.get("sampai"));
  if ("error" in range) {
    return NextResponse.json({ error: range.error }, { status: 400 });
  }

  try {
    const data = await computeLaporan(range.dari, range.sampai);
    return NextResponse.json(data);
  } catch (e) {
    console.error("[api/laporan]", e);
    return NextResponse.json(
      { error: "Gagal memuat laporan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
