import os
import glob
import re
import mistune
from flask import Flask, request, jsonify, send_file, send_from_directory
from app.converter_engine import convert_single_pdf

APP_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(APP_DIR, "static")

app = Flask(__name__, static_folder=STATIC_DIR)

# Configure directories via environment or defaults
BASE_DIR = os.path.dirname(APP_DIR)
INPUT_DIR = os.environ.get("INPUT_DIR", os.path.join(BASE_DIR, "input_pdfs"))
OUTPUT_DIR = os.environ.get("OUTPUT_DIR", os.path.join(BASE_DIR, "output_markdown"))

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

markdown_renderer = mistune.create_markdown(plugins=['table'])

def slugify_filename(name):
    base = os.path.splitext(name)[0]
    clean = re.sub(r'[^a-zA-Z0-9_\-\s]', '', base)
    clean = re.sub(r'\s+', '_', clean).strip('_')
    return clean[:65] + ".md"

@app.route("/")
def index():
    return send_from_directory(STATIC_DIR, "index.html")

@app.route("/static/<path:filename>")
def serve_static(filename):
    return send_from_directory(STATIC_DIR, filename)

@app.route("/api/documents", methods=["GET"])
def get_documents():
    pdf_files = sorted(glob.glob(os.path.join(INPUT_DIR, "*.pdf")))
    md_files = {f: os.path.join(OUTPUT_DIR, f) for f in os.listdir(OUTPUT_DIR) if f.endswith(".md")}
    
    documents = []
    for pdf_path in pdf_files:
        pdf_name = os.path.basename(pdf_path)
        stat = os.stat(pdf_path)
        
        matched_md = None
        for md_name in md_files:
            if md_name.startswith("00_INDEX"):
                continue
            base_pdf = os.path.splitext(pdf_name)[0].lower()
            base_md = os.path.splitext(md_name)[0].lower()
            if base_md in base_pdf or base_pdf in base_md:
                matched_md = md_name
                break
                
        if not matched_md:
            possible_slug = slugify_filename(pdf_name)
            if possible_slug in md_files:
                matched_md = possible_slug
                
        md_size = 0
        if matched_md:
            md_path = os.path.join(OUTPUT_DIR, matched_md)
            if os.path.exists(md_path):
                md_size = os.path.getsize(md_path)
                
        documents.append({
            "filename": pdf_name,
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
        
    return jsonify({
        "success": True,
        "filename": safe_name,
        "raw_markdown": raw_md,
        "rendered_html": rendered
    })

@app.route("/api/upload", methods=["POST"])
def upload_pdf():
    if "file" not in request.files and "files[]" not in request.files:
        return jsonify({"success": False, "error": "Tidak ada file PDF yang diunggah."}), 400
        
    files = request.files.getlist("files[]") or [request.files["file"]]
    converted_list = []
    
    for f in files:
        if not f.filename or not f.filename.lower().endswith(".pdf"):
            continue
            
        safe_pdf_name = os.path.basename(f.filename)
        dest_pdf_path = os.path.join(INPUT_DIR, safe_pdf_name)
        f.save(dest_pdf_path)
        
        slug_md = slugify_filename(safe_pdf_name)
        target_md_path = os.path.join(OUTPUT_DIR, slug_md)
        
        try:
            result = convert_single_pdf(dest_pdf_path, target_md_path)
            converted_list.append(result)
        except Exception as e:
            return jsonify({
                "success": False,
                "error": f"Gagal mengonversi '{safe_pdf_name}': {str(e)}"
            }), 500
            
    return jsonify({
        "success": True,
        "converted": converted_list
    })

@app.route("/api/convert/<path:pdf_filename>", methods=["POST"])
def convert_specific(pdf_filename):
    safe_pdf_name = os.path.basename(pdf_filename)
    pdf_path = os.path.join(INPUT_DIR, safe_pdf_name)
    
    if not os.path.exists(pdf_path):
        return jsonify({"success": False, "error": f"File PDF '{safe_pdf_name}' tidak ditemukan."}), 404
        
    slug_md = slugify_filename(safe_pdf_name)
    target_md_path = os.path.join(OUTPUT_DIR, slug_md)
    
    try:
        result = convert_single_pdf(pdf_path, target_md_path)
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
