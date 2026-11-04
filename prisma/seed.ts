/**
 * Seed data awal Sekelas Cafe.
 * Jalankan: bun run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  const userCount = await db.user.count();

  // ---------- Pengguna ----------
  if (userCount === 0) {
    const hash = (p: string) => bcrypt.hashSync(p, 10);
    await db.user.createMany({
      data: [
        {
          name: "Admin Sekelas",
          username: "admin",
          passwordHash: hash("AdminSekelas123"),
          role: "ADMIN",
        },
        {
          name: "Kasir Sekelas",
          username: "kasir",
          passwordHash: hash("KasirSekelas123"),
          role: "KASIR",
        },
        {
          name: "Barista Sekelas",
          username: "barista",
          passwordHash: hash("BaristaSekelas123"),
          role: "BARISTA",
        },
      ],
    });
    console.log("✓ 3 pengguna staf dibuat (admin/kasir/barista)");
  }

  // ---------- Pengaturan & jadwal ----------
  await db.setting.upsert({
    where: { id: "singleton" },
    create: {
      id: "singleton",
      aboutText:
        "Sekelas Cafe adalah kafe yang dijalankan oleh siswa-siswi SMKN 1 Boyolangu sebagai wadah belajar wirausaha. Setiap secangkir kopi yang kamu pesan mendukung langsung semangat belajar kami.",
      qrisImageUrl: "/images/qris-placeholder.svg",
    },
    update: {},
  });
  // Jadwal operasional: Senin(1)–Jumat(5) 07:00–14:00 WIB; Sabtu & Minggu tutup.
  for (let d = 0; d <= 6; d++) {
    await db.daySchedule.upsert({
      where: { dayOfWeek: d },
      create: { dayOfWeek: d, isOpen: d >= 1 && d <= 5, openTime: "07:00", closeTime: "14:00" },
      update: {},
    });
  }
  console.log("✓ Pengaturan & jadwal (Senin–Jumat 07:00–14:00)");

  // ---------- Kategori ----------
  const kategoriDefs = [
    { name: "Kopi", sortOrder: 1 },
    { name: "Non-Kopi", sortOrder: 2 },
    { name: "Makanan", sortOrder: 3 },
  ];
  const kategori: Record<string, string> = {};
  for (const k of kategoriDefs) {
    const row = await db.category.upsert({
      where: { name: k.name },
      create: k,
      update: { sortOrder: k.sortOrder },
    });
    kategori[k.name] = row.id;
  }
  console.log("✓ 3 kategori");

  // ---------- Bahan baku ----------
  const bahanDefs = [
    { name: "Biji Kopi Arabika", unit: "gr", stock: 2000, minStock: 300 },
    { name: "Susu UHT", unit: "ml", stock: 8000, minStock: 1500 },
    { name: "Sirup Gula Aren", unit: "ml", stock: 2000, minStock: 300 },
    { name: "Teh Tubruk", unit: "kantong", stock: 150, minStock: 30 },
    { name: "Bubuk Matcha", unit: "gr", stock: 500, minStock: 100 },
    { name: "Bubuk Cokelat", unit: "gr", stock: 800, minStock: 150 },
    { name: "Jeruk Peras", unit: "pcs", stock: 80, minStock: 20 },
    { name: "Roti Tawar", unit: "lembar", stock: 100, minStock: 20 },
    { name: "Pisang", unit: "pcs", stock: 90, minStock: 20 },
    { name: "Kentang Beku", unit: "gr", stock: 3000, minStock: 500 },
    { name: "Mie Instan", unit: "bungkus", stock: 60, minStock: 12 },
    { name: "Gula Pasir", unit: "gr", stock: 3000, minStock: 500 },
  ];
  const bahan: Record<string, string> = {};
  for (const b of bahanDefs) {
    const row = await db.ingredient.upsert({
      where: { name: b.name },
      create: b,
      update: { unit: b.unit },
    });
    bahan[b.name] = row.id;
  }
  console.log("✓ 12 bahan baku");

  // ---------- Helper grup opsi ----------
  async function opsi(
    menuItemId: string,
    name: string,
    isRequired: boolean,
    maxSelect: number,
    options: { name: string; priceDelta?: number }[]
  ) {
    await db.menuOptionGroup.create({
      data: {
        menuItemId,
        name,
        isRequired,
        maxSelect,
        sortOrder: 0,
        options: {
          create: options.map((o, i) => ({
            name: o.name,
            priceDelta: o.priceDelta ?? 0,
            sortOrder: i,
          })),
        },
      },
    });
  }

  const GULA = ["0%", "25%", "50%", "75%", "100%"].map((n) => ({ name: n }));
  const ES = [
    { name: "Less Ice" },
    { name: "Ice Normal" },
    { name: "Extra Ice" },
  ];

  // ---------- Menu ----------
  const menuDefs: {
    name: string;
    kategori: string;
    harga: number;
    desc: string;
    img: string;
    featured?: boolean;
    resep?: [string, number][];
    opsi?: (
      | { tipe: "ukuran" }
      | { tipe: "gula" }
      | { tipe: "es" }
      | { tipe: "topping" }
      | { tipe: "pedas" }
    )[];
  }[] = [
    {
      name: "Es Kopi Susu Gula Aren",
      kategori: "Kopi",
      harga: 8000,
      desc: "Espresso, susu segar, dan sirup gula aren asli. Favorit nomor satu!",
      img: "/images/menu-es-kopi-susu.jpg",
      featured: true,
      resep: [["Biji Kopi Arabika", 18], ["Susu UHT", 150], ["Sirup Gula Aren", 25]],
      opsi: [{ tipe: "ukuran" }, { tipe: "gula" }, { tipe: "es" }, { tipe: "topping" }],
    },
    {
      name: "Americano",
      kategori: "Kopi",
      harga: 7000,
      desc: "Kopi hitam klasik dengan double shot espresso. Pahit yang jujur.",
      img: "/images/menu-americano.jpg",
      resep: [["Biji Kopi Arabika", 18]],
      opsi: [{ tipe: "ukuran" }, { tipe: "topping" }],
    },
    {
      name: "Cappuccino",
      kategori: "Kopi",
      harga: 10000,
      desc: "Espresso dengan foam susu lembut dan taburan bubuk cokelat.",
      img: "/images/menu-cappuccino.jpg",
      featured: true,
      resep: [["Biji Kopi Arabika", 18], ["Susu UHT", 120], ["Bubuk Cokelat", 3]],
      opsi: [{ tipe: "ukuran" }, { tipe: "topping" }],
    },
    {
      name: "Kopi Tubruk",
      kategori: "Kopi",
      harga: 5000,
      desc: "Cara paling jujur menikmati kopi — diseduh langsung, aroma pekat.",
      img: "/images/menu-kopi-tubruk.jpg",
      resep: [["Biji Kopi Arabika", 15]],
    },
    {
      name: "Es Teh Manis Jumbo",
      kategori: "Non-Kopi",
      harga: 4000,
      desc: "Teh manis segar ukuran jumbo. Pas buat teman ngobrol santai.",
      img: "/images/menu-es-teh.jpg",
      resep: [["Teh Tubruk", 2], ["Gula Pasir", 20]],
      opsi: [{ tipe: "gula" }, { tipe: "es" }],
    },
    {
      name: "Es Matcha Latte",
      kategori: "Non-Kopi",
      harga: 10000,
      desc: "Matcha premium dengan susu segar, manisnya pas, warnanya bikin happy.",
      img: "/images/menu-es-matcha.jpg",
      featured: true,
      resep: [["Bubuk Matcha", 12], ["Susu UHT", 150], ["Gula Pasir", 15]],
      opsi: [{ tipe: "ukuran" }, { tipe: "gula" }, { tipe: "es" }, { tipe: "topping" }],
    },
    {
      name: "Cokelat Panas",
      kategori: "Non-Kopi",
      harga: 8000,
      desc: "Cokelat hangat creamy, pelengkap hari yang dingin atau tugas yang menumpuk.",
      img: "/images/menu-cokelat-panas.jpg",
      resep: [["Bubuk Cokelat", 25], ["Susu UHT", 180], ["Gula Pasir", 10]],
      opsi: [{ tipe: "ukuran" }, { tipe: "topping" }],
    },
    {
      name: "Es Jeruk Peras",
      kategori: "Non-Kopi",
      harga: 7000,
      desc: "Jeruk asli diperas langsung, tanpa pengawet. Vitamin C mentah!",
      img: "/images/menu-es-jeruk.jpg",
      resep: [["Jeruk Peras", 2], ["Gula Pasir", 15]],
      opsi: [{ tipe: "es" }],
    },
    {
      name: "Roti Bakar Cokelat Keju",
      kategori: "Makanan",
      harga: 9000,
      desc: "Roti bakar lembut dengan lelehan cokelat dan keju parut melimpah.",
      img: "/images/menu-roti-bakar.jpg",
      featured: true,
      resep: [["Roti Tawar", 2]],
    },
    {
      name: "Pisang Goreng Madu (3 pcs)",
      kategori: "Makanan",
      harga: 7000,
      desc: "Pisang goreng crispy dengan drizzle madu. Camilan sore paling absah.",
      img: "/images/menu-pisang-goreng.jpg",
      resep: [["Pisang", 3]],
    },
    {
      name: "Kentang Goreng",
      kategori: "Makanan",
      harga: 8000,
      desc: "Kentang goreng renyah di luar, lembut di dalam, dengan saus tomat.",
      img: "/images/menu-kentang-goreng.jpg",
      resep: [["Kentang Beku", 120]],
    },
    {
      name: "Mie Goreng Spesial",
      kategori: "Makanan",
      harga: 10000,
      desc: "Mie goreng rumahan dengan telur, sayur, dan bumbu rempah penuh.",
      img: "/images/menu-mie-goreng.jpg",
      resep: [["Mie Instan", 1]],
      opsi: [{ tipe: "pedas" }],
    },
  ];

  let order = 0;
  for (const m of menuDefs) {
    order++;
    const existing = await db.menuItem.findFirst({ where: { name: m.name } });
    if (existing) continue;
    const item = await db.menuItem.create({
      data: {
        categoryId: kategori[m.kategori],
        name: m.name,
        description: m.desc,
        imageUrl: m.img,
        price: m.harga,
        status: "AVAILABLE",
        sortOrder: order,
        isFeatured: m.featured ?? false,
      },
    });
    // Resep
    if (m.resep) {
      for (const [nama, jumlah] of m.resep) {
        await db.menuItemIngredient.create({
          data: { menuItemId: item.id, ingredientId: bahan[nama], amount: jumlah },
        });
      }
    }
    // Opsi
    if (m.opsi) {
      for (const o of m.opsi) {
        if (o.tipe === "ukuran")
          await opsi(item.id, "Ukuran", true, 1, [
            { name: "Reguler" },
            { name: "Large", priceDelta: 2000 },
          ]);
        if (o.tipe === "gula") await opsi(item.id, "Tingkat Gula", true, 1, GULA);
        if (o.tipe === "es") await opsi(item.id, "Tingkat Es", true, 1, ES);
        if (o.tipe === "pedas")
          await opsi(item.id, "Level Pedas", true, 1, [
            { name: "0 (Tidak Pedas)" },
            { name: "1" },
            { name: "2" },
            { name: "3 (Pedas Nampol)" },
          ]);
        if (o.tipe === "topping")
          await opsi(item.id, "Tambahan", false, 3, [
            { name: "Extra Shot Kopi", priceDelta: 3000 },
            { name: "Cheese Foam", priceDelta: 4000 },
            { name: "Extra Sirup Gula Aren", priceDelta: 2000 },
          ]);
      }
    }
  }
  console.log(`✓ ${menuDefs.length} menu dengan variasi & resep`);

  // ---------- Promo contoh ----------
  const now = new Date();
  const promoCount = await db.promo.count();
  if (promoCount === 0) {
    await db.promo.createMany({
      data: [
        {
          name: "Promo Hangat Pekan Ini",
          type: "PERCENT",
          value: 10,
          scope: "ALL",
          minOrder: 15000,
          startsAt: now,
          endsAt: new Date(now.getTime() + 14 * 24 * 3600 * 1000),
        },
        {
          name: "Diskon Berbagi Rp2.000",
          type: "NOMINAL",
          value: 2000,
          scope: "ALL",
          minOrder: 25000,
          startsAt: now,
          endsAt: new Date(now.getTime() + 30 * 24 * 3600 * 1000),
        },
      ],
    });
    console.log("✓ 2 promo contoh");
  }

  console.log("SEED SELESAI ✔");
}

main()
  .catch((e) => {
    console.error("Seed gagal:", e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
