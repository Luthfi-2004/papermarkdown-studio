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

  // Skripsi Tools & Outline Elements
  const downloadAllBtn = document.getElementById("download-all-btn");
  const autoDownloadToggle = document.getElementById("auto-download-toggle");
  const skripsiToolsBtn = document.getElementById("skripsi-tools-btn");
  const toggleOutlineBtn = document.getElementById("toggle-outline-btn");
  const outlineDrawer = document.getElementById("outline-drawer");
  const closeOutlineBtn = document.getElementById("close-outline-btn");
  const outlineList = document.getElementById("outline-list");

  const skripsiStatsBar = document.getElementById("skripsi-stats-bar");
  const statWords = document.getElementById("stat-words");
  const statReading = document.getElementById("stat-reading");
  const statHeadings = document.getElementById("stat-headings");
  const statTables = document.getElementById("stat-tables");

  const skripsiModal = document.getElementById("skripsi-modal");
  const closeSkripsiModalBtn = document.getElementById("close-skripsi-modal-btn");
  const promptCards = document.querySelectorAll(".prompt-card");
  const promptPreviewTextarea = document.getElementById("prompt-preview-textarea");
  const copyFullPromptBtn = document.getElementById("copy-full-prompt-btn");
  const copyPromptBtnText = document.getElementById("copy-prompt-btn-text");
  
  let allDocuments = [];
  let currentSelectedMd = null;
  let currentRawMarkdown = "";
  let fontScalePercent = 100;
  let isPresentationMode = false;
  let activeMobileTab = "list";
  let activePromptId = "bab1";
  
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

      const readyDocs = allDocuments.filter(d => d.has_markdown);
      if (downloadAllBtn) {
        downloadAllBtn.style.display = readyDocs.length > 0 ? "inline-flex" : "none";
      }
      
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
      
      const ext = doc.filename.split('.').pop().toLowerCase();
      const badgeTypeClass = ext === 'docx' ? 'docx' : (ext === 'doc' ? 'doc' : 'pdf');
      const badgeTypeText = ext.toUpperCase();

      itemEl.innerHTML = `
        <div class="doc-item-title" title="${escapeHtml(doc.filename)}">
          <span class="doc-type-badge ${badgeTypeClass}">${badgeTypeText}</span>
          ${escapeHtml(doc.filename.replace(/\.(pdf|docx|doc)$/i, ''))}
        </div>
        <div class="doc-item-meta">
          <span>${sizeKB} KB</span>
          <div style="display:flex; align-items:center; gap:6px;">
            <span class="status-tag ${isReady ? 'ready' : 'pending'}">
              ${isReady ? 'Siap Baca' : 'Perlu Konversi'}
            </span>
            ${isReady ? `
              <span class="quick-download-btn" title="Unduh Markdown langsung (.md)" data-file="${escapeHtml(doc.md_filename)}">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </span>
            ` : ''}
          </div>
        </div>
      `;
      
      const qBtn = itemEl.querySelector(".quick-download-btn");
      if (qBtn) {
        qBtn.addEventListener("click", (e) => {
          e.stopPropagation();
          const targetMd = qBtn.getAttribute("data-file");
          if (targetMd) {
            window.location.href = `/api/download/${encodeURIComponent(targetMd)}`;
            showToast(`Mengunduh ${targetMd}...`, "success");
          }
        });
      }

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
      currentRawMarkdown = data.raw_markdown;
      
      copyBtn.disabled = false;
      downloadBtn.disabled = false;
      if (skripsiToolsBtn) skripsiToolsBtn.disabled = false;

      // Update Skripsi Stats Bar
      if (data.stats && skripsiStatsBar) {
        skripsiStatsBar.classList.remove("hidden");
        if (statWords) statWords.textContent = `${data.stats.word_count.toLocaleString()} Kata`;
        if (statReading) statReading.textContent = `${data.stats.reading_time_min} Menit Baca`;
        if (statHeadings) statHeadings.textContent = `${data.stats.headings_count} Bab / Subbab`;
        if (statTables) statTables.textContent = `${data.stats.tables_count} Tabel`;
      }

      // Update Outline / Table of Contents
      if (data.headings && data.headings.length > 0) {
        renderOutline(data.headings);
        if (toggleOutlineBtn) toggleOutlineBtn.disabled = false;
      } else {
        if (toggleOutlineBtn) toggleOutlineBtn.disabled = true;
        if (outlineDrawer) outlineDrawer.classList.add("hidden");
      }

      // Refresh Skripsi Prompt Preview with Document Context
      updatePromptPreview();
      
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

  if (downloadAllBtn) {
    downloadAllBtn.addEventListener("click", () => {
      window.location.href = "/api/download-all";
      showToast("Mengunduh semua file Markdown (.zip)...", "success");
    });
  }
  
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
    const validFiles = Array.from(files).filter(f => {
      const name = f.name.toLowerCase();
      return name.endsWith(".pdf") || name.endsWith(".docx") || name.endsWith(".doc");
    });
    if (validFiles.length === 0) {
      showToast("Mohon pilih file berekstensi .pdf, .docx, atau .doc", "error");
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
      
      showToast(`Berhasil mengonversi ${data.converted.length} dokumen!`, "success");

      // Auto-download converted files to user's computer if enabled
      const isAutoDownload = autoDownloadToggle ? autoDownloadToggle.checked : true;
      if (isAutoDownload && data.converted) {
        data.converted.forEach((item, idx) => {
          if (item.md_filename) {
            setTimeout(() => {
              const a = document.createElement("a");
              a.href = `/api/download/${encodeURIComponent(item.md_filename)}`;
              a.download = item.md_filename;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              showToast(`File ${item.md_filename} otomatis diunduh!`, "success");
            }, idx * 400);
          }
        });
      }
      
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
  
  // 13. Skripsi AI Prompt Helper Templates (Hard Gate R-02 Compliant, No Em Dashes)
  const SKRIPSI_PROMPTS = {
    bab1: `Bertindaklah sebagai Dosen Pembimbing Skripsi dan Reviewer Ahli Metodologi Penelitian.
Evaluasilah BAB I (Pendahuluan) dari draf dokumen berikut. Fokuskan evaluasi pada:
1. Urgensi Latar Belakang: Apakah permasalahan yang diangkat didukung data riil dan justifikasi ilmiah yang kuat?
2. Keterkaitan Rumusan Masalah dan Tujuan: Apakah rumusan masalah sudah terukur (measurable) dan terjawab langsung oleh tujuan penelitian?
3. Batasan Masalah: Apakah batasan ruang lingkup riset sudah jelas (dataset, algoritma, periode waktu)?
4. Berikan saran revisi kalimat pembuka dan poin perbaikan konkret.

Berikut naskah BAB I:
[KONTEN DOKUMEN AKAN DISISIPKAN DI SINI]`,

    bab2: `Bertindaklah sebagai Dosen Penelaah Skripsi bidang Kecerdasan Buatan dan Sains Data.
Analisis BAB II (Tinjauan Pustaka & Landasan Teori) berikut:
1. State-of-the-Art & Gap Penelitian: Apakah kajian literatur menunjukkan posisi penelitian ini terhadap penelitian-penelitian terdahulu?
2. Landasan Teori Algoritma: Apakah teori dasar (seperti LSTM, XGBoost, ARIMA, dll.) dijelaskan secara matematis dan konseptual dengan benar?
3. Relevansi Referensi: Berikan saran literatur atau konsep kunci yang perlu ditambahkan agar landasan teori lebih kokoh.

Berikut naskah BAB II:
[KONTEN DOKUMEN AKAN DISISIPKAN DI SINI]`,

    bab3: `Bertindaklah sebagai Penguji Sidang Skripsi bidang Data Science dan Machine Learning.
Lakukan audit kritis terhadap BAB III (Metodologi Penelitian) berikut:
1. Alur Penelitian (Flowchart): Apakah tahapan riset dari akuisisi data, preprocessing, pemodelan, hingga validasi sudah logis dan terstruktur?
2. Preprocessing & Validasi Data: Apakah ada risiko data leakage? Apakah split data (train/validation/test) dan scaling data dijelaskan transparan?
3. Arsitektur Model & Hyperparameter: Apakah konfigurasi parameter model dijelaskan dengan baik?
4. Metrik Evaluasi: Apakah metrik (RMSE, MAPE, MAE, R-squared) sesuai dengan karakteristik data?
5. Tuliskan daftar 5 pertanyaan kritis yang kemungkinan akan ditanyakan penguji saat sidang skripsi beserta rekomendasi jawabannya.

Berikut naskah BAB III:
[KONTEN DOKUMEN AKAN DISISIPKAN DI SINI]`,

    bab4: `Bertindaklah sebagai Dosen Pembimbing Skripsi.
Bantulah menganalisis dan menyusun narasi akademik untuk BAB IV (Hasil dan Pembahasan) berikut:
1. Interpretasi Data & Tabel: Buat narasi ilmiah yang menjelaskan makna angka-angka metrik akurasi atau tabel hasil eksperimen.
2. Analisis Perbandingan: Jelaskan mengapa satu algoritma mengungguli algoritma lain (misal Hybrid LSTM-XGBoost vs Single Model) berdasarkan karakteristik model.
3. Keterbatasan Eksperimen: Apa saja kelemahan atau anomali data yang perlu diakui secara jujur dalam pembahasan?

Berikut naskah BAB IV:
[KONTEN DOKUMEN AKAN DISISIPKAN DI SINI]`,

    bab5: `Bertindaklah sebagai Tim Penguji Sidang Skripsi.
Periksalah BAB V (Kesimpulan dan Saran) berikut:
1. Apakah kesimpulan secara tegas dan ringkas menjawab setiap poin rumusan masalah penelitian?
2. Pastikan tidak ada spekulasi atau pernyataan baru yang tidak didukung data pada Bab IV.
3. Apakah saran riset lanjutan bersifat konstruktif dan teknis (misalnya perbaikan fitur, penambahan dataset, optimasi hyperparameter)?

Berikut naskah BAB V:
[KONTEN DOKUMEN AKAN DISISIPKAN DI SINI]`,

    daftar_pustaka: `Bertindaklah sebagai Editor Jurnal dan Penyelaras Skripsi.
Periksalah format sitasi dan daftar pustaka berikut sesuai gaya sitasi akademik (APA 7th Edition atau IEEE):
1. Verifikasi kelengkapan komponen: Penulis, Tahun, Judul, Jurnal/Prosiding, Volume/Nomor, Halaman, dan DOI/URL.
2. Identifikasi sitasi dalam teks yang belum ada di daftar pustaka (atau sebaliknya).
3. Rapikan susunan alfabetis dan format indentasi gantung (hanging indent).

Berikut daftar pustaka / teks dokumen:
[KONTEN DOKUMEN AKAN DISISIPKAN DI SINI]`
  };

  function updatePromptPreview() {
    if (!promptPreviewTextarea) return;
    const basePrompt = SKRIPSI_PROMPTS[activePromptId] || SKRIPSI_PROMPTS.bab1;
    const previewContent = currentRawMarkdown ? currentRawMarkdown.substring(0, 500) + "\n\n... [Sisa teks dokumen akan otomatis digabungkan saat disalin] ..." : "(Pilih atau buka dokumen terlebih dahulu)";
    promptPreviewTextarea.value = basePrompt.replace("[KONTEN DOKUMEN AKAN DISISIPKAN DI SINI]", previewContent);
  }

  // Outline / Table of Contents Renderer
  function renderOutline(headings) {
    if (!outlineList) return;
    outlineList.innerHTML = "";
    
    headings.forEach(h => {
      const btn = document.createElement("button");
      btn.className = `outline-item lvl-${h.level}`;
      btn.textContent = h.title;
      btn.title = h.title;
      
      btn.addEventListener("click", () => {
        // Find matching heading in rendered pane
        const headingsInDoc = viewRendered.querySelectorAll("h1, h2, h3, h4");
        for (const el of headingsInDoc) {
          if (el.textContent.trim().toLowerCase().includes(h.title.toLowerCase().substring(0, 20))) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            break;
          }
        }
        if (window.innerWidth <= 768 && outlineDrawer) {
          outlineDrawer.classList.add("hidden");
        }
      });
      
      outlineList.appendChild(btn);
    });
  }

  // Toggle Outline Drawer
  if (toggleOutlineBtn) {
    toggleOutlineBtn.addEventListener("click", () => {
      if (outlineDrawer) {
        outlineDrawer.classList.toggle("hidden");
      }
    });
  }

  if (closeOutlineBtn) {
    closeOutlineBtn.addEventListener("click", () => {
      if (outlineDrawer) outlineDrawer.classList.add("hidden");
    });
  }

  // Skripsi Modal Handlers
  if (skripsiToolsBtn) {
    skripsiToolsBtn.addEventListener("click", () => {
      if (!currentSelectedMd) {
        showToast("Pilih dokumen terlebih dahulu", "info");
        return;
      }
      updatePromptPreview();
      if (skripsiModal) skripsiModal.classList.remove("hidden");
    });
  }

  if (closeSkripsiModalBtn) {
    closeSkripsiModalBtn.addEventListener("click", () => {
      if (skripsiModal) skripsiModal.classList.add("hidden");
    });
  }

  if (skripsiModal) {
    skripsiModal.addEventListener("click", (e) => {
      if (e.target === skripsiModal) {
        skripsiModal.classList.add("hidden");
      }
    });
  }

  // Prompt Cards selection
  promptCards.forEach(card => {
    card.addEventListener("click", () => {
      promptCards.forEach(c => c.classList.remove("active"));
      card.classList.add("active");
      activePromptId = card.getAttribute("data-prompt-id") || "bab1";
      updatePromptPreview();
    });
  });

  // Copy Full Prompt with Complete Document Text
  if (copyFullPromptBtn) {
    copyFullPromptBtn.addEventListener("click", async () => {
      const basePrompt = SKRIPSI_PROMPTS[activePromptId] || SKRIPSI_PROMPTS.bab1;
      const fullText = currentRawMarkdown || "(Teks dokumen kosong)";
      const fullPromptToCopy = basePrompt.replace("[KONTEN DOKUMEN AKAN DISISIPKAN DI SINI]", fullText);

      try {
        await navigator.clipboard.writeText(fullPromptToCopy);
        copyPromptBtnText.textContent = "Tersalin ke Clipboard!";
        showToast("Prompt skripsi + teks dokumen berhasil disalin ke clipboard!", "success");
        setTimeout(() => {
          copyPromptBtnText.textContent = "Salin Prompt Lengkap + Teks Dokumen";
          if (skripsiModal) skripsiModal.classList.add("hidden");
        }, 1500);
      } catch (err) {
        promptPreviewTextarea.value = fullPromptToCopy;
        promptPreviewTextarea.select();
        document.execCommand("copy");
        showToast("Prompt berhasil disalin", "success");
      }
    });
  }

  // Initialize
  loadDocuments();
});
