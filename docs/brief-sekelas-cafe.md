# Sekelas Cafe

## Gambaran Umum

Sekelas Cafe adalah platform website manajemen kafe yang dirancang untuk mendukung operasional kafe di lingkungan SMKN 1 Boyolangu, Tulungagung, Jawa Timur.

Kafe ini dikelola oleh pelajar, sehingga sistem harus dirancang agar mudah dipahami, praktis digunakan, dan mampu membantu staf menjalankan kegiatan operasional secara tertib dan efisien.

Sekelas Cafe bukan hanya website untuk menampilkan menu dan menerima pesanan. Platform ini harus menjadi satu ekosistem manajemen kafe yang mencakup pemesanan, pembayaran, pengelolaan menu, antrean dapur, kasir, operasional staf, pengiriman pesanan di lingkungan sekolah, laporan, serta pengelolaan data melalui Excel.

Tujuan utamanya adalah menciptakan sistem yang membuat operasional kafe lebih terorganisasi, meminimalkan kesalahan manusia, memudahkan pengelolaan keuangan, dan memberikan pengalaman pemesanan yang nyaman bagi pembeli.

## 1. Identitas dan Informasi Kafe

**Nama:** Sekelas Cafe

**Lokasi:** SMKN 1 Boyolangu

**Alamat:**
Jl. Ki Mangun Sarkoro No.VI/3, Dusun Talun, Beji, Kec. Boyolangu, Kabupaten Tulungagung, Jawa Timur 66233.

Gunakan lokasi sekolah yang diberikan sebagai referensi lokasi kafe. Integrasikan peta atau petunjuk lokasi apabila memang membantu pengalaman pengguna.

**Jam operasional:**
Setiap hari operasional mengikuti pengaturan kafe, dengan jam buka default pukul 07.00 sampai 14.00 WIB.

Jam operasional harus dapat diubah melalui pengaturan admin, tidak ditanam secara hardcode.

Sistem harus mampu menangani kondisi kafe sedang buka, belum buka, sudah tutup, maupun sedang libur atau tutup sementara.

Pesanan baru harus mengikuti aturan jam operasional yang berlaku. Pertimbangkan pula bagaimana menangani pesanan yang sudah masuk sebelum jam tutup tetapi belum selesai diproses.

## 2. Role dan Hak Akses

Sekelas Cafe memiliki empat role utama:

1. **Admin**
2. **Kasir**
3. **Barista**
4. **Pembeli**

Masing-masing role memiliki kebutuhan dan hak akses yang berbeda.

### Admin

Admin bertanggung jawab terhadap pengelolaan dan pengawasan keseluruhan operasional kafe.

Admin dapat mengelola:

- Dashboard operasional.
- Data pengguna dan role.
- Menu dan kategori menu.
- Harga dan ketersediaan produk.
- Bahan baku dan stok jika sistem inventaris bahan diterapkan.
- Pesanan dan transaksi.
- Pengaturan pembayaran.
- Pengaturan pengiriman.
- Data dan aktivitas kasir serta barista.
- Laporan penjualan dan operasional.
- Import dan export data.
- Pengaturan kafe.
- Pengaturan jam operasional.
- Pengelolaan promo dan diskon jika diperlukan.
- Riwayat aktivitas dan audit trail.

### Kasir

Kasir bertanggung jawab terhadap proses transaksi dan pembayaran.

Kasir dapat:

- Melihat pesanan yang masuk sesuai kewenangannya.
- Membuat pesanan melalui POS.
- Mengelola pesanan langsung di tempat jika diperlukan.
- Memproses pembayaran tunai.
- Memproses pembayaran QRIS sesuai mekanisme yang disediakan.
- Memverifikasi pembayaran sesuai kewenangannya.
- Mencetak struk pelanggan.
- Melihat riwayat transaksi yang relevan.
- Mengelola pembatalan atau koreksi transaksi sesuai izin.

### Barista

Barista bertanggung jawab terhadap proses pembuatan pesanan.

Barista dapat:

- Melihat antrean pesanan yang harus dibuat.
- Melihat detail setiap pesanan.
- Melihat daftar menu dan jumlah yang harus disiapkan.
- Mengubah status pengerjaan.
- Menandai setiap menu yang telah selesai dibuat.
- Melihat prioritas atau urutan antrean.
- Menyelesaikan pesanan setelah seluruh menu di dalamnya selesai dibuat.

