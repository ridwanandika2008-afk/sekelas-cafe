/**
 * Inti logika pesanan Sekelas Cafe.
 *
 * Prinsip keamanan:
 * - Harga SELALU dihitung ulang di server dari data DB.
 *   Input client hanya: menuId, qty, optionIds, catatan. (anti-manipulasi harga)
 * - Transisi status divalidasi di server (state machine).
 * - Pembayaran & status pengerjaan terpisah (paymentStatus vs status).
 *
 * State machine pesanan:
 *   NEW --bayar--> QUEUED --item pertama selesai--> PREPARING --semua item selesai + tandai siap--> READY
 *   READY --(antar)--> DELIVERING --diterima--> COMPLETED
 *   READY --(makan/bawa pulang: diserahkan)--> COMPLETED
 *   (semua status kecuali COMPLETED/CANCELLED) --batal--> CANCELLED
 */
import { Prisma } from "@prisma/client";
import { db } from "./db";
import { getSettings } from "./settings";
import { wibOrderKey } from "./format";
import { logActivity, notify } from "./logger";
import type { SessionUser } from "./auth";
import { MAX_ITEMS_PER_ORDER, MAX_QTY_PER_ITEM } from "./constants";

export type FulfillmentInput = "DINE_IN" | "TAKEAWAY" | "DELIVERY";
export type PaymentMethodInput = "CASH" | "QRIS";

export type CartItemInput = {
  menuItemId: string;
  qty: number;
  note?: string;
  optionIds?: string[];
};

export type CreateOrderInput = {
  channel: "ONLINE" | "POS";
  customerName: string;
  fulfillment: FulfillmentInput;
  tableNumber?: string | null;
  deliveryBuilding?: string | null;
  deliveryRoom?: string | null;
  deliveryNote?: string | null;
  note?: string | null;
  items: CartItemInput[];
  promoId?: string | null;
  /** POS: bayar langsung saat transaksi */
  payment?: {
    method: PaymentMethodInput;
    cashReceived?: number | null;
  } | null;
  session?: SessionUser | null;
};

export class OrderError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

/** Nomor pesanan harian: SC-YYMMDD-NNN */
async function nextOrderNumber(tx: Prisma.TransactionClient): Promise<string> {
  const key = wibOrderKey();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const counter = await tx.counter.upsert({
        where: { id: key },
        create: { id: key, seq: 1 },
        update: { seq: { increment: 1 } },
      });
      return `${key}-${String(counter.seq).padStart(3, "0")}`;
    } catch (e) {
      if (attempt === 2) throw e;
      await new Promise((r) => setTimeout(r, 50));
    }
  }
  throw new OrderError("Gagal membuat nomor pesanan, coba lagi.", 500);
}

function randomAccessKey(): string {
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < 6; i++) out += chars[Math.floor(Math.random() * chars.length)];
  return out;
}

