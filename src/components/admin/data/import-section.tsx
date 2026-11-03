"use client";

/**
 * Kartu Import Data — dua langkah aman:
 * (1) pilih jenis + unduh template, (2) unggah → validasi → pratinjau per baris
 * (baris valid hijau, baris bermasalah merah + pesan) → impor hanya baris valid.
 */
import { Fragment, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileSpreadsheet,
  FileUp,
  ListChecks,
  Loader2,
  Upload,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  IMPORT_LABEL,
  downloadFile,
  type CommitResponse,
  type ImportType,
  type ValidateResponse,
} from "./types";

const MAX_FILE_BYTES = 2 * 1024 * 1024;

export function ImportSection() {
  const [type, setType] = useState<ImportType>("menu");
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [preview, setPreview] = useState<ValidateResponse | null>(null);
  const [hasil, setHasil] = useState<CommitResponse | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetPratinjau = () => {
    setPreview(null);
    setHasil(null);
  };

  const gantiJenis = (t: string) => {
    const next = t === "kategori" ? "kategori" : "menu";
    if (next !== type) {
      setType(next);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      resetPratinjau();
    }
  };

  const pilihFile = (f: File | null) => {
    setFile(f);
    resetPratinjau();
  };

  const validasi = async () => {
    if (!file) return;
    const lower = file.name.toLowerCase();
    if (file.size > MAX_FILE_BYTES) {
      toast.error("Ukuran berkas melebihi batas 2MB.");
      return;
    }
    if (!lower.endsWith(".xlsx") && !lower.endsWith(".csv")) {
      toast.error("Format berkas harus .xlsx atau .csv sesuai template.");
      return;
    }
    setValidating(true);
    try {
      const fd = new FormData();
      fd.append("type", type);
      fd.append("file", file);
      const res = await fetch("/api/data/import/validate", {
        method: "POST",
        body: fd,
      });
      const json = (await res.json()) as ValidateResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Validasi gagal.");
      setPreview(json);
      setHasil(null);
      if (json.bermasalah === 0) {
        toast.success(json.ringkasan);
      } else {
        toast.warning(json.ringkasan);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Validasi gagal.");
    } finally {
      setValidating(false);
    }
  };

  const impor = async () => {
    if (!preview) return;
    const rows = preview.baris
      .filter((b) => b.status === "ok" && b.payload)
      .map((b) => b.payload);
    if (rows.length === 0) return;
    setCommitting(true);
    try {
      const res = await fetch("/api/data/import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, rows }),
      });
      const json = (await res.json()) as CommitResponse & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Impor gagal.");
      setHasil(json);
      setPreview(null);
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      const bagian = [
        `${json.diimpor} baru diimpor`,
        `${json.diperbarui} diperbarui`,
        `${json.dilewati} dilewati`,
      ].join(" · ");
      toast.success(`Impor ${IMPORT_LABEL[type]} selesai — ${bagian}.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Impor gagal.");
    } finally {
      setCommitting(false);
    }
  };

  const unduhTemplate = async () => {
    try {
      await downloadFile(
        `/api/data/template?type=${type}`,
        `template-import-${type}.xlsx`
      );
      toast.success(`Template ${IMPORT_LABEL[type]} berhasil diunduh.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunduh template.");
    }
  };

  const kolomMenu = ["Nama", "Kategori", "Harga", "Deskripsi", "Status", "Unggulan", "Urutan"];
  const kolomKategori = ["Nama", "Urutan", "Diarsipkan"];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Upload className="h-5 w-5 text-primary" aria-hidden />
          Import Data
        </CardTitle>
        <CardDescription>
          Impor menu atau kategori dari berkas Excel/CSV. Data divalidasi dan
          ditinjau dulu — tidak ada yang tersimpan sebelum Anda menekan tombol impor.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Langkah 1 */}
        <section aria-label="Langkah 1 — pilih jenis data" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              1
            </span>
            <p className="font-medium">Pilih jenis data &amp; unduh template</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 pl-8">
            <Tabs value={type} onValueChange={gantiJenis}>
              <TabsList className="h-10">
                <TabsTrigger value="menu" className="px-4">
                  Menu
                </TabsTrigger>
                <TabsTrigger value="kategori" className="px-4">
                  Kategori
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Button
              variant="outline"
              className="h-10"
              onClick={() => void unduhTemplate()}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden />
              Unduh Template {IMPORT_LABEL[type]}
            </Button>
          </div>
          <p className="pl-8 text-xs text-muted-foreground">
            Template berisi kolom wajib, 2 baris contoh, dan sheet &ldquo;Petunjuk&rdquo;
            berisi penjelasan setiap kolom.
          </p>
        </section>

        {/* Langkah 2 */}
        <section aria-label="Langkah 2 — unggah berkas" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              2
            </span>
            <p className="font-medium">Unggah berkas &amp; periksa pratinjau</p>
          </div>
          <div className="flex flex-wrap items-end gap-3 pl-8">
            <div className="grid min-w-56 flex-1 gap-1.5 sm:max-w-sm">
              <label htmlFor="impor-file" className="text-sm font-medium">
                Berkas (.xlsx / .csv, maks. 2MB &amp; 500 baris)
              </label>
              <Input
                id="impor-file"
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.csv"
                onChange={(e) => pilihFile(e.target.files?.[0] ?? null)}
                className="h-10"
              />
            </div>
            <Button
              className="h-10"
              onClick={() => void validasi()}
              disabled={!file || validating}
            >
              {validating ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ListChecks className="h-4 w-4" aria-hidden />
              )}
              Validasi &amp; Pratinjau
            </Button>
          </div>
        </section>

        {/* Hasil commit */}
        {hasil && (
          <div
            role="status"
            className="flex items-start gap-3 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30"
          >
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden />
            <div>
              <p className="font-medium">
                Impor {IMPORT_LABEL[type]} berhasil.
              </p>
              <p className="text-sm text-muted-foreground">
                {hasil.diimpor} data baru diimpor · {hasil.diperbarui} data diperbarui ·{" "}
                {hasil.dilewati} baris dilewati.
              </p>
            </div>
          </div>
        )}

        {/* Pratinjau */}
        {preview && (
          <section aria-label="Pratinjau hasil validasi" className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border bg-secondary px-3 py-1 text-xs font-semibold">
                {preview.totalBaris} baris
              </span>
              <span className="rounded-full border border-emerald-300 bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300">
                {preview.valid} valid
              </span>
              {preview.bermasalah > 0 && (
                <span className="rounded-full border border-red-300 bg-red-100 px-3 py-1 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
                  {preview.bermasalah} bermasalah
                </span>
              )}
              <span className="text-xs text-muted-foreground">{preview.ringkasan}</span>
            </div>

            <div className="max-h-96 overflow-y-auto rounded-xl border">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-card">
                  <TableRow>
                    <TableHead className="w-12 text-center">Baris</TableHead>
                    {(type === "menu" ? kolomMenu : kolomKategori).map((k) => (
                      <TableHead key={k}>{k}</TableHead>
                    ))}
                    <TableHead className="w-20 text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {preview.baris.map((b) => (
                    <Fragment key={`frag-${b.no}`}>
                      <TableRow
                        className={cn(
                          b.status === "ok"
                            ? "bg-emerald-50/60 dark:bg-emerald-950/20"
                            : "bg-red-50/70 dark:bg-red-950/25"
                        )}
                      >
                        <TableCell className="text-center text-xs text-muted-foreground">
                          {b.no}
                        </TableCell>
                        {type === "menu"
                          ? ["nama", "kategori", "harga", "deskripsi", "status", "unggulan", "urutan"].map(
                              (f) => (
                                <TableCell
                                  key={f}
                                  className={cn(
                                    "max-w-[160px] truncate",
                                    f === "nama" && "font-medium",
                                    f === "deskripsi" && "text-muted-foreground"
                                  )}
                                >
                                  {b.data[f] || "—"}
                                </TableCell>
                              )
                            )
                          : ["nama", "urutan", "diarsipkan"].map((f) => (
                              <TableCell
                                key={f}
                                className={cn("max-w-[200px] truncate", f === "nama" && "font-medium")}
                              >
                                {b.data[f] || "—"}
                              </TableCell>
                            ))}
                        <TableCell className="text-center">
                          {b.status === "ok" ? (
                            <CheckCircle2
                              className="mx-auto h-5 w-5 text-emerald-600 dark:text-emerald-400"
                              aria-label="Valid"
                            />
                          ) : (
                            <AlertTriangle
                              className="mx-auto h-5 w-5 text-red-600 dark:text-red-400"
                              aria-label="Bermasalah"
                            />
                          )}
                        </TableCell>
                      </TableRow>
                      {b.status === "error" && b.pesanError && (
                        <TableRow className="bg-red-50/70 dark:bg-red-950/25">
                          <TableCell colSpan={type === "menu" ? 9 : 5} className="py-2 text-xs text-red-700 dark:text-red-300">
                            {b.pesanError}
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => void impor()}
                disabled={preview.valid === 0 || committing}
                className="h-10"
              >
                {committing ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <FileUp className="h-4 w-4" aria-hidden />
                )}
                Impor {preview.valid} Baris Valid
              </Button>
              <Button
                variant="ghost"
                className="h-10"
                onClick={() => {
                  resetPratinjau();
                  setFile(null);
                  if (fileInputRef.current) fileInputRef.current.value = "";
                }}
                disabled={committing}
              >
                Batalkan
              </Button>
            </div>
          </section>
        )}
      </CardContent>
    </Card>
  );
}