Antarmuka barista harus dirancang agar praktis digunakan dalam kondisi operasional yang sibuk.

### Pembeli

Pembeli dapat:

- Melihat halaman beranda kafe.
- Menjelajahi menu dan kategori.
- Melihat foto, deskripsi, harga, dan ketersediaan menu.
- Menambahkan menu ke keranjang.
- Mengatur jumlah pesanan.
- Memilih variasi atau tambahan menu jika tersedia.
- Memilih metode pemesanan.
- Melakukan pemesanan.
- Memilih metode pembayaran.
- Melihat status pesanan.
- Melihat riwayat pesanan jika memiliki akun.
- Menghubungi kafe melalui WhatsApp.

Pertimbangkan apakah pembelian dapat dilakukan tanpa registrasi akun agar proses pemesanan lebih praktis, selama sistem tetap dapat mengelola identitas dan status pesanan dengan baik.

## 3. Website Pembeli dan Beranda

Halaman beranda merupakan wajah utama Sekelas Cafe.

Saya menginginkan gaya desain **warm minimalis**, dengan suasana hangat, nyaman, modern, dan tetap terlihat profesional.

Beranda harus mampu memperkenalkan kafe sekaligus memudahkan pembeli menemukan menu dan melakukan pemesanan.

Pertimbangkan elemen seperti:

- Hero section yang menarik.
- Identitas dan pengenalan Sekelas Cafe.
- Menu unggulan.
- Daftar kategori menu.
- Menu yang tersedia.
- Informasi jam operasional.
- Informasi lokasi kafe.
- Cara melakukan pemesanan.
- Tombol pemesanan yang mudah ditemukan.
- Informasi kontak dan WhatsApp.

Jangan membuat beranda terlalu ramai. Utamakan tampilan yang bersih, menarik, dan langsung mengarahkan pembeli kepada tujuan utamanya, yaitu memilih menu dan memesan.

Website harus responsif dan nyaman digunakan melalui smartphone karena kemungkinan besar pembeli mengaksesnya melalui perangkat mobile.

## 4. Manajemen Menu dan Produk

Admin harus memiliki kendali penuh atas seluruh menu yang dijual.

Sediakan pengelolaan CRUD untuk:

- Nama menu.
- Kategori.
- Deskripsi.
- Foto.
- Harga.
- Status ketersediaan.
- Variasi menu.
- Pilihan ukuran.
- Tambahan atau topping.
- Harga tambahan.
- Pengaturan lainnya yang diperlukan.

Menu harus dapat dikelompokkan ke dalam kategori yang dinamis.

Kategori tidak boleh ditanam secara hardcode. Admin harus dapat menambah, mengubah, mengarsipkan, dan mengelola kategori sesuai kebutuhan.

Sistem juga harus mendukung menu yang memiliki variasi, misalnya ukuran minuman, tingkat gula, tingkat es, topping, atau pilihan lainnya.

AI agent harus menentukan model pengelolaan variasi yang fleksibel tanpa membuat proses pemesanan menjadi rumit.

### Ketersediaan Menu

Admin harus dapat mengubah ketersediaan menu kapan saja.

Pertimbangkan status seperti:

- Tersedia.
- Habis.
- Tidak dijual sementara.
- Tidak aktif.

Jika suatu menu habis, pembeli tidak boleh tetap bisa memesan menu tersebut.

Jika memungkinkan, sistem juga dapat mendukung pengelolaan stok atau bahan baku agar ketersediaan menu dapat lebih terkontrol.

## 5. Sistem Pemesanan

Sediakan alur pemesanan yang sederhana bagi pembeli.

Secara umum, pembeli memilih menu, memasukkannya ke keranjang, mengatur jumlah dan variasi, lalu melanjutkan ke proses checkout.

Informasi pesanan setidaknya mencakup:

- Identitas atau nama pembeli.
- Daftar menu.
- Jumlah setiap menu.
- Variasi dan tambahan.
- Catatan khusus.
- Harga satuan.
- Subtotal.
- Biaya tambahan jika ada.
- Total pembayaran.
- Metode pembayaran.
- Metode penerimaan pesanan.
- Waktu pemesanan.
- Status pesanan.

Sediakan nomor pesanan unik agar pesanan mudah diidentifikasi oleh pembeli, kasir, dan barista.

Pertimbangkan tiga metode penerimaan pesanan:

