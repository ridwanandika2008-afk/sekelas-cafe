# WORKLOG — Sekelas Cafe

Dokumentasi perkembangan proyek platform manajemen kafe **Sekelas Cafe** (SMKN 1 Boyolangu, Tulungagung). Diperbarui sepanjang pengembangan.

---

## Ringkasan Proyek

- **Produk:** Platform manajemen kafe lengkap — situs pembeli, POS kasir, antrean barista, panel admin, laporan, Excel import/export.
- **Stack:** Next.js 16 (App Router, multi-route) · TypeScript · Tailwind CSS 4 + shadcn/ui · Prisma ORM · **Supabase PostgreSQL** (proyek `tenyfptibnwijzexibgt`, region ap-southeast-1) · Supabase Storage (bucket `uploads`).
- **Batasan:** no-capital (tanpa layanan berbayar, tanpa payment gateway, tanpa SMTP).
- **Identitas visual:** Espresso Brown (`--primary`) + Caramel Gold (`--gold`), gaya warm minimalis. Font: Fraunces (display) + Plus Jakarta Sans (body).
- **Bahasa antarmuka:** Indonesia (id-ID). Zona waktu: Asia/Jakarta (WIB).

## Keputusan Arsitektur Penting

1. **Database = Supabase Postgres via Prisma** — koneksi melalui Supavisor session pooler (IPv4; koneksi langsung db.*.supabase.co hanya IPv6 dan tidak tersedia dari sandbox). Role DB khusus `sekelas_app` (bukan user `postgres`) dengan hak penuh di schema `public`; env `SEKELAS_DATABASE_URL` (hindari tabrakan dengan `DATABASE_URL` warisan environment yang berisi path SQLite lama).
2. **Keamanan PostgREST:** semua tabel aplikasi diaktifkan RLS-nya + policy `app_all` khusus role `sekelas_app` — anon key tidak bisa membaca data aplikasi. Jalankan `bun run db:harden` setiap kali setelah `bun run db:push`.
3. **Auth custom JWT (jose + bcryptjs)**, cookie httpOnly `skls_session`, 12 jam. Guard di `src/proxy.ts` (Next 16 mengganti konvensi `middleware` → `proxy`) + guard server di setiap layout seksi + guard `requireApiRole()` di setiap API route. **Tidak memakai NextAuth** demi kompatibilitas penuh Next 16 dan kendali penuh.
4. **Harga selalu dihitung server** (`lib/order-service.ts`) dari DB — input client hanya menuId/qty/optionIds (anti-manipulasi harga).
5. **Status pesanan terpisah:** `paymentStatus` (UNPAID/PAID) vs `status` pengerjaan (NEW→QUEUED→PREPARING→READY→DELIVERING→COMPLETED / CANCELLED).
6. **Checkout tamu untuk pembeli** (tanpa akun) + `accessKey` 6 karakter untuk melacak pesanan (anti-enumerasi nomor urut). Riwayat pesanan via localStorage (`/pesanan-saya`).
7. **QRIS statis** (gambar diunggah admin) + verifikasi manual kasir; tunai dengan hitung kembalian otomatis. Screenshot bukan bukti mutlak — kasir wajib verifikasi.
8. **Stok bahan sederhana:** resep per menu (`MenuItemIngredient`), pengurangan otomatis saat barista menandai item selesai, peringatan bahan hampir habis ke admin.
9. **Real-time via polling ringan** (5–20 detik) untuk antrean barista & pesanan kasir — cukup andal untuk skala kafe sekolah, tanpa infrastruktur tambahan.
10. **Nomor pesanan harian** `SC-YYMMDD-NNN` via tabel `Counter` (transaksional).
11. **Foto menu/hero dihasilkan AI** (image-generation); logo resmi = SVG buatan tangan (`src/components/logo.tsx` + `src/app/icon.svg`).

## Akun Staf (seed)

| Username  | Kata Sandi       | Role    |
| --------- | ---------------- | ------- |
| `admin`   | `AdminSekelas123`   | ADMIN   |
| `kasir`   | `KasirSekelas123`   | KASIR   |
| `barista` | `BaristaSekelas123` | BARISTA |

> Ganti kata sandi default lewat menu Pengguna sebelum digunakan sungguhan.

## Progress

### ✅ Selesai

