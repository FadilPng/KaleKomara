/* =========================================================
   DESA KALE KO'MARA — JAVASCRIPT
   Semua data (berita, galeri, struktur, statistik, dusun,
   anggaran) diambil langsung dari Supabase saat halaman dibuka.
   Koneksi Supabase disiapkan di assets/js/supabase-client.js
   (dimuat sebelum file ini). Kelola datanya lewat admin.html.
   ========================================================= */

  // Ditampung sebagai variabel biasa (bukan konstanta) karena
  // isinya baru terisi setelah fetch ke Supabase selesai.
  let NEWS_DATA = [];
  let GALLERY_DATA = [];
  let STRUKTUR_DATA = [];
  let STATISTIK_DATA = { totalPenduduk: 0, jumlahKK: 0, lakiLaki: 0, perempuan: 0, luasWilayah: 0, luasSatuan: "hektar", jumlahDusun: 0 };
  let DUSUN_DATA = [];
  let BUDGET_DATA = [];

  // ---------- Ambil data dari Supabase ----------
  async function fetchNewsData() {
    const { data, error } = await supabaseClient.from("news").select("*").order("date", { ascending: false });
    if (error) { console.error("Gagal memuat berita:", error.message); return []; }
    return data.map((row) => ({
      id: row.id,
      slug: row.slug,
      title: row.title,
      category: row.category,
      date: formatTanggalIndo(row.date),
      image: row.image_url,
      excerpt: row.excerpt,
      content: row.content || []
    }));
  }

  async function fetchGalleryData() {
    const { data, error } = await supabaseClient
      .from("gallery_items")
      .select("*, gallery_images(image_url, sort_order)")
      .order("sort_order");
    if (error) { console.error("Gagal memuat galeri:", error.message); return []; }
    return data.map((row) => ({
      title: row.title,
      category: row.category,
      description: row.description || "",
      size: row.size || "",
      images: (row.gallery_images || []).slice().sort((a, b) => a.sort_order - b.sort_order).map((img) => img.image_url)
    }));
  }

  async function fetchStrukturData() {
    const { data, error } = await supabaseClient.from("struktur_desa").select("*").order("sort_order");
    if (error) { console.error("Gagal memuat struktur pemerintahan:", error.message); return []; }
    return data.map((row) => ({ nama: row.nama, jabatan: row.jabatan, foto: row.foto_url }));
  }

  async function fetchStatistikData() {
    const [{ data: penduduk, error: pendudukError }, { data: fisik, error: fisikError }] = await Promise.all([
      supabaseClient.rpc("get_statistik_penduduk"),
      supabaseClient.from("statistik_desa").select("*").eq("id", 1).single()
    ]);

    if (pendudukError) console.error("Gagal memuat statistik penduduk:", pendudukError.message);
    if (fisikError) console.error("Gagal memuat data wilayah:", fisikError.message);

    const rekap = penduduk?.[0] || { total_penduduk: 0, jumlah_kk: 0, laki_laki: 0, perempuan: 0 };
    const total = Number(rekap.total_penduduk) || 0;
    const laki = Number(rekap.laki_laki) || 0;
    const perempuan = Number(rekap.perempuan) || 0;

    return {
      totalPenduduk: total,
      jumlahKK: Number(rekap.jumlah_kk) || 0,
      // Persentase dihitung dari data penduduk asli, bukan angka tetap.
      lakiLaki: total > 0 ? Math.round((laki / total) * 100) : 0,
      perempuan: total > 0 ? Math.round((perempuan / total) * 100) : 0,
      luasWilayah: fisik?.luas_wilayah ?? 0,
      luasSatuan: fisik?.luas_satuan || "hektar",
      jumlahDusun: 0 // diisi dari jumlah baris DUSUN_DATA setelah fetchDusunData()
    };
  }

  async function fetchDusunData() {
    const { data, error } = await supabaseClient.rpc("get_statistik_dusun");
    if (error) { console.error("Gagal memuat data dusun:", error.message); return []; }
    return data.map((row) => ({ nama: row.nama, jumlahPenduduk: Number(row.jumlah_penduduk) || 0 }));
  }

  async function fetchBudgetData() {
    const { data, error } = await supabaseClient
      .from("anggaran_tahun")
      .select("*, anggaran_item(*)")
      .order("tahun", { ascending: false });
    if (error) { console.error("Gagal memuat anggaran:", error.message); return []; }
    return data.map((row) => {
      const items = (row.anggaran_item || []).slice().sort((a, b) => a.sort_order - b.sort_order);
      return {
        tahun: row.tahun,
        pendapatan: items.filter((i) => i.jenis === "pendapatan").map((i) => ({ label: i.label, nilai: Number(i.nilai) })),
        belanja: items.filter((i) => i.jenis === "belanja").map((i) => ({ label: i.label, nilai: Number(i.nilai) })),
        dokumen: { nama: row.dokumen_nama || "", ukuran: row.dokumen_ukuran || "", href: row.dokumen_url || "#" }
      };
    });
  }

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
    const href = `berita-detail.html?slug=${encodeURIComponent(item.slug)}`;
    return `
      <article class="news-card reveal ${index % 3 === 1 ? "delay-1" : index % 3 === 2 ? "delay-2" : ""}">
        <a class="news-image" href="${href}" aria-label="Baca berita: ${item.title}">
          <img src="${item.image}" alt="Tempat foto untuk berita: ${item.title}" loading="lazy" width="720" height="540">
          <span class="news-category">${titleCase(item.category)}</span>
        </a>
        <div class="news-meta"><time>${item.date}</time><span></span><span>Desa Kale Ko'mara</span></div>
        <h3><a href="${href}">${item.title}</a></h3>
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
  const lightboxLoading = document.getElementById("lightbox-loading");
  const lightboxTitle = document.getElementById("lightbox-title");
  const lightboxCategory = document.getElementById("lightbox-category");
  const lightboxDescription = document.getElementById("lightbox-description");
  const lightboxCounter = document.getElementById("lightbox-counter");
  const lightboxPrev = document.querySelector(".lightbox-nav.prev");
  const lightboxNext = document.querySelector(".lightbox-nav.next");

  let currentGalleryItem = null;
  let currentImageIndex = 0;
  let lightboxAnimating = false;
  // Token dinaikkan tiap kali mulai memuat foto baru — dipakai supaya
  // event load/error dari foto LAMA (yang keburu diganti sebelum selesai
  // dimuat, mis. user klik next-next dengan cepat) tidak ikut memicu
  // status "siap" untuk foto yang sekarang sedang ditampilkan.
  let lightboxLoadToken = 0;

  function setLightboxLoading(isLoading) {
    lightboxLoading.hidden = !isLoading;
  }

  // ---------- Tinggi kotak foto (.lightbox-stage) mengikuti rasio foto ----------
  // Sebelumnya tinggi kotak ikut dipengaruhi rasio bawaan tiap foto secara
  // "diam-diam" lewat CSS (height:100% pada img) — hasilnya foto tinggi
  // kepotong (object-fit:cover), dan kalau batas tingginya dilepas malah
  // modalnya kelebihan tinggi & discroll. Sekarang tinggi kotak dihitung
  // manual di sini berdasarkan rasio foto YANG SEDANG TAMPIL, dibatasi
  // supaya tidak pernah melebihi tinggi layar, lalu diset lewat
  // style.height — perubahannya dianimasikan otomatis oleh CSS transition
  // di .lightbox-stage, jadi pindah ke foto lain yang resolusinya beda
  // kelihatan "membesar/mengecil" mulus, bukan lompat tiba-tiba.
  function updateLightboxStageHeight() {
    if (!lightboxImage.naturalWidth || !lightboxImage.naturalHeight) return;
    const isMobile = window.innerWidth <= 720;
    const stageWidth = lightboxStage.clientWidth || lightboxImage.naturalWidth;
    const ratio = lightboxImage.naturalHeight / lightboxImage.naturalWidth;
    const idealHeight = stageWidth * ratio;
    const minHeight = isMobile ? 260 : 320;
    const maxHeight = Math.min(window.innerHeight * (isMobile ? 0.56 : 0.76), isMobile ? 480 : 640);
    const finalHeight = Math.min(Math.max(idealHeight, minHeight), maxHeight);
    lightboxStage.style.height = `${Math.round(finalHeight)}px`;
  }

  window.addEventListener("resize", () => {
    if (lightbox.open) updateLightboxStageHeight();
  });

  function closeLightbox() {
    if (lightbox.open) lightbox.close();
    document.body.classList.remove("lightbox-open");
    currentGalleryItem = null;
    lightboxAnimating = false;
    lightboxLoadToken++;
    lightboxImage.classList.remove("lb-img-exit-left", "lb-img-exit-right", "lb-img-enter-right", "lb-img-enter-left", "is-ready");
    setLightboxLoading(false);
  }

  // Pasang src/alt baru pada elemen gambar dan tampilkan spinner sampai
  // foto itu benar-benar termuat (bukan cuma sampai src diganti) —
  // supaya foto lama tidak "nyangkut" tampil selagi foto baru diunduh.
  // onReady dipanggil begitu foto siap ditampilkan (dipakai untuk memicu
  // animasi masuk saat pindah foto).
  function applyLightboxImage(src, alt, onReady) {
    const token = ++lightboxLoadToken;
    lightboxImage.classList.remove("is-ready");
    setLightboxLoading(true);
    const done = () => {
      if (token !== lightboxLoadToken) return; // sudah pindah ke foto lain, abaikan
      setLightboxLoading(false);
      lightboxImage.classList.add("is-ready");
      updateLightboxStageHeight();
      if (onReady) onReady();
    };
    lightboxImage.addEventListener("load", done, { once: true });
    lightboxImage.addEventListener("error", done, { once: true });
    lightboxImage.src = src;
    lightboxImage.alt = alt;
    // Kalau foto sudah ada di cache browser, "load" bisa saja sudah lewat
    // sebelum listener di atas terpasang — cek langsung supaya tidak
    // nyangkut menampilkan spinner terus-menerus.
    if (lightboxImage.complete && lightboxImage.naturalWidth > 0) done();
  }

  function updateLightboxCounter() {
    if (!currentGalleryItem) return;
    const total = currentGalleryItem.images.length;
    const multi = total > 1;
    lightboxPrev.hidden = !multi;
    lightboxNext.hidden = !multi;
    lightboxCounter.hidden = !multi;
    if (multi) lightboxCounter.textContent = `${currentImageIndex + 1} / ${total}`;
  }

  function renderLightboxImage() {
    if (!currentGalleryItem) return;
    const images = currentGalleryItem.images;
    applyLightboxImage(images[currentImageIndex], `${currentGalleryItem.title} (${currentImageIndex + 1}/${images.length})`);
    updateLightboxCounter();
  }

  function openLightbox(item) {
    currentGalleryItem = item;
    currentImageIndex = 0;
    lightboxTitle.textContent = item.title;
    lightboxCategory.textContent = titleCase(item.category);
    lightboxDescription.textContent = item.description;
    lightboxImage.classList.remove("lb-img-exit-left", "lb-img-exit-right", "lb-img-enter-right", "lb-img-enter-left");
    renderLightboxImage();
    document.body.classList.add("lightbox-open");
    lightbox.showModal();
  }

  // Pindah ke foto berikutnya/sebelumnya dengan slide penuh yang smooth.
  // direction: 1 = maju (geser ke kiri), -1 = mundur (geser ke kanan).
  // Foto lama digeser keluar frame dulu; begitu selesai, foto baru mulai
  // dimuat (spinner tampil kalau belum siap) baru kemudian digeser masuk
  // ke tengah — jadi tidak pernah ada momen menampilkan foto yang salah.
  function stepLightbox(direction) {
    if (!currentGalleryItem || lightboxAnimating) return;
    const total = currentGalleryItem.images.length;
    if (total <= 1) return;
    currentImageIndex = (currentImageIndex + direction + total) % total;

    if (prefersReducedMotion()) {
      renderLightboxImage();
      return;
    }

    lightboxAnimating = true;
    const exitClass = direction > 0 ? "lb-img-exit-left" : "lb-img-exit-right";
    const enterClass = direction > 0 ? "lb-img-enter-right" : "lb-img-enter-left";

    let exited = false;
    const afterExit = () => {
      if (exited) return;
      exited = true;
      lightboxImage.removeEventListener("transitionend", afterExit);
      lightboxImage.classList.remove(exitClass);
      lightboxImage.classList.add(enterClass);

      const images = currentGalleryItem.images;
      applyLightboxImage(
        images[currentImageIndex],
        `${currentGalleryItem.title} (${currentImageIndex + 1}/${images.length})`,
        () => {
          // Paksa reflow supaya posisi awal (di luar frame) terdaftar
          // dulu sebelum dianimasikan slide ke tengah.
          void lightboxImage.offsetWidth;
          requestAnimationFrame(() => {
            lightboxImage.classList.remove(enterClass);
            setTimeout(() => { lightboxAnimating = false; }, 420);
          });
        }
      );
      updateLightboxCounter();
    };

    lightboxImage.addEventListener("transitionend", afterExit);
    lightboxImage.classList.add(exitClass);
    // Jaring pengaman jika transitionend tidak terpicu.
    setTimeout(afterExit, 460);
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
  // Jabatan dikelompokkan per jenjang agar susunan organisasi terlihat
  // rapi seperti bagan, bukan sekadar daftar rata.
  const STRUKTUR_TINGKAT = [
    { kunci: "pimpinan", label: "Pimpinan desa", cocok: (j) => /kepala desa|sekretaris desa/i.test(j) },
    { kunci: "kaur-kasi", label: "Kaur & Kasi", cocok: (j) => /^(kaur|kasi)\b/i.test(j) },
    { kunci: "staf", label: "Staf pelaksana", cocok: (j) => /^staf\b/i.test(j) },
    { kunci: "kadus", label: "Kepala dusun", cocok: (j) => /^kadus\b/i.test(j) }
  ];

  function strukturItemCard(item, compact = false) {
    return `
      <div class="struktur-item ${compact ? "compact" : ""}">
        <span class="struktur-avatar"><img src="${item.foto}" alt="Foto ${item.jabatan}" loading="lazy" width="120" height="120"></span>
        <div>
          <h3>${item.nama}</h3>
          <span>${item.jabatan}</span>
        </div>
      </div>`;
  }

  function renderStruktur() {
    const wrap = document.getElementById("struktur-list");
    if (!wrap) return;

    const sisa = new Set(STRUKTUR_DATA);
    const kelompok = STRUKTUR_TINGKAT.map((tingkat) => {
      const anggota = STRUKTUR_DATA.filter((item) => tingkat.cocok(item.jabatan));
      anggota.forEach((item) => sisa.delete(item));
      return { ...tingkat, anggota };
    }).filter((tingkat) => tingkat.anggota.length > 0);

    // Jabatan yang tidak cocok pola manapun tetap ditampilkan, dikelompokkan di akhir.
    if (sisa.size > 0) {
      kelompok.push({ kunci: "lainnya", label: "Perangkat lainnya", anggota: [...sisa] });
    }

    wrap.innerHTML = kelompok.map((tingkat) => `
      <div class="struktur-tier struktur-tier-${tingkat.kunci}">
        <p class="struktur-tier-label">${tingkat.label}</p>
        <div class="struktur-grid">
          ${tingkat.anggota.map((item) => strukturItemCard(item, tingkat.kunci === "staf")).join("")}
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
      <div class="dusun-item"><strong>${item.nama}</strong><span>${item.jumlahPenduduk.toLocaleString("id-ID")} jiwa</span></div>`).join("");
  }

  // ---------- Anggaran / transparansi ----------
  let activeBudgetYear = null;

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
  document.getElementById("current-year").textContent = new Date().getFullYear();

  const initialTarget = window.location.hash.replace("#", "");
  showPage(pageFromHash(window.location.hash), initialTarget, false);
  observeReveals();

  async function refreshAllData({ showLoading = false } = {}) {
    if (showLoading) {
      const loadingTargets = ["home-news-list", "news-list", "gallery-grid", "struktur-list"];
      loadingTargets.forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<p class="loading-text">Memuat data...</p>`;
      });
    }

    try {
      [NEWS_DATA, GALLERY_DATA, STRUKTUR_DATA, STATISTIK_DATA, DUSUN_DATA, BUDGET_DATA] = await Promise.all([
        fetchNewsData(),
        fetchGalleryData(),
        fetchStrukturData(),
        fetchStatistikData(),
        fetchDusunData(),
        fetchBudgetData()
      ]);
    } catch (error) {
      console.error("Gagal memuat data dari Supabase:", error);
      return;
    }

    activeBudgetYear = BUDGET_DATA.some((item) => item.tahun === activeBudgetYear) ? activeBudgetYear : BUDGET_DATA[0]?.tahun;
    STATISTIK_DATA.jumlahDusun = DUSUN_DATA.length;

    renderHomeNews();
    renderNews();
    renderGallery();
    renderStruktur();
    renderStatistik();
    renderBudgetFilters();
    renderBudget();
    observeReveals();
  }

  async function initData() {
    await refreshAllData({ showLoading: true });
  }

  initData();

  // ---------- Live update dari Supabase (Realtime) ----------
  // Begitu ada perubahan (tambah/ubah/hapus data) lewat admin panel,
  // halaman ini otomatis ambil data terbaru & render ulang — tanpa
  // pengunjung perlu refresh manual dan tanpa reload seluruh halaman
  // (posisi scroll & menu yang sedang terbuka tidak ikut ter-reset).
  //
  // Tiap tabel cuma memicu refresh bagian yang relevan aja (mis. ubah
  // berita tidak ikut memutar ulang animasi angka di halaman Anggaran).
  //
  // Syarat: Realtime harus diaktifkan untuk tabel-tabel ini di Supabase
  // (Database → Replication di dashboard, atau lewat SQL):
  //   alter publication supabase_realtime add table
  //     news, gallery_items, gallery_images, struktur_desa,
  //     statistik_desa, anggaran_tahun, anggaran_item;
  // Kalau data dusun/penduduk ternyata disimpan di tabel tersendiri
  // (di luar RPC get_statistik_dusun), tambahkan juga nama tabelnya ke
  // TABLE_REFRESH di bawah supaya ikut ter-refresh otomatis.

  async function refreshNews() {
    NEWS_DATA = await fetchNewsData();
    renderHomeNews();
    renderNews();
    observeReveals();
  }

  async function refreshGallery() {
    GALLERY_DATA = await fetchGalleryData();
    renderGallery();
    observeReveals();
  }

  async function refreshStruktur() {
    STRUKTUR_DATA = await fetchStrukturData();
    renderStruktur();
  }

  async function refreshStatistik() {
    [STATISTIK_DATA, DUSUN_DATA] = await Promise.all([fetchStatistikData(), fetchDusunData()]);
    STATISTIK_DATA.jumlahDusun = DUSUN_DATA.length;
    renderStatistik();
  }

  async function refreshAnggaran() {
    BUDGET_DATA = await fetchBudgetData();
    activeBudgetYear = BUDGET_DATA.some((item) => item.tahun === activeBudgetYear) ? activeBudgetYear : BUDGET_DATA[0]?.tahun;
    renderBudgetFilters();
    renderBudget();
  }

  const TABLE_REFRESH = {
    news: refreshNews,
    gallery_items: refreshGallery,
    gallery_images: refreshGallery,
    struktur_desa: refreshStruktur,
    statistik_desa: refreshStatistik,
    anggaran_tahun: refreshAnggaran,
    anggaran_item: refreshAnggaran
  };

  // Beberapa perubahan sering datang beruntun (mis. simpan berita +
  // beberapa gambar sekaligus) — debounce & kumpulkan dulu tabel mana
  // saja yang berubah, supaya cuma satu kali refresh per bagian.
  const pendingRefreshTables = new Set();
  let realtimeRefreshTimer = null;
  function scheduleRealtimeRefresh(table) {
    pendingRefreshTables.add(table);
    clearTimeout(realtimeRefreshTimer);
    realtimeRefreshTimer = setTimeout(() => {
      const tables = [...pendingRefreshTables];
      pendingRefreshTables.clear();
      const uniqueRefreshFns = new Set(tables.map((t) => TABLE_REFRESH[t]).filter(Boolean));
      uniqueRefreshFns.forEach((fn) => fn());
    }, 500);
  }

  const realtimeChannel = supabaseClient.channel("public-site-updates");
  Object.keys(TABLE_REFRESH).forEach((table) => {
    realtimeChannel.on("postgres_changes", { event: "*", schema: "public", table }, () => scheduleRealtimeRefresh(table));
  });
  realtimeChannel.subscribe();

  // ---------- Spot foto (welcome section carousel) ----------