- Makan atau mengambil langsung di kafe.
- Dibawa pulang.
- Diantar ke area sekolah.

AI agent dapat menyempurnakan pilihan tersebut berdasarkan alur operasional yang paling masuk akal.

Pastikan pesanan yang sudah masuk tidak mudah berubah tanpa pencatatan yang jelas.

## 6. Pengiriman di Area Sekolah

Sekelas Cafe beroperasi di lingkungan SMKN 1 Boyolangu.

Pengiriman hanya ditujukan ke area sekolah, bukan layanan pengiriman umum ke luar sekolah.

**Biaya pengiriman default adalah Rp1.000.**

Sistem harus menyediakan pengaturan biaya pengiriman yang dapat diubah oleh admin.

Untuk pesanan antar, pembeli harus dapat memberikan informasi lokasi tujuan secara jelas, misalnya:

- Nama gedung.
- Ruang kelas.
- Laboratorium.
- Area sekolah.
- Titik pengantaran.
- Catatan tambahan.

Buat alur pengantaran yang praktis bagi staf.

Pastikan biaya pengiriman hanya dikenakan pada pesanan yang menggunakan metode antar.

Pertimbangkan status pengiriman, seperti menunggu pengantaran, sedang diantar, dan sudah diterima.

Sistem tidak perlu menggunakan layanan logistik atau pihak ketiga berbayar.

## 7. Pembayaran

Sekelas Cafe mendukung dua metode pembayaran:

1. Tunai.
2. QRIS.

### Pembayaran Tunai

Kasir dapat mencatat pembayaran tunai, jumlah uang yang diterima, serta menghitung uang kembalian secara otomatis.

Pastikan transaksi tunai tercatat dengan benar dan dapat masuk ke laporan kas.

### Pembayaran QRIS

Sediakan opsi pembayaran menggunakan QRIS.

Karena proyek ini tidak menggunakan payment gateway, rancang mekanisme pembayaran QRIS tanpa integrasi payment gateway berbayar.

Pertimbangkan penggunaan QRIS statis atau mekanisme lain yang sah dan sesuai dengan kebutuhan operasional kafe.

Jika pembayaran perlu diverifikasi secara manual, sediakan alur yang jelas agar kasir dapat memastikan pembayaran telah diterima sebelum pesanan diproses sesuai kebijakan kafe.

Jangan menganggap screenshot bukti pembayaran sebagai bukti mutlak bahwa transaksi berhasil. Rancang prosedur verifikasi yang masuk akal dan aman.

Status pembayaran harus tercatat secara terpisah dari status pengerjaan pesanan.

## 8. Sistem POS Kasir

Sediakan antarmuka Point of Sale (POS) yang praktis bagi kasir.

POS harus memungkinkan kasir melakukan transaksi dengan cepat, termasuk ketika pembeli memesan langsung di kafe.

Pertimbangkan fitur:

- Pemilihan menu berdasarkan kategori.
- Pencarian menu.
- Penambahan dan pengurangan jumlah.
- Pemilihan variasi.
- Catatan pesanan.
- Keranjang transaksi.
- Perhitungan subtotal dan total.
- Penghitungan biaya pengiriman jika relevan.
- Pengelolaan pembayaran.
- Penghitungan uang kembalian.
- Pencetakan struk.
- Riwayat transaksi.
- Pembatalan dan koreksi transaksi dengan otorisasi.

POS harus nyaman digunakan pada layar desktop maupun tablet.

## 9. Sistem Antrean dan Dapur/Barista

Salah satu fitur penting Sekelas Cafe adalah sistem antrean pengerjaan pesanan.

Pesanan yang telah memenuhi ketentuan pembayaran harus diteruskan ke antrean pengerjaan sesuai alur operasional yang dirancang.

Barista harus memiliki tampilan antrean yang jelas dan mudah dipahami.

Setiap pesanan menampilkan informasi seperti:

- Nomor pesanan.
- Waktu masuk.
- Daftar menu.
- Jumlah masing-masing menu.
- Variasi dan tambahan.
- Catatan khusus.
- Informasi relevan lainnya.

### Checklist Pengerjaan Setiap Menu

Setiap pesanan dapat berisi beberapa menu.

Contohnya, satu pesanan memiliki:
- 2 Es Teh.
- 1 Kopi Susu.
- 1 Roti Bakar.

