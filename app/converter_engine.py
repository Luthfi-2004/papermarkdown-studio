import os
import re
import traceback
import pdfplumber

def format_table_as_markdown(table):
    """
    Converts a 2D list of cells extracted from pdfplumber into a GitHub-flavored Markdown table.
    """
    if not table or not any(table):
        return ""
    cleaned_rows = []
    for row in table:
        cleaned_row = [re.sub(r'\s+', ' ', str(cell).strip()) if cell is not None else "" for cell in row]
        if any(cleaned_row):
            cleaned_rows.append(cleaned_row)
    if not cleaned_rows:
        return ""
    
    max_cols = max(len(r) for r in cleaned_rows)
    for r in cleaned_rows:
        while len(r) < max_cols:
            r.append("")
            
    header = cleaned_rows[0]
    separator = ["---"] * max_cols
    
    md_lines = []
    md_lines.append("| " + " | ".join(header) + " |")
    md_lines.append("| " + " | ".join(separator) + " |")
    for r in cleaned_rows[1:]:
        md_lines.append("| " + " | ".join(r) + " |")
        
    return "\n".join(md_lines) + "\n\n"

def clean_and_format_text(text):
    """
    Applies typography fixes, hyphenation repairs, and Markdown section hierarchy formatting.
    """
    if not text:
        return ""
    
    # Rejoin hyphenated words split across lines: e.g. predik-\nsi -> prediksi
    text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)
    
    # Format Section Headings with Markdown # / ## / ###
    heading_patterns = [
        (r'(?m)^(?:\d+\.?|[IVXLCDM]+\.?)\s+(?:PENDAHULUAN|INTRODUCTION|BACKGROUND|TINJAUAN PUSTAKA|LITERATURE REVIEW|LANDASAN TEORI|METODE|METODOLOGI|METHODOLOGY|RESEARCH METHOD|METODE PENELITIAN|HASIL DAN PEMBAHASAN|RESULTS AND DISCUSSION|EXPERIMENTS AND RESULTS|EXPERIMENTAL SETUP|ANALISIS DAN HASIL|KESIMPULAN|CONCLUSION|CONCLUSIONS|SARAN|DAFTAR PUSTAKA|REFERENCES)\b[^\n]*', r'## \g<0>'),
        (r'(?m)^(?:\d+\.\d+\.?)\s+[A-Z][^\n]+', r'### \g<0>'),
        (r'(?m)^(?:\d+\.\d+\.\d+\.?)\s+[A-Z][^\n]+', r'#### \g<0>'),
        (r'(?m)^(?:ABSTRAK|ABSTRACT)\b[^\n]*', r'## \g<0>'),
        (r'(?m)^(?:Kata Kunci|Keywords|Key Words)\s*:', r'**\g<0>**')
    ]
    for pattern, repl in heading_patterns:
        text = re.sub(pattern, repl, text)
        
    # Remove orphan page number lines
    text = re.sub(r'(?m)^\s*\d{1,4}\s*$', '', text)
    
    # Normalize excessive newlines
    text = re.sub(r'\n{3,}', '\n\n', text)
    return text.strip()