const SPOT_DATA = [
  {
    image: "assets/bendung.jpeg",
    title: "Bendungan Pamukkulu",
    note: "Bendungan Pamukkulu",
    desc: "Bendungan yang jadi salah satu spot favorit warga untuk bersantai dan berfoto, dengan pemandangan yang tenang di sekitar Desa Kale Ko'mara."
  },
  {
    image: "assets/timurung.jpeg",
    title: "Air Terjun Timurung",
    note: "Air Terjun Timurung",
    desc: "Air terjun alami dengan suasana sejuk, cocok untuk yang ingin healing sejenak sambil menikmati alam sekitar desa."
  },
  {
    image: "assets/atv.jpeg",
    title: "Wisata ATV",
    note: "Wisata ATV",
    desc: "Wahana ATV yang bisa dicoba warga maupun pengunjung untuk menyusuri jalur di sekitar desa dengan cara yang lebih seru."
  }
];

let spotIndex = 0;
let spotAnimating = false;

const spotImageSlide = document.getElementById("spot-image-slide");
const spotCopySlide = document.getElementById("spot-copy-slide");
const spotImage = document.getElementById("spot-image");
const spotNote = document.getElementById("spot-note");
const spotTitle = document.getElementById("spot-title");
const spotDesc = document.getElementById("spot-desc");
const spotCounter = document.getElementById("spot-counter");
const spotPrev = document.getElementById("spot-prev");
const spotNext = document.getElementById("spot-next");

