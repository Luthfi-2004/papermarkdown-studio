# PaperMarkdown Studio 📄➡️📝

> **Layout-Aware Academic PDF to Structured Markdown Converter for AI & Large Language Models.**

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
- ✅ **Dukungan PDF & Microsoft Word (.docx / .doc)**: Ubah artikel jurnal PDF maupun draf naskah skripsi Word menjadi Markdown bersih siap AI.
- ✅ **Deteksi Kolom Alami (*Gutter Detection*)**: Membaca kolom kiri sampai tuntas sebelum membaca kolom kanan pada paper jurnal ilmiah.
- ✅ **Preservasi Tabel Terformat**: Mengubah tabel dokumen menjadi tabel Markdown (`| Kolom | ... |`) yang presisi.
- ✅ **Asisten Prompt Skripsi AI**: Template prompt siap salin ke ChatGPT/Claude/Gemini untuk evaluasi Bab 1 (Latar Belakang), Bab 2 (Tinjauan Pustaka), Bab 3 (Metodologi LSTM/XGBoost), Bab 4 (Hasil Pembahasan), Bab 5 (Kesimpulan), dan Format Sitasi.
- ✅ **Daftar Isi & Navigasi Bab Otomatis**: Drawer outline interaktif untuk melompat langsung ke Bab atau Subbab tertentu.
- ✅ **Statistik Skripsi**: Perhitungan jumlah kata, estimasi waktu baca, jumlah bab, dan jumlah tabel secara instan.
- ✅ **Layar Presentasi Glassmorphism & Responsif Mobile**: Navigasi dinamis dengan Floating Glass Dock di smartphone dan layar baca fokus di desktop.
- ✅ **100% Berjalan di Docker**: Tanpa perlu instalasi Python lokal di komputer Anda.

---

## 🏗️ Alur Kerja Sistem (Architecture)

```
┌──────────────────┐     ┌────────────────────────────────────────────────────────┐     ┌───────────────────────┐
│ Dokumen PDF      │     │ Pipeline Rekonstruksi Layout                           │     │ Output Markdown Siap  │
│ (1 Kolom /       │ ──> │ 1. Deteksi Gutter & Separator Kolom                    │ ──> │ untuk Prompt / RAG AI │
│  2 Kolom Ilmiah) │     │ 2. Isolasi Tabel ke Markdown Table Syntax              │     │ (Presisi, Utuh,       │
│                  │     │ 3. Perbaikan Pemenggalan Kata & Heading Terstruktur    │     │  Tabel & Halaman Rapi)│
└──────────────────┘     └────────────────────────────────────────────────────────┘     └───────────────────────┘
```

---

## 🚀 Panduan Memulai Cepat (Quickstart)

### Cara 1: Menggunakan Docker (Rekomendasi Utama)

Anda tidak memerlukan Python di komputer Anda. Cukup pastikan **Docker Desktop** sedang berjalan.

#### Di Windows:
Cukup klik ganda file:
```cmd
start.bat
```
Atau jalankan perintah berikut di PowerShell / Terminal:
```powershell
docker compose up -d --build
```

#### Di Linux / macOS:
Jalankan script bash:
```bash
chmod +x start.sh
./start.sh
```

Buka browser Anda dan akses antarmuka web di:
👉 **http://localhost:5000**

---

### Cara 2: Menjalankan Langsung dengan Python (Bagi Pengembang)

Jika komputer Anda telah memiliki Python 3.11+:

```bash
# 1. Pasang dependensi
pip install -r requirements.txt

# 2. Jalankan Web UI
python -m app.server
```

---

### Cara 3: Mode CLI (Command Line Batch Processing)

Untuk mengonversi ratusan dokumen PDF sekaligus tanpa membuka antarmuka web:

```bash
# Mengonversi seluruh PDF di folder input_pdfs/ ke output_markdown/
python -m app.cli --input input_pdfs --output output_markdown

# Atau konversi satu file spesifik
python -m app.cli --single "input_pdfs/nama_artikel.pdf" --output output_markdown
```