Barista tidak boleh langsung menekan tombol selesai untuk seluruh pesanan sebelum semua menu selesai dibuat.

Sediakan checklist pengerjaan pada setiap item menu.

Aturannya:

1. Setiap item menu memiliki status pengerjaan masing-masing.
2. Barista harus menandai menu yang sudah selesai dibuat.
3. Sistem menghitung jumlah item yang sudah selesai dan yang masih belum selesai.
4. Tombol penyelesaian pesanan hanya dapat digunakan apabila seluruh item menu sudah dicentang selesai.
5. Jika masih ada satu atau lebih item yang belum selesai, sistem harus mencegah penyelesaian pesanan.
6. Setelah seluruh menu selesai, barulah pesanan dapat ditandai selesai dibuat.

Contoh indikator:

`3 dari 4 menu selesai dibuat`

Tampilkan indikator progres secara jelas agar barista dapat mengetahui pekerjaan yang masih tersisa.

Mekanisme ini merupakan aturan penting untuk mencegah human error, khususnya ketika antrean sedang ramai dan staf menangani banyak pesanan sekaligus.

### Status Antrean

AI agent harus merancang status antrean yang sesuai dengan operasional kafe.

Sebagai gambaran:

- Menunggu pembayaran.
- Menunggu diproses.
- Sedang dibuat.
- Sebagian menu selesai.
- Semua menu selesai dibuat.
- Menunggu diambil.
- Sedang diantar.
- Selesai diterima.
- Dibatalkan.

Tidak semua status harus digunakan secara terpisah apabila terdapat pendekatan yang lebih sederhana. Yang terpenting, status pembayaran, pengerjaan, dan penyerahan pesanan tidak tercampur.

Pertimbangkan pembaruan antrean secara real-time agar kasir dan barista memiliki informasi yang konsisten.

## 10. Dua Jenis Struk

Sekelas Cafe harus memiliki dua jenis struk yang berbeda.

### Struk Pelanggan

Struk ini diberikan kepada pembeli sebagai bukti transaksi.

Informasi yang dapat ditampilkan:

- Logo dan nama Sekelas Cafe.
- Alamat atau identitas kafe.
- Nomor pesanan.
- Tanggal dan waktu transaksi.
- Nama pembeli jika tersedia.
- Daftar menu.
- Jumlah dan harga.
- Variasi dan tambahan.
- Subtotal.
- Biaya pengiriman jika ada.
- Total pembayaran.
- Metode pembayaran.
- Jumlah uang diterima dan kembalian untuk transaksi tunai.
- Informasi tambahan jika diperlukan.

Desain struk harus ringkas, jelas, dan cocok untuk printer thermal maupun format cetak lainnya.

### Struk Dapur

Struk dapur ditujukan untuk barista atau staf yang menyiapkan pesanan.

Struk ini harus fokus pada kebutuhan pengerjaan, bukan informasi keuangan.

Informasi yang dapat ditampilkan:

- Nomor pesanan.
- Waktu pesanan masuk.
- Nama pembeli jika diperlukan.
- Daftar menu.
- Jumlah setiap menu.
- Variasi dan tambahan.
- Catatan khusus.
- Informasi pengiriman atau pengambilan.
- Prioritas atau informasi penting lainnya.

Struk dapur harus mudah dibaca dan tidak dipenuhi informasi yang tidak dibutuhkan barista.

AI agent harus menentukan alur pencetakan kedua struk agar sesuai dengan proses transaksi.

## 11. WhatsApp dan Kontak Kafe

Gunakan WhatsApp melalui tautan `wa.me` dengan nomor resmi berikut:

**0851-5182-3036**

Nomor tersebut digunakan sebagai kontak WhatsApp Sekelas Cafe.

Sediakan tombol WhatsApp pada tempat yang relevan, misalnya halaman beranda, footer, dan halaman kontak.

Pertimbangkan pesan otomatis yang sudah diisi sebelumnya melalui tautan WhatsApp, misalnya untuk pertanyaan menu, informasi pesanan, atau bantuan pembeli.

Gunakan format nomor internasional yang sesuai ketika membentuk tautan WhatsApp.

Tidak perlu menggunakan WhatsApp Business API atau layanan integrasi pihak ketiga berbayar.

## 12. Laporan dan Analisis Operasional

Sediakan fitur laporan yang lengkap untuk membantu admin memahami kondisi bisnis kafe.

