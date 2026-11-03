/**
 * Pencatatan aktivitas (audit trail) & notifikasi internal.
 */
import { db } from "./db";
import type { SessionUser } from "./auth";
import type { Role } from "./constants";

export type ActivityAction =
  | "LOGIN"
  | "LOGOUT"
  | "ORDER_CREATE"
  | "ORDER_POS_CREATE"
  | "PAYMENT_CASH"
  | "PAYMENT_QRIS"
  | "PAYMENT_VERIFY"
  | "ORDER_ITEM_DONE"
  | "ORDER_ITEM_UNDO"
  | "ORDER_READY"
  | "ORDER_DELIVERING"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED"
  | "MENU_CREATE"
  | "MENU_UPDATE"
  | "MENU_DELETE"
  | "CATEGORY_CREATE"
  | "CATEGORY_UPDATE"
  | "CATEGORY_DELETE"
  | "USER_CREATE"
  | "USER_UPDATE"
  | "USER_DELETE"
  | "SETTINGS_UPDATE"
  | "PROMO_CREATE"
  | "PROMO_UPDATE"
  | "PROMO_DELETE"
  | "STOCK_ADJUST"
  | "RECIPE_UPDATE"
  | "SHIFT_OPEN"
  | "SHIFT_CLOSE"
  | "SHIFT_EXPENSE"
  | "DATA_IMPORT"
  | "DATA_EXPORT"
  | string;

export async function logActivity(input: {
  session?: SessionUser | null;
  action: ActivityAction;
  entity?: string;
  entityId?: string;
  detail?: unknown;
}) {
  try {
    await db.activityLog.create({
      data: {
        userId: input.session?.userId ?? null,
        actorName: input.session?.name ?? "Sistem",
        role: input.session?.role ?? null,
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        detail: input.detail ? JSON.stringify(input.detail) : null,
      },
    });
  } catch (e) {
    // Audit tidak boleh memblokir transaksi utama — catat ke log server.
    console.error("[logActivity] gagal:", e);
  }
}

export type NotificationType =
  | "NEW_ORDER"
  | "PAYMENT_CONFIRMED"
  | "ORDER_QUEUED"
  | "ORDER_READY"
  | "ORDER_CANCELLED"
  | "DELIVERY_UPDATE"
  | "LOW_STOCK"
  | "SHIFT";

/** Kirim notifikasi ke satu/lebih role (broadcast) atau user tertentu */
export async function notify(input: {
  roles?: Role[];
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  orderId?: string;
}) {
  try {
    await db.notification.createMany({
      data: (input.roles ?? []).map((role) => ({
        role,
        type: input.type,
        title: input.title,
        message: input.message,
        orderId: input.orderId ?? null,
      })),
    });
    if (input.userId) {
      await db.notification.create({
        data: {
          userId: input.userId,
          type: input.type,
          title: input.title,
          message: input.message,
          orderId: input.orderId ?? null,
        },
      });
    }
  } catch (e) {
    console.error("[notify] gagal:", e);
  }
}
