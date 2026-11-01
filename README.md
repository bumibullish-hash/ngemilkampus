# NgemilKampus

Aplikasi website pre-order camilan dan minuman kampus. Pembeli memesan lewat website, membayar dengan QRIS melalui Bayaraja, lalu mengambil pesanan di titik ambil. Penjual mengelola produk, transaksi, laporan penjualan, dan laporan keuangan.

Proyek mata kuliah Digital Entrepreneurship.

## Teknologi

| Bagian | Teknologi |
|---|---|
| Backend | Node.js, Express 5 |
| Database | MongoDB Atlas, Mongoose |
| Login | JWT di cookie httpOnly, bcryptjs |
| Validasi | express-validator |
| Keamanan | helmet (CSP), express-rate-limit |
| Upload foto | multer (foto disimpan di MongoDB) |
| PDF | pdfkit |
| Grafik | Chart.js |
| Frontend | HTML, CSS, JavaScript |
| Pembayaran | Bayaraja (QRIS dinamis dan payment link) |

## Struktur Folder

```
ngemilkampus/
  backend/
    config/        koneksi database
    models/        skema MongoDB
    middleware/    login, role, validasi, upload, error
    controllers/   logika setiap fitur
    routes/        daftar endpoint dan halaman
    services/      Bayaraja, pembayaran, laporan, PDF
    utils/         format, periode tanggal, nomor invoice
    seeds/         membuat admin, kategori, produk contoh dan dummy
    scripts/       cek koneksi Bayaraja
    app.js         pengaturan Express
    server.js      menjalankan server
  frontend/
    css/           style.css
    js/            script setiap halaman
    pages/user/    halaman user
    pages/admin/   halaman admin
    pages/         invoice
    index.html, produk.html, login.html, register.html, ...
  tests/           pengujian otomatis
  .env.example
  package.json
```

## Cara Menjalankan

1. Pasang Node.js versi 18 atau lebih baru.
2. Pasang dependency:

   ```
   npm install
   ```

3. Salin `.env.example` menjadi `.env`:

   ```
   copy .env.example .env      (Windows)
   cp .env.example .env        (Mac/Linux)
   ```

4. Isi `.env`:

   | Variabel | Isi |
   |---|---|
   | `MONGODB_URI` | Connection string Atlas. Tambahkan nama database, contoh `...mongodb.net/ngemilkampus` |
   | `JWT_SECRET` | Teks acak minimal 16 karakter |
   | `BAYARAJA_BASE_URL` | Alamat instance Bayaraja Anda, contoh `https://bayaraja.arwebs.my.id` |
   | `BAYARAJA_API_KEY` | API Key dari Pengaturan, API Keys di dashboard Bayaraja |
   | `BAYARAJA_QRIS_ACCOUNT_ID` | ID akun QRIS di Bayaraja (wajib untuk payment link) |
   | `BAYARAJA_WEBHOOK_SECRET` | Hanya jika memakai webhook |
   | `PAYMENT_EXPIRE_MINUTES` | Batas waktu bayar, bawaan 30 menit |
   | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | Akun admin yang dibuat oleh seed |

   Membuat `JWT_SECRET` acak:

   ```
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```

5. Di MongoDB Atlas, buka Network Access dan izinkan IP komputer Anda.
6. Buat akun admin, kategori, dan produk contoh (aman dijalankan berulang kali):

   ```
   npm run seed:contoh
   ```

   Gunakan `npm run seed` jika tidak ingin produk contoh. Jika login admin gagal, jalankan `npm run reset-admin` untuk membuat atau mengatur ulang password admin sesuai `.env`.

   Untuk data uji yang lebih lengkap (21 produk bergambar, satu produk stok tipis, satu produk stok habis, dan satu akun pembeli uji), jalankan:

   ```
   npm run seed:dummy
   ```

   Perintah ini aman diulang. Setiap dijalankan, harga dan stok produk dummy kembali ke nilai awal, sehingga pengujian pembelian bisa diulang. Akun pembeli uji: `pembeli@ngemilkampus.local` dengan password `pembeli123`. Hapus akun itu sebelum aplikasi dipakai sungguhan, atau jalankan dengan `npm run seed:dummy -- --tanpa-user`. Perintah ini tidak membuat transaksi palsu.

7. Periksa koneksi Bayaraja:

   ```
   npm run cek-bayaraja
   npm run cek-bayaraja -- --tes-link
   ```

   Opsi kedua membuat satu payment link uji bernilai Rp 1.000.

