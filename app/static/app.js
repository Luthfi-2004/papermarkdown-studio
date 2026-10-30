// PaperMarkdown Studio - Client Logic

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const docListEl = document.getElementById("doc-list");
  const docCounterEl = document.getElementById("doc-counter");
  const badgeCountEl = document.getElementById("badge-count");
  const searchInput = document.getElementById("search-input");
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
  
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const progressBox = document.getElementById("upload-progress-container");
  const progressBar = document.getElementById("upload-progress-bar");
  const statusLabel = document.getElementById("upload-status-label");
  const percentLabel = document.getElementById("upload-percent-label");
  
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const toastEl = document.getElementById("toast");
  
  let allDocuments = [];
  let currentSelectedMd = null;
  
  // 1. Theme Management (R-21, R-34)
  const savedTheme = localStorage.getItem("papermarkdown-theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  
  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("papermarkdown-theme", newTheme);
    showToast(`Tema diubah ke mode ${newTheme === "dark" ? "gelap" : "terang"}`);
  });
  
  // 2. Tab Navigation (R-26, R-32)
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
  
  // 3. Load Documents from API
  async function loadDocuments(selectAfterLoad = null) {
    try {
      const res = await fetch("/api/documents");
      const data = await res.json();
      
      if (!data.success) {
        showToast(data.error || "Gagal memuat dokumen", "error");
        return;
      }
      
      allDocuments = data.documents;
      renderDocList(allDocuments);
      
      const count = allDocuments.length;
      docCounterEl.textContent = `${count} Dokumen Siap`;
      badgeCountEl.textContent = `${count} file`;
      
      // Auto select first document if none selected
      if (selectAfterLoad) {
        const item = allDocuments.find(d => d.md_filename === selectAfterLoad || d.filename === selectAfterLoad);
        if (item && item.md_filename) {
          selectDocument(item.md_filename, item.filename);
        }
      } else if (!currentSelectedMd && allDocuments.length > 0) {
        const firstReady = allDocuments.find(d => d.has_markdown);
        if (firstReady) {
          selectDocument(firstReady.md_filename, firstReady.filename);
        }
      }
    } catch (err) {
      console.error(err);
      showToast("Koneksi server gagal", "error");
    }
  }
  
  // 4. Render Document List
  function renderDocList(docs) {
    docListEl.innerHTML = "";
    
    if (docs.length === 0) {
      emptySearchEl.classList.remove("hidden");
      return;
    }
    emptySearchEl.classList.add("hidden");
    
    docs.forEach(doc => {
      const itemEl = document.createElement("button");
      itemEl.className = "doc-item";
      if (doc.md_filename && doc.md_filename === currentSelectedMd) {
        itemEl.classList.add("active");
      }
      
      const sizeKB = (doc.size_bytes / 1024).toFixed(0);
      const isReady = doc.has_markdown;
      
      itemEl.innerHTML = `
        <div class="doc-item-title" title="${escapeHtml(doc.filename)}">
          ${escapeHtml(doc.filename.replace('.pdf', ''))}
        </div>
        <div class="doc-item-meta">
          <span>${sizeKB} KB</span>
          <span class="status-tag ${isReady ? 'ready' : 'pending'}">
            ${isReady ? 'Markdown Siap' : 'Perlu Konversi'}
          </span>
        </div>
      `;
      
      itemEl.addEventListener("click", () => {
        if (doc.has_markdown) {
          selectDocument(doc.md_filename, doc.filename);
        } else {
          convertSingle(doc.filename);
        }
      });
      
      docListEl.appendChild(itemEl);
    });
  }
  
  // 5. Select & Display Document
  async function selectDocument(mdFilename, origName) {
    currentSelectedMd = mdFilename;
    
    // Update active class in list
    document.querySelectorAll(".doc-item").forEach(el => el.classList.remove("active"));
    const items = Array.from(docListEl.children);
    const matched = allDocuments.findIndex(d => d.md_filename === mdFilename);
    if (matched !== -1 && items[matched]) {
      items[matched].classList.add("active");
    }
    
    activeTitleEl.textContent = origName ? origName.replace('.pdf', '') : mdFilename;
    renderedContentEl.innerHTML = `<div class="empty-state"><p>Memuat konten artikel...</p></div>`;
    rawContentEl.value = "Memuat...";
    
    copyBtn.disabled = true;
    downloadBtn.disabled = true;
    
    try {
      const res = await fetch(`/api/document/${encodeURIComponent(mdFilename)}`);
      const data = await res.json();
      
      if (!data.success) {
        renderedContentEl.innerHTML = `<div class="empty-state"><p>${escapeHtml(data.error || "Gagal membuka dokumen.")}</p></div>`;
        rawContentEl.value = "";
        return;
      }
      
      renderedContentEl.innerHTML = data.rendered_html;
      rawContentEl.value = data.raw_markdown;
      
      copyBtn.disabled = false;
      downloadBtn.disabled = false;
    } catch (err) {
      console.error(err);
      showToast("Gagal memuat artikel", "error");
    }
  }
  
  // 6. Convert Specific Document
  async function convertSingle(pdfFilename) {
    showToast(`Mengonversi ${pdfFilename}...`);
    try {
      const res = await fetch(`/api/convert/${encodeURIComponent(pdfFilename)}`, { method: "POST" });
      const data = await res.json();
      if (data.success) {
        showToast("Konversi berhasil!", "success");
        await loadDocuments(data.result.md_filename);
      } else {
        showToast(`Gagal: ${data.error}`, "error");
      }
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan saat konversi", "error");
    }
  }
  
  // 7. Search Filter
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderDocList(allDocuments);
      return;
    }
    const filtered = allDocuments.filter(d => d.filename.toLowerCase().includes(q));
    renderDocList(filtered);
  });
  
  // 8. Copy to Clipboard (R-26)
  copyBtn.addEventListener("click", async () => {
    if (!rawContentEl.value) return;
    try {
      await navigator.clipboard.writeText(rawContentEl.value);
      copyBtnText.textContent = "Tersalin!";
      showToast("Markdown berhasil disalin ke clipboard", "success");
      setTimeout(() => {
        copyBtnText.textContent = "Salin Teks";
      }, 2000);
    } catch (err) {
      // Fallback
      rawContentEl.select();
      document.execCommand("copy");
      showToast("Markdown berhasil disalin", "success");
    }
  });
  
  // 9. Download .md File (R-26)
  downloadBtn.addEventListener("click", () => {
    if (!currentSelectedMd) return;
    window.location.href = `/api/download/${encodeURIComponent(currentSelectedMd)}`;
  });
  
  // 10. Drag & Drop Upload
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
    const validFiles = Array.from(files).filter(f => f.name.toLowerCase().endsWith(".pdf"));
    if (validFiles.length === 0) {
      showToast("Mohon pilih file berekstensi .pdf", "error");
      return;
    }
    
    const formData = new FormData();
    validFiles.forEach(f => formData.append("files[]", f));
    
    // Show Progress Box
    progressBox.classList.remove("hidden");
    progressBar.style.width = "20%";
    percentLabel.textContent = "20%";
    statusLabel.textContent = `Mengunggah & mengonversi ${validFiles.length} file...`;
    
    try {
      progressBar.style.width = "50%";
      percentLabel.textContent = "50%";
      
      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      
      progressBar.style.width = "85%";
      percentLabel.textContent = "85%";
      
      const data = await res.json();
      
      if (!data.success) {
        showToast(data.error || "Gagal mengonversi file", "error");
        progressBox.classList.add("hidden");
        return;
      }
      
      progressBar.style.width = "100%";
      percentLabel.textContent = "100%";
      statusLabel.textContent = "Konversi selesai!";
      
      showToast(`Berhasil mengonversi ${data.converted.length} file PDF!`, "success");
      
      setTimeout(async () => {
        progressBox.classList.add("hidden");
        progressBar.style.width = "0%";
        fileInput.value = "";
        
        // Reload and select first newly converted file
        const firstConverted = data.converted[0];
        await loadDocuments(firstConverted ? firstConverted.md_filename : null);
      }, 1000);
      
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan koneksi", "error");
      progressBox.classList.add("hidden");
    }
  }
  
  // 11. Helper Toast Notification
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
  
  // Initialize
  loadDocuments();
});
