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
          <a class="news-image" href="${href}" aria-label="Baca berita: ${item.title}">
            <img src="${item.image_url}" alt="Tempat foto untuk berita: ${item.title}" loading="lazy" width="720" height="540">
            <span class="news-category">${titleCase(item.category)}</span>
          </a>
          <div class="news-meta"><time>${formatTanggalIndo(item.date)}</time><span></span><span>Desa Kale Ko'mara</span></div>
          <h3><a href="${href}">${item.title}</a></h3>
          <p class="news-excerpt">${item.excerpt}</p>
        </article>`;
    }
  
    // ---------- Ambil berita sesuai slug ----------
    const params = new URLSearchParams(window.location.search);
    const slug = params.get("slug");
  
    if (!slug) {
      showNotFound();
      return;
    }
  
    const { data: article, error } = await supabaseClient.from("news").select("*").eq("slug", slug).single();
  
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
    bodyEl.innerHTML = (article.content || []).map((paragraf) => `<p>${paragraf}</p>`).join("");
  
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
  });