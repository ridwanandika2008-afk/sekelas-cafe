"use client";

/**
 * Unggah gambar kecil (foto menu / QRIS) — validasi format & ukuran di klien,
 * kirim ke POST /api/upload (multipart field "file"), kembalikan URL publik.
 */
import { useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 2 * 1024 * 1024;

export function ImageUpload({
  value,
  onChange,
  label = "Unggah Gambar",
  hint,
  className,
  previewClassName,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
  label?: string;
  hint?: string;
  className?: string;
  previewClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (!ALLOWED.includes(file.type)) {
      toast.error("Format gambar harus JPG, PNG, atau WebP.");
      return;
    }
    if (file.size > MAX_BYTES) {
      toast.error("Ukuran gambar maksimal 2MB.");
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !json.url) {
        throw new Error(json.error ?? "Gagal mengunggah gambar.");
      }
      onChange(json.url);
      toast.success("Gambar berhasil diunggah.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal mengunggah gambar.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(e) => void handleFile(e.target.files?.[0])}
        aria-label={label}
      />
      <div className="flex flex-wrap items-center gap-3">
        {value ? (
          <img
            src={value}
            alt="Pratinjau gambar"
            className={cn(
              "h-16 w-16 rounded-lg border object-cover",
              previewClassName
            )}
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed bg-muted/50">
            <ImagePlus className="h-6 w-6 text-muted-foreground" aria-hidden />
          </div>
        )}
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-10"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <ImagePlus className="h-4 w-4" aria-hidden />
            )}
            {uploading ? "Mengunggah…" : value ? "Ganti Gambar" : label}
          </Button>
          {value && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 text-muted-foreground"
              onClick={() => onChange(null)}
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
              Hapus gambar
            </Button>
          )}
        </div>
      </div>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