/** Validasi & hitung harga item — sumber kebenaran harga adalah DB */
async function computePricedItems(
  tx: Prisma.TransactionClient,
  items: CartItemInput[]
) {
  if (!items.length) throw new OrderError("Keranjang masih kosong.");
  if (items.length > MAX_ITEMS_PER_ORDER)
    throw new OrderError(`Maksimal ${MAX_ITEMS_PER_ORDER} jenis menu per pesanan.`);

  const priced: {
    menuItemId: string;
    nameSnapshot: string;
    basePrice: number;
    unitPrice: number;
    qty: number;
    note: string | null;
    options: { groupId: string; groupName: string; optionId: string; optionName: string; priceDelta: number }[];
    sortOrder: number;
  }[] = [];

  for (let i = 0; i < items.length; i++) {
    const input = items[i];
    const qty = Math.floor(Number(input.qty));
    if (!Number.isFinite(qty) || qty < 1 || qty > MAX_QTY_PER_ITEM)
      throw new OrderError(`Jumlah untuk salah satu menu tidak valid (1–${MAX_QTY_PER_ITEM}).`);

    const menu = await tx.menuItem.findUnique({
      where: { id: input.menuItemId },
      include: { optionGroups: { include: { options: true }, orderBy: { sortOrder: "asc" } } },
    });
    if (!menu || menu.isArchived)
      throw new OrderError(`Menu "${input.menuItemId}" tidak ditemukan.`);
    if (menu.status !== "AVAILABLE")
      throw new OrderError(`Menu "${menu.name}" sedang tidak tersedia.`);

    const selectedIds = new Set(input.optionIds ?? []);
    const chosenOptions: {
      groupId: string;
      groupName: string;
      optionId: string;
      optionName: string;
      priceDelta: number;
    }[] = [];

    for (const group of menu.optionGroups) {
      const selected = group.options.filter((o) => selectedIds.has(o.id));
      if (group.isRequired && selected.length < 1) {
        throw new OrderError(`Pilih "${group.name}" untuk menu ${menu.name}.`);
      }
      if (selected.length > group.maxSelect) {
        throw new OrderError(
          `"${group.name}" untuk ${menu.name} maksimal ${group.maxSelect} pilihan.`
        );
      }
      for (const o of selected) {
        if (!o.isAvailable)
          throw new OrderError(`Pilihan "${o.name}" pada ${menu.name} sedang tidak tersedia.`);
        chosenOptions.push({
          groupId: group.id,
          groupName: group.name,
          optionId: o.id,
          optionName: o.name,
          priceDelta: o.priceDelta,
        });
      }
    }

    const unitPrice = menu.price + chosenOptions.reduce((s, o) => s + o.priceDelta, 0);
    priced.push({
      menuItemId: menu.id,
      nameSnapshot: menu.name,
      basePrice: menu.price,
      unitPrice,
      qty,
      note: (input.note ?? "").toString().trim().slice(0, 200) || null,
      options: chosenOptions,
      sortOrder: i,
    });
  }
  return priced;
}

async function validatePromo(
  tx: Prisma.TransactionClient,
  promoId: string | null | undefined,
  subtotal: number
) {
  if (!promoId) return { promoId: null as string | null, discount: 0 };
  const promo = await tx.promo.findUnique({ where: { id: promoId } });
  const now = new Date();
  if (!promo || !promo.isActive)
    throw new OrderError("Promo tidak ditemukan atau tidak aktif.");
  if (promo.startsAt > now || promo.endsAt < now)
    throw new OrderError("Masa berlaku promo tidak sesuai.");
  if (promo.scope === "MENU")
    throw new OrderError("Promo ini hanya berlaku untuk menu tertentu dan tidak bisa dipilih langsung.");
  if (subtotal < promo.minOrder)
    throw new OrderError(
      `Minimum belanja promo ini ${promo.minOrder.toLocaleString("id-ID")}.`
    );
  const discount =
    promo.type === "PERCENT"
      ? Math.min(Math.round((subtotal * promo.value) / 100), subtotal)
      : Math.min(promo.value, subtotal);
  return { promoId: promo.id, discount };
}

/**
 * Buat pesanan baru (channel ONLINE atau POS).
 * Untuk POS dengan pembayaran langsung, pesanan langsung LUNAS + masuk antrean.
 */
