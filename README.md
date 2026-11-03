# ☕ Sekelas Cafe

Platform manajemen kafe lengkap untuk **Sekelas Cafe — Kafe Siswa SMKN 1 Boyolangu, Tulungagung, Jawa Timur**. Satu sistem untuk situs pembeli, POS kasir, antrean dapur barista, panel admin, pelaporan, sampai import/export Excel — semuanya dalam bahasa Indonesia.

> Dikelola pelajar, untuk pelajar: sederhana dipakai, rapi dikelola, jujur angkanya.

---

## Fitur Utama

| Modul | Route | Deskripsi |
| --- | --- | --- |
| 🛍️ **Situs Pembeli** | `/`, `/menu`, `/pesanan/[nomor]`, `/pesanan-saya` | Beranda, daftar menu dengan grup opsi (ukuran, gula, es, topping), keranjang, checkout tamu tanpa akun, pelacakan pesanan real-time dengan `accessKey`, riwayat pesanan lokal. |
| 💳 **POS Kasir** | `/kasir`, `/kasir/pesanan`, `/kasir/riwayat`, `/kasir/shift` | Buat pesanan langsung, bayar tunai (hitung kembalian otomatis) atau QRIS statis + verifikasi manual, kelola pesanan masuk sampai serah terima, riwayat transaksi per hari, shift kas dengan rekap kas & pengeluaran. |
| ☕ **Antrean Barista** | `/barista` | Antrean pesanan First-In-First-Out dengan checklist item per pesanan, penandaan item selesai (stok bahan terpotong otomatis), pesanan siap & selesai. |
| ⚙️ **Panel Admin** | `/admin/*` | Dashboard ringkasan, kelola menu & kategori & grup opsi, pengguna & role, stok bahan + resep + riwayat pergerakan, promo, pengaturan kafe (jam buka, QRIS, hero, biaya antar), audit trail aktivitas. |
| 📊 **Laporan** | `/admin/laporan`, `/admin/data` | Grafik penjualan harian/mingguan, export laporan ke Excel (.xlsx), template & import data menu/kategori/pengguna/bahan via Excel. |
| 🔔 **Notifikasi** | semua dashboard | Lonceng notifikasi per-role (stok menipis, pesanan baru, dsb.) dengan polling ringan. |

**Karakter produk:** tanpa layanan berbayar (no payment gateway, no SMTP — verifikasi QRIS manual oleh kasir), harga selalu dihitung ulang di server (anti-manipulasi), nomor pesanan harian `SC-YYMMDD-NNN`, antarmuka 100% Bahasa Indonesia, zona waktu WIB.

## Stack Teknologi