Laporan harus dapat dibuat kapan saja, bukan hanya berdasarkan jadwal rutin.

Pertimbangkan jenis laporan seperti:

- Laporan penjualan harian.
- Laporan penjualan berdasarkan periode.
- Laporan penjualan berdasarkan menu.
- Laporan menu terlaris.
- Laporan menu yang kurang diminati.
- Laporan transaksi tunai.
- Laporan transaksi QRIS.
- Laporan total pendapatan.
- Laporan biaya pengiriman.
- Laporan pembatalan dan pengembalian dana jika ada.
- Laporan aktivitas kasir.
- Laporan aktivitas barista.
- Laporan jam ramai.
- Laporan jumlah pesanan.
- Laporan operasional lainnya.

Sediakan filter berdasarkan tanggal, periode, metode pembayaran, menu, dan parameter relevan lainnya.

Laporan harus memiliki tampilan yang profesional, mudah dibaca, dan dapat digunakan sebagai bahan evaluasi pengelolaan kafe.

Pastikan laporan menggunakan data transaksi yang valid dan tidak menghitung transaksi yang belum selesai atau dibatalkan secara keliru.

## 13. Excel Management: Import dan Export

Pengelolaan file dan Excel merupakan salah satu kebutuhan penting Sekelas Cafe.

Sistem harus menyediakan kemampuan import dan export data secara komprehensif.

### Import

Pertimbangkan import untuk:

- Data menu.
- Kategori menu.
- Harga.
- Variasi dan tambahan menu.
- Data pendukung.
- Data transaksi historis jika memang diperlukan.

Sediakan template Excel yang dapat diunduh agar pengguna memahami struktur file yang harus diisi.

Sebelum data diimpor, lakukan:

- Validasi format.
- Pemeriksaan kolom wajib.
- Pemeriksaan tipe data.
- Pemeriksaan harga dan angka.
- Pemeriksaan duplikasi.
- Preview data.
- Ringkasan data yang valid dan bermasalah.

Tampilkan informasi kesalahan secara spesifik agar admin mudah memperbaiki file.

Jangan langsung memasukkan data yang belum lolos validasi.

### Export

Sediakan export data sesuai kebutuhan, seperti:

- Daftar menu.
- Daftar kategori.
- Data transaksi.
- Data penjualan.
- Laporan harian.
- Laporan periode tertentu.
- Data operasional lainnya.

Dukung format Excel (.xlsx) dan CSV. Pertimbangkan PDF untuk laporan yang membutuhkan tampilan siap cetak.

Hasil export harus rapi, terstruktur, dan sesuai dengan filter yang dipilih.

## 14. Manajemen Stok dan Bahan Baku

AI agent harus mengevaluasi kebutuhan pengelolaan stok bahan baku untuk mendukung operasional kafe.

Pertimbangkan sistem yang dapat mencatat:

- Nama bahan.
- Satuan.
- Jumlah stok.
- Batas stok minimum.
- Riwayat stok masuk.
- Riwayat penggunaan.
- Penyesuaian stok.
- Bahan yang hampir habis.
- Bahan yang habis.

Jika diterapkan, sistem dapat menghubungkan menu dengan bahan baku melalui resep atau komposisi.

Ketika pesanan diproses, sistem dapat menghitung pengurangan bahan sesuai komposisi menu.

Namun, jangan membuat sistem stok yang terlalu rumit jika kebutuhan operasional kafe belum memerlukannya.

Prioritaskan solusi yang benar-benar dapat digunakan dan dikelola oleh pelajar yang menjalankan kafe.

## 15. Manajemen Shift dan Kas

Karena kafe dikelola oleh pelajar, pertimbangkan fitur pengelolaan shift kasir dan pencatatan kas.

Fitur dapat mencakup:

- Pembukaan shift.
- Pencatatan saldo awal kas.
- Total transaksi tunai.
- Total transaksi QRIS.
- Pengeluaran kas jika diperlukan.
- Penutupan shift.
- Perhitungan saldo akhir.
- Selisih kas.
- Riwayat aktivitas kasir.

Tujuannya adalah memudahkan pencatatan keuangan dan pertanggungjawaban transaksi.

AI agent harus menentukan alur yang sederhana, tidak membebani staf, tetapi tetap dapat dipertanggungjawabkan.

## 16. Manajemen Promo dan Pengaturan Harga

