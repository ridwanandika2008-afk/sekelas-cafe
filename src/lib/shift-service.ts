/**
 * Manajemen shift kasir & pertanggungjawaban kas.
 * Alur sederhana: buka shift (saldo awal) → transaksi → tutup shift
 * (hitung total tunai/QRIS, expected kas, selisih).
 */
import { db } from "./db";
import { logActivity, notify } from "./logger";
import type { SessionUser } from "./auth";

export class ShiftError extends Error {
  status: number;
  constructor(message: string, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function getOpenShift(kasirId: string) {
  return db.shift.findFirst({
    where: { kasirId, status: "OPEN" },
    include: { expenses: true, kasir: { select: { name: true } } },
  });
}

export async function openShift(
  kasirId: string,
  openingCash: number,
  session: SessionUser
) {
  const existing = await getOpenShift(kasirId);
  if (existing) throw new ShiftError("Masih ada shift yang terbuka. Tutup dulu shift sebelumnya.");
  const cash = Math.round(Number(openingCash));
  if (!Number.isFinite(cash) || cash < 0) throw new ShiftError("Saldo awal kas tidak valid.");

  const shift = await db.shift.create({ data: { kasirId, openingCash: cash } });
  await logActivity({
    session,
    action: "SHIFT_OPEN",
    entity: "Shift",
    entityId: shift.id,
    detail: { openingCash: cash },
  });
  return shift;
}

export async function addShiftExpense(
  shiftId: string,
  amount: number,
  note: string,
  session: SessionUser
) {
  const shift = await db.shift.findUnique({ where: { id: shiftId } });
  if (!shift) throw new ShiftError("Shift tidak ditemukan.", 404);
  if (shift.status !== "OPEN") throw new ShiftError("Shift sudah ditutup.");
  const amt = Math.round(Number(amount));
  if (!Number.isFinite(amt) || amt <= 0) throw new ShiftError("Nominal pengeluaran tidak valid.");
  if (note.trim().length < 3) throw new ShiftError("Isi keterangan pengeluaran.");

  const expense = await db.shiftExpense.create({
    data: { shiftId, amount: amt, note: note.trim().slice(0, 200) },
  });
  await logActivity({
    session,
    action: "SHIFT_EXPENSE",
    entity: "Shift",
    entityId: shiftId,
    detail: { amount: amt, note: note.trim() },
  });
  return expense;
}

export async function closeShift(
  shiftId: string,
  closingCash: number,
  session: SessionUser
) {
  const result = await db.$transaction(async (tx) => {
    const shift = await tx.shift.findUnique({
      where: { id: shiftId },
      include: { expenses: true, orders: { where: { paymentStatus: "PAID" } } },
    });
    if (!shift) throw new ShiftError("Shift tidak ditemukan.", 404);
    if (shift.status !== "OPEN") throw new ShiftError("Shift sudah ditutup.");

    const closing = Math.round(Number(closingCash));
    if (!Number.isFinite(closing) || closing < 0)
      throw new ShiftError("Saldo akhir kas tidak valid.");

    const cashTotal = shift.orders
      .filter((o) => o.paymentMethod === "CASH" && o.status !== "CANCELLED")
      .reduce((s, o) => s + o.total, 0);
    const qrisTotal = shift.orders
      .filter((o) => o.paymentMethod === "QRIS" && o.status !== "CANCELLED")
      .reduce((s, o) => s + o.total, 0);
    const expenseTotal = shift.expenses.reduce((s, e) => s + e.amount, 0);
    const expectedCash = shift.openingCash + cashTotal - expenseTotal;
    const variance = closing - expectedCash;

    return tx.shift.update({
      where: { id: shiftId },
      data: {
        status: "CLOSED",
        closedAt: new Date(),
        closingCash: closing,
        cashTotal,
        qrisTotal,
        expenseTotal,
        expectedCash,
        variance,
      },
    });
  });

  await notify({
    roles: ["ADMIN"],
    type: "SHIFT",
    title: "Shift ditutup",
    message: `${session.name} menutup shift. Selisih kas: Rp${(result.variance ?? 0).toLocaleString("id-ID")}.`,
  });
  await logActivity({
    session,
    action: "SHIFT_CLOSE",
    entity: "Shift",
    entityId: shiftId,
    detail: {
      cashTotal: result.cashTotal,
      qrisTotal: result.qrisTotal,
      expectedCash: result.expectedCash,
      variance: result.variance,
    },
  });
  return result;
}
