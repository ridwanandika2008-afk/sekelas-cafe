# CONVENTIONS — Pedoman Pengembangan Sekelas Cafe

WAJIB dibaca sebelum menulis kode. Proyek: Next.js 16 App Router + TypeScript + Tailwind 4 + shadcn/ui + Prisma + Supabase PostgreSQL.

## Aturan Kontribusi

1. **Jaga kepemilikan berkas bersama.** File fondasi milik semua orang — ubah hanya dengan alasan kuat dan jelaskan di commit: `prisma/schema.prisma`, `src/lib/*`, `src/app/layout.tsx`, `src/app/globals.css`, `src/proxy.ts`, `src/components/logo.tsx`, `src/components/dashboard-shell.tsx`, `src/components/notification-bell.tsx`, `src/components/public-navbar.tsx`, seluruh `layout.tsx`, `src/app/masuk/**`, dan `src/app/api/auth/**`, `.env*`, `WORKLOG.md`.
2. **API route tambahan** hanya boleh dalam prefix modulnya sendiri (lihat tabel struktur route).
3. Semua teks UI **Bahasa Indonesia**, gaya sopan-santun khas Indonesia ("Anda" untuk formal, "kamu" untuk pembeli muda).
4. Harga **integer Rupiah** — format dengan `formatRupiah()` dari `@/lib/format` (menghasilkan "Rp12.000").
5. Semua waktu tampil sebagai **WIB** — pakai helper `formatWibDateTime` / `formatWibTime` / `timeAgo` dari `@/lib/format`.
6. `bun run lint` dan `bunx tsc --noEmit` harus bersih untuk file-filemu sebelum selesai. Perbaiki SEMUA error.
7. Komponen shadcn/ui tersedia di `src/components/ui/*` (set inti yang benar-benar dipakai — tambahkan via `bunx shadcn@latest add <komponen>` bila perlu). Ikon: `lucide-react`. Notifikasi aksi: `sonner` (`import { toast } from "sonner"`).
8. Akses data: **selalu lewat API route** (fetch dari client component) atau `db` (`@/lib/db`) langsung di server component/route. Jangan pernah panggil `db` dari client component.
9. Tailwind: gunakan token tema (`bg-primary`, `text-muted-foreground`, `bg-card`, `border`, dll). Aksen khas: `text-gold`, `bg-gold`, `bg-gold-soft`, `border-gold`. Font display (heading): className `font-display`. JANGAN hardcode warna kecuali sangat perlu.
10. Status pesanan/menu gunakan konstanta & label dari `@/lib/constants` (`ORDER_STATUS_LABEL`, `ORDER_STATUS_BADGE`, `MENU_STATUS_LABEL`, `FULFILLMENT_LABEL`, `PAYMENT_STATUS_LABEL`, dll).
11. Responsif wajib (mobile-first). Daftar panjang: `max-h-[...] overflow-y-auto`. Touch target ≥ 44px.

## Struktur Route

| Route | Modul | Isi |
| --- | --- | --- |
| `/` `(publik)` | Publik | Beranda pembeli |
| `/menu` | Publik | Daftar menu + keranjang + checkout |
| `/pesanan/[nomor]?k=...` | Publik | Lacak status pesanan |
| `/pesanan-saya` | Publik | Riwayat pesanan (localStorage) |
| `/masuk` | Auth | Login staf |
| `/admin` + sub | Admin | Dasbor, menu, kategori, pengguna, pengaturan, aktivitas, laporan, data Excel, stok, promo |
| `/kasir` + sub | Kasir | POS, pesanan masuk, riwayat, shift |
| `/barista` | Barista | Antrean dapur |
| `/api/admin/*`, `/api/laporan/*`, `/api/data/*` | Admin | API admin, laporan & excel |

## Model Data (ringkas — lihat `prisma/schema.prisma` untuk lengkap)

