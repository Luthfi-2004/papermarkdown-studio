#!/usr/bin/env python3
"""
PaperMarkdown Studio CLI
Batch convert academic PDF papers to structured Markdown for AI analysis.
"""

import os
import sys
import argparse
import glob
import re
from app.converter_engine import convert_single_pdf

def slugify(text):
    base = os.path.splitext(text)[0]
    clean = re.sub(r'[^a-zA-Z0-9_\-\s]', '', base)
    clean = re.sub(r'\s+', '_', clean).strip('_')
    return clean[:65] + ".md"

def generate_index(results, output_dir):
    index_path = os.path.join(output_dir, "00_INDEX_DAN_RINGKASAN.md")
    lines = [
        "# Kumpulan Artikel Ilmiah: Prediksi Harga Saham & Time Series",
        "",
        "> Master Index dari seluruh dokumen PDF yang telah dikonversi secara detail ke format Markdown untuk kebutuhan analisis AI / LLM.",
        "",
        f"- **Total Dokumen**: {len(results)} Artikel",
        "- **Format Ekstraksi**: Markdown Terstruktur (Tabel Markdown, Rekonstruksi Kolom Alami, Penanda Halaman)",
        "",
        "---",
        "",
        "## Daftar Artikel",
        "",
        "| No | Judul Artikel | Metode Terdeteksi | Objek / Saham | Halaman | File Markdown |",
        "|---|---|---|---|---|---|"
    ]
    
    for idx, r in enumerate(results, 1):
        m = ", ".join(r['methods'][:3]) if r['methods'] else "-"
        d = ", ".join(r['datasets'][:3]) if r['datasets'] else "-"
        title = r['title'].replace("|", "-")[:70]
        lines.append(f"| {idx} | {title} | {m} | {d} | {r['pages']} | [{r['md_filename']}](./{r['md_filename']}) |")
        
    lines.extend(["", "---", "", "## Detail Dokumen", ""])
    for idx, r in enumerate(results, 1):
        lines.extend([
            f"### {idx}. [{r['title']}](./{r['md_filename']})",
            f"- **File PDF**: `{r['filename']}`",
            f"- **Markdown**: [{r['md_filename']}](./{r['md_filename']})",
            f"- **Halaman**: {r['pages']}",
            f"- **Metode**: {', '.join(r['methods'])}",
            f"- **Fokus**: {', '.join(r['datasets'])}",
            f"> **Abstrak**: {r['abstract']}",
            "",
            "---",
            ""
        ])
        
    with open(index_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))
    print(f"[OK] Master Index tersimpan di: {index_path}")

def main():
    parser = argparse.ArgumentParser(description="PaperMarkdown Studio CLI: Konversi PDF Ilmiah ke Markdown Siap AI")
    parser.add_argument("--input", "-i", default="input_pdfs", help="Direktori input file PDF (default: input_pdfs/)")
    parser.add_argument("--output", "-o", default="output_markdown", help="Direktori output file Markdown (default: output_markdown/)")
    parser.add_argument("--single", "-s", help="Konversi satu file PDF tertentu saja")
    args = parser.parse_args()

    os.makedirs(args.output, exist_ok=True)

    if args.single:
        if not os.path.exists(args.single):
            print(f"[ERROR] File '{args.single}' tidak ditemukan.")
            sys.exit(1)
        md_name = slugify(os.path.basename(args.single))
        out_path = os.path.join(args.output, md_name)
        print(f"[*] Mengonversi: {args.single} -> {out_path}...")
        res = convert_single_pdf(args.single, out_path)
        print(f"[OK] Selesai ({res['pages']} halaman, tersimpan di {out_path})")
        return

    os.makedirs(args.input, exist_ok=True)
    pdf_files = sorted(glob.glob(os.path.join(args.input, "*.pdf")))

    if not pdf_files:
        print(f"[WARN] Tidak ada file PDF di direktori '{args.input}'.")
        print("Silakan masukkan file PDF ke direktori tersebut lalu jalankan kembali.")
        sys.exit(0)

    print(f"[*] Menemukan {len(pdf_files)} file PDF di '{args.input}'...")
    results = []
    for pdf_path in pdf_files:
        fname = os.path.basename(pdf_path)
        md_name = slugify(fname)
        out_path = os.path.join(args.output, md_name)
        print(f"  -> Mengonversi: {fname}...")
        try:
            res = convert_single_pdf(pdf_path, out_path)
            results.append(res)
            print(f"     [OK] {res['pages']} halaman diekstrak.")
        except Exception as e:
            print(f"     [ERROR] Gagal: {e}")

    if results:
        generate_index(results, args.output)

    print(f"\n[SELESAI] {len(results)} dokumen berhasil dikonversi ke '{args.output}/'.")

if __name__ == "__main__":
    main()