export async function createOrder(input: CreateOrderInput) {
  const settings = await getSettings();

  const customerName = (input.customerName ?? "").trim();
  if (customerName.length < 2 || customerName.length > 60)
    throw new OrderError("Nama pemesan wajib diisi (2–60 karakter).");

  if (input.fulfillment === "DELIVERY") {
    if (!settings.deliveryEnabled)
      throw new OrderError("Layanan antar sedang tidak tersedia.");
    if (!input.deliveryBuilding?.trim())
      throw new OrderError("Isi lokasi pengantaran (gedung/ruang/titik antar).");
  }

  if (input.channel === "POS" && input.payment) {
    if (input.payment.method === "CASH" && !settings.cashEnabled)
      throw new OrderError("Pembayaran tunai dinonaktifkan di pengaturan.");
    if (input.payment.method === "QRIS" && !settings.qrisEnabled)
      throw new OrderError("Pembayaran QRIS dinonaktifkan di pengaturan.");
  }

  const accessKey = randomAccessKey();

  const { order } = await db.$transaction(async (tx) => {
    const priced = await computePricedItems(tx, input.items);
    const subtotal = priced.reduce((s, p) => s + p.unitPrice * p.qty, 0);
    const { promoId, discount } = await validatePromo(tx, input.promoId, subtotal);
    const deliveryFee =
      input.fulfillment === "DELIVERY" && settings.deliveryEnabled ? settings.deliveryFee : 0;
    const total = subtotal - discount + deliveryFee;

    // Kasir POS wajib punya shift terbuka bila ada pembayaran
    let shiftId: string | null = null;
    if (input.channel === "POS" && input.session?.userId) {
      const openShift = await tx.shift.findFirst({
        where: { kasirId: input.session.userId, status: "OPEN" },
      });
      if (!openShift) throw new OrderError("Buka shift kasir terlebih dahulu sebelum transaksi.");
      shiftId = openShift.id;
    }

    const orderNumber = await nextOrderNumber(tx);

    // POS dengan pembayaran langsung
    const payNow = input.channel === "POS" && input.payment ? input.payment : null;
    if (payNow?.method === "CASH") {
      const received = Math.round(Number(payNow.cashReceived ?? 0));
      if (received < total)
        throw new OrderError("Uang yang diterima kurang dari total pembayaran.");
    }

    const order = await tx.order.create({
      data: {
        orderNumber,
        accessKey,
        channel: input.channel,
        customerName,
        fulfillment: input.fulfillment,
        tableNumber: input.tableNumber?.trim().slice(0, 20) || null,
        deliveryBuilding: input.deliveryBuilding?.trim().slice(0, 100) || null,
        deliveryRoom: input.deliveryRoom?.trim().slice(0, 100) || null,
        deliveryNote: input.deliveryNote?.trim().slice(0, 200) || null,
        note: input.note?.trim().slice(0, 200) || null,
        subtotal,
        deliveryFee,
        discount,
        total,
        promoId,
        kasirId: input.session?.userId ?? null,
        shiftId,
        paymentMethod: payNow?.method ?? null,
        paymentStatus: payNow ? "PAID" : "UNPAID",
        status: payNow ? "QUEUED" : "NEW",
        cashReceived:
          payNow?.method === "CASH" ? Math.round(Number(payNow.cashReceived ?? 0)) : null,
        cashChange:
          payNow?.method === "CASH"
            ? Math.round(Number(payNow.cashReceived ?? 0)) - total
            : null,
        paidAt: payNow ? new Date() : null,
        items: {
          create: priced.map((p) => ({
            menuItemId: p.menuItemId,
            nameSnapshot: p.nameSnapshot,
            basePrice: p.basePrice,
            unitPrice: p.unitPrice,
            qty: p.qty,
            note: p.note,
            optionsJson: JSON.stringify(p.options),
            sortOrder: p.sortOrder,
          })),
        },
      },
      include: { items: { orderBy: { sortOrder: "asc" } } },
    });

    if (promoId) {
      await tx.promo.update({ where: { id: promoId }, data: { usageCount: { increment: 1 } } });
    }

    return { order };
  });

  if (input.channel === "ONLINE") {
    await notify({
      roles: ["KASIR", "ADMIN"],
      type: "NEW_ORDER",
      title: "Pesanan online masuk",
      message: `${order.orderNumber} — ${order.customerName} (${order.items.length} jenis menu, total ${order.total.toLocaleString("id-ID")})`,
      orderId: order.id,
    });
    await logActivity({
      session: input.session,
      action: "ORDER_CREATE",
      entity: "Order",
      entityId: order.id,
      detail: { orderNumber: order.orderNumber, total: order.total, channel: "ONLINE" },
    });
  } else {
    await notify({
      roles: ["BARISTA"],
      type: "ORDER_QUEUED",
      title: "Pesanan baru masuk antrean",
      message: `${order.orderNumber} — ${order.customerName}`,
      orderId: order.id,
    });
    await logActivity({
      session: input.session,
      action: "ORDER_POS_CREATE",
      entity: "Order",
      entityId: order.id,
      detail: { orderNumber: order.orderNumber, total: order.total, channel: "POS" },
    });
  }

  return { order, accessKey };
}

