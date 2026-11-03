/** Tipe respons impor & helper unduh — dipakai halaman Import/Export Data. */

export type ImportType = "menu" | "kategori";

export type PreviewBaris = {
  no: number;
  data: Record<string, string>;
  status: "ok" | "error";
  pesanError: string | null;
  payload?: Record<string, unknown>;
};

export type ValidateResponse = {
  totalBaris: number;
  valid: number;
  bermasalah: number;
  baris: PreviewBaris[];
  ringkasan: string;
};

export type CommitResponse = {
  diimpor: number;
  diperbarui: number;
  dilewati: number;
  total: number;
};

export const IMPORT_LABEL: Record<ImportType, string> = {
  menu: "Menu",
  kategori: "Kategori",
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