- **User**: role `ADMIN|KASIR|BARISTA`, `isActive`.
- **Category**: `name`, `sortOrder`, `isArchived`.
- **MenuItem**: `categoryId`, `name`, `description`, `imageUrl`, `price` (Int), `status` `AVAILABLE|SOLD_OUT|PAUSED|INACTIVE`, `isFeatured`, `isArchived`, `sortOrder`.
- **MenuOptionGroup** → **MenuOption**: `name`, `isRequired`, `maxSelect` (1=radio, >1=multi), option `name`+`priceDelta` (Int)+`isAvailable`.
- **Order**: `orderNumber` "SC-YYMMDD-NNN", `accessKey`, `channel` `ONLINE|POS`, `customerName`, `fulfillment` `DINE_IN|TAKEAWAY|DELIVERY`, `tableNumber`, `deliveryBuilding/Room/Note`, `note`, `subtotal/deliveryFee/discount/total` (Int), `paymentMethod` `CASH|QRIS`, `paymentStatus` `UNPAID|PAID`, `status` `NEW|QUEUED|PREPARING|READY|DELIVERING|COMPLETED|CANCELLED`, `cashReceived/cashChange`, `promoId`, `kasirId`, `shiftId`, `paidAt/completedAt/cancelledAt/cancelReason`.
- **OrderItem**: `nameSnapshot`, `basePrice`, `unitPrice`, `qty`, `note`, `optionsJson` (string JSON `[{groupId,groupName,optionId,optionName,priceDelta}]`), `isDone`, `doneAt`.
- **Ingredient**: `name`, `unit`, `stock` (Float), `minStock`, `isActive`. **MenuItemIngredient**: resep (`amount` per porsi). **StockMovement**: `type` `IN|OUT|ADJUST`, `amount`, `note`, `orderId`.
- **Promo**: `type` `PERCENT|NOMINAL`, `value`, `scope` `ALL|MENU`, `menuItemId`, `minOrder`, `startsAt/endsAt`, `isActive`, `usageCount`.
- **Shift**: `kasirId`, `openingCash/closingCash/cashTotal/qrisTotal/expenseTotal/expectedCash/variance`, `status` `OPEN|CLOSED`. **ShiftExpense**: `amount`, `note`.
- **Setting** (singleton id="singleton"): cafeName, address, whatsapp, heroHeadline/Subheadline/ImageUrl, aboutText, deliveryFee, deliveryEnabled, qrisImageUrl, qrisEnabled, cashEnabled, receiptFooter, temporarilyClosed, closedMessage, mapQuery.
- **DaySchedule**: `dayOfWeek` 0–6, `isOpen`, `openTime/closeTime` "HH:MM".
- **ActivityLog**: `userId/actorName/role`, `action`, `entity/entityId`, `detail` (JSON string).
- **Notification**: `userId` ATAU `role` (broadcast), `type`, `title`, `message`, `orderId`, `isRead`.

## Kontrak API Inti

Autentikasi ditangani cookie `skls_session` (httpOnly). Semua API mengembalikan JSON; error: `{"error": "pesan"}` dengan status 4xx/5xx.

### Publik
- `GET /api/public/cafe` → `{cafe: {...}, status: {isOpen, message, state, today}, schedules: [...]}`
- `GET /api/public/menu` → `{categories: [...], items: [{..., optionGroups: [{..., options: [...]}]}]}` — hanya AVAILABLE/SOLD_OUT/PAUSED.
- `GET /api/public/promos` → `{promos: [...]}` (aktif, scope ALL).
- `POST /api/public/orders` body `{customerName, fulfillment, tableNumber?, deliveryBuilding?, deliveryRoom?, deliveryNote?, note?, items: [{menuItemId, qty, note?, optionIds: []}], promoId?}` → `{orderNumber, accessKey, total}` (ditolak bila kafe tutup).
- `GET /api/public/orders/[orderNumber]?k=ACCESSKEY` → detail pesanan pembeli + `progress: {done, total}`.

