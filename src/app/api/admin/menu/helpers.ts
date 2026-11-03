/**
 * Validasi & parser bersama untuk API admin menu.
 * Bukan route — hanya modul bantu (tidak membuat endpoint).
 */

export const MENU_STATUSES = ["AVAILABLE", "SOLD_OUT", "PAUSED", "INACTIVE"] as const;
export type MenuStatusValue = (typeof MENU_STATUSES)[number];

export type OptionInput = {
  name: string;
  priceDelta: number;
  isAvailable: boolean;
};

export type OptionGroupInput = {
  name: string;
  isRequired: boolean;
  maxSelect: number;
  options: OptionInput[];
};

function toInt(v: unknown): number | null {
  if (typeof v === "number" && Number.isInteger(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isInteger(Number(v))) return Number(v);
  return null;
}

/** Validasi struktur grup opsi: name wajib, maxSelect 1–5, opsi name wajib & priceDelta ≥ 0 */
export function parseOptionGroups(raw: unknown): { groups: OptionGroupInput[] } | { error: string } {
  if (raw === undefined || raw === null) return { groups: [] };
  if (!Array.isArray(raw)) return { error: "Struktur grup opsi tidak valid." };
  const groups: OptionGroupInput[] = [];
  for (let gi = 0; gi < raw.length; gi++) {
    const g = raw[gi] as Record<string, unknown>;
    if (!g || typeof g !== "object") return { error: "Struktur grup opsi tidak valid." };
    const name = String(g.name ?? "").trim();
    if (!name) return { error: `Grup opsi ke-${gi + 1}: nama wajib diisi.` };
    const maxSelect = toInt(g.maxSelect);
    if (maxSelect === null || maxSelect < 1 || maxSelect > 5) {
      return { error: `Grup opsi "${name}": maksimal pilih harus angka 1–5.` };
    }
    const rawOptions = g.options;
    if (!Array.isArray(rawOptions) || rawOptions.length === 0) {
      return { error: `Grup opsi "${name}": minimal harus ada 1 opsi.` };
    }
    const options: OptionInput[] = [];
    for (let oi = 0; oi < rawOptions.length; oi++) {
      const o = rawOptions[oi] as Record<string, unknown>;
      if (!o || typeof o !== "object") return { error: `Struktur opsi di grup "${name}" tidak valid.` };
      const optName = String(o.name ?? "").trim();
      if (!optName) return { error: `Grup opsi "${name}": nama opsi ke-${oi + 1} wajib diisi.` };
      const priceDelta = toInt(o.priceDelta ?? 0);
      if (priceDelta === null || priceDelta < 0) {
        return { error: `Opsi "${optName}": tambahan harga harus angka ≥ 0.` };
      }
      options.push({
        name: optName,
        priceDelta,
        isAvailable: o.isAvailable === undefined ? true : Boolean(o.isAvailable),
      });
    }
    groups.push({
      name,
      isRequired: Boolean(g.isRequired),
      maxSelect,
      options,
    });
  }
  return { groups };
}

/** Data nested untuk create grup opsi (dipakai create & replace) */
export function optionGroupsCreateData(groups: OptionGroupInput[]) {
  return groups.map((g, i) => ({
    name: g.name,
    isRequired: g.isRequired,
    maxSelect: g.maxSelect,
    sortOrder: i,
    options: {
      create: g.options.map((o, j) => ({
        name: o.name,
        priceDelta: o.priceDelta,
        isAvailable: o.isAvailable,
        sortOrder: j,
      })),
    },
  }));
}

/** Validasi harga utama menu: int ≥ 0 */
export function parsePrice(
  v: unknown
): { ok: true; value: number } | { ok: false; error: string } {
  const price = toInt(v);
  if (price === null || price < 0) {
    return { ok: false, error: "Harga harus berupa angka bulat ≥ 0." };
  }
  return { ok: true, value: price };
}

/** Validasi status menu */
export function parseStatus(
  v: unknown
): { ok: true; value: MenuStatusValue } | { ok: false; error: string } {
  const s = String(v ?? "AVAILABLE");
  if (!(MENU_STATUSES as readonly string[]).includes(s)) {
    return { ok: false, error: "Status menu tidak valid." };
  }
  return { ok: true, value: s as MenuStatusValue };
}
