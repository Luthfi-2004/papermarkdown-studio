// PaperMarkdown - Simple & Instant PDF & Word (.docx) to Markdown Converter

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const docListEl = document.getElementById("doc-list");
  const docCounterEl = document.getElementById("doc-counter");
  const badgeCountEl = document.getElementById("badge-count");
  const emptySearchEl = document.getElementById("empty-search");
  
  const activeTitleEl = document.getElementById("active-doc-title");
  const tabRenderedBtn = document.getElementById("tab-rendered");
  const tabRawBtn = document.getElementById("tab-raw");
  const viewRendered = document.getElementById("view-rendered");
  const viewRaw = document.getElementById("view-raw");
  const renderedContentEl = document.getElementById("rendered-content");
  const rawContentEl = document.getElementById("raw-content");
  
  const copyBtn = document.getElementById("copy-btn");
  const copyBtnText = document.getElementById("copy-btn-text");
  const downloadBtn = document.getElementById("download-btn");
  const downloadAllBtn = document.getElementById("download-all-btn");
  const autoDownloadToggle = document.getElementById("auto-download-toggle");
  
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const progressBox = document.getElementById("upload-progress-container");
  const progressBar = document.getElementById("upload-progress-bar");
  const statusLabel = document.getElementById("upload-status-label");
  const percentLabel = document.getElementById("upload-percent-label");
  
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const toastEl = document.getElementById("toast");

  // State: In-Memory Only (Clean on every refresh as requested)
  let allDocuments = [];
  let currentSelectedMd = null;
  let currentRawMarkdown = "";
  let turndownServiceInstance = null;

  // Clear any past cached documents so refresh always starts 100% clean
  try {
    localStorage.removeItem("papermarkdown-cached-docs");
  } catch (_) {}

  // 1. Theme Management
  const savedTheme = localStorage.getItem("papermarkdown-theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  
  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("papermarkdown-theme", newTheme);
    showToast(`Tema beralih ke mode ${newTheme === "dark" ? "gelap" : "terang"}`);
  });

  // 2. Tab Navigation (Rendered vs Raw)
  function switchTab(mode) {
    if (mode === "rendered") {
      tabRenderedBtn.classList.add("active");
      tabRenderedBtn.setAttribute("aria-selected", "true");
      tabRawBtn.classList.remove("active");
      tabRawBtn.setAttribute("aria-selected", "false");
      viewRendered.classList.remove("hidden");
      viewRaw.classList.add("hidden");
    } else {
      tabRawBtn.classList.add("active");
      tabRawBtn.setAttribute("aria-selected", "true");
      tabRenderedBtn.classList.remove("active");
      tabRenderedBtn.setAttribute("aria-selected", "false");
      viewRaw.classList.remove("hidden");
      viewRendered.classList.add("hidden");
    }
  }
  
  tabRenderedBtn.addEventListener("click", () => switchTab("rendered"));
  tabRawBtn.addEventListener("click", () => switchTab("raw"));

  // 3. Blob Download Helper
  function downloadMarkdownBlob(filename, content) {
    if (!content) return false;
    try {
      const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename.endsWith(".md") ? filename : `${filename}.md`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      return true;
    } catch (err) {
      console.error("Download error:", err);
      return false;
    }
  }

  // 4. In-Browser Document Extraction Engines
  function getTurndownService() {
    if (turndownServiceInstance) return turndownServiceInstance;
    if (typeof TurndownService !== "undefined") {
      turndownServiceInstance = new TurndownService({
        headingStyle: 'atx',
        hr: '---',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced'
      });
      turndownServiceInstance.addRule('table', {
        filter: ['table'],
        replacement: function (content, node) {
          const rows = Array.from(node.querySelectorAll('tr'));
          if (!rows.length) return '';
          let md = '\n\n';
          rows.forEach((tr, rowIndex) => {
            const cells = Array.from(tr.querySelectorAll('th, td')).map(c => c.textContent.trim().replace(/\s+/g, ' '));
            if (!cells.length) return;
            md += '| ' + cells.join(' | ') + ' |\n';
            if (rowIndex === 0) {
              md += '| ' + cells.map(() => '---').join(' | ') + ' |\n';
            }
          });
          return md + '\n\n';
        }
      });
    }
    return turndownServiceInstance;
  }

  function extractHeadingsFromText(text) {
    const headings = [];
    if (!text) return headings;
    const lines = text.split("\n");
    for (const line of lines) {
      const trimmed = line.trim();
      const m = trimmed.match(/^(#{1,4})\s+(.+)$/);
      if (m) {
        const level = m[1].length;
        const title = m[2].replace(/[*_`]/g, "").trim();
        const slug = title.toLowerCase().replace(/[^a-z0-9_-]/g, "-").replace(/^-+|-+$/g, "");
        headings.push({ level, title, slug });
      }
    }
    return headings;
  }

  async function convertDocxClientSide(file) {
    if (typeof mammoth === "undefined") {
      throw new Error("Library Mammoth.js belum siap.");
    }
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer });
    const html = result.value;
    
    const td = getTurndownService();
    let rawMd = "";
    if (td) {
      rawMd = td.turndown(html);
    } else {
      rawMd = html.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
                  .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
                  .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
                  .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
                  .replace(/<br\s*\/?>/gi, '\n');
    }
    
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    const mdFilename = baseName.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 60) + ".md";
    
    let finalMd = "";
    if (!rawMd.trim().startsWith("# ")) {
      finalMd = `# ${baseName}\n\n> **Metadata Dokumen Word (.docx)**:\n> - **File Asli**: \`${file.name}\`\n> - **Status Dokumen**: Siap Dipakai\n\n---\n\n` + rawMd;
    } else {
      finalMd = rawMd;
    }
    
    return {
      filename: file.name,
      md_filename: mdFilename,
      file_type: "docx",
      size_bytes: file.size,
      has_markdown: true,
      raw_markdown: finalMd,
      rendered_html: html || `<pre>${escapeHtml(finalMd)}</pre>`
    };
  }

  async function convertPdfClientSide(file) {
    if (typeof pdfjsLib === "undefined") {
      throw new Error("Library PDF.js belum selesai dimuat.");
    }
    pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
    
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    const numPages = pdf.numPages;
    const baseName = file.name.replace(/\.[^/.]+$/, "");
    
    let pagesMd = [];
    
    for (let p = 1; p <= numPages; p++) {
      const page = await pdf.getPage(p);
      const content = await page.getTextContent();
      
      const lineMap = new Map();
      content.items.forEach(item => {
        const y = Math.round(item.transform[5] / 4) * 4;
        if (!lineMap.has(y)) lineMap.set(y, []);
        lineMap.get(y).push(item);
      });
      
      const sortedY = Array.from(lineMap.keys()).sort((a, b) => b - a);
      let pageText = "";
      
      sortedY.forEach(y => {
        const lineItems = lineMap.get(y).sort((a, b) => a.transform[4] - b.transform[4]);
        const lineStr = lineItems.map(it => it.str).join(" ").trim();
        if (lineStr) {
          if (/^(?:\d+\.?|[IVXLCDM]+\.?)\s+(?:PENDAHULUAN|INTRODUCTION|METODE|METHODOLOGY|HASIL|KESIMPULAN|REFERENCES|DAFTAR PUSTAKA)\b/i.test(lineStr)) {
            pageText += `\n## ${lineStr}\n\n`;
          } else if (/^\d+\.\d+\.?\s+[A-Z]/.test(lineStr)) {
            pageText += `\n### ${lineStr}\n\n`;
          } else {
            pageText += lineStr + "\n";
          }
        }
      });
      
      pageText = pageText.replace(/(\w+)-\s*\n\s*(\w+)/g, "$1$2");
      pageText = pageText.replace(/\n{3,}/g, "\n\n");
      pagesMd.push(`<!-- PAGE ${p} START -->\n\n${pageText.trim()}\n\n<!-- PAGE ${p} END -->\n\n---\n`);
    }
    
    const mdFilename = baseName.replace(/[^a-zA-Z0-9_\-]/g, "_").slice(0, 60) + ".md";
    const header = `# ${baseName}\n\n> **Metadata Dokumen PDF**:\n> - **File Asli**: \`${file.name}\`\n> - **Jumlah Halaman**: ${numPages} Halaman\n> - **Status Dokumen**: Siap Dipakai\n\n---\n\n`;
    const rawMd = header + pagesMd.join("\n\n");
    
    const rendered = rawMd
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>')
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\n/gim, '<br>');
      
    return {
      filename: file.name,
      md_filename: mdFilename,
      file_type: "pdf",
      size_bytes: file.size,
      has_markdown: true,
      raw_markdown: rawMd,
      rendered_html: rendered
    };
  }

  async function convertAnyFileUniversal(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (ext === 'docx') {
      return await convertDocxClientSide(file);
    } else if (ext === 'pdf') {
      return await convertPdfClientSide(file);
    } else {
      // Legacy .doc or other formats fallback
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      return data.converted[0];
    }
  }

  // 5. Render Document List
  function renderDocList(docs) {
    docListEl.innerHTML = "";
    
    if (docs.length === 0) {
      emptySearchEl.classList.remove("hidden");
      docCounterEl.textContent = "0 Dokumen";
      badgeCountEl.textContent = "0 file";
      if (downloadAllBtn) downloadAllBtn.style.display = "none";
      return;
    }
    emptySearchEl.classList.add("hidden");
    
    const count = docs.length;
    docCounterEl.textContent = `${count} Dokumen`;
    badgeCountEl.textContent = `${count} file`;
    if (downloadAllBtn) downloadAllBtn.style.display = count > 0 ? "inline-flex" : "none";
    
    docs.forEach(doc => {
      const itemEl = document.createElement("button");
      itemEl.className = "doc-item";
      if (doc.md_filename && doc.md_filename === currentSelectedMd) {
        itemEl.classList.add("active");
      }
      
      const sizeKB = (doc.size_bytes / 1024).toFixed(0);
      const ext = doc.filename.split('.').pop().toLowerCase();
      const badgeTypeClass = ext === 'docx' ? 'docx' : 'pdf';
      const badgeTypeText = ext.toUpperCase();

      itemEl.innerHTML = `
        <div class="doc-item-title" title="${escapeHtml(doc.filename)}">
          <span class="doc-type-badge ${badgeTypeClass}">${badgeTypeText}</span>
          ${escapeHtml(doc.filename.replace(/\.(pdf|docx|doc)$/i, ''))}
        </div>
        <div class="doc-item-meta">
          <span>${sizeKB} KB</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="status-tag ready">Siap</span>
            <span class="quick-download-btn" title="Unduh Markdown langsung (.md)" data-file="${escapeHtml(doc.md_filename)}">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            </span>
          </div>
        </div>
      `;
      
      const qBtn = itemEl.querySelector(".quick-download-btn");
      if (qBtn) {
        qBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const targetMd = qBtn.getAttribute("data-file");
          const targetDoc = allDocuments.find(d => d.md_filename === targetMd);
          if (targetDoc && targetDoc.raw_markdown) {
            downloadMarkdownBlob(targetDoc.md_filename, targetDoc.raw_markdown);
            showToast(`Mengunduh ${targetDoc.md_filename}...`, "success");
          }
        });
      }

      itemEl.addEventListener("click", () => {
        selectDocument(doc.md_filename);
      });
      
      docListEl.appendChild(itemEl);
    });
  }

  // 6. Select & Display Document
  function selectDocument(mdFilename) {
    currentSelectedMd = mdFilename;
    
    document.querySelectorAll(".doc-item").forEach(el => el.classList.remove("active"));
    const items = Array.from(docListEl.children);
    const matched = allDocuments.findIndex(d => d.md_filename === mdFilename);
    if (matched !== -1 && items[matched]) {
      items[matched].classList.add("active");
    }

    const doc = allDocuments.find(d => d.md_filename === mdFilename);
    if (!doc) return;

    activeTitleEl.textContent = doc.filename.replace(/\.(pdf|docx|doc)$/i, '');
    renderedContentEl.innerHTML = doc.rendered_html || `<div class="empty-state"><p>Tidak ada konten.</p></div>`;
    rawContentEl.value = doc.raw_markdown || "";
    currentRawMarkdown = doc.raw_markdown || "";
    
    copyBtn.disabled = !currentRawMarkdown;
    downloadBtn.disabled = !currentRawMarkdown;
  }

  // 7. Drag & Drop Upload
  dropzone.addEventListener("click", () => fileInput.click());
  
  dropzone.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInput.click();
    }
  });
  
  ["dragenter", "dragover"].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.add("drag-over");
    });
  });
  
  ["dragleave", "drop"].forEach(name => {
    dropzone.addEventListener(name, (e) => {
      e.preventDefault();
      dropzone.classList.remove("drag-over");
    });
  });
  
  dropzone.addEventListener("drop", (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFilesUpload(files);
    }
  });
  
  fileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      handleFilesUpload(e.target.files);
    }
  });

  async function handleFilesUpload(files) {
    const validFiles = Array.from(files).filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".doc");
    });
    if (validFiles.length === 0) {
      showToast("Mohon pilih file berekstensi .pdf atau .docx", "error");
      return;
    }

    progressBox.classList.remove("hidden");
    progressBar.style.width = "10%";
    percentLabel.textContent = "10%";
    statusLabel.textContent = `Mengekstrak ${validFiles.length} file...`;

    const newlyConverted = [];

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      const percent = Math.round(((i + 0.5) / validFiles.length) * 90);
      progressBar.style.width = `${percent}%`;
      percentLabel.textContent = `${percent}%`;
      statusLabel.textContent = `Mengekstrak [${i + 1}/${validFiles.length}]: ${file.name}...`;

      try {
        const item = await convertAnyFileUniversal(file);
        if (item) {
          // Add or replace in session array
          const existingIdx = allDocuments.findIndex(d => d.md_filename === item.md_filename);
          if (existingIdx >= 0) {
            allDocuments[existingIdx] = item;
          } else {
            allDocuments.unshift(item);
          }
          newlyConverted.push(item);

          // Auto-download per file if enabled
          const isAutoDownload = autoDownloadToggle ? autoDownloadToggle.checked : true;
          if (isAutoDownload && item.raw_markdown) {
            setTimeout(() => {
              downloadMarkdownBlob(item.md_filename, item.raw_markdown);
              showToast(`File ${item.md_filename} otomatis diunduh!`, "success");
            }, 300);
          }
        }
      } catch (err) {
        console.error("Conversion error for", file.name, err);
        showToast(`Gagal mengekstrak ${file.name}: ${err.message}`, "error");
      }
    }

    progressBar.style.width = "100%";
    percentLabel.textContent = "100%";
    statusLabel.textContent = "Ekstraksi selesai!";
    
    renderDocList(allDocuments);

    if (newlyConverted.length > 0) {
      showToast(`Berhasil mengekstrak ${newlyConverted.length} dokumen!`, "success");
      selectDocument(newlyConverted[0].md_filename);
    }

    setTimeout(() => {
      progressBox.classList.add("hidden");
      progressBar.style.width = "0%";
      fileInput.value = "";
    }, 800);
  }

  // 8. Download Single File Button
  downloadBtn.addEventListener("click", () => {
    if (!currentSelectedMd) return;
    const doc = allDocuments.find(d => d.md_filename === currentSelectedMd);
    if (doc && doc.raw_markdown) {
      downloadMarkdownBlob(doc.md_filename, doc.raw_markdown);
      showToast(`Mengunduh ${doc.md_filename}...`, "success");
    }
  });

  // 9. Download All Files (.zip)
  if (downloadAllBtn) {
    downloadAllBtn.addEventListener("click", async () => {
      if (allDocuments.length === 0) {
        showToast("Belum ada dokumen Markdown untuk diunduh.", "error");
        return;
      }
      
      if (typeof JSZip !== "undefined") {
        showToast("Menyiapkan berkas ZIP...");
        try {
          const zip = new JSZip();
          allDocuments.forEach(doc => {
            zip.file(doc.md_filename, doc.raw_markdown || `# ${doc.filename}`);
          });
          const blob = await zip.generateAsync({ type: "blob" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "Semua_Dokumen_Markdown.zip";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          setTimeout(() => URL.revokeObjectURL(url), 1000);
          showToast("Berkas ZIP berhasil diunduh!", "success");
        } catch (zipErr) {
          console.error("ZIP creation error:", zipErr);
          showToast("Gagal membuat berkas ZIP", "error");
        }
      }
    });
  }

  // 10. Copy Markdown to Clipboard
  copyBtn.addEventListener("click", async () => {
    if (!rawContentEl.value) return;
    try {
      await navigator.clipboard.writeText(rawContentEl.value);
      copyBtnText.textContent = "Tersalin!";
      showToast("Markdown berhasil disalin ke clipboard", "success");
      setTimeout(() => {
        copyBtnText.textContent = "Salin Markdown";
      }, 2000);
    } catch (err) {
      rawContentEl.select();
      document.execCommand("copy");
      showToast("Markdown berhasil disalin", "success");
    }
  });

  function showToast(msg, type = "info") {
    toastEl.textContent = msg;
    toastEl.className = `toast ${type}`;
    toastEl.classList.remove("hidden");
    
    setTimeout(() => {
      toastEl.classList.add("hidden");
    }, 3500);
  }
  
  function escapeHtml(str) {
    if (!str) return "";
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Initial render: empty list on fresh load (clean state on every refresh)
  renderDocList(allDocuments);
});