def process_page(page, page_num):
    """
    Processes a single PDF page with layout detection:
    - 2-column detection (reads column 1 then column 2)
    - Hybrid detection (single column top header/abstract + 2-column bottom)
    - Single column fallback
    - Table extraction with proper bounding box handling
    """
    w, h = page.width, page.height
    center_x = 0.50 * w
    
    # Extract tables first
    tables = page.find_tables()
    valid_tables = []
    for t in tables:
        extracted = t.extract()
        if extracted and len(extracted) >= 2:
            valid_tables.append((t, extracted))
            
    words = page.extract_words()
    body_words = [word for word in words if 45 <= word['top'] <= h - 55]
    if not body_words:
        body_words = words
        
    if not body_words:
        return f"<!-- PAGE {page_num} START -->\n\n(Halaman kosong / Blank Page)\n\n<!-- PAGE {page_num} END -->\n\n---\n"
        
    crossing = [word for word in body_words if word['x0'] < center_x - 3 and word['x1'] > center_x + 3]
    gutter = [word for word in body_words if 0.49 * w <= (word['x0'] + word['x1'])/2 <= 0.51 * w]
    
    is_two_col = len(crossing) <= 1 and len(gutter) <= 2 and len(body_words) > 40
    
    split_y = None
    if not is_two_col and len(body_words) > 80:
        wide_words = [word for word in body_words if (word['x1'] - word['x0'] > 0.35 * w) or (word['x0'] < center_x - 3 and word['x1'] > center_x + 3)]
        if wide_words:
            max_y = max(word['bottom'] for word in wide_words)
            below_words = [word for word in body_words if word['top'] >= max_y]
            crossing_below = [word for word in below_words if word['x0'] < center_x - 3 and word['x1'] > center_x + 3]
            if len(below_words) >= 40 and len(crossing_below) <= 1:
                split_y = max_y + 4
                
    content_chunks = []
    full_width_tables = []
    narrow_tables = []
    for t_obj, t_data in valid_tables:
        bbox = t_obj.bbox
        if bbox[0] < center_x - 20 and bbox[2] > center_x + 20:
            full_width_tables.append((t_obj, t_data))
        else:
            narrow_tables.append((t_obj, t_data))
            
    if is_two_col:
        if full_width_tables:
            full_width_tables.sort(key=lambda x: x[0].bbox[1])
            curr_y = 35
            for t_obj, t_data in full_width_tables:
                t_bbox = t_obj.bbox
                if t_bbox[1] > curr_y + 10:
                    l_crop = page.crop((0, curr_y, center_x, t_bbox[1]))
                    r_crop = page.crop((center_x, curr_y, w, t_bbox[1]))
                    content_chunks.append(l_crop.extract_text() or "")
                    content_chunks.append("\n\n")
                    content_chunks.append(r_crop.extract_text() or "")
                    content_chunks.append("\n\n")
                t_md = format_table_as_markdown(t_data)
                content_chunks.append(f"\n\n**Tabel (Hal. {page_num})**:\n\n{t_md}\n\n")
                curr_y = max(curr_y, t_bbox[3])
                
            if curr_y < h - 45:
                l_crop = page.crop((0, curr_y, center_x, h - 40))
                r_crop = page.crop((center_x, curr_y, w, h - 40))
                content_chunks.append(l_crop.extract_text() or "")
                content_chunks.append("\n\n")
                content_chunks.append(r_crop.extract_text() or "")
        else:
            l_crop = page.crop((0, 35, center_x, h - 40))
            r_crop = page.crop((center_x, 35, w, h - 40))
            content_chunks.append(l_crop.extract_text() or "")
            content_chunks.append("\n\n")
            content_chunks.append(r_crop.extract_text() or "")
            
    elif split_y:
        top_crop = page.crop((0, 35, w, split_y))
        content_chunks.append(top_crop.extract_text() or "")
        content_chunks.append("\n\n")
        l_crop = page.crop((0, split_y, center_x, h - 40))
        r_crop = page.crop((center_x, split_y, w, h - 40))
        content_chunks.append(l_crop.extract_text() or "")
        content_chunks.append("\n\n")
        content_chunks.append(r_crop.extract_text() or "")
    else:
        crop_page = page.crop((0, 35, w, h - 40))
        content_chunks.append(crop_page.extract_text() or "")
        
    raw_body = "".join(content_chunks)
    clean_body = clean_and_format_text(raw_body)
    
    tables_md = []
    for t_idx, (t_obj, t_data) in enumerate(narrow_tables):
        t_md = format_table_as_markdown(t_data)
        if t_md.strip():
            tables_md.append(f"\n\n**Tabel / Table (Hal. {page_num}, Tabel {t_idx+1})**:\n\n{t_md}")
            
    return f"<!-- PAGE {page_num} START -->\n\n{clean_body}\n" + "".join(tables_md) + f"\n\n<!-- PAGE {page_num} END -->\n\n---\n"