8. Jalankan aplikasi:

   ```
   npm start
   ```

   Mode pengembangan yang restart otomatis: `npm run dev`.

9. Buka `http://localhost:3000`. Backend dan frontend dilayani oleh satu server, tidak ada server frontend terpisah.

## Foto Produk

Foto produk bersifat opsional. Produk tanpa foto menampilkan nama produk sebagai tulisan pada latar berwarna sesuai kategori. Foto yang diunggah disimpan di MongoDB.

## Akun

- **Admin:** email dan password dari `ADMIN_EMAIL` dan `ADMIN_PASSWORD` di `.env`. Akun admin tidak bisa dibuat lewat registrasi.
- **User:** daftar sendiri di halaman Daftar.

## Alur Pembayaran Bayaraja

Bayaraja memakai konfirmasi manual oleh pemilik akun, sehingga alurnya:

1. Pembeli checkout dan memilih QRIS atau Payment Link.
2. Aplikasi membuat payment link di Bayaraja (`POST /api/links`). Untuk metode QRIS, aplikasi juga membuat QR dinamis (`POST /api/qris/create-amount`) dan menampilkannya.
3. Pembeli membayar, lalu membuka halaman Bayaraja dan mengunggah bukti pembayaran.
4. Pemilik akun Bayaraja mengonfirmasi atau menolak di dashboard Bayaraja.
5. Halaman pembayaran mengecek status tiap 5 detik (`GET /api/pay/{slug}/status`). Status menjadi Paid hanya setelah Bayaraja melaporkan pembayaran terkonfirmasi dan nominalnya sama dengan total pesanan.

Aturan lain:

- Pesanan yang melewati batas waktu menjadi Expired dan stok dikembalikan, kecuali ada bukti pembayaran yang masih menunggu konfirmasi.
- Pembayaran Rejected atau Expired mengembalikan stok satu kali saja.
- Jika pembayaran dikonfirmasi setelah pesanan Expired, tombol Sinkronkan di menu Transaksi akan mengubahnya menjadi Paid dan mengurangi stok kembali.
- Omzet dan laporan hanya menghitung transaksi Paid.

### Webhook

Endpoint `POST /api/webhooks/bayaraja` memverifikasi signature HMAC SHA256 dengan `BAYARAJA_WEBHOOK_SECRET`. Webhook tidak bisa menjangkau localhost, jadi polling status adalah mekanisme utama. Untuk mencoba webhook, gunakan tunnel seperti ngrok atau Cloudflare Tunnel.

Catatan jujur: nama header signature tidak ada di dokumentasi Bayaraja yang tersedia. Kode memeriksa beberapa nama umum (`x-bayaraja-signature`, `x-webhook-signature`, `x-signature`). Webhook yang valid hanya memicu pengecekan ulang status ke Bayaraja, bukan langsung menandai lunas. Pengujian dengan webhook Bayaraja asli belum dilakukan.

## Pengujian

Pengujian otomatis memakai database khusus yang namanya berakhiran `_test`. Isinya dihapus setiap kali tes berjalan, jadi jangan arahkan ke database asli.

```
set TEST_MONGODB_URI=mongodb://127.0.0.1:27017/ngemilkampus_test     (Windows)
export TEST_MONGODB_URI=mongodb://127.0.0.1:27017/ngemilkampus_test  (Mac/Linux)
npm test
```

Tes meniru server Bayaraja (`tests/mockBayaraja.js`) agar alur konfirmasi, penolakan, dan kedaluwarsa bisa diuji. Server tiruan itu hanya alat uji, bukan bagian aplikasi. Pengujian ke Bayaraja asli dilakukan lewat `npm run cek-bayaraja` dan transaksi manual.

## Deploy ke Vercel

Vercel menjalankan fungsi serverless, bukan server yang menyala terus. Proyek ini sudah disesuaikan: `api/index.js` adalah pintu masuk fungsi, `vercel.json` mengarahkan semua alamat ke fungsi itu dan menyertakan file yang dibutuhkan, foto produk disimpan di MongoDB (bukan disk), dan pengecekan pesanan kedaluwarsa berjalan lewat cron harian serta saat admin membuka Dashboard atau Transaksi.

1. Unggah semua file ke GitHub, termasuk `api/index.js` dan `vercel.json`:

   ```
   git add .
   git commit -m "Siap deploy Vercel"
   git push
   ```

