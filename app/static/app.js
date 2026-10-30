// PaperMarkdown Studio - Family-Friendly Glassmorphism Presentation UI Logic

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
  
  const fontDecreaseBtn = document.getElementById("font-decrease-btn");
  const fontIncreaseBtn = document.getElementById("font-increase-btn");
  const fontSizeLabel = document.getElementById("font-size-label");
  const togglePresentationBtn = document.getElementById("toggle-presentation-btn");
  const sidebarPanel = document.getElementById("sidebar-panel");
  const presentationScreen = document.getElementById("presentation-screen");
  
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");
  const progressBox = document.getElementById("upload-progress-container");
  const progressBar = document.getElementById("upload-progress-bar");
  const statusLabel = document.getElementById("upload-status-label");
  const percentLabel = document.getElementById("upload-percent-label");
  
  const themeToggleBtn = document.getElementById("theme-toggle-btn");
  const toastEl = document.getElementById("toast");
  
  // Mobile Dynamic Elements (R-03)
  const appContainer = document.getElementById("app-container");
  const mobileBackBtn = document.getElementById("mobile-back-btn");
  const mobileNavList = document.getElementById("mobile-nav-list");
  const mobileNavUpload = document.getElementById("mobile-nav-upload");
  const mobileNavReader = document.getElementById("mobile-nav-reader");
  
  let allDocuments = [];
  let currentSelectedMd = null;
  let fontScalePercent = 100;
  let isPresentationMode = false;
  let activeMobileTab = "list";
  
  // 1. Theme Management (R-21, R-34)
  const savedTheme = localStorage.getItem("papermarkdown-theme") || "dark";
  document.documentElement.setAttribute("data-theme", savedTheme);
  
  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-theme");
    const newTheme = currentTheme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", newTheme);
    localStorage.setItem("papermarkdown-theme", newTheme);
    showToast(`Tema beralih ke mode ${newTheme === "dark" ? "gelap" : "terang"}`);
  });
  
  // 1b. Dynamic Mobile View Controller (R-03)
  function setMobileView(view) {
    activeMobileTab = view;
    if (appContainer) {
      appContainer.setAttribute("data-mobile-view", view);
    }
    document.body.setAttribute("data-mobile-view", view);
    
    if (mobileNavList) mobileNavList.classList.toggle("active", view === "list");
    if (mobileNavUpload) mobileNavUpload.classList.toggle("active", view === "upload");
    if (mobileNavReader) mobileNavReader.classList.toggle("active", view === "reader");
    
    // Smooth scroll active panel to top
    if (view === "reader") {
      const renderedPane = document.getElementById("view-rendered");
      if (renderedPane) renderedPane.scrollTop = 0;
    } else if (view === "list") {
      const docList = document.getElementById("doc-list");
      if (docList) docList.scrollTop = 0;
    }
  }
  
  if (mobileNavList) mobileNavList.addEventListener("click", () => setMobileView("list"));
  if (mobileNavUpload) mobileNavUpload.addEventListener("click", () => setMobileView("upload"));
  if (mobileNavReader) mobileNavReader.addEventListener("click", () => setMobileView("reader"));
  if (mobileBackBtn) mobileBackBtn.addEventListener("click", () => setMobileView("list"));
  
  // Initial mobile view
  setMobileView("list");
  
  // 2. Font Zoom Controls for Family/Presentation Reading
  function updateFontScale() {
    fontSizeLabel.textContent = `${fontScalePercent}%`;
    document.documentElement.style.setProperty("--doc-font-scale", `${fontScalePercent / 100}rem`);
  }
  
  fontDecreaseBtn.addEventListener("click", () => {
    if (fontScalePercent > 80) {
      fontScalePercent -= 10;
      updateFontScale();
    }
  });
  
  fontIncreaseBtn.addEventListener("click", () => {
    if (fontScalePercent < 150) {
      fontScalePercent += 10;
      updateFontScale();
    }
  });
  
  // 3. Presentation Focus Mode (Hides/Shows Sidebar)
  togglePresentationBtn.addEventListener("click", () => {
    isPresentationMode = !isPresentationMode;
    if (isPresentationMode) {
      sidebarPanel.classList.add("hidden-presentation");
      togglePresentationBtn.classList.add("active");
      togglePresentationBtn.setAttribute("title", "Kembalikan Tampilan Standar");
      showToast("Mode Layar Penuh Presentasi Aktif (Tekan Esc untuk keluar)");
    } else {
      sidebarPanel.classList.remove("hidden-presentation");
      togglePresentationBtn.classList.remove("active");
      togglePresentationBtn.setAttribute("title", "Mode Layar Penuh / Fokus Membaca");
    }
  });
  
  // Esc key to exit presentation mode
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isPresentationMode) {
      isPresentationMode = false;
      sidebarPanel.classList.remove("hidden-presentation");
      togglePresentationBtn.classList.remove("active");
      togglePresentationBtn.setAttribute("title", "Mode Layar Penuh / Fokus Membaca");
    }
  });
  
  // 4. Tab Navigation
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
  
  // 5. Load Documents from API
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
  
  // 6. Render Document List
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
  
  // 7. Select & Display Document
  async function selectDocument(mdFilename, origName) {
    currentSelectedMd = mdFilename;
    
    document.querySelectorAll(".doc-item").forEach(el => el.classList.remove("active"));
    const items = Array.from(docListEl.children);
    const matched = allDocuments.findIndex(d => d.md_filename === mdFilename);
    if (matched !== -1 && items[matched]) {
      items[matched].classList.add("active");
    }
    
    activeTitleEl.textContent = origName ? origName.replace('.pdf', '') : mdFilename;
    renderedContentEl.innerHTML = `<div class="empty-state"><p>Mempersiapkan layar presentasi artikel...</p></div>`;
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
      
      // Auto-transition to reader on mobile when a document is opened
      if (window.innerWidth <= 768) {
        setMobileView("reader");
      }
    } catch (err) {
      console.error(err);
      showToast("Gagal memuat artikel", "error");
    }
  }
  
  // 8. Convert Specific Document
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
  
  // 9. Search Filter
  searchInput.addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase().trim();
    if (!q) {
      renderDocList(allDocuments);
      return;
    }
    const filtered = allDocuments.filter(d => d.filename.toLowerCase().includes(q));
    renderDocList(filtered);
  });
  
  // 10. Copy to Clipboard
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
      rawContentEl.select();
      document.execCommand("copy");
      showToast("Markdown berhasil disalin", "success");
    }
  });
  
  // 11. Download .md File
  downloadBtn.addEventListener("click", () => {
    if (!currentSelectedMd) return;
    window.location.href = `/api/download/${encodeURIComponent(currentSelectedMd)}`;
  });
  
  // 12. Drag & Drop Upload
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
        
        const firstConverted = data.converted[0];
        await loadDocuments(firstConverted ? firstConverted.md_filename : null);
        
        // Auto-transition to reader on mobile after conversion
        if (window.innerWidth <= 768 && firstConverted) {
          setMobileView("reader");
        }
      }, 1000);
      
    } catch (err) {
      console.error(err);
      showToast("Terjadi kesalahan koneksi", "error");
      progressBox.classList.add("hidden");
    }
  }
  
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
