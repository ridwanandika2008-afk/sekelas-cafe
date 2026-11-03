import { NextRequest, NextResponse } from "next/server";
import { createOrder, OrderError } from "@/lib/order-service";
import { getCafeStatus } from "@/lib/settings";

export const dynamic = "force-dynamic";

/** Rate limit sederhana in-memory: maks 8 pesanan / 5 menit / IP */
const RATE_LIMIT = 8;
const RATE_WINDOW_MS = 5 * 60 * 1000;
const hits = new Map<string, number[]>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const list = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (list.length >= RATE_LIMIT) {
    hits.set(ip, list);
    return true;
  }
  list.push(now);
  hits.set(ip, list);
  return false;
}

/** Buat pesanan online (tanpa akun — checkout tamu) */
export async function POST(req: NextRequest) {
  try {
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";
    if (rateLimited(ip)) {
      return NextResponse.json(
        { error: "Terlalu banyak pesanan dari perangkat ini. Tunggu beberapa menit ya." },
        { status: 429 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) return NextResponse.json({ error: "Data pesanan tidak valid." }, { status: 400 });

    // Pesanan online wajib mengikuti jam operasional
    const status = await getCafeStatus();
    if (!status.isOpen) {
      return NextResponse.json(
        { error: `Kafe sedang tidak menerima pesanan. ${status.message}` },
        { status: 423 }
      );
    }

    const result = await createOrder({
      channel: "ONLINE",
      customerName: String(body.customerName ?? ""),
      fulfillment: body.fulfillment,
      tableNumber: body.tableNumber ?? null,
      deliveryBuilding: body.deliveryBuilding ?? null,
      deliveryRoom: body.deliveryRoom ?? null,
      deliveryNote: body.deliveryNote ?? null,
      note: body.note ?? null,
      items: Array.isArray(body.items) ? body.items : [],
      promoId: body.promoId ?? null,
      session: null,
    });

    return NextResponse.json({
      orderNumber: result.order.orderNumber,
      accessKey: result.accessKey,
      total: result.order.total,
    });
  } catch (e) {
    if (e instanceof OrderError) {
      return NextResponse.json({ error: e.message }, { status: e.status });
    }
    console.error("[public-order]", e);
    return NextResponse.json({ error: "Gagal membuat pesanan. Coba lagi." }, { status: 500 });
  }
}
