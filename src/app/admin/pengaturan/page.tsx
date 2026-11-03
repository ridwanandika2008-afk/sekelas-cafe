"use client";

/**
 * Pengaturan Kafe — beberapa Card section dengan tombol simpan per-section.
 * Identitas, Jam Operasional (+ tutup sementara & jadwal 7 hari),
 * Pengantaran, Pembayaran (QRIS + unggah gambar), dan Struk.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bike,
  Clock,
  Info,
  Loader2,
  QrCode,
  ReceiptText,
  Save,
  Store,
} from "lucide-react";
import { toast } from "sonner";
import { DAY_NAMES } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ImageUpload } from "@/components/admin/image-upload";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Settings = {
  cafeName: string;
  address: string;
  whatsapp: string;
  heroHeadline: string;
  heroSubheadline: string;
  heroImageUrl: string;
  aboutText: string | null;
  deliveryFee: number;
  deliveryEnabled: boolean;
  qrisImageUrl: string | null;
  qrisEnabled: boolean;
  cashEnabled: boolean;
  receiptFooter: string;
  temporarilyClosed: boolean;
  closedMessage: string;
  mapQuery: string;
};

type Schedule = { dayOfWeek: number; isOpen: boolean; openTime: string; closeTime: string };

export default function AdminPengaturanPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const [savingSection, setSavingSection] = useState<string | null>(null);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/pengaturan");
      if (res.ok && mounted.current) {
        const json = (await res.json()) as { settings: Settings; schedules: Schedule[] };
        setSettings(json.settings);
        setSchedules(
          Array.from({ length: 7 }, (_, d) =>
            json.schedules.find((s) => s.dayOfWeek === d) ?? {
              dayOfWeek: d,
              isOpen: true,
              openTime: "07:00",
              closeTime: "14:00",
            }
          )
        );
      }
    } catch {
      /* coba lagi */
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const patchSettings = (patch: Partial<Settings>) => {
    setSettings((s) => (s ? { ...s, ...patch } : s));
  };

  const patchSchedule = (dayOfWeek: number, patch: Partial<Schedule>) => {
    setSchedules((list) => list.map((s) => (s.dayOfWeek === dayOfWeek ? { ...s, ...patch } : s)));
  };

  /** PUT parsial settings; section untuk UI busy + toast kontekstual */
  const saveSettings = async (section: string, payload: Record<string, unknown>) => {
    setSavingSection(section);
    try {
      const res = await fetch("/api/admin/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Gagal menyimpan pengaturan.");
      if (json.settings && mounted.current) setSettings(json.settings as Settings);
      toast.success("Pengaturan tersimpan — tampilan pembeli langsung diperbarui.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan pengaturan.");
    } finally {
      setSavingSection(null);
    }
  };

  /** Simpan jam operasional: settings (tutup sementara) + jadwal 7 hari */
  const saveJamOperasional = async () => {
    if (!settings) return;
    setSavingSection("jam");
    try {
      const res1 = await fetch("/api/admin/pengaturan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          temporarilyClosed: settings.temporarilyClosed,
          closedMessage: settings.closedMessage,
        }),
      });
      const json1 = await res1.json().catch(() => ({}));
      if (!res1.ok) throw new Error(json1.error ?? "Gagal menyimpan status buka.");

      const res2 = await fetch("/api/admin/pengaturan/jadwal", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ days: schedules }),
      });
      const json2 = await res2.json().catch(() => ({}));
      if (!res2.ok) throw new Error(json2.error ?? "Gagal menyimpan jadwal.");
      if (json2.schedules && mounted.current) setSchedules(json2.schedules as Schedule[]);

      toast.success("Jam operasional tersimpan.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Gagal menyimpan jam operasional.");
    } finally {
      setSavingSection(null);
    }
  };

  if (loading || !settings) {
    return (
      <main className="space-y-6">
        <Skeleton className="h-10 w-64" />
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-40 rounded-2xl" />
        ))}
      </main>
    );
  }

  return (
    <main className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">Pengaturan Kafe</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Atur identitas, jam buka, pengantaran, pembayaran, dan struk. Setiap section punya
          tombol simpan sendiri.
        </p>
      </div>

      {/* a. Identitas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Store className="h-4.5 w-4.5 text-primary" aria-hidden />
            Identitas Kafe
          </CardTitle>
          <CardDescription>Nama, alamat, dan teks yang tampil di beranda pembeli.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="st-nama">Nama Kafe *</Label>
              <Input
                id="st-nama"
                value={settings.cafeName}
                onChange={(e) => patchSettings({ cafeName: e.target.value })}
                maxLength={60}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-wa">Nomor WhatsApp</Label>
              <Input
                id="st-wa"
                value={settings.whatsapp}
                onChange={(e) => patchSettings({ whatsapp: e.target.value })}
                placeholder="cth. 0851xxxxxxx"
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="st-alamat">Alamat</Label>
              <Textarea
                id="st-alamat"
                value={settings.address}
                onChange={(e) => patchSettings({ address: e.target.value })}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-headline">Headline Beranda</Label>
              <Input
                id="st-headline"
                value={settings.heroHeadline}
                onChange={(e) => patchSettings({ heroHeadline: e.target.value })}
                maxLength={80}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="st-subheadline">Sub-headline Beranda</Label>
              <Input
                id="st-subheadline"
                value={settings.heroSubheadline}
                onChange={(e) => patchSettings({ heroSubheadline: e.target.value })}
                maxLength={120}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="st-tentang">Teks "Tentang Kami"</Label>
              <Textarea
                id="st-tentang"
                value={settings.aboutText ?? ""}
                onChange={(e) => patchSettings({ aboutText: e.target.value })}
                placeholder="Ceritakan kafe kalian…"
                rows={3}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="st-peta">Query Peta (Google Maps)</Label>
              <Input
                id="st-peta"
                value={settings.mapQuery}
                onChange={(e) => patchSettings({ mapQuery: e.target.value })}
                placeholder="cth. SMKN 1 Boyolangu, Tulungagung"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button
              className="h-11"
              disabled={savingSection === "identitas"}
              onClick={() =>
                void saveSettings("identitas", {
                  cafeName: settings.cafeName,
                  address: settings.address,
                  whatsapp: settings.whatsapp,
                  heroHeadline: settings.heroHeadline,
                  heroSubheadline: settings.heroSubheadline,
                  aboutText: settings.aboutText,
                  mapQuery: settings.mapQuery,
                })
              }
            >
              {savingSection === "identitas" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              Simpan Identitas
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* b. Jam Operasional */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4.5 w-4.5 text-primary" aria-hidden />
            Jam Operasional
          </CardTitle>
          <CardDescription>
            Jadwal buka per hari (WIB). Pembeli hanya bisa memesan saat kafe buka.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50/60 p-4 dark:border-red-900 dark:bg-red-950/20">
            <div>
              <Label htmlFor="st-tutup" className="cursor-pointer font-semibold">
                Tutup Sementara (Libur)
              </Label>
              <p className="text-xs text-muted-foreground">
                Mengaktifkan ini menutup pemesanan online apa pun jadwalnya.
              </p>
            </div>
            <Switch
              id="st-tutup"
              checked={settings.temporarilyClosed}
              onCheckedChange={(v) => patchSettings({ temporarilyClosed: v })}
              aria-label="Tutup sementara"
            />
          </div>

          {settings.temporarilyClosed && (
            <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/40 p-4 dark:border-red-900 dark:bg-red-950/10">
              <Label htmlFor="st-pesan-tutup">Pesan untuk Pembeli Saat Tutup</Label>
              <Textarea
                id="st-pesan-tutup"
                value={settings.closedMessage}
                onChange={(e) => patchSettings({ closedMessage: e.target.value })}
                rows={2}
                maxLength={200}
              />
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="py-2 pr-4 font-semibold">Hari</th>
                  <th className="py-2 pr-4 font-semibold">Buka?</th>
                  <th className="py-2 pr-4 font-semibold">Jam Buka</th>
                  <th className="py-2 font-semibold">Jam Tutup</th>
                </tr>
              </thead>
              <tbody>
                {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                  const s = schedules.find((x) => x.dayOfWeek === d);
                  if (!s) return null;
                  return (
                    <tr key={d} className="border-b last:border-0">
                      <td className="py-2.5 pr-4 font-medium">{DAY_NAMES[d]}</td>
                      <td className="py-2.5 pr-4">
                        <Switch
                          checked={s.isOpen}
                          onCheckedChange={(v) => patchSchedule(d, { isOpen: v })}
                          aria-label={`${DAY_NAMES[d]} buka`}
                        />
                      </td>
                      <td className="py-2.5 pr-4">
                        <Input
                          type="time"
                          value={s.openTime}
                          onChange={(e) => patchSchedule(d, { openTime: e.target.value })}
                          className="h-10 w-32"
                          aria-label={`Jam buka ${DAY_NAMES[d]}`}
                        />
                      </td>
                      <td className="py-2.5">
                        <Input
                          type="time"
                          value={s.closeTime}
                          onChange={(e) => patchSchedule(d, { closeTime: e.target.value })}
                          className="h-10 w-32"
                          aria-label={`Jam tutup ${DAY_NAMES[d]}`}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end">
            <Button
              className="h-11"
              disabled={savingSection === "jam"}
              onClick={() => void saveJamOperasional()}
            >
              {savingSection === "jam" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              Simpan Jam Operasional
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* c. Pengantaran */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bike className="h-4.5 w-4.5 text-primary" aria-hidden />
            Pengantaran Area Sekolah
          </CardTitle>
          <CardDescription>Biaya antar ditambahkan otomatis ke pesanan diantar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border p-4">
            <div>
              <Label htmlFor="st-antar" className="cursor-pointer font-semibold">
                Layanan Antar Aktif
              </Label>
              <p className="text-xs text-muted-foreground">
                Nonaktif = pembeli hanya bisa makan di tempat / bawa pulang
              </p>
            </div>
            <Switch
              id="st-antar"
              checked={settings.deliveryEnabled}
              onCheckedChange={(v) => patchSettings({ deliveryEnabled: v })}
            />
          </div>
          <div className="max-w-56 space-y-2">
            <Label htmlFor="st-biaya">Biaya Antar (Rupiah)</Label>
            <Input
              id="st-biaya"
              type="number"
              min={0}
              step={500}
              value={settings.deliveryFee}
              onChange={(e) => patchSettings({ deliveryFee: Number(e.target.value) || 0 })}
              inputMode="numeric"
            />
          </div>
          <div className="flex justify-end">
            <Button
              className="h-11"
              disabled={savingSection === "antar"}
              onClick={() =>
                void saveSettings("antar", {
                  deliveryEnabled: settings.deliveryEnabled,
                  deliveryFee: settings.deliveryFee,
                })
              }
            >
              {savingSection === "antar" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              Simpan Pengantaran
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* d. Pembayaran */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <QrCode className="h-4.5 w-4.5 text-primary" aria-hidden />
            Metode Pembayaran
          </CardTitle>
          <CardDescription>Atur metode yang boleh dipakai pembeli.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <Label htmlFor="st-tunai" className="cursor-pointer font-semibold">
                  Tunai
                </Label>
                <p className="text-xs text-muted-foreground">Bayar di kasir saat pengambilan</p>
              </div>
              <Switch
                id="st-tunai"
                checked={settings.cashEnabled}
                onCheckedChange={(v) => patchSettings({ cashEnabled: v })}
              />
            </div>
            <div className="flex items-center justify-between rounded-xl border p-4">
              <div>
                <Label htmlFor="st-qris" className="cursor-pointer font-semibold">
                  QRIS
                </Label>
                <p className="text-xs text-muted-foreground">Scan &amp; verifikasi kasir</p>
              </div>
              <Switch
                id="st-qris"
                checked={settings.qrisEnabled}
                onCheckedChange={(v) => patchSettings({ qrisEnabled: v })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Gambar QRIS</Label>
            <ImageUpload
              value={settings.qrisImageUrl}
              onChange={(url) => patchSettings({ qrisImageUrl: url })}
              label="Unggah QRIS"
              hint="Gambar QRIS ditampilkan kasir saat pembeli memilih QRIS. JPG/PNG/WebP maks 2MB."
              previewClassName="h-28 w-28"
            />
          </div>

          <div className="flex justify-end">
            <Button
              className="h-11"
              disabled={savingSection === "bayar"}
              onClick={() =>
                void saveSettings("bayar", {
                  cashEnabled: settings.cashEnabled,
                  qrisEnabled: settings.qrisEnabled,
                  qrisImageUrl: settings.qrisImageUrl,
                })
              }
            >
              {savingSection === "bayar" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              Simpan Pembayaran
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* e. Struk */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ReceiptText className="h-4.5 w-4.5 text-primary" aria-hidden />
            Struk
          </CardTitle>
          <CardDescription>Teks kecil di bagian bawah struk pembelian.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="st-footer">Footer Struk</Label>
            <Textarea
              id="st-footer"
              value={settings.receiptFooter}
              onChange={(e) => patchSettings({ receiptFooter: e.target.value })}
              rows={2}
              maxLength={200}
            />
            <p className={cn("text-right text-xs", settings.receiptFooter.length >= 190 ? "text-red-600" : "text-muted-foreground")}>
              {settings.receiptFooter.length}/200 karakter
            </p>
          </div>
          <div className="flex justify-end">
            <Button
              className="h-11"
              disabled={savingSection === "struk"}
              onClick={() => void saveSettings("struk", { receiptFooter: settings.receiptFooter })}
            >
              {savingSection === "struk" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Save className="h-4 w-4" aria-hidden />
              )}
              Simpan Struk
            </Button>
          </div>
        </CardContent>
      </Card>

      <p className="flex items-start gap-2 text-xs text-muted-foreground">
        <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        Semua perubahan pengaturan langsung diterapkan ke tampilan pembeli dan kasir (cache
        pengaturan otomatis disegarkan server).
      </p>
    </main>
  );
}