/** Kasir menerima pembayaran pesanan (tunai / verifikasi QRIS) */
export async function markOrderPaid(
  orderId: string,
  params: { method: PaymentMethodInput; cashReceived?: number | null },
  session: SessionUser
) {
  return db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order) throw new OrderError("Pesanan tidak ditemukan.", 404);
    if (order.paymentStatus === "PAID") throw new OrderError("Pesanan ini sudah dibayar.");
    if (order.status === "CANCELLED") throw new OrderError("Pesanan sudah dibatalkan.");

    const settings = await getSettings();
    if (params.method === "CASH" && !settings.cashEnabled)
      throw new OrderError("Pembayaran tunai dinonaktifkan.");
    if (params.method === "QRIS" && !settings.qrisEnabled)
      throw new OrderError("Pembayaran QRIS dinonaktifkan.");

    let cashReceived: number | null = null;
    let cashChange: number | null = null;
    if (params.method === "CASH") {
      cashReceived = Math.round(Number(params.cashReceived ?? 0));
      if (cashReceived < order.total)
        throw new OrderError("Uang diterima kurang dari total pembayaran.");
      cashChange = cashReceived - order.total;
    }

    const openShift = await tx.shift.findFirst({
      where: { kasirId: session.userId, status: "OPEN" },
    });
    if (!openShift)
      throw new OrderError("Buka shift kasir terlebih dahulu sebelum menerima pembayaran.");

    const updated = await tx.order.update({
      where: { id: orderId },
      data: {
        paymentMethod: params.method,
        paymentStatus: "PAID",
        status: order.status === "NEW" ? "QUEUED" : order.status,
        cashReceived,
        cashChange,
        kasirId: session.userId,
        shiftId: openShift.id,
        paidAt: new Date(),
      },
    });

    return updated;
  }).then(async (updated) => {
    await notify({
      roles: ["BARISTA"],
      type: "ORDER_QUEUED",
      title: "Pesanan masuk antrean",
      message: `${updated.orderNumber} — ${updated.customerName}`,
      orderId: updated.id,
    });
    await logActivity({
      session,
      action: params.method === "CASH" ? "PAYMENT_CASH" : "PAYMENT_QRIS",
      entity: "Order",
      entityId: updated.id,
      detail: {
        orderNumber: updated.orderNumber,
        total: updated.total,
        cashReceived: params.cashReceived ?? null,
      },
    });
    return updated;
  });
}

