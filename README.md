# PaperMarkdown Studio 📄➡️📝

> **Layout-Aware Academic PDF & Word to Structured Markdown Converter for AI, Large Language Models, and Thesis Writing.**

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FLuthfi-2004%2Fpapermarkdown-studio)
[![Docker Ready](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
[![Python](https://img.shields.io/badge/Python-3.11+-3776AB?logo=python&logoColor=white)](https://www.python.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Design](https://img.shields.io/badge/Design-Anti--Slop-0d9488)](DESIGN.md)

---

## 🌟 Mengapa PaperMarkdown Studio?

Sebagian besar alat ekstraksi PDF standar (*naive parser*) memecah dokumen ilmiah menjadi teks mentah yang sulit dibaca oleh model AI (ChatGPT, Claude, Gemini, DeepSeek, atau pipeline RAG). Masalah umum yang sering terjadi:
1. **Urutan Kolom Berantakan**: Teks dari format 2-kolom (*IEEE / Elsevier / Jurnal*) sering kali terbaca bercampur antara baris kolom kiri dan kanan.
2. **Tabel Rusak**: Angka-angka metrik penting (seperti RMSE, MAE, nilai p, parameter) terpencar tanpa format tabel yang jelas.
3. **Kata Terpenggal**: Tanda hubung di ujung baris memotong kata ilmiah (misal `predik-` di baris 1 dan `si` di baris 2).

**PaperMarkdown Studio** memecahkan masalah ini dengan sistem rekonstruksi layout pintar dan perangkat bantu skripsi:
- ✅ **Akses Web & Mobile Cloud via Vercel**: Dapat diakses kapan saja dan di mana saja dari browser smartphone tanpa perlu menyalakan komputer atau Docker.
- ✅ **Dukungan PDF & Microsoft Word (.docx / .doc)**: Ubah artikel jurnal PDF maupun draf naskah skripsi Word menjadi Markdown bersih siap AI.
- ✅ **Deteksi Kolom Alami (*Gutter Detection*)**: Membaca kolom kiri sampai tuntas sebelum membaca kolom kanan pada paper jurnal ilmiah.
- ✅ **Preservasi Tabel Terformat**: Mengubah tabel dokumen menjadi tabel Markdown (`| Kolom | ... |`) yang presisi.
- ✅ **Unduh Instan & Auto-Download**: Dokumen langsung terunduh secara otomatis atau via tombol unduh Blob tanpa ketergantungan server.
- ✅ **Asisten Prompt Skripsi AI**: Template prompt siap salin ke ChatGPT/Claude/Gemini untuk evaluasi Bab 1 (Latar Belakang), Bab 2 (Tinjauan Pustaka), Bab 3 (Metodologi LSTM/XGBoost), Bab 4 (Hasil Pembahasan), Bab 5 (Kesimpulan), dan Format Sitasi.
- ✅ **Daftar Isi & Navigasi Bab Otomatis**: Drawer outline interaktif untuk melompat langsung ke Bab atau Subbab tertentu.
- ✅ **Statistik Skripsi**: Perhitungan jumlah kata, estimasi waktu baca, jumlah bab, dan jumlah tabel secara instan.
- ✅ **Layar Presentasi Glassmorphism & Responsif Mobile**: Navigasi dinamis dengan Floating Glass Dock di smartphone dan layar baca fokus di desktop.

---

## 📱 Panduan Deploy ke Vercel (Gratis & Siap Pakai di HP)

Repositori ini sudah dilengkapi konfigurasi serverless (`vercel.json` dan `api/index.py`). Anda dapat menerapkannya secara gratis ke Vercel hanya dalam 2 menit:

### Langkah 1: Hubungkan ke Vercel
1. Buka [vercel.com](https://vercel.com/) dan masuk menggunakan akun **GitHub** Anda.
2. Di halaman Dashboard Vercel, klik tombol **"Add New..."** lalu pilih **"Project"**.
3. Temukan repositori **`papermarkdown-studio`** dari daftar repositori GitHub Anda, kemudian klik tombol **"Import"**.

### Langkah 2: Deploy Project
1. Pada form konfigurasi:
   - **Framework Preset**: Biarkan `Other` (Vercel otomatis membaca konfigurasi `vercel.json`).
   - **Root Directory**: Biarkan `./`.
   - **Build and Output Settings**: Tidak perlu diubah.
2. Klik tombol biru **"Deploy"**.
3. Tunggu proses build selesai sekitar 1 - 2 menit.
4. Selamat! Vercel akan memberikan tautan website publik aktif (contoh: `https://papermarkdown-studio.vercel.app`).

### Langkah 3: Akses dan Simpan di HP
1. Buka tautan Vercel tersebut di browser smartphone Anda (Google Chrome di Android atau Safari di iPhone).
2. **Jadikan Aplikasi Layar Utama (PWA / Add to Home Screen)**:
   - **Di Android (Chrome)**: Ketuk ikon titik tiga di pojok kanan atas, lalu pilih **"Tambahkan ke Layar Utama" (Add to Home screen)**.
   - **Di iPhone (Safari)**: Ketuk ikon Share (kotak dengan panah ke atas) di bagian bawah, scroll dan pilih **"Tambahkan ke Layar Utama" (Add to Home Screen)**.
3. Sekarang PaperMarkdown Studio telah terpasang seperti aplikasi native di handphone Anda. Anda dapat langsung mengunggah PDF atau file Word skripsi dari memori HP dan mengunduh hasilnya seketika!

---

## 💻 Panduan Menjalankan Lokal

### Cara 1: Menggunakan Docker
Pastikan Docker Desktop aktif di komputer Anda:

#### Di Windows:
Klik ganda file:
```cmd
start.bat
```
Atau jalankan perintah:
```powershell
docker compose up -d --build
```

#### Di Linux / macOS:
```bash
chmod +x start.sh
./start.sh
```
Buka browser di **http://localhost:5000**.

---

### Cara 2: Menjalankan Langsung dengan Python
```bash
# 1. Pasang dependensi
pip install -r requirements.txt

# 2. Jalankan server
python -m app.server
```

---

### Cara 3: Mode CLI (Batch Processing)
```bash
# Konversi seluruh dokumen di folder input_pdfs/ ke output_markdown/
python -m app.cli --input input_pdfs --output output_markdown

# Atau satu file spesifik
python -m app.cli --single "input_pdfs/nama_artikel.pdf" --output output_markdown
```

---

## 📂 Struktur Repositori

```text
papermarkdown-studio/
├── api/
│   └── index.py              # WSGI Entrypoint untuk Vercel Serverless Function
├── app/
│   ├── __init__.py           # Package initializer
│   ├── converter_engine.py   # Engine ekstraksi PDF, DOCX, DOC dan tabel
│   ├── cli.py                # Command Line Interface untuk batch parsing
│   ├── server.py             # Backend Flask (Mendukung lokal & Vercel /tmp)
│   └── static/               # Frontend antarmuka web Glassmorphism
│       ├── index.html        # Struktur antarmuka responsif mobile & desktop
│       ├── style.css         # Styling Glassmorphism dan Floating Mobile Dock
│       └── app.js            # Logika client-side, local caching, dan Blob download
├── input_pdfs/               # Direktori input dokumen lokal (.gitkeep)
├── output_markdown/          # Direktori output hasil Markdown lokal (.gitkeep)
├── .dockerignore              # Konfigurasi ignore Docker
├── .gitignore                # Konfigurasi ignore Git (mengabaikan .vercel dan cache)
├── vercel.json               # Konfigurasi rewrite & serverless Vercel
├── Dockerfile                # Docker container Python Slim
├── docker-compose.yml        # Konfigurasi Docker Compose
├── requirements.txt          # Dependensi Python
├── start.bat                 # 1-klik starter Windows
├── start.sh                  # 1-klik starter Linux/macOS
├── LICENSE                   # Lisensi open-source (MIT)
├── README.md                 # Dokumentasi lengkap
└── DESIGN.md                 # Prinsip desain Anti-Slop
```

---

## 🔌 Dokumentasi REST API

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/documents` | Mengambil daftar seluruh dokumen dan status konversinya |
| `POST` | `/api/upload` | Mengunggah satu atau banyak file (PDF/DOCX/DOC), langsung mengonversi dan mengembalikan data lengkap |
| `GET` | `/api/document/<filename>` | Mengambil isi Markdown mentah, HTML render, statistik, dan heading |
| `POST` | `/api/convert/<filename>` | Menjalankan konversi on-demand untuk dokumen tertentu |
| `GET` | `/api/download/<filename>` | Mengunduh file `.md` langsung |
| `GET` | `/api/download-all` | Mengunduh seluruh Markdown yang ada dalam format `.zip` |

---

## 📄 Lisensi (License)

Didistribusikan di bawah **Lisensi MIT**. Silakan baca file [LICENSE](LICENSE) untuk detail ketentuan lisensi.