function applySpotContent() {
  const item = SPOT_DATA[spotIndex];
  spotImage.src = item.image;
  spotImage.alt = item.title;
  spotNote.innerHTML = `<i class="fa-solid fa-location-dot" aria-hidden="true"></i> ${item.note}`;
  spotTitle.textContent = item.title;
  spotDesc.textContent = item.desc;
  spotCounter.textContent = `${spotIndex + 1} / ${SPOT_DATA.length}`;
}

// direction: 1 = maju (masuk dari kanan), -1 = mundur (masuk dari kiri)
function stepSpot(direction) {
  if (spotAnimating) return;
  spotIndex = (spotIndex + direction + SPOT_DATA.length) % SPOT_DATA.length;

  if (prefersReducedMotion()) {
    applySpotContent();
    return;
  }

  spotAnimating = true;
  const exitClass = direction > 0 ? "spot-slide-exit-left" : "spot-slide-exit-right";
  const enterClass = direction > 0 ? "spot-slide-enter-right" : "spot-slide-enter-left";
  const elements = [spotImageSlide, spotCopySlide];

  let finished = false;
  const finishExit = () => {
    if (finished) return;
    finished = true;
    spotImageSlide.removeEventListener("transitionend", finishExit);

    elements.forEach((el) => el.classList.remove(exitClass));
    applySpotContent();
    elements.forEach((el) => el.classList.add(enterClass));

    // Paksa reflow supaya posisi awal (di luar frame) terdaftar dulu sebelum dianimasikan ke tengah.
    void spotImageSlide.offsetWidth;
    requestAnimationFrame(() => {
      elements.forEach((el) => el.classList.remove(enterClass));
      setTimeout(() => { spotAnimating = false; }, 320);
    });
  };

  spotImageSlide.addEventListener("transitionend", finishExit);
  elements.forEach((el) => el.classList.add(exitClass));
  // Jaring pengaman kalau transitionend tidak terpicu
  setTimeout(finishExit, 360);
}

if (spotPrev && spotNext) {
  spotPrev.addEventListener("click", () => stepSpot(-1));
  spotNext.addEventListener("click", () => stepSpot(1));
}