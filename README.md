# 🎓 LMS Classroom English untuk Calon Guru SD
### Program Studi S1 Pendidikan Guru Sekolah Dasar (PGSD) - Universitas Terbuka

Sistem Pembelajaran Daring (Learning Management System) interaktif yang dirancang khusus bagi mahasiswa Calon Guru SD (PGSD Universitas Terbuka) dalam menguasai keterampilan **Classroom Language for English Teachers** (Bahasa Kelas).

Aplikasi ini siap diunggah ke **GitHub** dan dijalankan langsung melalui **GitHub Pages** dengan database berbasis **Google Spreadsheet** yang aman dan terintegrasi secara real-time.

---

## 🌟 Fitur Utama LMS

1. **19 Modul Pembelajaran Terstruktur**:
   - **Video Pelatihan**: Tersemat langsung dari playlist resmi YouTube (tersinkronisasi 19 video).
   - **Materi & Panduan (Dokumen PDF)**: Rangkuman tabel ungkapan bahasa Inggris, terjemahan bahasa Indonesia, panduan gestur tubuh (TPR), skenario kelas, serta tautan langsung membaca/mengunduh dokumen asli PDF di folder `docs/`.
   - **Kuis Pilihan Ganda Esensial**: 3–4 soal kontekstual per modul dengan pembahasan langsung.
   - **Sistem Syarat Kelulusan Berurutan**: Modul berikutnya hanya akan terbuka jika mahasiswa telah mencapai batas kelulusan minimal **70%** pada kuis modul sebelumnya.

2. **Pendaftaran & Autentikasi Mahasiswa UT**:
   - Pilihan Kelas: **PGSD 1A** atau **PGSD 1B**.
   - Input: **NIM** dan **Nama Lengkap**.
   - **Username & Password Otomatis**: Mahasiswa menggunakan NIM mereka sebagai username dan password awal.

3. **Papan Peringkat Real-Time (Leaderboard)**:
   - Menampilkan peringkat mahasiswa secara langsung berdasarkan jumlah modul yang telah lulus dan akumulasi skor kuis.
   - Dilengkapi podium visual untuk Peringkat 1 (Emas), 2 (Perak), dan 3 (Perunggu).
   - Filter kelas: **Semua Kelas**, **PGSD 1A**, atau **PGSD 1B**.
   - Sensor privasi otomatis (NIM disamarkan sebagian untuk proteksi privasi mahasiswa).

4. **Transkrip & Lembar Capaian Akademik (Bisa Unduh PDF)**:
   - Mahasiswa dapat memantau capaian belajar secara mandiri.
   - Memuat rekapitulasi nilai 19 modul, predikat huruf (A/B/C/D), status kelulusan, dan tanggal penyelesaian.
   - Tombol **"Cetak / Unduh Capaian (PDF)"** dengan tata letak resmi kop Universitas Terbuka FKIP PGSD.

5. **Sertifikat Kelulusan Resmi (Certificate of Completion)**:
   - Otomatis terbuka ketika mahasiswa berhasil menuntaskan seluruh 19 modul pelatihan.
   - Format sertifikat beresolusi tinggi dengan bingkai ornamen formal Universitas Terbuka, stempel emas verified, kode nomor verifikasi unik, dan tanda tangan tutor.
   - Dapat diunduh atau dicetak langsung ke format PDF.

6. **Panel Khusus Tutor (Keamanan & Privasi Database)**:
   - Mahasiswa **tidak dapat** mengakses lembar Google Spreadsheet database secara langsung.
   - Tutor dapat masuk ke **Panel Tutor** menggunakan PIN rahasia (default: `tutor123`).
   - Tautan langsung membuka Google Spreadsheet Database.
   - Rekap tabel seluruh mahasiswa, pemantauan kemajuan belajar, dan tombol **Unduh Rekap Nilai (CSV/Excel)**.

---

## 🗄️ Database Google Spreadsheet & Backend

