import os
import glob
import re
import mistune
from flask import Flask, request, jsonify, send_file, send_from_directory
from app.converter_engine import convert_any_document, convert_single_pdf

APP_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(APP_DIR, "static")

app = Flask(__name__, static_folder=STATIC_DIR)

# Configure directories via environment or defaults
BASE_DIR = os.path.dirname(APP_DIR)
INPUT_DIR = os.environ.get("INPUT_DIR", os.path.join(BASE_DIR, "input_pdfs"))
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", os.path.join(BASE_DIR, "output_markdown"))

ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc'}

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

markdown_renderer = mistune.create_markdown(plugins=['table'])

def slugify_filename(name):
    base = os.path.splitext(name)[0]
    clean = re.sub(r'[^a-zA-Z0-9_\-\s]', '', base)
    clean = re.sub(r'\s+', '_', clean).strip('_')
    return clean[:65] + ".md"

def extract_headings_from_md(md_text):
    headings = []
    lines = md_text.splitlines()
    for line in lines:
        line = line.strip()
        m = re.match(r'^(#{1,4})\s+(.+)$', line)
        if m:
            level = len(m.group(1))
            title = m.group(2).strip()
            # Clean formatting characters
            clean_title = re.sub(r'[*_`]', '', title)
            slug = re.sub(r'[^a-zA-Z0-9_\-]', '-', clean_title.lower()).strip('-')
            headings.append({
                "level": level,
                "title": clean_title,
                "slug": slug
            })
    return headings

@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")

@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory(STATIC_DIR, filename)

@app.route("/api/documents", methods=["GET"])
def get_documents():
    input_files = []
    for ext in ["*.pdf", "*.docx", "*.doc"]:
        input_files.extend(glob.glob(os.path.join(INPUT_DIR, ext)))
    input_files = sorted(input_files)
    
    md_files = {f: os.path.join(OUTPUT_DIR, f) for f in os.listdir(OUTPUT_DIR) if f.endswith(".md")}
    
    documents = []
    for doc_path in input_files:
        doc_name = os.path.basename(doc_path)
        stat = os.stat(doc_path)
        ext = os.path.splitext(doc_name)[1].lower()
        
        matched_md = None
        for md_name in md_files:
            if md_name.startswith("00_INDEX"):
                continue
            base_doc = os.path.splitext(doc_name)[0].lower()
            base_md = os.path.splitext(md_name)[0].lower()
            if base_md in base_doc or base_doc in base_md:
                matched_md = md_name
                break
                
        if not matched_md:
            possible_slug = slugify_filename(doc_name)
            if possible_slug in md_files:
                matched_md = possible_slug
                
        md_size = 0
        if matched_md:
            md_path = os.path.join(OUTPUT_DIR, matched_md)
            if os.path.exists(md_path):
                md_size = os.path.getsize(md_path)
                
        documents.append({
            "filename": doc_name,
            "file_type": ext.replace(".", ""),
            "size_bytes": stat.st_size,
            "last_modified": int(stat.st_mtime),
            "md_filename": matched_md,
            "has_markdown": bool(matched_md and md_size > 0),
            "md_size_bytes": md_size
        })
        
    return jsonify({
        "success": True,
        "count": len(documents),
        "documents": documents
    })

@app.route("/api/document/<md_filename>", methods=["GET"])
def get_document_content(md_filename):
    safe_name = os.path.basename(md_filename)
    file_path = os.path.join(OUTPUT_DIR, safe_name)
    if not os.path.exists(file_path):
        return jsonify({"success": False, "error": f"File '{safe_name}' tidak ditemukan."}), 404
        
    with open(file_path, "r", encoding="utf-8") as f:
        raw_md = f.read()
        
    try:
        rendered = markdown_renderer(raw_md)
    except Exception as e:
        rendered = f"<pre>{raw_md}</pre>"
        
    # Thesis and document analysis statistics
    words = raw_md.split()
    word_count = len(words)
    char_count = len(raw_md)
    reading_time = max(1, round(word_count / 200))
    headings = extract_headings_from_md(raw_md)
    tables_count = len(re.findall(r'\|(?:\s*---\s*\|)+', raw_md))
    
    return jsonify({
        "success": True,
        "filename": safe_name,
        "raw_markdown": raw_md,
        "rendered_html": rendered,
        "stats": {
            "word_count": word_count,
            "char_count": char_count,
            "reading_time_min": reading_time,
            "headings_count": len(headings),
            "tables_count": tables_count
        },
        "headings": headings
    })

@app.route("/api/upload", methods=["POST"])
def upload_files():
    if "file" not in request.files and "files[]" not in request.files:
        return jsonify({"success": False, "error": "Tidak ada file PDF atau Word yang diunggah."}), 400
        
    files = request.files.getlist("files[]") or [request.files["file"]]
    converted_list = []
    
    for f in files:
        if not f.filename:
            continue
        ext = os.path.splitext(f.filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            continue
            
        safe_name = os.path.basename(f.filename)
        dest_path = os.path.join(INPUT_DIR, safe_name)
        f.save(dest_path)
        
        try:
            result = convert_any_document(dest_path, OUTPUT_DIR)
            converted_list.append(result)
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Gagal mengonversi '{safe_name}': {str(e)}"
            }), 500
            
    return jsonify({
        "success": True,
        "converted": converted_list
    })

@app.route("/api/convert/<path:doc_filename>", methods=["POST"])
def convert_specific(doc_filename):
    safe_name = os.path.basename(doc_filename)
    doc_path = os.path.join(INPUT_DIR, safe_name)
    
    if not os.path.exists(doc_path):
        return jsonify({"success": False, "error": f"File '{safe_name}' tidak ditemukan."}), 404
        
    try:
        result = convert_any_document(doc_path, OUTPUT_DIR)
        return jsonify({"success": True, "result": result})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/download/<md_filename>", methods=["GET"])
def download_markdown(md_filename):
    safe_name = os.path.basename(md_filename)
    file_path = os.path.join(OUTPUT_DIR, safe_name)
    if not os.path.exists(file_path):
        return jsonify({"success": False, "error": "File tidak ditemukan."}), 404
    return send_file(file_path, as_attachment=True, download_name=safe_name)

def main():
    port = int(os.environ.get("PORT", 5000))
    print(f"PaperMarkdown Studio Web UI running on http://0.0.0.0:{port}...")
    print(f"  Input PDFs directory:  {INPUT_DIR}")
    print(f"  Output MD directory:   {OUTPUT_DIR}")
    app.run(host="0.0.0.0", port=port, debug=False)

if __name__ == "__main__":
    main()