/** Barista menandai satu item menu selesai dibuat (lengkap dengan pengurangan stok) */
export async function markItemDone(itemId: string, session: SessionUser) {
  const result = await db.$transaction(async (tx) => {
    const item = await tx.orderItem.findUnique({ where: { id: itemId }, include: { order: true } });
    if (!item) throw new OrderError("Item pesanan tidak ditemukan.", 404);
    if (item.isDone) return item;
    if (!["QUEUED", "PREPARING"].includes(item.order.status))
      throw new OrderError("Pesanan ini tidak sedang dalam pengerjaan.");

    const updated = await tx.orderItem.update({
      where: { id: itemId },
      data: { isDone: true, doneAt: new Date() },
    });

    // Transisi otomatis QUEUED → PREPARING saat item pertama selesai
    if (item.order.status === "QUEUED") {
      await tx.order.update({ where: { id: item.orderId }, data: { status: "PREPARING" } });
    }

    // Pengurangan stok sesuai resep
    const recipe = await tx.menuItemIngredient.findMany({
      where: { menuItemId: item.menuItemId ?? "" },
      include: { ingredient: true },
    });
    for (const r of recipe) {
      const before = r.ingredient.stock;
      const after = before - r.amount * item.qty;
      await tx.ingredient.update({ where: { id: r.ingredientId }, data: { stock: after } });
      await tx.stockMovement.create({
        data: {
          ingredientId: r.ingredientId,
          type: "OUT",
          amount: r.amount * item.qty,
          note: `${item.order.orderNumber} — ${item.nameSnapshot} x${item.qty}`,
          orderId: item.orderId,
          userId: session.userId,
        },
      });
      // Notifikasi bahan hampir habis (sekali saat melewati batas minimum)
      if (before >= r.ingredient.minStock && after < r.ingredient.minStock) {
        await tx.notification.create({
          data: {
            role: "ADMIN",
            type: "LOW_STOCK",
            title: "Bahan hampir habis",
            message: `${r.ingredient.name} tersisa ${after.toFixed(1)} ${r.ingredient.unit} (batas minimum ${r.ingredient.minStock}).`,
          },
        });
      }
    }

    return updated;
  });

  await logActivity({
    session,
    action: "ORDER_ITEM_DONE",
    entity: "OrderItem",
    entityId: itemId,
    detail: { name: result.nameSnapshot },
  });
  return result;
}

/** Barista membatalkan tanda selesai pada item (stok dikembalikan) */
export async function undoItemDone(itemId: string, session: SessionUser) {
  const result = await db.$transaction(async (tx) => {
    const item = await tx.orderItem.findUnique({ where: { id: itemId }, include: { order: true } });
    if (!item) throw new OrderError("Item pesanan tidak ditemukan.", 404);
    if (!item.isDone) return item;
    if (item.order.status === "READY")
      throw new OrderError("Pesanan sudah siap — tidak bisa mengubah item.");

    const updated = await tx.orderItem.update({
      where: { id: itemId },
      data: { isDone: false, doneAt: null },
    });

    // Kembalikan stok
    const recipe = await tx.menuItemIngredient.findMany({
      where: { menuItemId: item.menuItemId ?? "" },
    });
    for (const r of recipe) {
      await tx.ingredient.update({
        where: { id: r.ingredientId },
        data: { stock: { increment: r.amount * item.qty } },
      });
      await tx.stockMovement.create({
        data: {
          ingredientId: r.ingredientId,
          type: "IN",
          amount: r.amount * item.qty,
          note: `Pembatalan item ${item.order.orderNumber} — ${item.nameSnapshot}`,
          orderId: item.orderId,
          userId: session.userId,
        },
      });
    }
    return updated;
  });

  await logActivity({
    session,
    action: "ORDER_ITEM_UNDO",
    entity: "OrderItem",
    entityId: itemId,
    detail: { name: result.nameSnapshot },
  });
  return result;
}

/** Barista menandai pesanan SIAP — hanya boleh bila SEMUA item selesai */
export async function markOrderReady(orderId: string, session: SessionUser) {
  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o) throw new OrderError("Pesanan tidak ditemukan.", 404);
    if (o.status !== "PREPARING")
      throw new OrderError("Hanya pesanan berstatus 'Sedang Dibuat' yang bisa ditandai siap.");
    const undone = o.items.filter((i) => !i.isDone).length;
    if (undone > 0)
      throw new OrderError(
        `Masih ada ${undone} menu yang belum selesai dibuat. Selesaikan semua menu dulu.`
      );
    return tx.order.update({ where: { id: orderId }, data: { status: "READY" } });
  });

  await notify({
    roles: ["KASIR", "ADMIN"],
    type: "ORDER_READY",
    title: "Pesanan siap",
    message: `${order.orderNumber} (${order.customerName}) selesai dibuat — ${
      order.fulfillment === "DELIVERY" ? "siap diantar" : "menunggu diambil pembeli"
    }.`,
    orderId: order.id,
  });
  await logActivity({
    session,
    action: "ORDER_READY",
    entity: "Order",
    entityId: order.id,
    detail: { orderNumber: order.orderNumber },
  });
  return order;
}