def convert_single_pdf(pdf_path, output_md_path):
    """
    Converts a complete PDF document to structured Markdown with metadata header.
    """
    filename = os.path.basename(pdf_path)
    pages_md = []
    
    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        for idx, page in enumerate(pdf.pages):
            p_md = process_page(page, idx + 1)
            pages_md.append(p_md)
            
    full_text = "\n".join(pages_md)
    
    title_match = re.search(r'<!-- PAGE 1 START -->\s*(.*?)(?=\n\n|\n[A-Z\s]{4,}:|Abstract|Abstrak)', full_text, re.DOTALL)
    detected_title = title_match.group(1).strip() if title_match else filename.replace('.pdf', '')
    detected_title = re.sub(r'\s+', ' ', detected_title)
    if len(detected_title) < 10 or len(detected_title) > 250:
        detected_title = filename.replace('.pdf', '')
        
    abstract_match = re.search(r'(?:##\s*(?:ABSTRAK|ABSTRACT)|(?:ABSTRAK|ABSTRACT))\s*[:\n]+(.*?)(?=\n##|\nKata Kunci|\nKeywords|\n\d+\.|\n[I|V|X]+\.)', full_text, re.DOTALL | re.IGNORECASE)
    abstract_text = abstract_match.group(1).strip() if abstract_match else "Tidak ditemukan teks abstrak eksplisit (langsung telusuri teks utama)."
    abstract_text = re.sub(r'\s+', ' ', abstract_text)[:900]
    
    methods_found = []
    text_lower = full_text.lower()
    for kw in ["lstm", "xgboost", "arima", "cnn", "rnn", "pso", "crisp-dm", "hybrid", "gru", "random forest", "svr"]:
        if kw in text_lower:
            methods_found.append(kw.upper())
            
    datasets_found = []
    for kw, label in [
        ("bbri", "Saham BBRI"), ("ihsg", "Indeks IHSG"), ("tesla", "Saham Tesla (TSLA)"),
        ("lq45", "Indeks LQ45"), ("microsoft", "Saham Microsoft (MSFT)"), ("oil", "Minyak Bumi (Oil Price)"),
        ("energy", "Komunitas Energi / Smart Meter"), ("pertambangan", "Saham Pertambangan BEI"),
        ("antm", "Saham ANTM"), ("bbca", "Saham BBCA"), ("tlkm", "Saham TLKM")
    ]:
        if kw in text_lower:
            datasets_found.append(label)
            
    header_metadata = f"""# {detected_title}

> **Metadata Dokumen Penelitian (AI-Ready Context)**:
> - **File Asli**: `{filename}`
> - **Total Halaman**: {total_pages} Halaman
> - **Metode Terdeteksi**: {', '.join(methods_found) if methods_found else 'Time Series Forecasting'}
> - **Fokus Objek / Dataset**: {', '.join(datasets_found) if datasets_found else 'Data Saham / Keuangan'}
> - **Format Dokumen**: Markdown Terstruktur (Teks Lengkap, Rekonstruksi Kolom Alami, Tabel Terformat)

---

### Ringkasan Abstrak:
> {abstract_text}

---

## Isi Lengkap Artikel

"""
    full_output = header_metadata + full_text
    
    os.makedirs(os.path.dirname(output_md_path), exist_ok=True)
    with open(output_md_path, "w", encoding="utf-8") as f:
        f.write(full_output)
        
    return {
        "filename": filename,
        "md_filename": os.path.basename(output_md_path),
        "title": detected_title,
        "pages": total_pages,
        "methods": methods_found,
        "datasets": datasets_found,
        "abstract": abstract_text
    }