- **Framework:** [Next.js 16](https://nextjs.org) (App Router, multi-route groups, Server Components) + TypeScript strict
- **Styling:** Tailwind CSS 4 + [shadcn/ui](https://ui.shadcn.com) (New York) + Lucide icons · tema Espresso Brown × Caramel Gold (light & dark)
- **Database:** [Supabase](https://supabase.com) PostgreSQL (region `ap-southeast-1`) + Supabase Storage, diakses via **Prisma ORM**
- **Auth:** JWT custom (`jose`) + bcrypt, cookie httpOnly — tanpa NextAuth
- **State:** Zustand (keranjang) · polling ringan 5–20 dtk untuk data live
- **Excel:** ExcelJS (export laporan, template & import data)
- **Font:** Fraunces (display) + Plus Jakarta Sans (body)

## Arsitektur Singkat

```
src/
├── app/
│   ├── (publik)/          # Situs pembeli — beranda, menu, lacak & riwayat pesanan
│   ├── admin/             # Panel admin (guard role ADMIN via layout)
│   ├── kasir/             # POS & shift (guard role KASIR/ADMIN)
│   ├── barista/           # Antrean dapur (guard role BARISTA/ADMIN)
│   ├── masuk/             # Login staf
│   └── api/               # 40+ route handler (publik, auth, kasir, barista, admin,
│                          #   laporan, data excel, struk, notifikasi, upload)
├── components/            # UI shadcn + komponen fitur per modul
├── lib/                   # db (Prisma), auth, api-guard, order-service (transaksional),
│                          #   shift-service, logger (audit+notifikasi), settings, format, constants
└── proxy.ts               # Middleware proteksi rute (konvensi Next 16: proxy.ts)
prisma/                    # schema.prisma (18 model) + seed.ts
scripts/harden-rls.ts      # Aktifasi RLS PostgREST setelah db push
docs/                      # Konvensi kode + brief produk
```

**Prinsip keamanan yang dipakai:**
1. Harga & total **selalu dihitung server-side** dari database — input klien hanya `menuItemId`, `qty`, `optionIds`.
2. Semua tabel aplikasi dilindungi **Row Level Security** Supabase — anon key tidak bisa membaca data; hanya role DB khusus aplikasi (`sekelas_app`) yang punya akses.
3. Guard berlapis: `proxy.ts` (middleware) → guard server di setiap layout seksi → `requireApiRole()` di setiap API route.
4. Nomor urut pesanan tidak bisa di-enumerasi: pelacakan membutuhkan `accessKey` 6 karakter.
5. Semua transaksi kritis (buat pesanan, bayar, checklist barista) berjalan dalam **database transaction** atomik.

## Memulai Pengembangan

### Prasyarat

- [Bun](https://bun.sh) v1.2+ (atau Node.js 20+ dengan npm — sesuaikan perintah)
- Akun Supabase (project PostgreSQL di region `ap-southeast-1` disarankan)

### 1. Clone & install

```bash
git clone <url-repo-ini> sekelas-cafe
cd sekelas-cafe
bun install        # otomatis menjalankan `prisma generate`
```

### 2. Siapkan environment

```bash
cp .env.example .env
```

Isi nilai berikut (lihat keterangan lengkap di dalam file):

| Variabel | Kegunaan |
| --- | --- |
| `SEKELAS_DATABASE_URL` | Koneksi Prisma ke Supabase (lewat pooler Supavisor). |
| `AUTH_SECRET` | Secret penandatanganan JWT sesi staf. |
| `SUPABASE_PROJECT_REF` | Project ref Supabase (untuk unggah gambar). |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key Supabase (hanya dipakai route upload). |

### 3. Siapkan database

Role database khusus `sekelas_app` direkomendasikan (bukan user `postgres` default) — buat lewat SQL Editor Supabase:

```sql
create role sekelas_app login password 'PASSWORD_KUAT' noinherit;
grant usage on schema public to sekelas_app;
grant all privileges on all tables in schema public to sekelas_app;
grant all privileges on all sequences in schema public to sekelas_app;
alter default privileges in schema public grant all on tables to sekelas_app;
alter default privileges in schema public grant all on sequences to sekelas_app;
```

Lalu sinkronkan skema, aktifkan RLS, dan seed data awal:

```bash
bun run db:push      # sinkron prisma/schema.prisma → database
bun run db:harden    # aktifkan RLS + policy khusus role sekelas_app
bun run db:seed      # 3 akun staf, 3 kategori, 12 menu + opsi + resep, pengaturan awal
```

> ⚠️ Urutan penting: jalankan `db:harden` **setiap kali** setelah `db:push` agar PostgREST tetap terkunci dari anon key.

<details>
<summary><strong>Memakai migrasi (alternatif <code>db:push</code>) untuk deployment baru</strong></summary>

Folder `prisma/migrations/0_init/` berisi baseline skema lengkap. Untuk database **kosong/baru**:

```bash
bun run db:deploy    # terapkan 0_init → database baru siap dipakai
```

Untuk database yang **sudah berjalan** (dibentuk lewat `db:push`) dan ingin bermigrasi ke alur migration, cukup tandai baseline tanpa menjalankan SQL-nya:

```bash
bunx prisma migrate resolve --applied 0_init
```

</details>

### 4. Jalankan

```bash
bun run dev          # http://localhost:3000
bun run lint         # ESLint — harus bersih sebelum commit
bunx tsc --noEmit    # typecheck — harus bersih sebelum commit
```

### Akun staf bawaan (seed)

| Username | Kata sandi | Role |
| --- | --- | --- |
| `admin` | `AdminSekelas123` | ADMIN |
| `kasir` | `KasirSekelas123` | KASIR |
| `barista` | `BaristaSekelas123` | BARISTA |

> 🔐 **Wajib diganti** lewat menu Admin → Pengguna sebelum dipakai sungguhan.

## Deployment (Vercel + Supabase)

Proyek ini dioptimalkan untuk **Vercel** dengan database Supabase di **Singapura (`ap-southeast-1`)**:

1. Fork/clone repo ke akun GitHub Anda, lalu *Import Project* di Vercel.
2. **Build Command:** `prisma generate && next build` · **Framework preset:** Next.js (otomatis terdeteksi).
3. **Function Region:** `sin1 (Singapore)` — satu region dengan database Supabase agar latensi query minimal.
4. Tambahkan environment variables (Production & Preview): `SEKELAS_DATABASE_URL` (gunakan **transaction pooler port 6543** + `connection_limit=1` untuk serverless), `AUTH_SECRET` baru yang kuat, `SUPABASE_PROJECT_REF`, `SUPABASE_SERVICE_ROLE_KEY`.
5. Deploy — setiap push ke `main` akan otomatis turun ke production; pull request mendapat Preview Deployment.

Detail konvensi environment pengembangan vs produksi ada di [docs/CONVENTIONS.md](docs/CONVENTIONS.md).

## Referensi Dokumentasi

- [docs/CONVENTIONS.md](docs/CONVENTIONS.md) — konvensi kode, struktur route, kontrak API inti, model data.
- [docs/brief-sekelas-cafe.md](docs/brief-sekelas-cafe.md) — brief produk lengkap (visi, fitur, batasan).
- [WORKLOG.md](WORKLOG.md) — catatan perkembangan & keputusan arsitektur.

## Lisensi & Penggunaan

Dikembangkan untuk kebutuhan operasional Sekelas Cafe SMKN 1 Boyolangu. Hubungi pengelola kafe untuk izin penggunaan atau adaptasi.
