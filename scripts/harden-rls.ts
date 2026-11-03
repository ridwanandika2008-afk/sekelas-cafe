/**
 * Hardening RLS Supabase untuk tabel aplikasi Sekelas Cafe.
 *
 * Mengapa: tabel di schema `public` bisa diakses via PostgREST (anon key)
 * jika tidak ada RLS. Karena aplikasi memakai Prisma (role `sekelas_app`),
 * kita aktifkan RLS di semua tabel aplikasi + policy permisif KHUSUS
 * untuk role `sekelas_app` — sehingga anon/authenticated PostgREST
 * tertolak, sementara Prisma tetap bebas.
 *
 * Jalankan setiap kali setelah `bun run db:push`.
 */
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const tables = (await db.$queryRaw<{ tablename: string }[]>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `).map((t) => t.tablename);

  let hardened = 0;
  for (const table of tables) {
    if (table.startsWith("_prisma")) continue;
    await db.$executeRawUnsafe(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY;`);
    const existing = await db.$queryRaw<{ count: number }[]>`
      SELECT count(*)::int as count FROM pg_policies
      WHERE schemaname = 'public' AND tablename = ${table} AND policyname = 'app_all'
    `;
    if (Number(existing[0]?.count ?? 0) === 0) {
      await db.$executeRawUnsafe(
        `CREATE POLICY "app_all" ON "${table}" FOR ALL TO sekelas_app USING (true) WITH CHECK (true);`
      );
    }
    hardened++;
  }
  console.log(`RLS aktif + policy app_all pada ${hardened} tabel.`);
}

main()
  .catch((e) => {
    console.error("Gagal hardening RLS:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
