import { NextResponse } from "next/server";
import { clearSessionCookie, getSession } from "@/lib/auth";
import { logActivity } from "@/lib/logger";

export async function POST() {
  const session = await getSession();
  if (session) {
    await logActivity({ session, action: "LOGOUT", entity: "User", entityId: session.userId });
  }
  await clearSessionCookie();
  return NextResponse.json({ ok: true });
}
