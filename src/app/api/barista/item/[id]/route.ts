import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api-guard";
import { markItemDone, undoItemDone, OrderError } from "@/lib/order-service";

/**
 * Checklist item barista.
 * body: { action: "selesai" | "batal" }
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { session, error } = await requireApiRole(["BARISTA", "ADMIN"]);
  if (error) return error;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  try {
    if (body?.action === "batal") {
      const item = await undoItemDone(id, session);
      return NextResponse.json({ item: { id: item.id, isDone: item.isDone } });
    }
    const item = await markItemDone(id, session);
    return NextResponse.json({ item: { id: item.id, isDone: item.isDone } });
  } catch (e) {
    if (e instanceof OrderError)
      return NextResponse.json({ error: e.message }, { status: e.status });
    console.error("[barista-item]", e);
    return NextResponse.json({ error: "Gagal memperbarui item." }, { status: 500 });
  }
}