- [x] Analisis brief lengkap (`docs/brief-sekelas-cafe.md`, 759 baris).
- [x] Akses Supabase: PAT → Management API → proyek ditemukan; role DB `sekelas_app` dibuat via SQL API; bucket Storage `uploads` (publik, ≤2MB, jpg/png/webp).
- [x] Skema Prisma lengkap (18 model) ter-push ke Supabase + RLS hardening.
- [x] Dependensi: bcryptjs, jose, exceljs.
- [x] Tema visual espresso/caramel (light+dark) + font Fraunces/Plus Jakarta Sans.
- [x] Logo SVG resmi + favicon + 1 foto hero + 12 foto menu (AI) + placeholder QRIS.
- [x] Lib inti: `format`, `constants`, `auth`, `api-guard`, `settings` (cache+status buka), `logger` (audit+notifikasi), `order-service` (buat/bayar/checklist/siap/antar/batal — semua transaksional), `shift-service`, `cart-store`.
- [x] API inti: auth (login/logout/me), publik (cafe/menu/orders/track/promos), kasir (POS, pesanan, transisi, riwayat, shift), barista (antrean, item, siap), struk, notifikasi, upload.
- [x] Proxy (middleware Next 16) proteksi rute /admin /kasir /barista.
- [x] Layout: publik (navbar+footer sticky), dashboard (sidebar admin / topnav kasir+barista) + lonceng notifikasi.
- [x] Halaman login `/masuk` + seluruh halaman modul.
- [x] Seed: 3 staf, 3 kategori, 12 menu (dengan grup opsi Ukuran/Gula/Es/Topping/Pedas + resep), 12 bahan, 2 promo, jadwal 7 hari, pengaturan.
- [x] Uji end-to-end alur inti via API: login kasir → buka shift → POS tunai (kembalian benar) → antrean barista → validasi checklist → item selesai → SIAP → serahkan → SELESAI → stok bahan terpotong otomatis ✓.
- [x] **Semua modul UI lengkap** — situs publik pembeli (A), POS & pesanan & riwayat & shift kasir (C), antrean barista (D), panel admin lengkap (B), laporan & Excel import/export (E), stok & resep & promo (F).
- [x] **Verifikasi browser end-to-end** (dev + production) — golden path: menu → keranjang → checkout (promo, harga server-side) → pesanan → bayar kasir (kembalian) → struk → barista checklist → SIAP.
- [x] **Rilis v1.0.0** — repository GitHub + deployment Vercel production (lihat Log Hari 2).
- [x] Lint bersih (eslint 0 error) + `tsc --noEmit` bersih.
- [x] Pembersihan data uji + WORKLOG final.

## Kendala & Catatan Teknis

- **Variabel environment shell basi:** `DATABASE_URL=file:...` tertanam di environment sesi shell (dan proses dev server lama) — mengabaikan `.env`. Solusi permanen: schema memakai `SEKELAS_DATABASE_URL` yang hanya ada di `.env`. Dev server harus dijalankan dengan trick subshell `(bun run dev &)` agar tetap hidup antar sesi.
- **Proses background:** proses yang dijalankan `nohup ... &` dari sesi shell alat terbunuh saat sesi berakhir; gunakan subshell `(cmd &)` untuk service yang harus tetap hidup.
- **Ukuran gambar SDK AI:** harus kelipatan 32 antara 512–2880 px (dokumen skill belum akurat — 1440x720 ditolak; dipakai 1440x768).
- **Supabase `ALTER USER postgres`** tidak diizinkan lewat Management API query (bukan superuser) — dibuat role khusus `sekelas_app` sebagai gantinya.
- **Prisma di luar folder proyek** (mis. /tmp) me-resolve versi berbeda (v7) — selalu jalankan perintah prisma dari root proyek.

## Log Harian

### 2026-11-04 (Hari 2) — Rilis v1.0.0

