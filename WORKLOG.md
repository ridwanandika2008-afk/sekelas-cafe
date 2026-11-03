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

- [x] Analisis brief lengkap (`upload/writing-block (2).md`, 759 baris).
- [x] Akses Supabase: PAT → Management API → proyek ditemukan; role DB `sekelas_app` dibuat via SQL API; bucket Storage `uploads` (publik, ≤2MB, jpg/png/webp).
- [x] Skema Prisma lengkap (18 model) ter-push ke Supabase + RLS hardening.
- [x] Dependensi: bcryptjs, jose, exceljs.
- [x] Tema visual espresso/caramel (light+dark) + font Fraunces/Plus Jakarta Sans.
- [x] Logo SVG resmi + favicon + 1 foto hero + 12 foto menu (AI) + placeholder QRIS.
- [x] Lib inti: `format`, `constants`, `auth`, `api-guard`, `settings` (cache+status buka), `logger` (audit+notifikasi), `order-service` (buat/bayar/checklist/siap/antar/batal — semua transaksional), `shift-service`, `cart-store`.
- [x] API inti: auth (login/logout/me), publik (cafe/menu/orders/track/promos), kasir (POS, pesanan, transisi, riwayat, shift), barista (antrean, item, siap), struk, notifikasi, upload.
- [x] Proxy (middleware Next 16) proteksi rute /admin /kasir /barista.
- [x] Layout: publik (navbar+footer sticky), dashboard (sidebar admin / topnav kasir+barista) + lonceng notifikasi.
- [x] Halaman login `/masuk` + stub 19 halaman (siap diisi agen).
- [x] Seed: 3 staf, 3 kategori, 12 menu (dengan grup opsi Ukuran/Gula/Es/Topping/Pedas + resep), 12 bahan, 2 promo, jadwal 7 hari, pengaturan.
- [x] Uji end-to-end alur inti via API: login kasir → buka shift → POS tunai (kembalian benar) → antrean barista → validasi checklist (tombol siap DITOLAK selama ada item belum selesai) → item selesai → SIAP → serahkan → SELESAI → stok bahan terpotong otomatis (kopi 2000→1964 gr, susu 8000→7700 ml) ✓.
- [x] Lint bersih (eslint 0 error).

### 🚧 Sedang Dikerjakan

- [ ] Agen A: situs publik pembeli (beranda, menu, keranjang+checkout, lacak pesanan, pesanan-saya).
- [ ] Agen C: UI kasir (POS, pesanan masuk, riwayat, shift, cetak struk).
- [ ] Agen D: UI barista (antrean + checklist).
- [ ] Agen B: admin (dashboard, menu, kategori, pengguna, pengaturan, aktivitas).
- [ ] Agen E: laporan + Excel import/export.
- [ ] Agen F: stok bahan + resep + promo.

### ⏳ Berikutnya

- [ ] Integrasi lintas modul + verifikasi browser end-to-end (agent-browser).
- [ ] Pembersihan data uji + WORKLOG final.

## Kendala & Catatan Teknis

- **Variabel environment shell basi:** `DATABASE_URL=file:...` tertanam di environment sesi shell (dan proses dev server lama) — mengabaikan `.env`. Solusi permanen: schema memakai `SEKELAS_DATABASE_URL` yang hanya ada di `.env`. Dev server harus dijalankan dengan trick subshell `(bun run dev &)` agar tetap hidup antar sesi.
- **Proses background:** proses yang dijalankan `nohup ... &` dari sesi shell alat terbunuh saat sesi berakhir; gunakan subshell `(cmd &)` untuk service yang harus tetap hidup.
- **Ukuran gambar SDK AI:** harus kelipatan 32 antara 512–2880 px (dokumen skill belum akurat — 1440x720 ditolak; dipakai 1440x768).
- **Supabase `ALTER USER postgres`** tidak diizinkan lewat Management API query (bukan superuser) — dibuat role khusus `sekelas_app` sebagai gantinya.
- **Prisma di luar folder proyek** (mis. /tmp) me-resolve versi berbeda (v7) — selalu jalankan perintah prisma dari root proyek.

## Log Harian

### 2026-11-03 (Hari 1)
- Brief dibaca & dipahami menyeluruh; kredensial Supabase diamankan (PAT via one-time secret) → proyek "Sekelas Cafe" aktif ditemukan.
- Fondasi lengkap dibangun (lihat bagian ✅ Selesai); seluruh alur bisnis inti teruji via API; siap memasuki fase pembangunan UI per modul oleh agen paralel.