### Kasir (butuh role KASIR/ADMIN)
- `POST /api/kasir/pos/pesanan` body `{customerName, fulfillment, ..., items: [...], promoId?, payment?: {method: "CASH"|"QRIS", cashReceived?}}` → `{order: {...}}`. Wajib ada shift terbuka bila membayar.
- `GET /api/kasir/pesanan?scope=aktif|semua` → pesanan hari ini (WIB) lengkap + items.
- `POST /api/kasir/pesanan/[id]` body `{action: "bayar"|"serahkan"|"antar"|"diterima"|"batal", ...}`.
- `GET /api/kasir/riwayat?tanggal=&metode=&status=&q=&limit=` → `{ringkasan, orders}`.
- `GET /api/kasir/shift` → `{shift: null | {..., expenses, ringkasan}}`.
- `POST /api/kasir/shift` body `{openingCash}` (buka).
- `POST /api/kasir/shift/[id]` body `{action:"tutup", closingCash} | {action:"pengeluaran", amount, note}`.

### Barista (role BARISTA/ADMIN)
- `GET /api/barista/antrean` → `{antrean: [...], siap: [...], selesaiHariIni: n}` (polling 5 dtk).
- `POST /api/barista/item/[id]` body `{action:"selesai"|"batal"}` — tandai/batal item (stok otomatis).
- `POST /api/barista/pesanan/[id]` — tandai siap (ditolak bila belum semua item selesai).

### Struk & lainnya
- `GET /api/receipt/[orderNumber]?type=customer|kitchen&k=...` → `{type, cafe: {...}, order: {..., items}}`. Kitchen khusus staf.
- `GET /api/notifikasi` → `{notifications, unread}`; `POST /api/notifikasi` body `{}` atau `{id}` (tandai dibaca).
- `POST /api/upload` (ADMIN, multipart `file`) → `{url}` (Supabase Storage publik).

### Auth
- `POST /api/auth/login` `{username, password}` → `{user, redirect}` (set cookie).
- `POST /api/auth/logout`, `GET /api/auth/me`.

## Sesi Server (untuk server component)

```ts
import { getSession } from "@/lib/auth";
const session = await getSession(); // null bila belum login; {userId, name, username, role}
```

Guard API route:

```ts
import { requireApiRole } from "@/lib/api-guard";
const { session, error } = await requireApiRole(["ADMIN"]);
if (error) return error; // 401/403 siap pakai
```

## Aktivitas & Notifikasi (untuk route API baru)

```ts
import { logActivity, notify } from "@/lib/logger";
await logActivity({ session, action: "MENU_UPDATE", entity: "MenuItem", entityId: id, detail: {...} });
await notify({ roles: ["ADMIN"], type: "LOW_STOCK", title: "...", message: "...", orderId: id? });
```

## Alur Kerja Database

```bash
bun run db:push      # sinkronisasi schema (non-destruktif secara default — baca prompt Prisma!)
bun run db:harden    # WAJIB setelah db:push — aktifkan RLS PostgREST
bun run db:seed      # data awal (idempotent untuk sebagian besar model)
bun run db:migrate   # alur migrasi dev (prisma migrate dev)
bun run db:deploy    # terapkan migrasi ke produksi (prisma migrate deploy)
```

## Pengujian Manual

- Dev server: `bun run dev` → http://localhost:3000
- Akun demo: admin/AdminSekelas123 · kasir/KasirSekelas123 · barista/BaristaSekelas123
- Cek error runtime: `tail -50 dev.log`
- Cek API dengan curl. Login dulu untuk dapat cookie: `curl -c /tmp/c.txt -X POST localhost:3000/api/auth/login -H 'Content-Type: application/json' -d '{"username":"admin","password":"AdminSekelas123"}'` lalu `curl -b /tmp/c.txt ...`.