**Persiapan rilis & kebersihan codebase:**
- Kredensial rilis (Vercel PAT + GitHub PAT) diamankan via one-time secret.
- Perbaikan 7 error TypeScript sisa (tipe `Promise.all` di riwayat stok; `eachCell?` ExcelJS) → `ignoreBuildErrors` dinonaktifkan; `tsc --noEmit` bersih.
- Audit dependensi: **38 paket dihapus** (next-auth, next-intl, @mdxeditor, react-markdown, react-syntax-highlighter, z-ai-web-dev-sdk, uuid, @dnd-kit, @tanstack/*, date-fns, react-hook-form+zod+resolvers, vaul, cmdk, embla, react-day-picker, input-otp, resizable-panels, @reactuses, 13 paket @radix-ui, tailwindcss-animate) + 24 komponen shadcn/ui tak terpakai dihapus (set inti yang benar-benar dipakai tetap).
- `tailwind.config.ts` v3 warisan template dihapus (Tailwind 4 memakai CSS-first config di globals.css; tidak ada `@config`) — menyebabkan build Vercel gagal sebelum dihapus.
- Artefak AI/sandbox dibersihkan dari repo: `agent-ctx/`, `tool-results/`, `db/custom.db` (SQLite lama), `scripts/generate-images.ts`, `download/`; brief asli dipindah ke `docs/brief-sekelas-cafe.md`.
- `package.json`: nama → `sekelas-cafe` v1.0.0; build → `next build` (Vercel-ready); `postinstall: prisma generate`; `db:push` tanpa `--accept-data-loss` (aman untuk DB produksi).
- `.gitignore` profesional lengkap (secrets, env, cache, IDE, OS, residu AI/sandbox) + `.env.example` aman tanpa secret asli.
- `README.md` baru (fitur, arsitektur, setup, deployment) + `docs/CONVENTIONS.md` diubah dari instruksi subagent menjadi konvensi kontribusi profesional.
- Baseline migrasi Prisma `prisma/migrations/0_init/` (401 baris SQL, diverifikasi sinkron dengan DB live via `migrate diff` — diff kosong).
- **Pembersihan data uji produksi**: 19 pesanan uji + 62 item + 4 shift + 68 pergerakan stok + 64 notifikasi + 258 log aktivitas dihapus; stok bahan & promo & counter direset ke kondisi seed (`scripts/cleanup-test-data.ts`).

**Repository:**
- Riwayat git baru dibuat (riwayat lama mengandung `.env` di initial commit — tidak boleh ikut terpublikasi).
- GitHub: `ridwanandika2008-afk/sekelas-cafe` (public) — https://github.com/ridwanandika2008-afk/sekelas-cafe
- Commit: `Initial release v1.0.0` → `fix: hapus tailwind.config.ts v3` → `fix(RSC): nav dashboard pindah ke module client`.

**Deployment Vercel:**
- Project `sekelas-cafe` (Hobby) — **function region `sin1` (Singapura)**, satu region dengan database Supabase `ap-southeast-1`.
  - Alasan: aplikasi DB-heavy (semua request ke PostgreSQL); kolokasi function↔DB meniadakan latensi jaringan per query. Pengguna utama di Indonesia (Jawa Timur) dilayani edge Vercel terdekat (SIN) untuk aset statis.
  - Bukti: API `/api/public/menu` dari luar (Hong Kong) konsisten ~105–120 ms end-to-end; halaman `/` ~41 ms (edge cache).
- Runtime Node.js 22.x (bukan Edge — Prisma + ExcelJS butuh Node penuh); bundler Turbopack; `bun install`.
- Environment (production+preview, terverifikasi decrypt): `SEKELAS_DATABASE_URL` (**transaction pooler port 6543**, `pgbouncer=true&connection_limit=1` — pola serverless; interactive transaction Prisma teruji OK), `AUTH_SECRET` baru dibuat khusus produksi, `SUPABASE_PROJECT_REF`, `SUPABASE_SERVICE_ROLE_KEY`.
  - Catatan: env bawaan akun dari integrasi Supabase lama menunjuk project lain (`fvzq…`) — sudah dikoreksi/dihapus.
- URL production: **https://sekelas-cafe-gamma.vercel.app** (alias: sekelas-cafe-no-name-887e.vercel.app)

**Insiden build (2, teratasi):**
1. `tailwindcss-animate` hilang setelah audit dependensi → tersembunyi di lokal karena sisa node_modules; build Vercel gagal → dead config v3 dihapus (commit 53f4e09).
2. **Semua halaman dashboard 500 di produksi** — layout server mengoper komponen ikon lucide sebagai prop ke `DashboardShell` (client). Di dev tidak error, di build produksi Turbopack serialisasi RSC menolak function/component melintasi batas server→client. Fix: NAV config pindah ke module client, layout mengoper `section` string (commit fa95db2). Pelajaran: pola ini harus selalu dihindari; verifikasi produksi wajib, bukan hanya dev.

**Verifikasi produksi (browser, URL live):** publik (beranda/menu/lacak/pesanan-saya), login 3 role, seluruh 15 rute dashboard 200, golden path lengkap (pesan → bayar tunai+ kembalian → struk 200 → barista checklist → SIAP), data live dari Supabase, data uji verifikasi dibersihkan setelahnya.

**Sisa kendala / langkah berikutnya:**
- ⚠️ Auto-deploy Git belum aktif: akun Vercel belum punya koneksi login GitHub (butuh otorisasi interaktif pemilik akun). Setelah tersambung (Vercel → Settings → Login Connections → GitHub, lalu `vercel git connect` atau Connect Repository di project), setiap push ke `main` otomatis deploy. Sampai itu terjadi, deploy manual via `vercel deploy --prod`.
- Hydration warning kosmetik di beberapa halaman (kemungkinan timeAgo/framer-motion SSR) — tidak memengaruhi fungsi; kandidat polish iterasi berikutnya.
- Ganti kata sandi staf default sebelum digunakan sungguhan.

### 2026-11-03 (Hari 1)
- Brief dibaca & dipahami menyeluruh; kredensial Supabase diamankan (PAT via one-time secret) → proyek "Sekelas Cafe" aktif ditemukan.
- Fondasi lengkap dibangun (lihat bagian ✅ Selesai); seluruh alur bisnis inti teruji via API; siap memasuki fase pembangunan UI per modul oleh agen paralel.
