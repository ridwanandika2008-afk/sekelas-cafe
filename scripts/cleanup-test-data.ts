/**
 * Pembersihan data uji sebelum rilis production.
 * Hanya menghapus data transaksi hasil pengujian development
 * (pesanan, shift, pergerakan stok, notifikasi, log aktivitas)
 * dan mereset stok/promo/counter ke kondisi seed.
 * Data master (user, menu, kategori, bahan, promo, pengaturan) TIDAK dihapus.
 */
import { db } from "@/lib/db";

const hasil = await db.$transaction(async (tx) => {
  const orders = await tx.order.findMany({ select: { id: true } });
  const orderIds = orders.map((o) => o.id);

  const items = await tx.orderItem.deleteMany({ where: { orderId: { in: orderIds } } });
  const notif = await tx.notification.deleteMany({});
  const logs = await tx.activityLog.deleteMany({});
  const movements = await tx.stockMovement.deleteMany({});
  const expenses = await tx.shiftExpense.deleteMany({});
  const shifts = await tx.shift.deleteMany({});
  const ordersDel = await tx.order.deleteMany({});

  const counters = await tx.counter.deleteMany({});

  await tx.promo.updateMany({ data: { usageCount: 0 } });

  const seedStock: Record<string, number> = {
    "Biji Kopi Arabika": 2000, "Susu UHT": 8000, "Sirup Gula Aren": 2000,
    "Teh Tubruk": 150, "Bubuk Matcha": 500, "Bubuk Cokelat": 800,
    "Jeruk Peras": 80, "Roti Tawar": 100, "Pisang": 90,
    "Kentang Beku": 3000, "Mie Instan": 60, "Gula Pasir": 3000,
  };
  for (const [name, stock] of Object.entries(seedStock)) {
    await tx.ingredient.update({ where: { name }, data: { stock } });
  }

  return { ordersDel: ordersDel.count, items: items.count, notif: notif.count,
           logs: logs.count, movements: movements.count, expenses: expenses.count,
           shifts: shifts.count, counters: counters.count };
});

console.log("✓ Pembersihan data uji selesai:", JSON.stringify(hasil));

const sisa = {
  orders: await db.order.count(),
  shifts: await db.shift.count(),
  movements: await db.stockMovement.count(),
  notif: await db.notification.count(),
  logs: await db.activityLog.count(),
  users: await db.user.count(),
  menu: await db.menuItem.count(),
  bahan: await db.ingredient.count(),
};
console.log("✓ Sisa data:", JSON.stringify(sisa));
await db.$disconnect();