Pertimbangkan fitur promo atau diskon jika memang sesuai dengan kebutuhan kafe.

Contohnya:

- Diskon nominal.
- Diskon persentase.
- Promo menu tertentu.
- Promo berdasarkan periode.
- Harga khusus yang dikonfigurasi admin.

Pastikan aturan promo tidak menyebabkan kesalahan perhitungan transaksi.

Semua data promo dan pengaturan harga harus dikelola secara dinamis.

## 17. Identitas Visual dan Desain

Saya menginginkan identitas visual Sekelas Cafe menggunakan kombinasi warna utama:

- **Espresso Brown:** sebagai warna utama yang memberikan kesan hangat, kuat, dan elegan.
- **Caramel Gold:** sebagai warna aksen yang memberikan kesan nyaman, bersahabat, dan khas kafe.

AI agent bertanggung jawab menentukan kode warna yang paling sesuai, termasuk warna pendukung, warna teks, latar belakang, border, dan status.

Jangan menggunakan warna secara berlebihan.

### Karakter Desain

Halaman beranda harus memiliki gaya warm minimalis.

Untuk dashboard admin, kasir, dan barista, prioritaskan desain yang lebih fungsional, jelas, dan efisien.

Gunakan ikon dari library yang sesuai dan berkualitas. AI agent bebas melakukan riset terhadap icon library yang tersedia di internet dan memilih yang paling cocok.

Pastikan seluruh ikon konsisten secara gaya, ukuran, dan penggunaan.

Hindari penggunaan ikon yang tidak jelas maknanya atau hanya menjadi dekorasi.

### Konsistensi Tampilan

Seluruh halaman harus memiliki sistem desain yang konsisten, termasuk:

- Tipografi.
- Warna.
- Tombol.
- Formulir.
- Tabel.
- Kartu.
- Modal.
- Navigasi.
- Notifikasi.
- Status pesanan.

Website harus responsif dan nyaman digunakan pada desktop, tablet, dan smartphone.

## 18. Manajemen Data dan Pengaturan Dinamis

Seluruh data yang berpotensi bertambah atau berubah tidak boleh ditanam secara hardcode.

Sediakan CRUD untuk data yang relevan, termasuk:

- Menu.
- Kategori.
- Variasi.
- Tambahan atau topping.
- Bahan baku.
- Pengguna.
- Pengaturan harga.
- Promo.
- Metode dan pengaturan pembayaran.
- Pengaturan jam operasional.
- Biaya pengiriman.
- Pengaturan struk.
- Template laporan.
- Pengaturan kafe.
- Data pendukung lainnya.

Jika suatu data sudah digunakan dalam transaksi historis, perubahan atau penghapusannya harus mempertimbangkan integritas data.

Gunakan mekanisme pengarsipan atau penonaktifan jika penghapusan permanen berisiko merusak riwayat transaksi.

## 19. Notifikasi dan Riwayat Aktivitas

Sediakan notifikasi internal yang membantu pengguna mengetahui informasi penting.

Contohnya:

- Pesanan baru.
- Pembayaran terkonfirmasi.
- Pesanan masuk antrean barista.
- Menu selesai dibuat.
- Pesanan siap diambil.
- Pesanan sedang diantar.
- Pesanan selesai.
- Stok bahan hampir habis.
- Perubahan status penting.

Sediakan riwayat aktivitas yang mencatat tindakan penting admin, kasir, dan barista.

Catatan aktivitas harus membantu admin melakukan evaluasi dan mengetahui siapa yang melakukan perubahan tertentu.

## 20. Keamanan dan Integritas Sistem

Karena sistem menangani transaksi keuangan dan operasional kafe, keamanan merupakan prioritas.

Perhatikan:

- Autentikasi yang aman.
- Otorisasi berdasarkan role.
- Validasi input frontend dan backend.
- Perlindungan data pembeli.
- Keamanan transaksi.
- Pencegahan transaksi ganda.
- Pencegahan manipulasi harga dari sisi client.
- Pengamanan proses pembayaran.
- Pengamanan file import dan export.
- Audit trail.
- Penanganan error.
- Backup dan pemulihan data.

Pastikan pembeli tidak dapat mengakses dashboard internal, kasir tidak dapat melakukan tindakan administratif di luar kewenangannya, dan barista hanya memiliki akses yang diperlukan untuk operasional pengerjaan pesanan.

