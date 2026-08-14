/* =========================================================
   DESA KALE KO'MARA — JAVASCRIPT
   Data contoh dapat diganti di bagian NEWS_DATA dan GALLERY_DATA.
   ========================================================= */

   const NEWS_DATA = [
    {
      id: 1,
      title: "Gotong royong menjaga kebersihan lingkungan desa",
      category: "kegiatan",
      date: "12 Agustus 2026",
      image: "assets/images/kegiatan-desa.svg",
      excerpt: "Warga bersama-sama membersihkan area fasilitas umum dan lingkungan sekitar desa."
    },
    {
      id: 2,
      title: "Informasi pelayanan administrasi untuk warga",
      category: "pelayanan",
      date: "8 Agustus 2026",
      image: "assets/images/pelayanan-desa.svg",
      excerpt: "Panduan awal bagi warga yang akan mengurus surat pengantar dan administrasi di kantor desa."
    },
    {
      id: 3,
      title: "Musyawarah warga membahas agenda desa",
      category: "pengumuman",
      date: "2 Agustus 2026",
      image: "assets/images/musyawarah-desa.svg",
      excerpt: "Pertemuan bersama untuk menyampaikan usulan dan membahas agenda yang berkaitan dengan warga."
    },
    {
      id: 4,
      title: "Kegiatan warga dan pemuda di akhir pekan",
      category: "kegiatan",
      date: "27 Juli 2026",
      image: "assets/images/warga-desa.svg",
      excerpt: "Ruang kebersamaan yang melibatkan warga dan pemuda dalam kegiatan sosial di lingkungan desa."
    },
    {
      id: 5,
      title: "Pemberitahuan pembaruan data kependudukan",
      category: "pengumuman",
      date: "21 Juli 2026",
      image: "assets/images/pelayanan-desa.svg",
      excerpt: "Warga diimbau memastikan data keluarga agar informasi administrasi tetap sesuai dan mutakhir."
    },
    {
      id: 6,
      title: "Pelayanan surat keterangan di kantor desa",
      category: "pelayanan",
      date: "16 Juli 2026",
      image: "assets/images/kegiatan-desa.svg",
      excerpt: "Informasi singkat mengenai alur awal pengajuan surat keterangan sesuai kebutuhan warga."
    }
  ];
  
  const GALLERY_DATA = [
    {
      title: "Bendungan Pamukkulu",
      category: "lingkungan",
      images: ["assets/bendungan2.jpg", "assets/images/gallery-lingkungan.svg", "assets/images/gallery-sudut-desa.svg"],
      description: "",
      size: "wide"
    },
    {
      title: "Gerak Jalan",
      category: "kegiatan",
      images: ["assets/gerak jalan.jpeg","assets/gerak jalan2.jpeg"],
      description: "Gerak Jalan Ibu-ibu PKK Desa Kale Ko'mara.",
      size: "tall"
    },
    {
      title: "Pelatihan Mitigasi Bencana",
      category: "kegiatan",
      images: ["assets/mitigasi-bencana3.jpg","assets/mitigasi-bencana2.jpg","assets/mitigasi-bencana4.jpg"],
      description: "Pelatihan dan Sosialisasi tentang Mitigasi Bencana di Aula Kantor Desa",
      size: ""
    },
    {
      title: "Seminar Program Kerja KKN",
      category: "kegiatan",
      images: ["assets/seminr-proker.jpeg","assets/seminr-proker2.jpeg","assets/seminr-proker3.jpeg"],
      description: "Seminar Program Kerja KKN Universiat Handayani Makassar.",
      size: "wide"
    },
    {
      title: "Sudut Kale Ko'mara",
      category: "lingkungan",
      images: ["assets/images/gallery-sudut-desa.svg"],
      description: "Salah satu sudut yang menjadi bagian dari keseharian desa.",
      size: "wide"
    },
    {
      title: "Warga dan pelayanan",
      category: "warga",
      images: ["assets/images/gallery-pelayanan.svg"],
      description: "Interaksi warga dalam pelayanan dan kegiatan desa.",
      size: ""
    }
  ];
  
  const STRUKTUR_DATA = [
    { nama: "Parawangsa, S.H", jabatan: "Kepala Desa", foto: "assets/kepala desa.jpeg" },
    { nama: "Herianto, S.IP", jabatan: "Sekretaris Desa", foto: "assets/images/struktur-placeholder.svg" },
    { nama: "Heni Haerunddin, S.E.,M.I.P", jabatan: "Bendahara Desa", foto: "assets/images/struktur-placeholder.svg" },
    { nama: "Nama Kaur Perencanaan", jabatan: "Kaur Perencanaan", foto: "assets/images/struktur-placeholder.svg" },
    { nama: "Nama Kaur Tata Usaha", jabatan: "Kaur Tata Usaha & Umum", foto: "assets/images/struktur-placeholder.svg" },
    { nama: "Nama Kasi Pemerintahan", jabatan: "Kasi Pemerintahan", foto: "assets/images/struktur-placeholder.svg" },
    { nama: "Nama Kasi Kesejahteraan", jabatan: "Kasi Kesejahteraan", foto: "assets/images/struktur-placeholder.svg" },
    { nama: "Nama Kasi Pelayanan", jabatan: "Kasi Pelayanan", foto: "assets/images/struktur-placeholder.svg" },
    { nama: "Nama Kepala Dusun", jabatan: "Kepala Dusun", foto: "assets/images/struktur-placeholder.svg" }
  ];

  const STATISTIK_DATA = {
    totalPenduduk: 2865,
    jumlahKK: 600,
    lakiLaki: 51,
    perempuan: 49,
    luasWilayah: 29.85,
    luasSatuan: "hektar",
    jumlahDusun: 5
  };

  const DUSUN_DATA = [
    { nama: "Dusun Kupang", ket: "Data warga akan dilengkapi" },
    { nama: "Dusun 2", ket: "Data warga akan dilengkapi" },
    { nama: "Dusun 3", ket: "Data warga akan dilengkapi" },
    { nama: "Dusun 4", ket: "Data warga akan dilengkapi" },
    { nama: "Dusun 5", ket: "Data warga akan dilengkapi" }
  ];

  const BUDGET_DATA = [
    {
      tahun: "2026",
      pendapatan: [
        { label: "Pendapatan Asli Desa", nilai: 45000000 },
        { label: "Dana Desa", nilai: 820000000 },
        { label: "Alokasi Dana Desa", nilai: 310000000 },
        { label: "Bantuan Keuangan Lainnya", nilai: 65000000 }
      ],
      belanja: [
        { label: "Penyelenggaraan Pemerintahan Desa", nilai: 340000000 },
        { label: "Pelaksanaan Pembangunan Desa", nilai: 520000000 },
        { label: "Pembinaan Kemasyarakatan", nilai: 140000000 },
        { label: "Pemberdayaan Masyarakat", nilai: 180000000 },
        { label: "Belanja Tak Terduga", nilai: 60000000 }
      ],
      dokumen: { nama: "APBDes Kale Ko'mara 2026.pdf", ukuran: "Contoh · belum tersedia", href: "#" }
    },
    {
      tahun: "2025",
      pendapatan: [
        { label: "Dana Desa (DDS)", nilai: 838686000 },
        { label: "Alokasi Dana Desa (ADD)", nilai: 815888400 },
        { label: "Bagi Hasil Pajak & Retribusi (BHPR)", nilai: 29824000 },
        { label: "Pendapatan Lain-lain", nilai: 2990000 }
      ],
      belanja: [
        { label: "Penyelenggaraan Pemerintahan Desa", nilai: 706336029 },
        { label: "Pelaksanaan Pembangunan Desa", nilai: 390900000 },
        { label: "Pembinaan Kemasyarakatan", nilai: 248986000 },
        { label: "Penanggulangan Bencana & Keadaan Mendesak", nilai: 36000000 },
        { label: "Pemberdayaan Masyarakat", nilai: 13500000 }
      ],
      dokumen: { 
        nama: "APBDes Realisasi Kale Ko'mara 2025.pdf", 
        ukuran: "1.2 MB · Dokumen Resmi", 
        href: "#" 
      }
    }
  ];

  const titleCase = (text) => text.charAt(0).toUpperCase() + text.slice(1);
  const formatRupiah = (value) => "Rp " + value.toLocaleString("id-ID");

  // ---------- Animasi hitung angka (count-up) ----------
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function animateCountUp(el, endValue, { duration = 500, formatter, startValue } = {}) {
    if (!el) return;
    const format = formatter || ((n) => Math.round(n).toLocaleString("id-ID"));
    const from = typeof startValue === "number" ? startValue : Number(el.dataset.countCurrent || 0);

    if (prefersReducedMotion() || from === endValue) {
      el.textContent = format(endValue);
      el.dataset.countCurrent = endValue;
      return;
    }

    el.dataset.countCurrent = endValue;
    const startTime = performance.now();

    function tick(now) {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = from + (endValue - from) * eased;
      el.textContent = format(current);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.textContent = format(endValue);
      }
    }
    requestAnimationFrame(tick);
  }

  // Animasikan semua elemen [data-count-end] di dalam sebuah kontainer.
  function playCountElements(container, { startFromZero = false } = {}) {
    if (!container) return;
    container.querySelectorAll(".count-value").forEach((el) => {
      const endValue = Number(el.dataset.countEnd);
      if (Number.isNaN(endValue)) return;
      const decimals = Number(el.dataset.countDecimals || 0);
      const suffix = el.dataset.countSuffix || "";
      const prefix = el.dataset.countPrefix || "";
      const formatter = (n) => prefix + (decimals
        ? n.toLocaleString("id-ID", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
        : Math.round(n).toLocaleString("id-ID")) + suffix;
      animateCountUp(el, endValue, { formatter, startValue: startFromZero ? 0 : undefined });
    });

    container.querySelectorAll("[data-width-end]").forEach((el) => {
      const endWidth = el.dataset.widthEnd;
      el.style.width = "0%";
      requestAnimationFrame(() => requestAnimationFrame(() => { el.style.width = endWidth + "%"; }));
    });
  }
  
  // ---------- Navigasi antar-tab ----------
  const panels = [...document.querySelectorAll(".page-panel")];
  const routeLinks = [...document.querySelectorAll("[data-route]")];
  const navLinks = [...document.querySelectorAll(".nav-link")];
  const menu = document.querySelector(".primary-nav");
  const menuToggle = document.querySelector(".menu-toggle");
  
  function pageFromHash(hash) {
    const clean = hash.replace("#", "") || "home";
    if (["home", "berita", "galeri", "info", "anggaran"].includes(clean)) return clean;
    if (clean.startsWith("info-")) return "info";
    return "home";
  }
  
  function closeMenu() {
    menu.classList.remove("open");
    menuToggle.setAttribute("aria-expanded", "false");
    menuToggle.setAttribute("aria-label", "Buka menu navigasi");
    document.body.classList.remove("menu-open");
  }
  
  let anggaranCountPlayed = false;

  function showPage(page, targetId = "", shouldScroll = true) {
    panels.forEach((panel) => {
      const active = panel.dataset.page === page;
      panel.hidden = !active;
      panel.classList.toggle("active", active);
      panel.classList.remove("is-entering");
      if (active) requestAnimationFrame(() => panel.classList.add("is-entering"));
    });

    if (page === "anggaran" && !anggaranCountPlayed) {
      anggaranCountPlayed = true;
      requestAnimationFrame(() => playCountElements(document.getElementById("anggaran"), { startFromZero: true }));
    }
  
    navLinks.forEach((link) => {
      const active = link.dataset.route === page;
      link.classList.toggle("active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  
    closeMenu();
    document.title = page === "home"
      ? "Desa Kale Ko'mara — Takalar"
      : `${titleCase(page)} — Desa Kale Ko'mara`;
  
    requestAnimationFrame(() => {
      observeReveals();
      if (!shouldScroll) return;
      const target = targetId ? document.getElementById(targetId) : null;
      if (target && !target.hidden) {
        setTimeout(() => target.scrollIntoView({ behavior: "smooth", block: "start" }), 70);
      } else {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }
  
  routeLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      const route = link.dataset.route;
      const hash = link.getAttribute("href") || `#${route}`;
      const targetId = hash.replace("#", "");
      const currentHash = window.location.hash;
  
      if (currentHash === hash) {
        event.preventDefault();
        showPage(route, targetId !== route ? targetId : "");
      }
    });
  });
  
  window.addEventListener("hashchange", () => {
    const targetId = window.location.hash.replace("#", "");
    showPage(pageFromHash(window.location.hash), targetId);
  });
  
  menuToggle.addEventListener("click", () => {
    const open = !menu.classList.contains("open");
    menu.classList.toggle("open", open);
    menuToggle.setAttribute("aria-expanded", String(open));
    menuToggle.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
    document.body.classList.toggle("menu-open", open);
  });
  
  window.addEventListener("resize", () => {
    if (window.innerWidth > 960) closeMenu();
  });
  
  // ---------- Header ----------
  const header = document.querySelector(".site-header");
  function updateHeader() {
    header.classList.toggle("scrolled", window.scrollY > 12);
  }
  window.addEventListener("scroll", updateHeader, { passive: true });
  updateHeader();
  
  // ---------- Berita ----------
  const newsList = document.getElementById("news-list");
  const homeNewsList = document.getElementById("home-news-list");
  const newsEmpty = document.getElementById("news-empty");
  const newsSearch = document.getElementById("news-search");
  let activeNewsFilter = "semua";
  
  function newsCard(item, index = 0) {
    return `
      <article class="news-card reveal ${index % 3 === 1 ? "delay-1" : index % 3 === 2 ? "delay-2" : ""}">
        <div class="news-image">
          <img src="${item.image}" alt="Tempat foto untuk berita: ${item.title}" loading="lazy" width="720" height="540">
          <span class="news-category">${titleCase(item.category)}</span>
        </div>
        <div class="news-meta"><time>${item.date}</time><span></span><span>Desa Kale Ko'mara</span></div>
        <h3>${item.title}</h3>
        <p class="news-excerpt">${item.excerpt}</p>
        <small class="news-sample">Konten contoh · siap diganti</small>
      </article>`;
  }
  
  function renderHomeNews() {
    homeNewsList.innerHTML = NEWS_DATA.slice(0, 3).map(newsCard).join("");
  }
  
  function renderNews() {
    const query = newsSearch.value.trim().toLocaleLowerCase("id");
    const filtered = NEWS_DATA.filter((item) => {
      const matchesCategory = activeNewsFilter === "semua" || item.category === activeNewsFilter;
      const matchesText = `${item.title} ${item.excerpt} ${item.category}`.toLocaleLowerCase("id").includes(query);
      return matchesCategory && matchesText;
    });
  
    newsList.innerHTML = filtered.map(newsCard).join("");
    newsEmpty.hidden = filtered.length !== 0;
    observeReveals();
  }
  
  newsSearch.addEventListener("input", renderNews);
  document.getElementById("news-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeNewsFilter = button.dataset.filter;
    document.querySelectorAll("#news-filters .filter-button").forEach((item) => item.classList.toggle("active", item === button));
    renderNews();
  });
  
  // ---------- Galeri ----------
  const galleryGrid = document.getElementById("gallery-grid");
  let activeGalleryFilter = "semua";
  
  function renderGallery() {
    const filtered = GALLERY_DATA.filter((item) => activeGalleryFilter === "semua" || item.category === activeGalleryFilter);
    galleryGrid.innerHTML = filtered.map((item, index) => `
      <button class="gallery-card ${item.size} reveal ${index % 3 === 1 ? "delay-1" : ""}" type="button" data-gallery-index="${GALLERY_DATA.indexOf(item)}" aria-label="Buka foto ${item.title}">
        <img src="${item.images[0]}" alt="${item.title}" loading="lazy" width="900" height="700">
        ${item.images.length > 1 ? `<span class="gallery-photo-count"><i class="fa-regular fa-images" aria-hidden="true"></i> ${item.images.length}</span>` : ""}
        <span class="gallery-open"><i class="fa-solid fa-expand" aria-hidden="true"></i></span>
        <span class="gallery-card-copy"><span>${titleCase(item.category)}</span><h3>${item.title}</h3></span>
      </button>`).join("");
    observeReveals();
  }
  
  document.getElementById("gallery-filters").addEventListener("click", (event) => {
    const button = event.target.closest("[data-filter]");
    if (!button) return;
    activeGalleryFilter = button.dataset.filter;
    document.querySelectorAll("#gallery-filters .filter-button").forEach((item) => item.classList.toggle("active", item === button));
    renderGallery();
  });
  
  // ---------- Lightbox ----------
  const lightbox = document.getElementById("lightbox");
  const lightboxStage = document.getElementById("lightbox-stage");
  const lightboxImage = document.getElementById("lightbox-image");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxCategory = document.getElementById("lightbox-category");
  const lightboxDescription = document.getElementById("lightbox-description");
  const lightboxCounter = document.getElementById("lightbox-counter");
  const lightboxPrev = document.querySelector(".lightbox-nav.prev");
  const lightboxNext = document.querySelector(".lightbox-nav.next");

  let currentGalleryItem = null;
  let currentImageIndex = 0;

  function closeLightbox() {
    if (lightbox.open) lightbox.close();
    document.body.classList.remove("lightbox-open");
    currentGalleryItem = null;
  }

  function renderLightboxImage() {
    if (!currentGalleryItem) return;
    const images = currentGalleryItem.images;
    lightboxImage.src = images[currentImageIndex];
    lightboxImage.alt = `${currentGalleryItem.title} (${currentImageIndex + 1}/${images.length})`;

    const multi = images.length > 1;
    lightboxPrev.hidden = !multi;
    lightboxNext.hidden = !multi;
    lightboxCounter.hidden = !multi;
    if (multi) lightboxCounter.textContent = `${currentImageIndex + 1} / ${images.length}`;
  }

  function openLightbox(item) {
    currentGalleryItem = item;
    currentImageIndex = 0;
    lightboxTitle.textContent = item.title;
    lightboxCategory.textContent = titleCase(item.category);
    lightboxDescription.textContent = item.description;
    renderLightboxImage();
    document.body.classList.add("lightbox-open");
    lightbox.showModal();
  }

  function stepLightbox(direction) {
    if (!currentGalleryItem) return;
    const total = currentGalleryItem.images.length;
    currentImageIndex = (currentImageIndex + direction + total) % total;
    renderLightboxImage();
  }

  galleryGrid.addEventListener("click", (event) => {
    const card = event.target.closest("[data-gallery-index]");
    if (!card) return;
    openLightbox(GALLERY_DATA[Number(card.dataset.galleryIndex)]);
  });

  lightboxPrev.addEventListener("click", () => stepLightbox(-1));
  lightboxNext.addEventListener("click", () => stepLightbox(1));

  document.querySelector(".lightbox-close").addEventListener("click", closeLightbox);
  lightbox.addEventListener("click", (event) => {
    if (event.target === lightbox) closeLightbox();
  });
  lightbox.addEventListener("cancel", () => document.body.classList.remove("lightbox-open"));

  lightbox.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") stepLightbox(-1);
    if (event.key === "ArrowRight") stepLightbox(1);
  });

  // Swipe gesture support (touch devices)
  let touchStartX = 0;
  let touchStartY = 0;
  lightboxStage.addEventListener("touchstart", (event) => {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }, { passive: true });

  lightboxStage.addEventListener("touchend", (event) => {
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) stepLightbox(dx < 0 ? 1 : -1);
  }, { passive: true });
  
  // ---------- Reveal on scroll ----------
  let revealObserver;
  function observeReveals() {
    if (prefersReducedMotion()) {
      document.querySelectorAll(".reveal").forEach((item) => item.classList.add("visible"));
      const statistikSection = document.getElementById("info-statistik");
      if (statistikSection) playCountElements(statistikSection, { startFromZero: true });
      return;
    }
  
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            if (entry.target.id === "info-statistik") {
              playCountElements(entry.target, { startFromZero: true });
            }
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -35px" });
    }
  
    document.querySelectorAll(".reveal:not(.visible)").forEach((item) => revealObserver.observe(item));
  }
  
  // ---------- Active section on Info page ----------
  const infoNavLinks = [...document.querySelectorAll(".info-nav a")];
  const infoSections = [...document.querySelectorAll(".info-section")];
  const infoSectionObserver = new IntersectionObserver((entries) => {
    const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    infoNavLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${visible.target.id}`));
  }, { rootMargin: "-22% 0px -58%", threshold: [0.05, 0.25, 0.5] });
  infoSections.forEach((section) => infoSectionObserver.observe(section));
  
  // ---------- Struktur pemerintahan ----------
  function renderStruktur() {
    const list = document.getElementById("struktur-list");
    if (!list) return;
    list.innerHTML = STRUKTUR_DATA.map((item) => `
      <div class="struktur-item">
        <span class="struktur-avatar"><img src="${item.foto}" alt="Foto ${item.jabatan}" loading="lazy" width="120" height="120"></span>
        <div>
          <h3>${item.nama}</h3>
          <span>${item.jabatan}</span>
        </div>
      </div>`).join("");
  }

  // ---------- Statistik desa ----------
  function renderStatistik() {
    const statGrid = document.getElementById("stat-grid");
    const genderBar = document.getElementById("gender-bar");
    const genderLegend = document.getElementById("gender-legend");
    const dusunList = document.getElementById("dusun-list");
    if (!statGrid) return;

    statGrid.innerHTML = `
      <div class="fact-item"><span>Total penduduk</span><strong class="count-value" data-count-end="${STATISTIK_DATA.totalPenduduk}">0</strong></div>
      <div class="fact-item"><span>Jumlah kepala keluarga</span><strong class="count-value" data-count-end="${STATISTIK_DATA.jumlahKK}">0</strong></div>
      <div class="fact-item"><span>Luas wilayah</span><strong class="count-value" data-count-end="${STATISTIK_DATA.luasWilayah}" data-count-decimals="2" data-count-suffix=" ${STATISTIK_DATA.luasSatuan}">0 ${STATISTIK_DATA.luasSatuan}</strong></div>
      <div class="fact-item"><span>Jumlah dusun</span><strong class="count-value" data-count-end="${STATISTIK_DATA.jumlahDusun}">0</strong></div>`;

    genderBar.innerHTML = `
      <span class="gender-bar-segment laki" data-width-end="${STATISTIK_DATA.lakiLaki}" style="width:0%"><span class="count-value" data-count-end="${STATISTIK_DATA.lakiLaki}" data-count-suffix="%">0%</span></span>
      <span class="gender-bar-segment perempuan" data-width-end="${STATISTIK_DATA.perempuan}" style="width:0%"><span class="count-value" data-count-end="${STATISTIK_DATA.perempuan}" data-count-suffix="%">0%</span></span>`;

    genderLegend.innerHTML = `
      <span><i class="dot-laki"></i> Laki-laki</span>
      <span><i class="dot-perempuan"></i> Perempuan</span>`;

    dusunList.innerHTML = DUSUN_DATA.map((item) => `
      <div class="dusun-item"><strong>${item.nama}</strong><span>${item.ket}</span></div>`).join("");
  }

  // ---------- Anggaran / transparansi ----------
  let activeBudgetYear = BUDGET_DATA[0]?.tahun;

  function renderBudgetFilters() {
    const wrap = document.getElementById("anggaran-filters");
    if (!wrap) return;
    wrap.innerHTML = BUDGET_DATA.map((item) => `
      <button class="filter-button ${item.tahun === activeBudgetYear ? "active" : ""}" type="button" data-year="${item.tahun}">${item.tahun}</button>`).join("");
  }

  function renderBudget() {
    const data = BUDGET_DATA.find((item) => item.tahun === activeBudgetYear) || BUDGET_DATA[0];
    if (!data) return;

    const totalPendapatan = data.pendapatan.reduce((sum, item) => sum + item.nilai, 0);
    const totalBelanja = data.belanja.reduce((sum, item) => sum + item.nilai, 0);
    const selisih = totalPendapatan - totalBelanja;

    const summary = document.getElementById("budget-summary");
    summary.innerHTML = `
      <div class="budget-card"><span>Total pendapatan · ${data.tahun}</span><strong class="count-value" data-count-prefix="Rp " data-count-end="${totalPendapatan}">${formatRupiah(0)}</strong><small>Seluruh sumber pendapatan desa</small></div>
      <div class="budget-card"><span>Total belanja · ${data.tahun}</span><strong class="count-value" data-count-prefix="Rp " data-count-end="${totalBelanja}">${formatRupiah(0)}</strong><small>Seluruh bidang belanja desa</small></div>
      <div class="budget-card is-status ${selisih < 0 ? "deficit" : ""}"><span>${selisih < 0 ? "Defisit" : "Surplus"} anggaran</span><strong class="count-value" data-count-prefix="Rp " data-count-end="${Math.abs(selisih)}">${formatRupiah(0)}</strong><small>Selisih pendapatan dan belanja</small></div>`;

    const renderList = (items, total) => items.map((item) => {
      const percent = Math.round((item.nilai / total) * 100);
      return `
      <div class="budget-row">
        <div class="budget-row-head"><span>${item.label}</span><span class="count-value" data-count-prefix="Rp " data-count-end="${item.nilai}">${formatRupiah(0)}</span></div>
        <div class="budget-bar"><div class="budget-bar-fill" data-width-end="${percent}" style="width:0%"></div></div>
      </div>`;
    }).join("");

    document.getElementById("budget-pendapatan").innerHTML = renderList(data.pendapatan, totalPendapatan);
    const belanjaWrap = document.getElementById("budget-belanja");
    belanjaWrap.classList.add("budget-belanja");
    belanjaWrap.innerHTML = renderList(data.belanja, totalBelanja);

    document.getElementById("doc-list").innerHTML = `
      <div class="doc-item">
        <span class="doc-icon"><i class="fa-regular fa-file-pdf" aria-hidden="true"></i></span>
        <div class="doc-info"><strong>${data.dokumen.nama}</strong><span>${data.dokumen.ukuran}</span></div>
        <a class="doc-download" href="${data.dokumen.href}"><i class="fa-solid fa-download" aria-hidden="true"></i> Unduh</a>
      </div>`;

    // Semua nilai rupiah & bar dianimasikan dari 0 setiap kali render (mis. saat ganti tahun).
    playCountElements(document.getElementById("anggaran"), { startFromZero: true });
  }

  const anggaranFilters = document.getElementById("anggaran-filters");
  if (anggaranFilters) {
    anggaranFilters.addEventListener("click", (event) => {
      const button = event.target.closest("[data-year]");
      if (!button) return;
      activeBudgetYear = button.dataset.year;
      renderBudgetFilters();
      renderBudget();
    });
  }

  // ---------- Inisialisasi ----------
  renderHomeNews();
  renderNews();
  renderGallery();
  renderStruktur();
  renderStatistik();
  renderBudgetFilters();
  renderBudget();
  document.getElementById("current-year").textContent = new Date().getFullYear();
  
  const initialTarget = window.location.hash.replace("#", "");
  showPage(pageFromHash(window.location.hash), initialTarget, false);
  observeReveals();