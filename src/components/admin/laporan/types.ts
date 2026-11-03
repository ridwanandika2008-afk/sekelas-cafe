/** Tipe respons GET /api/laporan — dipakai komponen halaman Laporan. */

export type LaporanRingkasan = {
  totalPendapatan: number;
  jumlahPesanan: number;
  totalTunai: number;
  totalQris: number;
  rataRataPerPesanan: number;
  totalBiayaAntar: number;
  totalDiskon: number;
  jumlahPembatalan: number;
  totalDibatalkan: number;
};

export type LaporanData = {
  dari: string;
  sampai: string;
  ringkasan: LaporanRingkasan;
  perHari: { tanggal: string; pendapatan: number; jumlahPesanan: number }[];
  perJam: { jam: number; jumlahPesanan: number }[];
  menuTerlaris: { nama: string; qty: number; pendapatan: number }[];
  menuKurangDiminati: { nama: string; qty: number; pendapatan: number }[];
  perKasir: {
    nama: string;
    jumlahTransaksi: number;
    tunai: number;
    qris: number;
    total: number;
  }[];
  perMetodePenerimaan: { fulfillment: string; jumlah: number }[];
};

/** Unduh berkas dari API (kirim cookie sesi) lalu picu unduhan browser. */
export async function downloadFile(url: string, fallbackName: string): Promise<void> {
  const res = await fetch(url);
  if (!res.ok) {
    let pesan = "Gagal mengunduh berkas.";
    try {
      const j = (await res.json()) as { error?: string };
      if (j.error) pesan = j.error;
    } catch {
      /* respons bukan JSON */
    }
    throw new Error(pesan);
  }
  const blob = await res.blob();
  const cd = res.headers.get("content-disposition");
  const name = cd?.match(/filename="?([^";]+)"?/)?.[1] ?? fallbackName;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
}