2. Di Vercel, buka Project Settings, General. Pengaturan Build and Output:
   - Framework Preset: Other
   - Build Command: kosongkan
   - Output Directory: kosongkan
   - Root Directory: `./`

3. Di Settings, Environment Variables, isi (untuk Production):

   | Variabel | Isi |
   |---|---|
   | `MONGODB_URI` | Connection string Atlas, dengan nama database di ujungnya, contoh `...mongodb.net/ngemilkampus` |
   | `JWT_SECRET` | Teks acak minimal 16 karakter |
   | `BAYARAJA_BASE_URL` | `https://bayaraja.arwebs.my.id` |
   | `BAYARAJA_API_KEY` | API Key Bayaraja |
   | `BAYARAJA_QRIS_ACCOUNT_ID` | ID akun QRIS |
   | `BAYARAJA_WEBHOOK_SECRET` | Opsional, jika memakai webhook |
   | `PAYMENT_EXPIRE_MINUTES` | `30` |
   | `CRON_SECRET` | Teks acak. Vercel mengirimnya otomatis saat menjalankan cron |

   `NODE_ENV` diisi Vercel sendiri sebagai `production`.

4. Di MongoDB Atlas, buka Network Access, tambahkan `0.0.0.0/0`. Alamat IP Vercel berubah-ubah, jadi tanpa ini koneksi akan gagal.
5. Di Vercel, buka Deployments, pilih deployment terakhir, lalu Redeploy (variabel baru hanya terbaca setelah deploy ulang).
6. Buka `https://NAMA-PROYEK.vercel.app/api/health`. Hasil yang benar: `"database":"terhubung"`.
7. Isi data awal ke database yang sama dari komputer Anda (file `.env` lokal menunjuk ke Atlas yang sama):

   ```
   npm run seed:dummy
   ```

8. Opsional, webhook: di dashboard Bayaraja, Pengaturan, Webhooks, isi URL `https://NAMA-PROYEK.vercel.app/api/webhooks/bayaraja` dan samakan secret-nya dengan `BAYARAJA_WEBHOOK_SECRET`.

Jika ada error, buka Vercel, Deployments, pilih deployment, lalu tab Logs.

Catatan: cron di paket Hobby hanya boleh berjalan sekali sehari, jadi pesanan kedaluwarsa terutama dibereskan saat admin membuka Dashboard atau Transaksi, dan saat pembeli membuka halaman pembayarannya.

## Keamanan

- `.env` masuk `.gitignore`. Jangan pernah mengunggahnya ke GitHub.
- API Key dan connection string hanya dipakai di backend.
- Password disimpan sebagai hash bcrypt.
- Token login disimpan di cookie httpOnly dan tidak bisa dibaca JavaScript.
- Halaman dan API admin dilindungi di server. User tidak bisa membuka halaman admin, dan user hanya bisa melihat transaksinya sendiri.
- Jika kredensial pernah tertulis di chat atau tempat umum, ganti password database dan buat API Key baru.

## Pemecahan Masalah

| Masalah | Penyebab dan solusi |
|---|---|
| `Gagal menjalankan aplikasi: connect ... ` | IP belum diizinkan di Network Access Atlas, atau `MONGODB_URI` salah |
| `Alamat Bayaraja tidak mengembalikan data JSON` | `BAYARAJA_BASE_URL` salah. Gunakan alamat instance Bayaraja Anda |
| `API Key Bayaraja tidak valid` | API Key salah atau dinonaktifkan di dashboard Bayaraja |
| `BAYARAJA_QRIS_ACCOUNT_ID belum diisi` | Isi ID akun QRIS dari Bayaraja, lalu restart server |
| Status pembayaran tetap Pending | Pemilik akun belum mengonfirmasi di dashboard Bayaraja, atau bukti belum diunggah di halaman Bayaraja |
| Login admin selalu "Email atau password salah" | Akun admin belum dibuat, atau dibuat dengan password lama (seed tidak menimpa akun yang sudah ada). Jalankan `npm run cek-login` untuk melihat penyebab pastinya, lalu `npm run reset-admin`, lalu login dengan `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dari `.env` |
| Perubahan `.env` tidak berpengaruh | `.env` hanya dibaca saat server mulai. Hentikan server (Ctrl + C) lalu jalankan lagi. `npm run dev` tidak restart otomatis untuk perubahan `.env` |
| Font tidak muncul | Perlu internet untuk Google Fonts. Tampilan tetap berfungsi dengan font cadangan |
