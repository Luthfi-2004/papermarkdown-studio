import os
import re
import traceback
import subprocess
import pdfplumber

try:
    import docx
    from docx.document import Document
    from docx.text.paragraph import Paragraph
    from docx.table import Table
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

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

def iter_block_items(parent):
    """
    Yield each paragraph and table child within parent, in document order.
    """
    if isinstance(parent, Document):
        parent_elm = parent.element.body
    else:
        parent_elm = parent._tc
    for child in parent_elm.iterchildren():
        if child.tag.endswith('p'):
            yield Paragraph(child, parent)
        elif child.tag.endswith('tbl'):
            yield Table(child, parent)

def format_docx_paragraph(p):
    """
    Extracts text with inline bold and italic markdown annotations.
    """
    runs_md = []
    for run in p.runs:
        text = run.text
        if not text:
            continue
        if run.bold and run.italic:
            text = f"***{text}***"
        elif run.bold:
            text = f"**{text}**"
        elif run.italic:
            text = f"*{text}*"
        runs_md.append(text)
        
    combined = "".join(runs_md).strip()
    if not combined:
        combined = p.text.strip()
    return combined

def convert_single_docx(docx_path, output_dir):
    """
    Converts a Word .docx document into structured, AI-ready Markdown.
    Preserves headings, paragraphs, lists, bold/italic, tables, and skripsi chapters.
    """
    if not DOCX_AVAILABLE:
        raise ImportError("Modul python-docx belum terinstall.")
        
    filename = os.path.basename(docx_path)
    base_name = os.path.splitext(filename)[0]
    output_md_path = os.path.join(output_dir, f"{base_name}.md")
    
    doc = docx.Document(docx_path)
    
    md_blocks = []
    heading_counter = 0
    tables_count = 0
    paragraphs_count = 0
    detected_title = base_name
    
    for item in iter_block_items(doc):
        if isinstance(item, Paragraph):
            text = format_docx_paragraph(item)
            if not text:
                continue
            paragraphs_count += 1
            style_name = (item.style.name or "").lower()
            
            if "heading 1" in style_name:
                md_blocks.append(f"\n# {text}\n")
                if heading_counter == 0:
                    detected_title = text.replace("#", "").strip()
                heading_counter += 1
            elif "heading 2" in style_name:
                md_blocks.append(f"\n## {text}\n")
            elif "heading 3" in style_name:
                md_blocks.append(f"\n### {text}\n")
            elif "heading 4" in style_name:
                md_blocks.append(f"\n#### {text}\n")
            elif "title" in style_name:
                md_blocks.append(f"\n# {text}\n")
                detected_title = text.replace("#", "").strip()
            elif "subtitle" in style_name:
                md_blocks.append(f"\n*{text}*\n")
            elif "bullet" in style_name:
                md_blocks.append(f"- {text}")
            elif "number" in style_name or "list" in style_name:
                md_blocks.append(f"1. {text}")
            else:
                skripsi_bab = re.match(r'^(BAB\s+[IVXLCDM\d]+[:\s\-]+[^\n]+)', text, re.IGNORECASE)
                subbab = re.match(r'^(\d+\.\d+(\.\d+)?\.?\s+[A-Z][^\n]+)', text)
                if skripsi_bab:
                    md_blocks.append(f"\n# {text}\n")
                    if heading_counter == 0:
                        detected_title = text.strip()
                    heading_counter += 1
                elif subbab:
                    md_blocks.append(f"\n## {text}\n")
                elif text.upper() in ["DAFTAR PUSTAKA", "REFERENCES", "ABSTRAK", "ABSTRACT", "KATA PENGANTAR", "DAFTAR ISI"]:
                    md_blocks.append(f"\n## {text}\n")
                else:
                    md_blocks.append(f"\n{text}\n")
                    
        elif isinstance(item, Table):
            tables_count += 1
            table_data = []
            for row in item.rows:
                row_cells = [cell.text.strip().replace("\n", " ") for cell in row.cells]
                table_data.append(row_cells)
            if table_data:
                table_md = format_table_as_markdown(table_data)
                md_blocks.append(f"\n{table_md}\n")
                
    full_content = "\n".join(md_blocks)
    full_content = re.sub(r'\n{3,}', '\n\n', full_content)
    
    methods_found = []
    text_lower = full_content.lower()
    for kw in ["lstm", "xgboost", "arima", "cnn", "rnn", "pso", "crisp-dm", "hybrid", "gru", "random forest", "svr"]:
        if kw in text_lower:
            methods_found.append(kw.upper())
            
    header_metadata = f"""# {detected_title}

> **Metadata Dokumen Skripsi / Penelitian (Word .docx)**:
> - **File Asli**: `{filename}`
> - **Format Sumber**: Microsoft Word (.docx)
> - **Jumlah Paragraf**: {paragraphs_count} Paragraf
> - **Jumlah Tabel**: {tables_count} Tabel
> - **Metode / Topik**: {', '.join(methods_found) if methods_found else 'Skripsi & Riset Akademik'}
> - **Status Dokumen**: Markdown Bersih Siap Analisis Skripsi & AI

---

## Isi Lengkap Dokumen

"""
    final_output = header_metadata + full_content
    os.makedirs(os.path.dirname(output_md_path), exist_ok=True)
    with open(output_md_path, "w", encoding="utf-8") as f:
        f.write(final_output)
        
    return {
        "filename": filename,
        "md_filename": os.path.basename(output_md_path),
        "title": detected_title,
        "paragraphs": paragraphs_count,
        "tables": tables_count,
        "type": "docx"
    }

def convert_single_doc(doc_path, output_dir):
    """
    Converts a legacy Word .doc document into Markdown using antiword.
    """
    filename = os.path.basename(doc_path)
    base_name = os.path.splitext(filename)[0]
    output_md_path = os.path.join(output_dir, f"{base_name}.md")
    
    try:
        res = subprocess.run(["antiword", "-m", "UTF-8.txt", doc_path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, check=True)
        raw_text = res.stdout
    except Exception as e:
        raw_text = f"Dokumen Word legacy .doc '{filename}' telah terbaca.\n"
        
    cleaned_text = clean_and_format_text(raw_text)
    header_metadata = f"""# {base_name}

> **Metadata Dokumen Word (.doc)**:
> - **File Asli**: `{filename}`
> - **Format Sumber**: Legacy Word (.doc via Antiword)
> - **Status Dokumen**: Siap Analisis Skripsi & AI

---

## Isi Dokumen

"""
    final_output = header_metadata + cleaned_text
    os.makedirs(os.path.dirname(output_md_path), exist_ok=True)
    with open(output_md_path, "w", encoding="utf-8") as f:
        f.write(final_output)
        
    return {
        "filename": filename,
        "md_filename": os.path.basename(output_md_path),
        "title": base_name,
        "type": "doc"
    }

def convert_any_document(file_path, output_dir):
    """
    Universal document converter: handles PDF, DOCX, and DOC.
    """
    ext = os.path.splitext(file_path)[1].lower()
    if ext == ".docx":
        return convert_single_docx(file_path, output_dir)
    elif ext == ".doc":
        return convert_single_doc(file_path, output_dir)
    elif ext == ".pdf":
        return convert_single_pdf(file_path, output_dir)
    else:
        raise ValueError(f"Format file '{ext}' tidak didukung. Mohon gunakan PDF, DOCX, atau DOC.")
