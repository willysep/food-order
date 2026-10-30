# 🍲 KateringApp - Web App Pemesanan Makanan

Aplikasi web pemesanan makanan katering/kantin berbasis Single Page Application (SPA) murni menggunakan **HTML, CSS, dan JavaScript Native** (tanpa framework, tanpa bundler/build tool) dengan tema bernuansa **jingga lembut (warm peach)** yang minimalis dan *mobile-friendly*.

Aplikasi ini siap di-deploy langsung ke **GitHub Pages**. Pada tahap prototipe ini, data disimpan secara lokal di browser (`localStorage`).

---

## 🚀 Panduan Menjalankan Aplikasi Secara Lokal

Karena aplikasi ini menggunakan arsitektur JavaScript Module standar (`<script type="module">`), jalankan menggunakan web server lokal sederhana (jangan membuka langsung file dengan klik ganda protokol `file:///` karena akan terkena batasan CORS browser):

### Opsi 1: Menggunakan Node.js (Disarankan)
Buka terminal / PowerShell di folder proyek ini (`d:\Dev\food-order`):
```bash
npx serve .
# atau
npx http-server .
```

### Opsi 2: Menggunakan Python
```bash
python -m http.server 8080
```

Buka peramban (browser) dan akses alamat yang tampil di terminal, misalnya:
👉 **`http://localhost:8080`** atau **`http://localhost:3000`**

---

## 🎁 Panduan Uji Coba Cepat dengan Data Demo

Jika Anda ingin langsung mencoba seluruh alur tanpa perlu menginput data satu per satu dari awal, gunakan fitur **Muat Data Demo**:

### Cara Mengaktifkan Data Demo:
1. Buka aplikasi di browser.
2. Pada halaman pertama (**Setup Admin Pertama**), klik tombol **"Muat Data Contoh / Demo"** di bagian bawah form.
3. *(Atau jika sudah login sebagai admin, buka menu **Pengaturan** &rarr; klik **Muat Data Demo**).*

---

### Kredensial Akun Data Demo:

| Peran | Nama | Nomor HP | PIN (6 Digit) | Hak Akses Utama |
|---|---|---|---|---|
| **Admin** | Admin Utama | `0811000001` | `123456` | Dashboard, kelola status pesanan, kuota/jadwal porsi, daftar menu, registrasi pelanggan |
| **Pelanggan 1** | Budi Santoso | `08123456789` | `111111` | Pesan menu makanan, cek riwayat pesanan & status bayar, batalkan pesanan |
| **Pelanggan 2** | Siti Aminah | `08987654321` | `222222` | Pesan menu makanan & pantau pesanan |

---

## 🧪 Skenario Uji Coba Langkah demi Langkah (Walkthrough)

### Skenario A: Pelanggan Memesan Makanan
1. Buka halaman login (`#/login`), masukkan nomor HP `08123456789` dan PIN `111111`.
2. Di halaman **Pesan Makanan**:
   - Pilih tanggal konsumsi (misal: klik chip **Besok** atau **Lusa**).
   - Perhatikan daftar makanan lezat lengkap dengan foto dan sisa kuota.
   - Tekan tombol **`+`** pada makanan yang diinginkan (misal: 2 porsi Ayam Bakar Madu).
   - Tulis catatan tambahan jika perlu (misal: *"sambal dipisah ya"*).
   - Klik tombol **Kirim Pesanan &rarr;** di bilah bawah, lalu klik **OK** pada dialog konfirmasi.
3. Anda akan otomatis dialihkan ke menu **Pesanan Saya**. Status pesanan pertama kali adalah **Menunggu** dengan status bayar **Belum Bayar**.
4. *(Uji Pembatalan)*: Selama status masih *Menunggu*, pelanggan bisa menekan tombol merah **Batalkan** untuk mengembalikan kuota ke stok.

---

### Skenario B: Admin Mengelola Pesanan & Dashboard
1. Klik tombol **Keluar** di pojok kanan atas.
2. Login sebagai admin: nomor HP `0811000001` dan PIN `123456`.
3. Buka menu **Pesanan**:
   - Anda akan melihat pesanan yang baru saja dibuat oleh pelanggan di atas.
   - Ubah status pesanan dari dropdown: `Menunggu` &rarr; `Diproses` &rarr; `Siap` &rarr; `Selesai`.
   - Klik badge status pembayaran untuk mengubahnya menjadi **Lunas**.
   - Klik tombol **Detail** untuk melihat rincian item pesanan dan catatan pelanggan.