Database menggunakan Google Spreadsheet:
👉 [https://docs.google.com/spreadsheets/d/1ETjJYbWnNVIfYhzAdx0gs77c73k6CsRW_-9-ZU4gQsc](https://docs.google.com/spreadsheets/d/1ETjJYbWnNVIfYhzAdx0gs77c73k6CsRW_-9-ZU4gQsc)

### Cara Memasang Google Apps Script (Sekali Pasang):

1. Buka spreadsheet database di atas menggunakan akun Google Tutor Anda.
2. Pada menu atas, klik **Extensions** (Ekstensi) ➔ **Apps Script**.
3. Buka file [`google-apps-script/Code.gs`](google-apps-script/Code.gs) di repositori ini, lalu salin (*copy*) seluruh isinya.
4. Tempel (*paste*) ke dalam editor Google Apps Script menggantikan kode yang ada.
5. Klik ikon **Save** (Disket / Ctrl+S).
6. Klik tombol **Deploy** (Terapkan) di pojok kanan atas ➔ pilih **New deployment** (Penerapan baru).
7. Konfigurasi penerapan:
   - **Select type** (Pilih jenis): **Web app** (Aplikasi Web)
   - **Description**: `LMS Backend v1`
   - **Execute as**: `Me (email Anda)`
   - **Who has access**: `Anyone` *(PENTING: pilih Anyone agar GitHub Pages dapat mengirim nilai)*
8. Klik **Deploy**. Jika muncul permintaan izin otorisasi Google (*Authorization Required*), klik *Review Permissions* ➔ pilih akun Anda ➔ klik *Advanced* ➔ klik *Go to Untitled project (unsafe)* ➔ klik *Allow*.
9. Salin **Web app URL** yang dihasilkan (contoh: `https://script.google.com/macros/s/AKfycb.../exec`).
10. Masuk ke LMS pada tab **Panel Tutor** ➔ masukkan PIN `tutor123` ➔ tempelkan Web app URL tersebut ke kotak konfigurasi dan klik **Simpan URL**. Database kini aktif 100%!

---

## 🚀 Panduan Mengunggah ke GitHub & Mengaktifkan GitHub Pages

Aplikasi ini dibuat murni menggunakan teknologi standar web modern (**HTML5, CSS3, JavaScript Vanilla**) tanpa perlu *build step* atau *npm install*, sehingga dapat langsung dijalankan oleh GitHub Pages!

### Langkah Unggah ke GitHub:

1. Buka terminal/PowerShell di folder ini (`c:\Users\KOMPUTERKU2\Documents\classroom-lang`).
2. Inisialisasi git dan buat repositori:
   ```bash
   git init
   git add .
   git commit -m "Inisialisasi LMS Classroom English UT PGSD"
   git branch -M main
   ```
3. Buat repositori baru di akun [GitHub](https://github.com/new) Anda (misalnya diberi nama `classroom-english-ut`).
4. Hubungkan dan dorong (*push*) ke GitHub:
   ```bash
   git remote add origin https://github.com/USERNAME-ANDA/classroom-english-ut.git
   git push -u origin main
   ```

### Langkah Mengaktifkan GitHub Pages (Gratis):

1. Buka repositori Anda di GitHub melalui browser.
2. Klik tab **Settings** (Pengaturan) di bagian atas repositori.
3. Di bilah sisi kiri, klik menu **Pages**.
4. Di bagian **Build and deployment** ➔ **Branch**:
   - Pilih branch: **`main`**
   - Pilih folder: **`/(root)`**
5. Klik tombol **Save**.
6. Tunggu sekitar 1–2 menit. Halaman web LMS Anda akan aktif di alamat:
   ```
   https://USERNAME-ANDA.github.io/classroom-english-ut/
   ```

---

## 📁 Struktur Berkas Repositori

```
classroom-lang/
├── index.html                 # Halaman utama SPA LMS
├── css/
│   └── styles.css             # Desain responsif, tema UT, & layout cetak PDF
├── js/
│   ├── data-modules.js        # Dataset 19 modul, bank soal kuis, & ringkasan
│   └── app.js                 # Logika LMS, autentikasi, sync Google Sheets, & sertifikat
├── docs/                      # 20 Dokumen Modul Resmi (Format PDF)
│   ├── 1.  Bahasa Kelas Untuk Guru [Classroom Language for Teachers].docx.pdf
│   ├── ... (Modul 2 s.d. 19)
│   └── Bermain “Kursi Panas” untuk Meningkatkan Literasi Murid.docx.pdf
├── google-apps-script/
│   └── Code.gs                # Kode backend API Google Spreadsheet
└── README.md                  # Panduan lengkap implementasi & operasional
```

---

## 🔐 Keamanan & Informasi Akun

- **Akun Mahasiswa**:
  - Didaftarkan secara mandiri melalui tombol **Daftar Baru**.
  - Username: NIM (contoh: `858012345`)
  - Password Awal: NIM (contoh: `858012345`)
- **Akses Tutor**:
  - Tombol **Panel Tutor** di bilah navigasi atas.
  - PIN Default: `tutor123` (dapat disesuaikan di `google-apps-script/Code.gs` dan `js/app.js`).

---
*Dikembangkan dengan penuh dedikasi untuk memajukan kompetensi Calon Guru Sekolah Dasar Indonesia melalui Program Studi S1 PGSD Universitas Terbuka.*
