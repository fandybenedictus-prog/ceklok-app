# Panduan Deployment CekLok Aplikasi

Aplikasi ini terdiri dari dua bagian (Frontend & Backend) yang harus di-online-kan secara terpisah agar bisa diakses public.

## Persiapan: Upload ke GitHub
Sebelum deploy, kode harus ada di GitHub.
1. Buat repository baru di GitHub (misal: `ceklok-app`).
2. Push kode Anda ke repository tersebut.

---

## Bagian 1: Deploy Backend (Server)
Kita akan menggunakan **Render (Gratis)** untuk menjalankan server Socket.io.

1. Buka [dashboard.render.com](https://dashboard.render.com/).
2. Klik **New +** -> **Web Service**.
3. Pilih **Build and deploy from a Git repository** -> Connect ke GitHub -> Pilih repo `ceklok-app`.
4. Isi konfigurasi berikut:
   - **Name**: `ceklok-server` (atau nama unik lain)
   - **Region**: Singapore (supaya cepat)
   - **Branch**: `main`
   - **Root Directory**: `.` (biarkan kosong / titik)
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.cjs`
5. Pilih **Free** plan -> Klik **Create Web Service**.
6. Tunggu proses deploy selesai.
7. **PENTING**: Copy link URL backend Anda (contoh: `https://ceklok-server.onrender.com`). Anda akan butuh ini untuk Frontend.

---

## Bagian 2: Deploy Frontend (Tampilan)
Kita akan menggunakan **Vercel (Gratis)** untuk aplikasinya.

1. Buka [vercel.com](https://vercel.com) -> Login/Signup.
2. Klik **Add New...** -> **Project**.
3. Import repository GitHub `ceklok-app`.
4. Di halaman **Configure Project**:
   - **Framework Preset**: Vite (biasanya otomatis terdeteksi).
   - Scroll ke **Environment Variables** (PENTING!).
   - Masukkan Key: `VITE_BACKEND_URL`
   - Masukkan Value: URL Backend dari Render tadi (misal: `https://ceklok-server.onrender.com`) **tanpa garis miring di akhir**.
   - Klik **Add**.
5. Klik **Deploy**.
6. Tunggu selesai.

## Selesai!
Sekarang aplikasi Anda sudah online.
- Buka link Vercel di HP Penjual.
- Buka link Vercel di HP Pembeli.
- GPS akan otomatis aktif karena Vercel sudah menggunakan HTTPS.