4. Buka menu **Dashboard**:
   - Lihat statistik omset: angka **Pemasukan (Lunas)** akan bertambah otomatis.
   - Perhatikan **Grafik Batang SVG** pemasukan harian dan daftar **5 Menu Terlaris**.
5. Buka menu **Kuota & Jadwal**:
   - Pilih tanggal (hari ini / besok / tanggal mendatang).
   - Tambah atau ubah batas kuota porsi makanan, lalu klik **Simpan Perubahan**.
   - Tersedia tombol **"Salin Kuota dari Tanggal Lain..."** untuk menyalin jadwal porsi secara cepat.
6. Buka menu **Pelanggan**:
   - Admin dapat mendaftarkan pelanggan baru (Nama, Nomor HP, dan PIN awal 6 digit).
   - Admin bisa melakukan reset PIN jika pelanggan lupa PIN.

---

## ⚙️ Fitur Cadangan Data (Backup & Restore)

Karena data disimpan di `localStorage` peramban:
- Buka menu **Pengaturan (`#/admin/settings`)**.
- **Unduh File JSON**: Menyimpan seluruh data pesanan, pelanggan, dan menu ke file `.json` di komputer Anda.
- **Pilih File Cadangan JSON**: Memulihkan data dari berkas cadangan kapan saja.
- **Reset Seluruh Data**: Menghapus seluruh data dari browser jika ingin mengulang dari awal.

---

## 🌐 Cara Deploy ke GitHub Pages

1. Buat repositori baru di GitHub Anda (misal: `food-order`).
2. Jalankan perintah git berikut dari folder proyek:
   ```bash
   git init
   git add .
   git commit -m "Deploy web app food order"
   git branch -M main
   git remote add origin https://github.com/<username-anda>/food-order.git
   git push -u origin main
   ```
3. Buka repositori di situs GitHub &rarr; pilih tab **Settings** &rarr; klik **Pages** (di bilah kiri).
4. Pada menu **Build and deployment**:
   - **Source**: `Deploy from a branch`
   - **Branch**: `main` | folder: `/(root)`
5. Klik **Save**. Dalam 1-2 menit aplikasi akan live di alamat:
   `https://<username-anda>.github.io/food-order/`
   *(File `.nojekyll` sudah disertakan di root agar aset dimuat sempurna).*

---

## 🗄️ Rekomendasi Arsitektur Database (Untuk Fase Produksi)

Saat ini aplikasi berada pada tahap prototipe mandiri (tanpa backend). Untuk penggunaan di dunia nyata antar-perangkat (admin di laptop, pelanggan di HP masing-masing):

### Rekomendasi Utama: Supabase (PostgreSQL BaaS)
* **Kelebihan**:
  - Relasional murni (sangat ideal untuk stok per tanggal, pesanan, dan rekap keuangan).
  - Row Level Security (RLS) menjaga pesanan pelanggan hanya bisa diakses oleh pemiliknya.
  - RPC Database Functions memastikan pengurangan stok terjadi secara atomik (mencegah *race condition* jika dua orang memesan porsi terakhir bersamaan).
  - Memiliki fitur Storage untuk unggah file foto makanan langsung dari komputer/HP admin.
* **Kemudahan Migrasi**:
  Seluruh manipulasi data aplikasi ini telah dipusatkan dan diisolasi di [`js/store.js`](./js/store.js). Untuk beralih ke Supabase, tampilan antarmuka (UI/View) tidak perlu diubah sama sekali, cukup mengubah implementasi fungsi penyimpanan di `store.js`.

---

## 🧪 Pengujian Otomatis

Logika bisnis (validasi nomor telepon Indonesia, kalkulasi stok, proteksi pembatalan, dan perhitungan pemasukan) diuji menggunakan Node.js Test Runner:

```bash
node --test tests/store.test.mjs tests/utils.test.mjs
```
Semua 11 test kasus lulus pengujian (100% pass).