Jika menggunakan Docker CLI:
```bash
docker run --rm -v "${PWD}:/app" papermarkdown-studio python -m app.cli
```

---

## 🖥️ Fitur Web Interface (UI)

Antarmuka web dibangun dengan standar estetika tinggi (*Anti-Slop Design Principles*), tanpa elemen dekorasi generik yang tidak bertujuan:
- **Drag & Drop Upload**: Cukup seret file PDF langsung ke layar untuk auto-konversi instan.
- **Dual-View**: Beralih antara **Tampilan Terformat (Rendered)** dan **Kode Markdown Mentah (Raw)**.
- **1-Klik Salin Teks**: Tombol salin ke clipboard untuk langsung Anda tempel ke prompt AI.
- **Unduh File (.md)**: Unduh hasil konversi langsung dari browser.
- **Filter Pencarian**: Cari dokumen berdasarkan topik, saham, atau metode dalam hitungan milidetik.
- **Dual Theme**: Tersedia mode Gelap (Dark Mode) dan Terang (Light Mode) yang nyaman untuk membaca.
- **Aksesibilitas Penuh**: Navigasi keyboard terstruktur dengan target sentuh responsif di perangkat mobile maupun desktop.

---

## 📂 Struktur Repositori

```text
papermarkdown-studio/
├── .dockerignore              # Konfigurasi ignore untuk Docker build
├── .gitignore                # Konfigurasi ignore untuk Git
├── LICENSE                   # Lisensi open-source (MIT)
├── README.md                 # Dokumentasi lengkap proyek
├── Dockerfile                # Image container mandiri berbasis Python Slim
├── docker-compose.yml        # Konfigurasi 1-command startup
├── requirements.txt          # Dependensi Python
├── start.bat                 # 1-klik starter untuk pengguna Windows
├── start.sh                  # 1-klik starter untuk pengguna Linux / macOS
├── app/
│   ├── __init__.py           # Package initializer
│   ├── converter_engine.py   # Engine ekstraksi multi-kolom dan tabel
│   ├── cli.py                # Command Line Interface untuk batch parsing
│   ├── server.py             # Server Flask backend dan REST API
│   └── static/               # Frontend antarmuka web
│       ├── index.html        # Struktur antarmuka
│       ├── style.css         # Styling modern bebas slop
│       └── app.js            # Interaktivitas client-side
├── input_pdfs/               # Direktori penyimpanan file PDF
└── output_markdown/          # Direktori penyimpanan hasil Markdown
```

---

## 🔌 Dokumentasi REST API

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/documents` | Mengambil daftar seluruh dokumen PDF dan status Markdown |
| `POST` | `/api/upload` | Mengunggah satu atau banyak file PDF dan langsung mengonversinya |
| `GET` | `/api/document/<filename>` | Mengambil isi Markdown mentah beserta HTML hasil render |
| `POST` | `/api/convert/<filename>` | Menjalankan konversi on-demand untuk PDF tertentu |
| `GET` | `/api/download/<filename>` | Mengunduh file `.md` langsung ke komputer |

---

## 🤝 Berkontribusi (Contributing)

Kontribusi sangat terbuka! Jika Anda ingin menambahkan parser formula LaTeX yang lebih kaya atau dukungan format lainnya:
1. Fork repositori ini.
2. Buat branch fitur baru (`git checkout -b fitur/ekstraksi-baru`).
3. Commit perubahan Anda (`git commit -m 'Menambahkan fitur ekstraksi baru'`).
4. Push ke branch Anda (`git push origin fitur/ekstraksi-baru`).
5. Buat Pull Request.

---

## 📄 Lisensi (License)

Didistribusikan di bawah **Lisensi MIT**. Silakan baca file [LICENSE](LICENSE) untuk detail ketentuan lisensi.