Setiap tindakan penting harus memiliki pemeriksaan otorisasi di backend, bukan hanya menyembunyikan tombol di frontend.

## 21. Prinsip Pengembangan dan Kebebasan AI Agent

Seluruh ide dalam brief ini merupakan gambaran awal produk yang ingin diwujudkan.

AI agent diberikan kebebasan dan tanggung jawab untuk melakukan riset, analisis, evaluasi, perancangan, implementasi, pengujian, serta penyempurnaan produk secara mandiri.

Jangan hanya menjadi pelaksana instruksi secara mekanis.

Anda diharapkan:

- Meneliti praktik terbaik pengembangan sistem kafe dan POS.
- Mengevaluasi alur pemesanan dan operasional.
- Menentukan arsitektur dan teknologi terbaik.
- Merancang database dan relasi data yang tepat.
- Mengembangkan pengalaman pengguna yang sederhana.
- Mengidentifikasi kebutuhan yang belum disebutkan.
- Mengkritisi ide yang kurang tepat.
- Menemukan solusi yang lebih baik jika diperlukan.
- Menguji seluruh alur operasional secara menyeluruh.
- Memperbaiki masalah secara proaktif.

Jangan mengubah visi utama dan ketentuan penting proyek tanpa alasan kuat.

Utamakan kualitas produk, kebutuhan operasional kafe, keamanan transaksi, dan kenyamanan pengguna.

## 22. Batasan Biaya dan Ketergantungan

Proyek ini memiliki prinsip no-capital.

Ketentuannya:

- Tidak menggunakan layanan berbayar.
- Tidak menggunakan subscription berbayar.
- Tidak menggunakan payment gateway.
- Tidak menggunakan layanan pihak ketiga berbayar.
- Tidak menggunakan verifikasi email yang membutuhkan SMTP.
- Tidak mengharuskan kartu pembayaran atau metode pembayaran lainnya.
- Tidak boleh memiliki ketergantungan tersembunyi yang menimbulkan biaya operasional.

Utamakan teknologi open source, self-hosted jika memungkinkan, serta layanan gratis atau free tier yang memadai.

Pembayaran QRIS tetap harus dapat berjalan tanpa payment gateway, dengan mekanisme yang sesuai untuk operasional kafe.

WhatsApp menggunakan tautan `wa.me`, bukan integrasi API berbayar.

Jika suatu fitur membutuhkan layanan berbayar, cari alternatif gratis yang layak.

Jangan mengorbankan keamanan atau keandalan hanya demi menghindari biaya.

## 23. Dokumentasi dan Transparansi

Buat dan pelihara file `WORKLOG.md` untuk mencatat perkembangan proyek.

Catat secara konsisten:

- Progres pengembangan.
- Fitur yang sudah selesai.
- Fitur yang sedang dikerjakan.
- Fitur yang belum diimplementasikan.
- Keputusan teknis dan arsitektur.
- Perubahan dan alasan perubahan.
- Hasil pengujian.
- Kendala dan risiko.
- Langkah berikutnya.

Dokumentasi harus mencerminkan kondisi implementasi yang sebenarnya.

Jangan menyatakan fitur selesai jika belum benar-benar diimplementasikan dan diuji.

## 24. Tujuan Akhir

Wujudkan Sekelas Cafe sebagai platform manajemen kafe yang lengkap, terintegrasi, mudah digunakan, dan dapat diandalkan untuk mendukung operasional kafe di SMKN 1 Boyolangu.

Sistem harus mampu menghubungkan pembeli, kasir, dan barista dalam satu alur kerja yang jelas.

Mulai dari pembeli memilih menu, melakukan pemesanan, menyelesaikan pembayaran, pesanan masuk antrean, barista menyiapkan setiap item dengan checklist, hingga pesanan diserahkan atau diantarkan kepada pembeli.

Di sisi administrasi, sistem harus menyediakan pengelolaan menu, transaksi, stok, laporan, dan Excel management yang komprehensif.

Jangan berhenti pada website pemesanan sederhana atau POS biasa.

Bangun Sekelas Cafe sebagai sistem operasional kafe yang benar-benar dapat digunakan oleh pelajar untuk menjalankan kafe secara profesional, tertib, dan efisien.

**Jadikan Sekelas Cafe sebagai tempat di mana pengalaman menikmati kafe yang nyaman bertemu dengan sistem operasional yang cerdas dan terorganisasi.**