/** Serahkan pesanan (makan di tempat / bawa pulang) → selesai */
export async function completeOrder(orderId: string, session: SessionUser) {
  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) throw new OrderError("Pesanan tidak ditemukan.", 404);
    if (o.status !== "READY")
      throw new OrderError("Pesanan belum siap atau sudah diselesaikan.");
    return tx.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  });
  await logActivity({
    session,
    action: "ORDER_COMPLETED",
    entity: "Order",
    entityId: order.id,
    detail: { orderNumber: order.orderNumber },
  });
  return order;
}

/** Pesanan antar: mulai & selesai pengantaran */
export async function startDelivery(orderId: string, session: SessionUser) {
  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) throw new OrderError("Pesanan tidak ditemukan.", 404);
    if (o.fulfillment !== "DELIVERY")
      throw new OrderError("Hanya pesanan antar yang punya status pengantaran.");
    if (o.status !== "READY")
      throw new OrderError("Pesanan harus siap dulu sebelum diantar.");
    return tx.order.update({ where: { id: orderId }, data: { status: "DELIVERING" } });
  });
  await notify({
    roles: ["ADMIN"],
    type: "DELIVERY_UPDATE",
    title: "Pesanan diantar",
    message: `${order.orderNumber} sedang diantar ke ${order.deliveryBuilding ?? "-"} ${order.deliveryRoom ?? ""}`.trim(),
    orderId: order.id,
  });
  await logActivity({
    session,
    action: "ORDER_DELIVERING",
    entity: "Order",
    entityId: order.id,
    detail: { orderNumber: order.orderNumber },
  });
  return order;
}

export async function completeDelivery(orderId: string, session: SessionUser) {
  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId } });
    if (!o) throw new OrderError("Pesanan tidak ditemukan.", 404);
    if (o.status !== "DELIVERING")
      throw new OrderError("Pesanan sedang tidak dalam pengantaran.");
    return tx.order.update({
      where: { id: orderId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  });
  await logActivity({
    session,
    action: "ORDER_COMPLETED",
    entity: "Order",
    entityId: order.id,
    detail: { orderNumber: order.orderNumber, via: "delivery" },
  });
  return order;
}

/** Batalkan pesanan (kasir/admin) dengan alasan */
export async function cancelOrder(orderId: string, reason: string, session: SessionUser) {
  const order = await db.$transaction(async (tx) => {
    const o = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!o) throw new OrderError("Pesanan tidak ditemukan.", 404);
    if (["COMPLETED", "CANCELLED"].includes(o.status))
      throw new OrderError("Pesanan sudah selesai/dibatalkan.");
    const trimmed = reason.trim();
    if (trimmed.length < 3) throw new OrderError("Isi alasan pembatalan (min. 3 karakter).");
    return tx.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED", cancelledAt: new Date(), cancelReason: trimmed.slice(0, 200) },
    });
  });
  await notify({
    roles: ["KASIR", "ADMIN", "BARISTA"],
    type: "ORDER_CANCELLED",
    title: "Pesanan dibatalkan",
    message: `${order.orderNumber} dibatalkan oleh ${session.name}: ${reason.trim().slice(0, 120)}`,
    orderId: order.id,
  });
  await logActivity({
    session,
    action: "ORDER_CANCELLED",
    entity: "Order",
    entityId: order.id,
    detail: { orderNumber: order.orderNumber, reason: reason.trim() },
  });
  return order;
}
