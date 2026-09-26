/* =========================================================
   BERITA DETAIL — DESA KALE KO'MARA
   Halaman terpisah dari index.html supaya index tidak perlu
   menanggung konten lengkap semua berita. Mengambil satu baris
   dari tabel "news" di Supabase berdasarkan ?slug= pada URL.
   ========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  const titleCase = (text) => text.charAt(0).toUpperCase() + text.slice(1);

  // ---------- Menu mobile ----------
  const menu = document.querySelector(".primary-nav");
  const menuToggle = document.querySelector(".menu-toggle");
  if (menu && menuToggle) {
    menuToggle.addEventListener("click", () => {
      const open = !menu.classList.contains("open");
      menu.classList.toggle("open", open);
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Tutup menu navigasi" : "Buka menu navigasi");
      document.body.classList.toggle("menu-open", open);
    });
  }

  const header = document.querySelector(".site-header");
  if (header) {
    window.addEventListener("scroll", () => header.classList.toggle("scrolled", window.scrollY > 12), { passive: true });
  }

  const yearEl = document.getElementById("current-year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // ---------- Reveal saat discroll ----------
  // Elemen dengan class "reveal" (judul "Berita lainnya" & tiap kartu berita)
  // defaultnya opacity:0 di style.css sampai class "visible" ditambahkan lewat
  // IntersectionObserver ini. Logic ini asalnya cuma ada di script.js, padahal
  // halaman berita-detail.html tidak memuat script.js — jadi elemen "reveal"
  // di halaman ini dulu tidak pernah muncul (transparan selamanya walau
  // tetap makan tempat).
  const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let revealObserver;
  function observeReveals() {
    if (prefersReducedMotion()) {
      document.querySelectorAll(".reveal").forEach((item) => item.classList.add("visible"));
      return;
    }
    if (!revealObserver) {
      revealObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("visible");
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.08, rootMargin: "0px 0px -35px" });
    }
    document.querySelectorAll(".reveal:not(.visible)").forEach((item) => revealObserver.observe(item));
  }
  observeReveals();

  function showNotFound() {
    document.getElementById("article-title").textContent = "Berita tidak ditemukan";
    const articleContent = document.querySelector(".article-content");
    if (articleContent) {
      articleContent.querySelector(".article-image").hidden = true;
      articleContent.querySelector(".article-body").hidden = true;
    }
    const notFound = document.getElementById("article-not-found");
    if (notFound) notFound.hidden = false;
    const relatedSection = document.getElementById("related-section");
    if (relatedSection) relatedSection.hidden = true;
  }

  function newsCardHtml(item, index = 0) {
    const href = `berita-detail.html?slug=${encodeURIComponent(item.slug)}`;
    return `
        <article class="news-card reveal ${index % 3 === 1 ? "delay-1" : index % 3 === 2 ? "delay-2" : ""}">
          <a class="news-image" href="${href}" aria-label="Baca berita: ${esc(item.title)}">
            <img src="${esc(safeUrl(item.image_url))}" alt="Tempat foto untuk berita: ${esc(item.title)}" loading="lazy" width="720" height="540">
            <span class="news-category">${esc(titleCase(item.category))}</span>
          </a>
          <div class="news-meta"><time>${esc(formatTanggalIndo(item.date))}</time><span></span><span>Desa Kale Ko'mara</span></div>
          <h3><a href="${href}">${esc(item.title)}</a></h3>
          <p class="news-excerpt">${esc(item.excerpt)}</p>
        </article>`;
  }

  // ---------- Render isi berita: paragraf + gambar sisipan ----------
  // "content" bisa berisi string lama (satu paragraf) ATAU objek blok baru
  // { type: "paragraph", text } / { type: "image", url, caption }.
  // Dua bentuk ini tetap didukung sekaligus supaya berita lama (sebelum
  // fitur blok gambar ada) tetap tampil normal tanpa perlu diedit ulang.
  function blockToHtml(block) {
    if (typeof block === "string") {
      return block.trim() ? `<p>${esc(block)}</p>` : "";
    }
    if (block && block.type === "image") {
      const url = safeUrl(block && block.url);
      if (!url) return "";
      const caption = block.caption ? `<figcaption>${esc(block.caption)}</figcaption>` : "";
      return `<figure class="article-figure"><img src="${esc(url)}" alt="${esc(block.caption || "")}" loading="lazy">${caption}</figure>`;
    }
    const text = block && block.text ? block.text : "";
    return text.trim() ? `<p>${esc(text)}</p>` : "";
  }

  // ---------- Ambil berita sesuai slug ----------
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("slug");

  if (!slug) {
    showNotFound();
    return;
  }

  const { data: article, error } = await supabaseClient.from("news").select("*").eq("slug", slug).maybeSingle();

  if (error || !article) {
    showNotFound();
    return;
  }

  document.title = `${article.title} — Desa Kale Ko'mara`;
  document.getElementById("article-category").textContent = titleCase(article.category);
  document.getElementById("article-title").textContent = article.title;
  document.getElementById("article-meta").textContent = `${formatTanggalIndo(article.date)} · Desa Kale Ko'mara`;

  const imageEl = document.getElementById("article-image");
  imageEl.src = article.image_url;
  imageEl.alt = `Foto untuk berita: ${article.title}`;

  const bodyEl = document.getElementById("article-body");
  bodyEl.innerHTML = (article.content || []).map(blockToHtml).join("");

  // ---------- Berita lainnya (maksimum 3, selain berita yang sedang dibuka) ----------
  const { data: related, error: relatedError } = await supabaseClient
    .from("news")
    .select("*")
    .neq("slug", article.slug)
    .order("date", { ascending: false })
    .limit(3);

  const relatedList = document.getElementById("related-news");
  if (relatedList) {
    if (relatedError || !related) {
      relatedList.innerHTML = `<p class="loading-text">Gagal memuat berita lainnya.</p>`;
    } else {
      relatedList.innerHTML = related.map(newsCardHtml).join("");
    }
  }
  observeReveals();
});