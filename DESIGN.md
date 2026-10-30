# DESIGN.md - PaperMarkdown Studio

## Identity & Purpose
- **Nama Aplikasi**: PaperMarkdown Studio
- **Tujuan**: Web interface interaktif untuk mengunggah artikel penelitian PDF, mengonversinya secara otomatis ke format Markdown yang terstruktur untuk AI (mempertahankan tabel, rumus, dan layout 2-kolom), serta meninjau (*preview*) dan menyalin hasilnya.
- **Karakter Desain**: Akademis, presisi, fungsional, responsif, dan bebas dari AI-slop generik.

## Visual Direction & Palette
- **Tema**: Dual-mode (Light Mode & Dark Mode seimbang dengan toggle aktif).
- **Warna Dasar Netral**:
  - Light: Paper Canvas (`#f8fafc`), Surface Card (`#ffffff`), Border (`#e2e8f0`), Teks Utama (`#0f172a`), Teks Sekunder (`#475569`).
  - Dark: Night Canvas (`#0b0f19`), Surface Card (`#111827`), Border (`#1f2937`), Teks Utama (`#f9fafb`), Teks Sekunder (`#9ca3af`).
- **Aksen Tunggal (One Deliberate Accent)**:
  - Emerald / Teal (`#0d9488` / `#14b8a6` hover): Melambangkan presisi konversi data dan status sukses.
- **Tipografi**:
  - Antarmuka & Teks: System UI Sans (`Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`)
  - Markdown Raw & Code: Monospace bersih (`ui-monospace, "SF Mono", Consolas, monospace`)

## Liveliness Dials
- **ENERGY**: 2 (Tenang, profesional, interaktif saat drag & drop dan konversi).
- **RHYTHM**: 2 (Tata letak dua panel fungsional: File & Upload Manager di kiri, Live Markdown & Raw Viewer di kanan).
- **MOTION**: 1 (Transisi halus hanya saat aksi pengguna: upload progress, tab switch, notifikasi copy to clipboard; tanpa loop animasi tanpa henti).

## Functional Requirements
1. Area Upload File PDF (Drag-and-Drop & File Picker) dengan validasi ukuran dan format `.pdf`.
2. Progress & Status bar konversi riil.
3. Daftar Dokumen (menampilkan 15 artikel yang sudah dikonversi dan dokumen baru yang diupload).
4. Peninjau Markdown Ganda (Tab "Rendered Preview" dan Tab "Raw Markdown").
5. Fitur utilitas: 1-klik "Salin Markdown (Copy)", "Unduh File (.md)", dan "Buka PDF Asli".
6. Light / Dark mode toggle yang terverifikasi berfungsi sempurna.
