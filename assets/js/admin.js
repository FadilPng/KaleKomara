/* =========================================================
   ADMIN PANEL — DESA KALE KO'MARA
   Login pakai Supabase Auth, semua data dibaca/ditulis langsung
   ke Supabase (tabel & storage bucket sesuai supabase-schema.sql).
   ========================================================= */

   const $ = (id) => document.getElementById(id);
   // esc() dan safeUrl() sekarang disediakan oleh supabase-client.js
   // (dimuat sebelum file ini) supaya situs publik & admin memakai
   // fungsi escaping yang sama.
   
   function slugify(text) {
     return text.toLowerCase().trim()
       .replace(/[^a-z0-9\s-]/g, "")
       .replace(/\s+/g, "-")
       .replace(/-+/g, "-")
       .replace(/^-|-$/g, "");
   }
   
   /* ---------------------------------------------------------
      STATUS MESSAGE — muncul + animasi + auto sembunyi.
      `hidden` benar-benar dipakai (tidak ditimpa display:flex),
      dan class is-visible dipakai CSS untuk transisi masuk.
      --------------------------------------------------------- */
   function setStatus(el, message, isError = false) {
     if (!el) return;
     el.innerHTML = `<i class="fa-solid ${isError ? "fa-circle-exclamation" : "fa-circle-check"}" aria-hidden="true"></i> <span>${esc(message)}</span>`;
     el.hidden = false;
     el.classList.toggle("is-error", isError);
     el.classList.remove("is-animate", "is-visible");
     void el.offsetWidth; // restart animasi
     el.classList.add("is-animate", "is-visible");
     if (el._hideTimer) clearTimeout(el._hideTimer);
     if (!isError) {
       el._hideTimer = setTimeout(() => {
         el.hidden = true;
         el.classList.remove("is-animate", "is-visible");
       }, 2600);
     }
   }
   
   /* ---------------------------------------------------------
      BUSY STATE UNTUK TOMBOL (submit, dsb.)
      Menyimpan HTML asli tombol lalu mengganti jadi spinner.
      --------------------------------------------------------- */
   function setBusy(btn, busy, label = "Menyimpan...") {
     if (!btn) return;
     if (busy) {
       if (!btn.dataset.idleHtml) btn.dataset.idleHtml = btn.innerHTML;
       btn.disabled = true;
       btn.classList.add("is-loading");
       btn.setAttribute("aria-busy", "true");
       btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i><span>${esc(label)}</span>`;
     } else {
       btn.disabled = false;
       btn.classList.remove("is-loading");
       btn.removeAttribute("aria-busy");
       if (btn.dataset.idleHtml) {
         btn.innerHTML = btn.dataset.idleHtml;
         delete btn.dataset.idleHtml;
       }
     }
   }
   
   /* ---------------------------------------------------------
      INDIKATOR UPLOAD FOTO/FILE
      `host` = elemen pembungkus tempat indikator disisipkan
      (mis. kotak preview atau kotak chip).
      --------------------------------------------------------- */
   function setUploadState(host, busy, text = "Mengunggah...") {
     if (!host) return;
     const field = host.closest(".admin-field") || host;
     field.classList.toggle("is-uploading", busy);
     let node = host.querySelector(".admin-upload-indicator");
     if (busy) {
       if (!node) {
         node = document.createElement("div");
         node.className = "admin-upload-indicator";
         host.prepend(node);
       }
       node.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> ${esc(text)}`;
     } else if (node) {
       node.remove();
     }
   }
   
   /* ---------------------------------------------------------
      STAGGER ANIMASI UNTUK BARIS LIST
      Dipanggil setiap kali sebuah daftar (.admin-row) dirender.
      --------------------------------------------------------- */
   function staggerRows(container) {
     if (!container) return;
     container.querySelectorAll(".admin-row").forEach((row, i) => {
       row.style.setProperty("--row-i", i);
       row.classList.add("is-stagger");
     });
   }
   
   /* ---------------------------------------------------------
      INDIKATOR UPLOAD KHUSUS BLOK GAMBAR BERITA
      Beda dari setUploadState: TIDAK mencari ".admin-field"
      terdekat (yang di editor blok berarti wrapper besar seluruh
      "Isi lengkap", bukan blok itu sendiri) — cukup toggle class
      langsung di elemen blok yang sedang diunggah. Ini yang bikin
      dulu semua file-input di semua blok ikut ke-disable dan bisa
      nyangkut permanen kalau blok itu keburu di-render ulang.
      --------------------------------------------------------- */
   function setBlockUploadState(host, busy, text = "Mengunggah...") {
     if (!host) return;
     host.classList.toggle("is-uploading", busy);
     let node = host.querySelector(".admin-upload-indicator");
     if (busy) {
       if (!node) {
         node = document.createElement("div");
         node.className = "admin-upload-indicator";
         host.prepend(node);
       }
       node.innerHTML = `<i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i> ${esc(text)}`;
     } else if (node) {
       node.remove();
     }
   }

   // Tipe & ukuran file yang diizinkan per folder. Ditolak SEBELUM
   // upload supaya file berbahaya (SVG/HTML berisi skrip) atau file
   // raksasa tidak masuk ke bucket publik.
   const UPLOAD_RULES = {
     news:     { types: ["image/jpeg", "image/png", "image/webp"], maxMB: 5,  label: "JPG/PNG/WebP" },
     gallery:  { types: ["image/jpeg", "image/png", "image/webp"], maxMB: 5,  label: "JPG/PNG/WebP" },
     struktur: { types: ["image/jpeg", "image/png", "image/webp"], maxMB: 5,  label: "JPG/PNG/WebP" },
     potensi:  { types: ["image/jpeg", "image/png", "image/webp"], maxMB: 5,  label: "JPG/PNG/WebP" },
     dokumen:  { types: ["application/pdf"],                       maxMB: 10, label: "PDF" }
   };

   async function uploadToStorage(file, folder) {
     const rule = UPLOAD_RULES[folder] || UPLOAD_RULES.news;
     if (!rule.types.includes(file.type)) {
       throw new Error(`Tipe file tidak diizinkan. Yang diterima: ${rule.label}.`);
     }
     if (file.size > rule.maxMB * 1024 * 1024) {
       throw new Error(`Ukuran file maksimal ${rule.maxMB} MB.`);
     }
     const ext = (file.name.split(".").pop() || "bin").toLowerCase();
     const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
     const { error } = await supabaseClient.storage.from("site-media").upload(path, file);
     if (error) throw error;
     return supabaseClient.storage.from("site-media").getPublicUrl(path).data.publicUrl;
   }
   
   function confirmDelete(message) {
     return window.confirm(message);
   }
   
   /* ---------------------------------------------------------
      FORMAT RUPIAH — dipakai di form Anggaran supaya admin tidak
      bingung menghitung nol saat mengisi nilai pendapatan/belanja.
      Input diformat pakai titik ribuan (gaya Indonesia) sambil
      diketik; angka aslinya (tanpa titik) yang disimpan ke Supabase.
      --------------------------------------------------------- */
   function formatRibuan(value) {
     const digits = String(value).replace(/\D/g, "");
     if (!digits) return "";
     return Number(digits).toLocaleString("id-ID");
   }
   
   function parseRibuan(value) {
     const digits = String(value).replace(/\D/g, "");
     return digits ? Number(digits) : 0;
   }
   
   // Format ulang isi input tiap kali admin mengetik, sambil menjaga
   // posisi kursor supaya tidak "loncat" ke akhir setiap kali titik
   // ribuan berubah jumlahnya.
   function wireRupiahInput(input) {
     input.addEventListener("input", () => {
       const digitsBeforeCursor = input.value.slice(0, input.selectionStart).replace(/\D/g, "").length;
       input.value = formatRibuan(input.value);
       let pos = 0, seen = 0;
       while (pos < input.value.length && seen < digitsBeforeCursor) {
         if (/\d/.test(input.value[pos])) seen++;
         pos++;
       }
       input.setSelectionRange(pos, pos);
     });
   }
   
   /* ---------------------------------------------------------
      UTIL DRAG & DROP — pindahkan satu elemen array dari
      fromIndex ke toIndex, dipakai untuk urutan galeri & foto.
      --------------------------------------------------------- */
   function reorderArray(arr, fromIndex, toIndex) {
     const copy = arr.slice();
     const [moved] = copy.splice(fromIndex, 1);
     copy.splice(toIndex, 0, moved);
     return copy;
   }
   
   /* ---------------------------------------------------------
      Pasang drag & drop generik ke sekumpulan elemen di dalam
      `wrap`. `selector` = elemen yang bisa diseret (draggable).
      `onDrop(fromIndex, toIndex)` dipanggil begitu urutan baru
      valid (diseret ke posisi yang berbeda).
      --------------------------------------------------------- */
   function wireDragReorder(wrap, selector, onDrop) {
     if (!wrap) return;
     let dragIndex = null;
     const items = wrap.querySelectorAll(selector);
     items.forEach((el) => {
       el.addEventListener("dragstart", (e) => {
         dragIndex = Number(el.dataset.index);
         el.classList.add("is-dragging");
         if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
       });
       el.addEventListener("dragend", () => {
         items.forEach((i) => i.classList.remove("is-dragging", "is-drag-over"));
       });
       el.addEventListener("dragover", (e) => {
         e.preventDefault();
         if (e.dataTransfer) e.dataTransfer.dropEffect = "move";
         el.classList.add("is-drag-over");
       });
       el.addEventListener("dragleave", () => el.classList.remove("is-drag-over"));
       el.addEventListener("drop", (e) => {
         e.preventDefault();
         el.classList.remove("is-drag-over");
         const dropIndex = Number(el.dataset.index);
         if (dragIndex === null || dragIndex === dropIndex) return;
         onDrop(dragIndex, dropIndex);
       });
     });
   }
   
   /* =========================================================
      AUTH
      ========================================================= */
   async function initAuth() {
     const { data } = await supabaseClient.auth.getSession();
     applySession(data.session);
   
     supabaseClient.auth.onAuthStateChange((_event, session) => applySession(session));
   
     $("login-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       const email = $("login-email").value.trim();
       const password = $("login-password").value;
       $("login-error").hidden = true;
       const submitBtn = document.querySelector(".admin-login-submit");
       setBusy(submitBtn, true, "Masuk...");
       try {
         const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
         if (error) {
           $("login-error").querySelector("span").textContent = "Email atau kata sandi salah.";
           $("login-error").hidden = false;
         }
       } finally {
         setBusy(submitBtn, false);
       }
     });
   
     $("logout-btn").addEventListener("click", () => supabaseClient.auth.signOut());
   
     $("toggle-password").addEventListener("click", () => {
       const input = $("login-password");
       const icon = document.querySelector("#toggle-password i");
       const showing = input.type === "text";
       input.type = showing ? "password" : "text";
       icon.className = showing ? "fa-solid fa-eye" : "fa-solid fa-eye-slash";
       $("toggle-password").setAttribute("aria-label", showing ? "Tampilkan kata sandi" : "Sembunyikan kata sandi");
     });
   }
   
   let dataLoaded = false;
   function applySession(session) {
     $("login-screen").hidden = !!session;
     $("admin-app").hidden = !session;

     if (!session) {
       // Saat logout: reset flag supaya login berikutnya (atau ganti
       // akun) memuat ulang data terbaru, bukan menampilkan data basi
       // dari sesi sebelumnya.
       dataLoaded = false;
     }
   
     if (session) {
       // Trigger animasi masuk setiap kali sesi aktif ditampilkan
       $("admin-app").classList.remove("is-entering");
       void $("admin-app").offsetWidth;
       $("admin-app").classList.add("is-entering");
     }
   
     if (session && !dataLoaded) {
       dataLoaded = true;
       loadBerita();
       loadGaleri();
       loadStruktur();
       loadPotensi();
       loadProfil();
       loadKontak();
       loadStatistik();
       loadDusun();
       loadKeluarga();
       loadAnggaran();
       loadPengaduan();
     }
   }
   
   /* =========================================================
      TAB SWITCHING + HEADER SCROLL EFFECT
      ========================================================= */
   document.addEventListener("DOMContentLoaded", () => {
     document.querySelectorAll(".admin-tab").forEach((btn) => {
       btn.addEventListener("click", () => {
         document.querySelectorAll(".admin-tab").forEach((b) => b.classList.toggle("active", b === btn));
         document.querySelectorAll(".admin-panel").forEach((panel) => {
           const isActive = panel.dataset.panel === btn.dataset.tab;
           if (isActive) {
             panel.hidden = false;
             panel.classList.remove("is-entering");
             void panel.offsetWidth; // restart animasi
             panel.classList.add("is-entering");
           } else {
             panel.hidden = true;
             panel.classList.remove("is-entering");
           }
         });
       });
     });
   
     // Efek shadow pada header admin saat discroll (sama seperti index)
     window.addEventListener("scroll", () => {
       document.querySelector(".admin-header")?.classList.toggle("scrolled", window.scrollY > 10);
     }, { passive: true });
   
     initAuth();
     wireBeritaForm();
     wireGaleriForm();
     wireStrukturForm();
     wirePotensiForm();
     wireProfilForm();
     wireKontakForm();
     wireStatistikForm();
     wireDusunForm();
     wireKeluargaForm();
     wireAnggotaForm();
     wireAnggaranForm();
     wirePengaduan();
     wirePengaduanRealtime();
     wirePendudukExcel();
   });
   
   /* =========================================================
      1. BERITA
      ========================================================= */
   let beritaList = [];
   let beritaEditingId = null;
   let beritaSlugTouched = false;
   let beritaBlocks = []; // isi berita: { type: "paragraph", text } atau { type: "image", url, caption }

   // Berita lama menyimpan "content" sebagai array string biasa (satu
   // paragraf per elemen). Ubah ke bentuk blok supaya bisa diedit di
   // editor blok yang baru tanpa kehilangan data lama.
   function contentToBlocks(content) {
     return (content || []).map((entry) => {
       if (typeof entry === "string") return { type: "paragraph", text: entry };
       if (entry && entry.type === "image") return { type: "image", url: entry.url || "", caption: entry.caption || "" };
       return { type: "paragraph", text: (entry && entry.text) || "" };
     });
   }

   // Ringkasan otomatis: gabungan semua teks paragraf, dipotong di batas
   // kata terdekat supaya tidak memotong di tengah kata.
   function autoExcerpt(blocks, maxLen = 160) {
     const text = blocks
       .filter((b) => b.type === "paragraph" && b.text)
       .map((b) => b.text.trim())
       .join(" ")
       .replace(/\s+/g, " ")
       .trim();
     if (text.length <= maxLen) return text;
     const cut = text.slice(0, maxLen);
     const lastSpace = cut.lastIndexOf(" ");
     return (lastSpace > 40 ? cut.slice(0, lastSpace) : cut).trim() + "…";
   }

   function renderBeritaBlocks() {
     const wrap = $("berita-blocks");
     if (beritaBlocks.length === 0) {
       wrap.innerHTML = `<p class="admin-blocks-empty">Belum ada isi — tambah paragraf atau gambar di bawah. Gambar bisa diletakkan di mana saja, tidak harus di awal.</p>`;
       return;
     }
     wrap.innerHTML = beritaBlocks.map((block, index) => {
       const controls = `
         <div class="admin-block-controls">
           <button type="button" class="admin-block-btn" data-move="up" data-index="${index}" ${index === 0 ? "disabled" : ""} title="Naikkan"><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button>
           <button type="button" class="admin-block-btn" data-move="down" data-index="${index}" ${index === beritaBlocks.length - 1 ? "disabled" : ""} title="Turunkan"><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button>
           <button type="button" class="admin-block-btn admin-block-remove" data-remove="${index}" title="Hapus bagian ini"><i class="fa-solid fa-trash" aria-hidden="true"></i></button>
         </div>`;
       if (block.type === "image") {
         return `
           <div class="admin-block admin-block-image" data-index="${index}">
             <div class="admin-block-head"><span class="admin-block-label"><i class="fa-solid fa-image" aria-hidden="true"></i> Gambar</span>${controls}</div>
             <div class="admin-block-image-body">
               ${block.url ? `<img src="${esc(block.url)}" alt="">` : `<div class="admin-block-image-placeholder"><i class="fa-solid fa-image" aria-hidden="true"></i> Belum ada foto</div>`}
               <div class="admin-block-image-fields">
                 <input type="file" accept="image/*" data-image-input="${index}">
                 <input type="text" placeholder="Keterangan foto (opsional)" data-caption-input="${index}" value="${esc(block.caption || "")}">
               </div>
             </div>
           </div>`;
       }
       return `
         <div class="admin-block admin-block-paragraph" data-index="${index}">
           <div class="admin-block-head"><span class="admin-block-label"><i class="fa-solid fa-paragraph" aria-hidden="true"></i> Paragraf</span>${controls}</div>
           <textarea rows="3" data-text-input="${index}" placeholder="Tulis paragraf...">${esc(block.text || "")}</textarea>
         </div>`;
     }).join("");
   }

   async function loadBerita() {
     const { data, error } = await supabaseClient.from("news").select("*").order("date", { ascending: false });
     if (error) { console.error(error); return; }
     beritaList = data;
     renderBeritaList();
   }
   
   function renderBeritaList() {
     const wrap = $("berita-list");
     if (beritaList.length === 0) { wrap.innerHTML = `<p class="admin-empty"><i class="fa-solid fa-newspaper" aria-hidden="true"></i>Belum ada berita — tulis yang pertama.</p>`; return; }
     wrap.innerHTML = beritaList.map((item) => `
       <div class="admin-row ${item.id === beritaEditingId ? "is-active" : ""}">
         <div class="admin-row-main"><strong>${esc(item.title)}</strong><span>${esc(item.category)} · ${esc(item.date)}</span></div>
         <div class="admin-row-actions">
           <button class="button" type="button" data-edit="${item.id}">Ubah</button>
         </div>
       </div>`).join("");
     wrap.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editBerita(btn.dataset.edit)));
     staggerRows(wrap);
   }
   
   function resetBeritaForm() {
     beritaEditingId = null;
     beritaSlugTouched = false;
     beritaBlocks = [];
     $("berita-form").reset();
     $("berita-image-url").value = "";
     $("berita-image-preview").innerHTML = "";
     renderBeritaBlocks();
     $("berita-form-title").textContent = "Berita baru";
     $("berita-delete-btn").hidden = true;
     renderBeritaList();
   }
   
   function editBerita(id) {
     const item = beritaList.find((n) => n.id === id);
     if (!item) return;
     beritaEditingId = id;
     beritaSlugTouched = true;
     $("berita-title").value = item.title;
     $("berita-slug").value = item.slug;
     $("berita-category").value = item.category;
     $("berita-date").value = item.date;
     $("berita-image-url").value = item.image_url || "";
     $("berita-image-preview").innerHTML = item.image_url ? `<img src="${esc(item.image_url)}" alt="">` : "";
     $("berita-excerpt").value = item.excerpt || "";
     beritaBlocks = contentToBlocks(item.content);
     renderBeritaBlocks();
     $("berita-form-title").textContent = "Ubah berita";
     $("berita-delete-btn").hidden = false;
     renderBeritaList();
   }
   
   function wireBeritaForm() {
     renderBeritaBlocks();
     $("berita-new-btn").addEventListener("click", resetBeritaForm);
     $("berita-cancel-btn").addEventListener("click", resetBeritaForm);
   
     $("berita-title").addEventListener("input", () => {
       if (!beritaSlugTouched) $("berita-slug").value = slugify($("berita-title").value);
     });
     $("berita-slug").addEventListener("input", () => { beritaSlugTouched = true; });
   
     $("berita-image-file").addEventListener("change", async (event) => {
       const file = event.target.files[0];
       if (!file) return;
       const preview = $("berita-image-preview");
       preview.innerHTML = "";
       setUploadState(preview, true, "Mengunggah foto...");
       try {
         const url = await uploadToStorage(file, "news");
         $("berita-image-url").value = url;
         preview.innerHTML = `<img src="${esc(url)}" alt="">`;
       } catch (err) {
         setStatus($("berita-status"), "Gagal unggah foto: " + err.message, true);
         preview.innerHTML = "";
       } finally {
         setUploadState(preview, false);
         event.target.value = "";
       }
     });
   
     // ---------- Editor blok isi berita (paragraf + gambar sisipan) ----------
     const blocksWrap = $("berita-blocks");
   
     $("berita-add-paragraph").addEventListener("click", () => {
       beritaBlocks.push({ type: "paragraph", text: "" });
       renderBeritaBlocks();
       const areas = blocksWrap.querySelectorAll("textarea[data-text-input]");
       areas[areas.length - 1]?.focus();
     });
   
     $("berita-add-image").addEventListener("click", () => {
       beritaBlocks.push({ type: "image", url: "", caption: "" });
       renderBeritaBlocks();
     });
   
     // Ketikan di paragraf/keterangan hanya memperbarui data, tidak me-render
     // ulang seluruh blok — supaya kursor & fokus tidak lompat saat mengetik.
     blocksWrap.addEventListener("input", (event) => {
       const textIndex = event.target.dataset.textInput;
       if (textIndex !== undefined) { beritaBlocks[Number(textIndex)].text = event.target.value; return; }
       const capIndex = event.target.dataset.captionInput;
       if (capIndex !== undefined) beritaBlocks[Number(capIndex)].caption = event.target.value;
     });
   
     blocksWrap.addEventListener("change", async (event) => {
       const imgIndex = event.target.dataset.imageInput;
       if (imgIndex === undefined) return;
       const file = event.target.files[0];
       if (!file) return;
       const index = Number(imgIndex);
       const blockEl = event.target.closest(".admin-block-image");
       setBlockUploadState(blockEl, true, "Mengunggah foto...");
       try {
         const url = await uploadToStorage(file, "news");
         beritaBlocks[index].url = url;
       } catch (err) {
         setStatus($("berita-status"), "Gagal unggah foto: " + err.message, true);
       } finally {
         setBlockUploadState(blockEl, false);
         renderBeritaBlocks();
       }
     });
   
     blocksWrap.addEventListener("click", (event) => {
       const moveBtn = event.target.closest("[data-move]");
       if (moveBtn) {
         const index = Number(moveBtn.dataset.index);
         const target = index + (moveBtn.dataset.move === "up" ? -1 : 1);
         if (target < 0 || target >= beritaBlocks.length) return;
         [beritaBlocks[index], beritaBlocks[target]] = [beritaBlocks[target], beritaBlocks[index]];
         renderBeritaBlocks();
         return;
       }
       const removeBtn = event.target.closest("[data-remove]");
       if (removeBtn) {
         beritaBlocks.splice(Number(removeBtn.dataset.remove), 1);
         renderBeritaBlocks();
       }
     });
   
     $("berita-form").addEventListener("submit", async (event) => {
       event.preventDefault();
   
       const cleanBlocks = beritaBlocks
         .map((b) => b.type === "image"
           ? { type: "image", url: b.url || "", caption: (b.caption || "").trim() }
           : { type: "paragraph", text: (b.text || "").trim() })
         .filter((b) => (b.type === "paragraph" && b.text) || (b.type === "image" && b.url));
   
       if (cleanBlocks.length === 0) { setStatus($("berita-status"), "Tambahkan minimal satu paragraf atau gambar.", true); return; }
   
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan berita...");
       try {
         const manualExcerpt = $("berita-excerpt").value.trim();
         const payload = {
           title: $("berita-title").value.trim(),
           slug: slugify($("berita-slug").value),
           category: $("berita-category").value,
           date: $("berita-date").value,
           image_url: $("berita-image-url").value || null,
           excerpt: manualExcerpt || autoExcerpt(cleanBlocks),
           content: cleanBlocks
         };
   
         const query = beritaEditingId
           ? supabaseClient.from("news").update(payload).eq("id", beritaEditingId)
           : supabaseClient.from("news").insert(payload);
   
         const { error } = await query;
         if (error) { setStatus($("berita-status"), "Gagal menyimpan: " + error.message, true); return; }
         setStatus($("berita-status"), "Berita tersimpan.");
         await loadBerita();
         resetBeritaForm();
       } finally {
         setBusy(submitBtn, false);
       }
     });
   
     $("berita-delete-btn").addEventListener("click", async () => {
       if (!beritaEditingId || !confirmDelete("Hapus berita ini?")) return;
       const btn = $("berita-delete-btn");
       setBusy(btn, true, "Menghapus...");
       try {
         const { error } = await supabaseClient.from("news").delete().eq("id", beritaEditingId);
         if (error) { setStatus($("berita-status"), "Gagal menghapus: " + error.message, true); return; }
         await loadBerita();
         resetBeritaForm();
       } finally {
         setBusy(btn, false);
       }
     });
   }
   
   /* =========================================================
      2. GALERI
      ========================================================= */
   let galeriList = [];
   let galeriEditingId = null;
   let galeriImages = []; // array of image_url string, urutan sesuai tampilan
   
   async function loadGaleri() {
     const { data, error } = await supabaseClient
       .from("gallery_items")
       .select("*, gallery_images(image_url, sort_order)")
       .order("sort_order");
     if (error) { console.error(error); return; }
     galeriList = data.map((row) => ({
       ...row,
       images: (row.gallery_images || []).slice().sort((a, b) => a.sort_order - b.sort_order).map((i) => i.image_url)
     }));
     renderGaleriList();
   }
   
   function renderGaleriList() {
     const wrap = $("galeri-list");
     if (galeriList.length === 0) { wrap.innerHTML = `<p class="admin-empty"><i class="fa-solid fa-images" aria-hidden="true"></i>Belum ada item galeri — unggah foto pertama.</p>`; return; }
     wrap.innerHTML = galeriList.map((item, index) => `
       <div class="admin-row admin-row-draggable ${item.id === galeriEditingId ? "is-active" : ""}" draggable="true" data-index="${index}">
         <span class="admin-drag-handle" title="Seret untuk ubah urutan" aria-hidden="true"><i class="fa-solid fa-grip-vertical"></i></span>
         <div class="admin-row-main"><strong>${esc(item.title)}</strong><span>${esc(item.category)} · ${item.images.length} foto</span></div>
         <div class="admin-row-actions">
           <button class="button" type="button" data-edit="${item.id}">Ubah</button>
         </div>
       </div>`).join("");
     wrap.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editGaleri(btn.dataset.edit)));
     wireDragReorder(wrap, ".admin-row-draggable", async (fromIndex, toIndex) => {
       galeriList = reorderArray(galeriList, fromIndex, toIndex);
       renderGaleriList();
       await persistGaleriOrder();
     });
     staggerRows(wrap);
   }
   
   /* ---------------------------------------------------------
      Simpan ulang sort_order semua item galeri ke Supabase
      sesuai urutan terbaru di galeriList (dipanggil tiap kali
      urutan diubah lewat drag & drop).
      --------------------------------------------------------- */
   async function persistGaleriOrder() {
     const results = await Promise.all(
       galeriList.map((item, i) => supabaseClient.from("gallery_items").update({ sort_order: i }).eq("id", item.id))
     );
     const failed = results.find((r) => r.error);
     galeriList.forEach((item, i) => { item.sort_order = i; });
     if (failed) {
       setStatus($("galeri-status"), "Gagal menyimpan urutan: " + failed.error.message, true);
     } else {
       setStatus($("galeri-status"), "Urutan galeri diperbarui.");
     }
   }
   
   function renderGaleriChips() {
     const wrap = $("galeri-image-chips");
     wrap.innerHTML = galeriImages.map((url, index) => `
       <div class="admin-image-chip" draggable="true" data-index="${index}" title="Seret untuk ubah urutan">
         <span class="admin-chip-handle" aria-hidden="true"><i class="fa-solid fa-grip-vertical"></i></span>
         <img src="${esc(url)}" alt="">
         <button type="button" data-remove="${index}">✕</button>
       </div>`).join("");
     wrap.querySelectorAll("[data-remove]").forEach((btn) => btn.addEventListener("click", () => {
       galeriImages.splice(Number(btn.dataset.remove), 1);
       renderGaleriChips();
     }));
     wireDragReorder(wrap, ".admin-image-chip", (fromIndex, toIndex) => {
       galeriImages = reorderArray(galeriImages, fromIndex, toIndex);
       renderGaleriChips();
     });
   }
   
   function resetGaleriForm() {
     galeriEditingId = null;
     galeriImages = [];
     $("galeri-form").reset();
     renderGaleriChips();
     $("galeri-form-title").textContent = "Item galeri baru";
     $("galeri-delete-btn").hidden = true;
     renderGaleriList();
   }
   
   function editGaleri(id) {
     const item = galeriList.find((g) => g.id === id);
     if (!item) return;
     galeriEditingId = id;
     galeriImages = [...item.images];
     $("galeri-title").value = item.title;
     $("galeri-category").value = item.category;
     $("galeri-size").value = item.size || "";
     $("galeri-description").value = item.description || "";
     renderGaleriChips();
     $("galeri-form-title").textContent = "Ubah item galeri";
     $("galeri-delete-btn").hidden = false;
     renderGaleriList();
   }
   
   function wireGaleriForm() {
     $("galeri-new-btn").addEventListener("click", resetGaleriForm);
     $("galeri-cancel-btn").addEventListener("click", resetGaleriForm);
   
     $("galeri-image-file").addEventListener("change", async (event) => {
       const files = [...event.target.files];
       if (files.length === 0) return;
       const host = $("galeri-image-chips");
       event.target.disabled = true;
   
       for (let i = 0; i < files.length; i++) {
         setUploadState(host, true, `Mengunggah foto ${i + 1} dari ${files.length}...`);
         try {
           const url = await uploadToStorage(files[i], "gallery");
           galeriImages.push(url);
         } catch (err) {
           setStatus($("galeri-status"), "Gagal unggah salah satu foto: " + err.message, true);
         }
         renderGaleriChips();
         setUploadState(host, true, `Mengunggah foto ${i + 1} dari ${files.length}...`);
       }
   
       setUploadState(host, false);
       event.target.disabled = false;
       event.target.value = "";
     });
   
     $("galeri-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       if (galeriImages.length === 0) { setStatus($("galeri-status"), "Tambahkan minimal satu foto.", true); return; }
   
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan item...");
       try {
         const itemPayload = {
           title: $("galeri-title").value.trim(),
           category: $("galeri-category").value,
           size: $("galeri-size").value,
           description: $("galeri-description").value.trim(),
           sort_order: galeriEditingId ? (galeriList.find((g) => g.id === galeriEditingId)?.sort_order ?? 0) : galeriList.length
         };
   
         let itemId = galeriEditingId;
         let oldImageRows = [];
         if (itemId) {
           const { error } = await supabaseClient.from("gallery_items").update(itemPayload).eq("id", itemId);
           if (error) { setStatus($("galeri-status"), "Gagal menyimpan: " + error.message, true); return; }
           // Simpan daftar foto lama dulu sebagai jaring pengaman,
           // baru hapus — kalau insert daftar baru gagal, foto lama
           // dipulihkan sehingga item tidak kehilangan semua fotonya.
           const { data: oldRows } = await supabaseClient
             .from("gallery_images").select("*").eq("gallery_item_id", itemId).order("sort_order");
           oldImageRows = oldRows || [];
           await supabaseClient.from("gallery_images").delete().eq("gallery_item_id", itemId);
         } else {
           const { data, error } = await supabaseClient.from("gallery_items").insert(itemPayload).select().single();
           if (error) { setStatus($("galeri-status"), "Gagal menyimpan: " + error.message, true); return; }
           itemId = data.id;
         }
   
         const imageRows = galeriImages.map((url, index) => ({ gallery_item_id: itemId, image_url: url, sort_order: index }));
         const { error: imgError } = await supabaseClient.from("gallery_images").insert(imageRows);
         if (imgError) {
           if (oldImageRows.length) await supabaseClient.from("gallery_images").insert(oldImageRows);
           setStatus($("galeri-status"), "Item tersimpan, tapi foto gagal disimpan — foto lama dipulihkan: " + imgError.message, true);
           return;
         }
   
         setStatus($("galeri-status"), "Item galeri tersimpan.");
         await loadGaleri();
         resetGaleriForm();
       } finally {
         setBusy(submitBtn, false);
       }
     });
   
     $("galeri-delete-btn").addEventListener("click", async () => {
       if (!galeriEditingId || !confirmDelete("Hapus item galeri ini beserta semua fotonya?")) return;
       const btn = $("galeri-delete-btn");
       setBusy(btn, true, "Menghapus...");
       try {
         const { error } = await supabaseClient.from("gallery_items").delete().eq("id", galeriEditingId);
         if (error) { setStatus($("galeri-status"), "Gagal menghapus: " + error.message, true); return; }
         await loadGaleri();
         resetGaleriForm();
       } finally {
         setBusy(btn, false);
       }
     });
   }
   
   /* =========================================================
      3. STRUKTUR PEMERINTAHAN
      ========================================================= */
   let strukturList = [];
   let strukturEditingId = null;
   
   async function loadStruktur() {
     const { data, error } = await supabaseClient.from("struktur_desa").select("*").order("sort_order");
     if (error) { console.error(error); return; }
     strukturList = data;
     renderStrukturList();
   }
   
   function renderStrukturList() {
     const wrap = $("struktur-list");
     if (strukturList.length === 0) { wrap.innerHTML = `<p class="admin-empty"><i class="fa-solid fa-sitemap" aria-hidden="true"></i>Belum ada perangkat desa yang tercatat.</p>`; return; }
     wrap.innerHTML = strukturList.map((item) => `
       <div class="admin-row ${item.id === strukturEditingId ? "is-active" : ""}">
         <div class="admin-row-main"><strong>${esc(item.nama)}</strong><span>${esc(item.jabatan)}</span></div>
         <div class="admin-row-actions">
           <button class="button" type="button" data-edit="${item.id}">Ubah</button>
         </div>
       </div>`).join("");
     wrap.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editStruktur(btn.dataset.edit)));
     staggerRows(wrap);
   }
   
   function resetStrukturForm() {
     strukturEditingId = null;
     $("struktur-form").reset();
     $("struktur-sort").value = strukturList.length;
     $("struktur-foto-url").value = "";
     $("struktur-foto-preview").innerHTML = "";
     $("struktur-form-title").textContent = "Perangkat baru";
     $("struktur-delete-btn").hidden = true;
     renderStrukturList();
   }
   
   function editStruktur(id) {
     const item = strukturList.find((s) => s.id === id);
     if (!item) return;
     strukturEditingId = id;
     $("struktur-nama").value = item.nama;
     $("struktur-jabatan").value = item.jabatan;
     $("struktur-sort").value = item.sort_order;
     $("struktur-foto-url").value = item.foto_url || "";
     $("struktur-foto-preview").innerHTML = item.foto_url ? `<img src="${esc(item.foto_url)}" alt="">` : "";
     $("struktur-form-title").textContent = "Ubah perangkat";
     $("struktur-delete-btn").hidden = false;
     renderStrukturList();
   }
   
   function wireStrukturForm() {
     $("struktur-new-btn").addEventListener("click", resetStrukturForm);
     $("struktur-cancel-btn").addEventListener("click", resetStrukturForm);
   
     $("struktur-foto-file").addEventListener("change", async (event) => {
       const file = event.target.files[0];
       if (!file) return;
       const preview = $("struktur-foto-preview");
       preview.innerHTML = "";
       setUploadState(preview, true, "Mengunggah foto...");
       try {
         const url = await uploadToStorage(file, "struktur");
         $("struktur-foto-url").value = url;
         preview.innerHTML = `<img src="${esc(url)}" alt="">`;
       } catch (err) {
         setStatus($("struktur-status"), "Gagal unggah foto: " + err.message, true);
         preview.innerHTML = "";
       } finally {
         setUploadState(preview, false);
         event.target.value = "";
       }
     });
   
     $("struktur-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan...");
       try {
         const payload = {
           nama: $("struktur-nama").value.trim(),
           jabatan: $("struktur-jabatan").value.trim(),
           sort_order: Number($("struktur-sort").value) || 0,
           foto_url: $("struktur-foto-url").value || null
         };
         const query = strukturEditingId
           ? supabaseClient.from("struktur_desa").update(payload).eq("id", strukturEditingId)
           : supabaseClient.from("struktur_desa").insert(payload);
         const { error } = await query;
         if (error) { setStatus($("struktur-status"), "Gagal menyimpan: " + error.message, true); return; }
         setStatus($("struktur-status"), "Data tersimpan.");
         await loadStruktur();
         resetStrukturForm();
       } finally {
         setBusy(submitBtn, false);
       }
     });
   
     $("struktur-delete-btn").addEventListener("click", async () => {
       if (!strukturEditingId || !confirmDelete("Hapus perangkat desa ini?")) return;
       const btn = $("struktur-delete-btn");
       setBusy(btn, true, "Menghapus...");
       try {
         const { error } = await supabaseClient.from("struktur_desa").delete().eq("id", strukturEditingId);
         if (error) { setStatus($("struktur-status"), "Gagal menghapus: " + error.message, true); return; }
         await loadStruktur();
         resetStrukturForm();
       } finally {
         setBusy(btn, false);
       }
     });
   }
   
   /* =========================================================
      3b. POTENSI DESA
      ========================================================= */
   let potensiList = [];
   let potensiEditingId = null;

   async function loadPotensi() {
     const { data, error } = await supabaseClient.from("potensi_desa").select("*").order("sort_order");
     if (error) { console.error(error); return; }
     potensiList = data;
     renderPotensiList();
   }

   function renderPotensiList() {
     const wrap = $("potensi-list");
     if (potensiList.length === 0) { wrap.innerHTML = `<p class="admin-empty"><i class="fa-solid fa-mountain-sun" aria-hidden="true"></i>Belum ada potensi desa yang ditambahkan.</p>`; return; }
     wrap.innerHTML = potensiList.map((item) => `
       <div class="admin-row ${item.id === potensiEditingId ? "is-active" : ""}">
         <div class="admin-row-main"><strong>${esc(item.title)}</strong><span>${esc((item.description || "").slice(0, 60))}${(item.description || "").length > 60 ? "…" : ""}</span></div>
         <div class="admin-row-actions">
           <button class="button" type="button" data-edit="${item.id}">Ubah</button>
         </div>
       </div>`).join("");
     wrap.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editPotensi(btn.dataset.edit)));
     staggerRows(wrap);
   }

   function resetPotensiForm() {
     potensiEditingId = null;
     $("potensi-form").reset();
     $("potensi-sort").value = potensiList.length;
     $("potensi-foto-url").value = "";
     $("potensi-foto-preview").innerHTML = "";
     $("potensi-form-title").textContent = "Potensi baru";
     $("potensi-delete-btn").hidden = true;
     renderPotensiList();
   }

   function editPotensi(id) {
     const item = potensiList.find((p) => p.id === id);
     if (!item) return;
     potensiEditingId = id;
     $("potensi-title").value = item.title;
     $("potensi-sort").value = item.sort_order;
     $("potensi-description").value = item.description || "";
     $("potensi-foto-url").value = item.image_url || "";
     $("potensi-foto-preview").innerHTML = item.image_url ? `<img src="${esc(item.image_url)}" alt="">` : "";
     $("potensi-form-title").textContent = "Ubah potensi";
     $("potensi-delete-btn").hidden = false;
     renderPotensiList();
   }

   function wirePotensiForm() {
     $("potensi-new-btn").addEventListener("click", resetPotensiForm);
     $("potensi-cancel-btn").addEventListener("click", resetPotensiForm);

     $("potensi-foto-file").addEventListener("change", async (event) => {
       const file = event.target.files[0];
       if (!file) return;
       const preview = $("potensi-foto-preview");
       preview.innerHTML = "";
       setUploadState(preview, true, "Mengunggah foto...");
       try {
         const url = await uploadToStorage(file, "potensi");
         $("potensi-foto-url").value = url;
         preview.innerHTML = `<img src="${esc(url)}" alt="">`;
       } catch (err) {
         setStatus($("potensi-status"), "Gagal unggah foto: " + err.message, true);
         preview.innerHTML = "";
       } finally {
         setUploadState(preview, false);
         event.target.value = "";
       }
     });

     $("potensi-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan...");
       try {
         const payload = {
           title: $("potensi-title").value.trim(),
           description: $("potensi-description").value.trim(),
           sort_order: Number($("potensi-sort").value) || 0,
           image_url: $("potensi-foto-url").value || null
         };
         const query = potensiEditingId
           ? supabaseClient.from("potensi_desa").update(payload).eq("id", potensiEditingId)
           : supabaseClient.from("potensi_desa").insert(payload);
         const { error } = await query;
         if (error) { setStatus($("potensi-status"), "Gagal menyimpan: " + error.message, true); return; }
         setStatus($("potensi-status"), "Potensi desa tersimpan.");
         await loadPotensi();
         resetPotensiForm();
       } finally {
         setBusy(submitBtn, false);
       }
     });

     $("potensi-delete-btn").addEventListener("click", async () => {
       if (!potensiEditingId || !confirmDelete("Hapus potensi desa ini?")) return;
       const btn = $("potensi-delete-btn");
       setBusy(btn, true, "Menghapus...");
       try {
         const { error } = await supabaseClient.from("potensi_desa").delete().eq("id", potensiEditingId);
         if (error) { setStatus($("potensi-status"), "Gagal menghapus: " + error.message, true); return; }
         await loadPotensi();
         resetPotensiForm();
       } finally {
         setBusy(btn, false);
       }
     });
   }

   /* =========================================================
      3b. PROFIL DESA (singleton, id = 1)
      ========================================================= */
   async function loadProfil() {
     const { data, error } = await supabaseClient.from("profil_desa").select("*").eq("id", 1).single();
     if (error) { console.error(error); return; }
     if (!data) return;
     $("profil-f-wilayah").value = data.wilayah || "";
     $("profil-f-provinsi").value = data.provinsi || "";
     $("profil-f-kecamatan").value = data.kecamatan || "";
     $("profil-f-kodepos").value = data.kode_pos || "";
     $("profil-f-lead").value = data.lead_copy || "";
     $("profil-f-sejarah").value = data.sejarah || "";
     $("profil-f-visi").value = data.visi || "";
     $("profil-f-misi").value = data.misi || "";
   }

   function wireProfilForm() {
     $("profil-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan...");
       try {
         const payload = {
           wilayah: $("profil-f-wilayah").value.trim(),
           provinsi: $("profil-f-provinsi").value.trim(),
           kecamatan: $("profil-f-kecamatan").value.trim(),
           kode_pos: $("profil-f-kodepos").value.trim(),
           lead_copy: $("profil-f-lead").value.trim(),
           sejarah: $("profil-f-sejarah").value.trim(),
           visi: $("profil-f-visi").value.trim(),
           misi: $("profil-f-misi").value.trim(),
           updated_at: new Date().toISOString()
         };
         const { error } = await supabaseClient.from("profil_desa").update(payload).eq("id", 1);
         if (error) { setStatus($("profil-status"), "Gagal menyimpan: " + error.message, true); return; }
         setStatus($("profil-status"), "Profil desa tersimpan.");
       } finally {
         setBusy(submitBtn, false);
       }
     });
   }

   /* =========================================================
      3c. KONTAK & LOKASI (singleton, id = 1)
      ========================================================= */
   async function loadKontak() {
     const { data, error } = await supabaseClient.from("kontak_desa").select("*").eq("id", 1).single();
     if (error) { console.error(error); return; }
     if (!data) return;
     $("kontak-f-alamat").value = data.alamat || "";
     $("kontak-f-alamat-detail").value = data.alamat_detail || "";
     $("kontak-f-telepon").value = data.telepon || "";
     $("kontak-f-jam").value = data.jam_pelayanan || "";
     $("kontak-f-lat").value = data.maps_lat ?? "";
     $("kontak-f-lng").value = data.maps_lng ?? "";
     $("kontak-f-zoom").value = data.maps_zoom || 16;
   }

   function wireKontakForm() {
     $("kontak-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan...");
       try {
         const lat = $("kontak-f-lat").value.trim();
         const lng = $("kontak-f-lng").value.trim();
         const payload = {
           alamat: $("kontak-f-alamat").value.trim(),
           alamat_detail: $("kontak-f-alamat-detail").value.trim(),
           telepon: $("kontak-f-telepon").value.trim(),
           jam_pelayanan: $("kontak-f-jam").value.trim(),
           maps_lat: lat === "" ? null : Number(lat),
           maps_lng: lng === "" ? null : Number(lng),
           maps_zoom: Number($("kontak-f-zoom").value) || 16,
           updated_at: new Date().toISOString()
         };
         const { error } = await supabaseClient.from("kontak_desa").update(payload).eq("id", 1);
         if (error) { setStatus($("kontak-status"), "Gagal menyimpan: " + error.message, true); return; }
         setStatus($("kontak-status"), "Kontak & lokasi tersimpan.");
       } finally {
         setBusy(submitBtn, false);
       }
     });
   }

   /* =========================================================
      4. STATISTIK & DUSUN
      ========================================================= */
   async function loadStatistik() {
     const [{ data: fisik, error: fisikError }, { data: rekapRows, error: rekapError }] = await Promise.all([
       supabaseClient.from("statistik_desa").select("*").eq("id", 1).single(),
       supabaseClient.rpc("get_statistik_penduduk")
     ]);
     if (fisikError) console.error(fisikError);
     if (rekapError) console.error(rekapError);
   
     if (fisik) {
       $("stat-luas").value = fisik.luas_wilayah;
       $("stat-satuan").value = fisik.luas_satuan;
     }
   
     const rekap = rekapRows?.[0] || { total_penduduk: 0, jumlah_kk: 0, laki_laki: 0, perempuan: 0 };
     $("statistik-readout").innerHTML = `
       <div><strong>${Number(rekap.total_penduduk).toLocaleString("id-ID")}</strong><span>Total penduduk</span></div>
       <div><strong>${Number(rekap.jumlah_kk).toLocaleString("id-ID")}</strong><span>Jumlah KK</span></div>
       <div><strong>${Number(rekap.laki_laki).toLocaleString("id-ID")}</strong><span>Laki-laki</span></div>
       <div><strong>${Number(rekap.perempuan).toLocaleString("id-ID")}</strong><span>Perempuan</span></div>`;
   }
   
   function wireStatistikForm() {
     $("statistik-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan...");
       try {
         const payload = {
           luas_wilayah: Number($("stat-luas").value) || 0,
           luas_satuan: $("stat-satuan").value.trim(),
           updated_at: new Date().toISOString()
         };
         const { error } = await supabaseClient.from("statistik_desa").update(payload).eq("id", 1);
         if (error) { setStatus($("statistik-status"), "Gagal menyimpan: " + error.message, true); return; }
         setStatus($("statistik-status"), "Luas wilayah tersimpan.");
       } finally {
         setBusy(submitBtn, false);
       }
     });
   }
   
   let dusunList = [];
   let dusunEditingId = null;
   
   async function loadDusun() {
     const [{ data, error }, { data: rekap, error: rekapError }] = await Promise.all([
       supabaseClient.from("dusun").select("*").order("sort_order"),
       supabaseClient.rpc("get_statistik_dusun")
     ]);
     if (error) { console.error(error); return; }
     if (rekapError) console.error(rekapError);
     const jumlahMap = new Map((rekap || []).map((r) => [r.dusun_id, Number(r.jumlah_penduduk) || 0]));
     dusunList = data.map((row) => ({ ...row, jumlahPenduduk: jumlahMap.get(row.id) || 0 }));
     populateDusunSelect();
     renderDusunList();
   }
   
   function renderDusunList() {
     const wrap = $("dusun-list");
     if (dusunList.length === 0) { wrap.innerHTML = `<p class="admin-empty"><i class="fa-solid fa-map-location-dot" aria-hidden="true"></i>Belum ada dusun yang ditambahkan.</p>`; return; }
     wrap.innerHTML = dusunList.map((item) => `
       <div class="admin-row ${item.id === dusunEditingId ? "is-active" : ""}">
         <div class="admin-row-main"><strong>${esc(item.nama)}</strong><span>${item.jumlahPenduduk.toLocaleString("id-ID")} jiwa</span></div>
         <div class="admin-row-actions">
           <button class="button" type="button" data-edit="${item.id}">Ubah</button>
         </div>
       </div>`).join("");
     wrap.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editDusun(btn.dataset.edit)));
     staggerRows(wrap);
   }
   
   function resetDusunForm() {
     dusunEditingId = null;
     $("dusun-form").reset();
     $("dusun-sort").value = dusunList.length;
     $("dusun-form-title").textContent = "Dusun baru";
     $("dusun-delete-btn").hidden = true;
   }
   
   function editDusun(id) {
     const item = dusunList.find((d) => d.id === id);
     if (!item) return;
     dusunEditingId = id;
     $("dusun-form").hidden = false;
     $("dusun-nama").value = item.nama;
     $("dusun-sort").value = item.sort_order;
     $("dusun-form-title").textContent = "Ubah dusun";
     $("dusun-delete-btn").hidden = false;
     renderDusunList();
   }
   
   function wireDusunForm() {
     $("dusun-new-btn").addEventListener("click", () => {
       resetDusunForm();
       $("dusun-form").hidden = false;
       renderDusunList();
     });
     $("dusun-cancel-btn").addEventListener("click", () => {
       resetDusunForm();
       $("dusun-form").hidden = true;
       renderDusunList();
     });
   
     $("dusun-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan...");
       try {
         const payload = {
           nama: $("dusun-nama").value.trim(),
           sort_order: Number($("dusun-sort").value) || 0
         };
         const query = dusunEditingId
           ? supabaseClient.from("dusun").update(payload).eq("id", dusunEditingId)
           : supabaseClient.from("dusun").insert(payload);
         const { error } = await query;
         if (error) { setStatus($("dusun-status"), "Gagal menyimpan: " + error.message, true); return; }
         setStatus($("dusun-status"), "Dusun tersimpan.");
         await loadDusun();
         resetDusunForm();
         $("dusun-form").hidden = true;
       } finally {
         setBusy(submitBtn, false);
       }
     });
   
     $("dusun-delete-btn").addEventListener("click", async () => {
       if (!dusunEditingId || !confirmDelete("Hapus dusun ini? KK yang terdaftar di dusun ini tidak akan terhapus, tapi jadi tidak terhubung ke dusun mana pun.")) return;
       const btn = $("dusun-delete-btn");
       setBusy(btn, true, "Menghapus...");
       try {
         const { error } = await supabaseClient.from("dusun").delete().eq("id", dusunEditingId);
         if (error) { setStatus($("dusun-status"), "Gagal menghapus: " + error.message, true); return; }
         await loadDusun();
         resetDusunForm();
         $("dusun-form").hidden = true;
       } finally {
         setBusy(btn, false);
       }
     });
   }
   
   /* =========================================================
      5. DATA PENDUDUK (KK & ANGGOTA KELUARGA)
      Data pribadi warga — hanya bisa diakses lewat admin panel
      ini (RLS di database menolak akses publik sama sekali).
      ========================================================= */
   let keluargaList = [];
   let keluargaEditingId = null;
   let anggotaList = [];
   let anggotaEditingId = null;
   let keluargaSearchTerm = "";
   
   function populateDusunSelect() {
     const select = $("keluarga-dusun");
     const current = select.value;
     select.innerHTML = `<option value="">— Belum ditentukan —</option>` +
       dusunList.map((d) => `<option value="${d.id}">${esc(d.nama)}</option>`).join("");
     if (current) select.value = current;
   }
   
   async function loadKeluarga() {
     const { data, error } = await supabaseClient
       .from("keluarga")
       .select("*, penduduk(id)")
       .order("created_at", { ascending: false });
     if (error) { console.error(error); return; }
     keluargaList = data.map((row) => ({ ...row, jumlahAnggota: (row.penduduk || []).length }));
     renderKeluargaList();
   }
   
   function renderKeluargaList() {
     const wrap = $("keluarga-list");
     const term = keluargaSearchTerm.trim().toLowerCase();
     const filtered = term
       ? keluargaList.filter((k) => k.no_kk.toLowerCase().includes(term) || k.kepala_keluarga.toLowerCase().includes(term))
       : keluargaList;
   
     if (filtered.length === 0) { wrap.innerHTML = `<p class="admin-empty"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>${term ? "Tidak ada KK yang cocok dengan pencarian." : "Belum ada KK terdaftar — tambahkan yang pertama."}</p>`; return; }
     wrap.innerHTML = filtered.map((item) => {
       const dusunNama = dusunList.find((d) => d.id === item.dusun_id)?.nama || "Belum ditentukan";
       return `
       <div class="admin-row ${item.id === keluargaEditingId ? "is-active" : ""}">
         <div class="admin-row-main"><strong>${esc(item.kepala_keluarga)}</strong><span>KK ${esc(item.no_kk)} · ${esc(dusunNama)} · ${item.jumlahAnggota} anggota</span></div>
         <div class="admin-row-actions">
           <button class="button" type="button" data-edit="${item.id}">Buka</button>
         </div>
       </div>`;
     }).join("");
     wrap.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editKeluarga(btn.dataset.edit)));
     staggerRows(wrap);
   }
   
   function resetKeluargaForm() {
     keluargaEditingId = null;
     $("keluarga-form").reset();
     $("keluarga-form-title").textContent = "KK baru";
     $("keluarga-delete-btn").hidden = true;
     $("anggota-section").hidden = true;
     renderKeluargaList();
   }
   
   async function editKeluarga(id) {
     const item = keluargaList.find((k) => k.id === id);
     if (!item) return;
     keluargaEditingId = id;
     $("keluarga-no-kk").value = item.no_kk;
     $("keluarga-kepala").value = item.kepala_keluarga;
     $("keluarga-dusun").value = item.dusun_id || "";
     $("keluarga-alamat").value = item.alamat || "";
     $("keluarga-form-title").textContent = `Ubah KK — ${item.kepala_keluarga}`;
     $("keluarga-delete-btn").hidden = false;
     $("anggota-section").hidden = false;
     renderKeluargaList();
     await loadAnggota(id);
     resetAnggotaForm();
   }
   
   function wireKeluargaForm() {
     $("keluarga-new-btn").addEventListener("click", resetKeluargaForm);
     $("keluarga-cancel-btn").addEventListener("click", resetKeluargaForm);
     $("keluarga-search").addEventListener("input", (event) => {
       keluargaSearchTerm = event.target.value;
       renderKeluargaList();
     });
   
     $("keluarga-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan KK...");
       try {
         const payload = {
           no_kk: $("keluarga-no-kk").value.replace(/\D/g, ""),
           kepala_keluarga: $("keluarga-kepala").value.trim(),
           dusun_id: $("keluarga-dusun").value || null,
           alamat: $("keluarga-alamat").value.trim()
         };
         const query = keluargaEditingId
           ? supabaseClient.from("keluarga").update(payload).eq("id", keluargaEditingId)
           : supabaseClient.from("keluarga").insert(payload).select().single();
   
         const { data, error } = await query;
         if (error) { setStatus($("keluarga-status"), "Gagal menyimpan: " + error.message, true); return; }
         setStatus($("keluarga-status"), "Data KK tersimpan.");
         await loadKeluarga();
         await loadDusun(); // supaya jumlah penduduk per dusun ikut ter-update di tab Statistik
   
         if (!keluargaEditingId) {
           // Setelah KK baru dibuat, langsung buka form tambah anggota untuknya.
           await editKeluarga(data.id);
         }
       } finally {
         setBusy(submitBtn, false);
       }
     });
   
     $("keluarga-delete-btn").addEventListener("click", async () => {
       if (!keluargaEditingId || !confirmDelete("Hapus KK ini beserta semua data anggotanya? Tindakan ini tidak bisa dibatalkan.")) return;
       const btn = $("keluarga-delete-btn");
       setBusy(btn, true, "Menghapus...");
       try {
         const { error } = await supabaseClient.from("keluarga").delete().eq("id", keluargaEditingId);
         if (error) { setStatus($("keluarga-status"), "Gagal menghapus: " + error.message, true); return; }
         await loadKeluarga();
         await loadDusun();
         resetKeluargaForm();
       } finally {
         setBusy(btn, false);
       }
     });
   }
   
   async function loadAnggota(keluargaId) {
     const { data, error } = await supabaseClient.from("penduduk").select("*").eq("keluarga_id", keluargaId).order("created_at");
     if (error) { console.error(error); return; }
     anggotaList = data;
     renderAnggotaList();
   }
   
   function renderAnggotaList() {
     const wrap = $("anggota-list");
     if (anggotaList.length === 0) { wrap.innerHTML = `<p class="admin-empty"><i class="fa-solid fa-user-plus" aria-hidden="true"></i>Belum ada anggota tercatat untuk KK ini.</p>`; return; }
     wrap.innerHTML = anggotaList.map((item) => `
       <div class="admin-row ${item.id === anggotaEditingId ? "is-active" : ""}">
         <div class="admin-row-main"><strong>${esc(item.nama)}</strong><span>${item.jenis_kelamin === "L" ? "Laki-laki" : "Perempuan"} · ${esc(item.status_hubungan || "-")}</span></div>
         <div class="admin-row-actions">
           <button class="button" type="button" data-edit="${item.id}">Ubah</button>
         </div>
       </div>`).join("");
     wrap.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editAnggota(btn.dataset.edit)));
     staggerRows(wrap);
   }
   
   function resetAnggotaForm() {
     anggotaEditingId = null;
     $("anggota-form").reset();
     $("anggota-form-title").textContent = "Tambah anggota";
     $("anggota-delete-btn").hidden = true;
   }
   
   function editAnggota(id) {
     const item = anggotaList.find((a) => a.id === id);
     if (!item) return;
     anggotaEditingId = id;
     $("anggota-nama").value = item.nama;
     $("anggota-nik").value = item.nik || "";
     $("anggota-jk").value = item.jenis_kelamin;
     $("anggota-tgl-lahir").value = item.tanggal_lahir || "";
     $("anggota-status").value = item.status_hubungan || "Anak";
     $("anggota-pekerjaan").value = item.pekerjaan || "";
     $("anggota-tempat-lahir").value = item.tempat_lahir || "";
     $("anggota-status-kawin").value = item.status_perkawinan || "";
     $("anggota-agama").value = item.agama || "";
     $("anggota-gol-darah").value = item.gol_darah || "";
     $("anggota-negara").value = item.negara || "";
     $("anggota-pendidikan").value = item.pendidikan || "";
     $("anggota-form-title").textContent = "Ubah anggota";
     $("anggota-delete-btn").hidden = false;
     renderAnggotaList();
   }
   
   function wireAnggotaForm() {
     $("anggota-cancel-btn").addEventListener("click", resetAnggotaForm);
   
     $("anggota-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       if (!keluargaEditingId) { setStatus($("anggota-status"), "Simpan data KK dahulu.", true); return; }
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan anggota...");
       try {
         const payload = {
           keluarga_id: keluargaEditingId,
           nama: $("anggota-nama").value.trim(),
           nik: $("anggota-nik").value.trim() || null,
           jenis_kelamin: $("anggota-jk").value,
           tanggal_lahir: $("anggota-tgl-lahir").value || null,
           status_hubungan: $("anggota-status").value,
           pekerjaan: $("anggota-pekerjaan").value.trim() || null,
           tempat_lahir: $("anggota-tempat-lahir").value.trim() || null,
           status_perkawinan: $("anggota-status-kawin").value.trim() || null,
           agama: $("anggota-agama").value.trim() || null,
           gol_darah: $("anggota-gol-darah").value.trim() || null,
           negara: $("anggota-negara").value.trim() || null,
           pendidikan: $("anggota-pendidikan").value.trim() || null
         };
         const query = anggotaEditingId
           ? supabaseClient.from("penduduk").update(payload).eq("id", anggotaEditingId)
           : supabaseClient.from("penduduk").insert(payload);
         const { error } = await query;
         if (error) { setStatus($("anggota-status"), "Gagal menyimpan: " + error.message, true); return; }
         setStatus($("anggota-status"), "Anggota tersimpan.");
         await loadAnggota(keluargaEditingId);
         await loadKeluarga();
         await loadDusun();
         resetAnggotaForm();
       } finally {
         setBusy(submitBtn, false);
       }
     });
   
     $("anggota-delete-btn").addEventListener("click", async () => {
       if (!anggotaEditingId || !confirmDelete("Hapus anggota keluarga ini?")) return;
       const btn = $("anggota-delete-btn");
       setBusy(btn, true, "Menghapus...");
       try {
         const { error } = await supabaseClient.from("penduduk").delete().eq("id", anggotaEditingId);
         if (error) { setStatus($("anggota-status"), "Gagal menghapus: " + error.message, true); return; }
         await loadAnggota(keluargaEditingId);
         await loadKeluarga();
         await loadDusun();
         resetAnggotaForm();
       } finally {
         setBusy(btn, false);
       }
     });
   }
   
   /* =========================================================
      6. ANGGARAN
      ========================================================= */
   let anggaranList = [];
   let anggaranEditingId = null;
   
   function addBudgetRow(containerId, label = "", nilai = "") {
     const template = $("budget-row-template");
     const clone = template.content.cloneNode(true);
     clone.querySelector(".budget-row-label").value = label;
     const nilaiInput = clone.querySelector(".budget-row-nilai");
     nilaiInput.value = nilai ? formatRibuan(nilai) : "";
     wireRupiahInput(nilaiInput);
     clone.querySelector(".admin-row-remove").addEventListener("click", (event) => {
       event.target.closest(".admin-budget-row").remove();
     });
     $(containerId).appendChild(clone);
   }
   
   function readBudgetRows(containerId) {
     return [...$(containerId).querySelectorAll(".admin-budget-row")].map((row) => ({
       label: row.querySelector(".budget-row-label").value.trim(),
       nilai: parseRibuan(row.querySelector(".budget-row-nilai").value)
     })).filter((row) => row.label);
   }
   
   async function loadAnggaran() {
     const { data, error } = await supabaseClient
       .from("anggaran_tahun")
       .select("*, anggaran_item(*)")
       .order("tahun", { ascending: false });
     if (error) { console.error(error); return; }
     anggaranList = data.map((row) => {
       const items = (row.anggaran_item || []).slice().sort((a, b) => a.sort_order - b.sort_order);
       return {
         ...row,
         pendapatan: items.filter((i) => i.jenis === "pendapatan"),
         belanja: items.filter((i) => i.jenis === "belanja")
       };
     });
     renderAnggaranList();
   }
   
   function renderAnggaranList() {
     const wrap = $("anggaran-list");
     if (anggaranList.length === 0) { wrap.innerHTML = `<p class="admin-empty"><i class="fa-solid fa-coins" aria-hidden="true"></i>Belum ada tahun anggaran — tambahkan yang pertama.</p>`; return; }
     wrap.innerHTML = anggaranList.map((item) => `
       <div class="admin-row ${item.id === anggaranEditingId ? "is-active" : ""}">
         <div class="admin-row-main"><strong>Anggaran ${esc(item.tahun)}</strong><span>${item.pendapatan.length} pendapatan · ${item.belanja.length} belanja</span></div>
         <div class="admin-row-actions">
           <button class="button" type="button" data-edit="${item.id}">Ubah</button>
         </div>
       </div>`).join("");
     wrap.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editAnggaran(btn.dataset.edit)));
     staggerRows(wrap);
   }
   
   function resetAnggaranForm() {
     anggaranEditingId = null;
     $("anggaran-form").reset();
     $("anggaran-dokumen-url").value = "";
     $("anggaran-pendapatan-rows").innerHTML = "";
     $("anggaran-belanja-rows").innerHTML = "";
     addBudgetRow("anggaran-pendapatan-rows");
     addBudgetRow("anggaran-belanja-rows");
     $("anggaran-form-title").textContent = "Tahun anggaran baru";
     $("anggaran-delete-btn").hidden = true;
     renderAnggaranList();
   }
   
   function editAnggaran(id) {
     const item = anggaranList.find((a) => a.id === id);
     if (!item) return;
     anggaranEditingId = id;
     $("anggaran-tahun").value = item.tahun;
     $("anggaran-dokumen-nama").value = item.dokumen_nama || "";
     $("anggaran-dokumen-url").value = item.dokumen_url || "";
     $("anggaran-dokumen-ukuran").value = item.dokumen_ukuran || "";
   
     $("anggaran-pendapatan-rows").innerHTML = "";
     $("anggaran-belanja-rows").innerHTML = "";
     (item.pendapatan.length ? item.pendapatan : [{ label: "", nilai: "" }]).forEach((row) => addBudgetRow("anggaran-pendapatan-rows", row.label, row.nilai));
     (item.belanja.length ? item.belanja : [{ label: "", nilai: "" }]).forEach((row) => addBudgetRow("anggaran-belanja-rows", row.label, row.nilai));
   
     $("anggaran-form-title").textContent = `Ubah anggaran ${item.tahun}`;
     $("anggaran-delete-btn").hidden = false;
     renderAnggaranList();
   }
   
   function wireAnggaranForm() {
     addBudgetRow("anggaran-pendapatan-rows");
     addBudgetRow("anggaran-belanja-rows");
   
     $("anggaran-new-btn").addEventListener("click", resetAnggaranForm);
     $("anggaran-cancel-btn").addEventListener("click", resetAnggaranForm);
     $("anggaran-pendapatan-add").addEventListener("click", () => addBudgetRow("anggaran-pendapatan-rows"));
     $("anggaran-belanja-add").addEventListener("click", () => addBudgetRow("anggaran-belanja-rows"));
   
     $("anggaran-dokumen-file").addEventListener("change", async (event) => {
       const file = event.target.files[0];
       if (!file) return;
       const host = event.target.closest(".admin-field");
       setUploadState(host, true, "Mengunggah PDF...");
       try {
         const url = await uploadToStorage(file, "dokumen");
         $("anggaran-dokumen-url").value = url;
         if (!$("anggaran-dokumen-nama").value) $("anggaran-dokumen-nama").value = file.name;
         if (!$("anggaran-dokumen-ukuran").value) $("anggaran-dokumen-ukuran").value = `${(file.size / 1024 / 1024).toFixed(2)} MB · Dokumen Resmi`;
         setStatus($("anggaran-status"), "Dokumen terunggah.");
       } catch (err) {
         setStatus($("anggaran-status"), "Gagal unggah dokumen: " + err.message, true);
       } finally {
         setUploadState(host, false);
         event.target.value = "";
       }
     });
   
     $("anggaran-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan anggaran...");
       try {
         const tahunPayload = {
           tahun: $("anggaran-tahun").value.trim(),
           dokumen_nama: $("anggaran-dokumen-nama").value.trim() || null,
           dokumen_url: $("anggaran-dokumen-url").value || null,
           dokumen_ukuran: $("anggaran-dokumen-ukuran").value.trim() || null
         };
   
         let tahunId = anggaranEditingId;
         let oldItemRows = [];
         if (tahunId) {
           const { error } = await supabaseClient.from("anggaran_tahun").update(tahunPayload).eq("id", tahunId);
           if (error) { setStatus($("anggaran-status"), "Gagal menyimpan: " + error.message, true); return; }
           // Jaring pengaman: simpan rincian lama sebelum dihapus,
           // supaya bisa dipulihkan kalau insert rincian baru gagal.
           const { data: oldRows } = await supabaseClient
             .from("anggaran_item").select("*").eq("anggaran_tahun_id", tahunId).order("sort_order");
           oldItemRows = oldRows || [];
           await supabaseClient.from("anggaran_item").delete().eq("anggaran_tahun_id", tahunId);
         } else {
           const { data, error } = await supabaseClient.from("anggaran_tahun").insert(tahunPayload).select().single();
           if (error) { setStatus($("anggaran-status"), "Gagal menyimpan: " + error.message, true); return; }
           tahunId = data.id;
         }
   
         const pendapatanRows = readBudgetRows("anggaran-pendapatan-rows").map((row, index) => ({ anggaran_tahun_id: tahunId, jenis: "pendapatan", label: row.label, nilai: row.nilai, sort_order: index }));
         const belanjaRows = readBudgetRows("anggaran-belanja-rows").map((row, index) => ({ anggaran_tahun_id: tahunId, jenis: "belanja", label: row.label, nilai: row.nilai, sort_order: index }));
         const allRows = [...pendapatanRows, ...belanjaRows];
   
         if (allRows.length > 0) {
           const { error: itemError } = await supabaseClient.from("anggaran_item").insert(allRows);
           if (itemError) {
             if (oldItemRows.length) await supabaseClient.from("anggaran_item").insert(oldItemRows);
             setStatus($("anggaran-status"), "Tahun tersimpan, tapi rincian gagal disimpan — rincian lama dipulihkan: " + itemError.message, true);
             return;
           }
         }
   
         setStatus($("anggaran-status"), "Anggaran tersimpan.");
         await loadAnggaran();
         resetAnggaranForm();
       } finally {
         setBusy(submitBtn, false);
       }
     });
   
     $("anggaran-delete-btn").addEventListener("click", async () => {
       if (!anggaranEditingId || !confirmDelete("Hapus seluruh data anggaran tahun ini?")) return;
       const btn = $("anggaran-delete-btn");
       setBusy(btn, true, "Menghapus...");
       try {
         const { error } = await supabaseClient.from("anggaran_tahun").delete().eq("id", anggaranEditingId);
         if (error) { setStatus($("anggaran-status"), "Gagal menghapus: " + error.message, true); return; }
         await loadAnggaran();
         resetAnggaranForm();
       } finally {
         setBusy(btn, false);
       }
     });
   }

   /* =========================================================
      7. PENGADUAN — kritik / saran / pengaduan warga
      Masuk lewat RPC kirim_pengaduan() di situs publik;
      hanya bisa dibaca & dikelola dari panel ini.
      ========================================================= */
   let pengaduanList = [];
   let pengaduanFilter = "semua";
   let pengaduanSelectedId = null;

   async function loadPengaduan() {
     const { data, error } = await supabaseClient
       .from("pengaduan")
       .select("*")
       .order("created_at", { ascending: false });
     if (error) { console.error(error); return; }
     pengaduanList = data;
     renderPengaduanList();
   }

   const PENGADUAN_LABEL = { kritik: "Kritik", saran: "Saran", pengaduan: "Pengaduan" };
   const PENGADUAN_STATUS = { baru: "Baru", diproses: "Diproses", selesai: "Selesai" };

   function renderPengaduanList() {
     const wrap = $("pengaduan-list");
     if (!wrap) return;
     const filtered = pengaduanFilter === "semua"
       ? pengaduanList
       : pengaduanList.filter((p) => p.status === pengaduanFilter);
     if (filtered.length === 0) {
       wrap.innerHTML = `<p class="admin-empty"><i class="fa-solid fa-inbox" aria-hidden="true"></i>Tidak ada pesan pada filter ini.</p>`;
       return;
     }
     wrap.innerHTML = filtered.map((item) => `
       <div class="admin-row ${item.id === pengaduanSelectedId ? "is-active" : ""}">
         <div class="admin-row-main">
           <strong>${esc(item.nama)}</strong>
           <span>${esc(PENGADUAN_LABEL[item.kategori] || item.kategori)} · ${esc(PENGADUAN_STATUS[item.status] || item.status)} · ${new Date(item.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}</span>
         </div>
         <div class="admin-row-actions">
           <button class="button" type="button" data-buka="${item.id}">Buka</button>
         </div>
       </div>`).join("");
     wrap.querySelectorAll("[data-buka]").forEach((btn) =>
       btn.addEventListener("click", () => bukaPengaduan(btn.dataset.buka)));
     staggerRows(wrap);
     updatePengaduanBadge();
   }

   function bukaPengaduan(id) {
     const item = pengaduanList.find((p) => p.id === id);
     if (!item) return;
     pengaduanSelectedId = id;
     $("pengaduan-detail-col").hidden = false;
     $("pengaduan-detail").innerHTML = `
       <p class="pd-meta"><strong>${esc(item.nama)}</strong> · ${esc(PENGADUAN_LABEL[item.kategori] || item.kategori)}</p>
       <p class="pd-meta">Dikirim ${new Date(item.created_at).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short" })}</p>
       ${item.kontak ? `<p class="pd-meta">Kontak: ${esc(item.kontak)}</p>` : ""}
       <p class="pd-isi">${esc(item.isi)}</p>`;
     $("pengaduan-status").value = item.status;
     $("pengaduan-tanggapan").value = item.tanggapan || "";
     renderPengaduanList();
   }

   function wirePengaduan() {
     $("pengaduan-filters").addEventListener("click", (event) => {
       const button = event.target.closest("[data-status]");
       if (!button) return;
       pengaduanFilter = button.dataset.status;
       document.querySelectorAll("#pengaduan-filters .filter-button").forEach((b) => b.classList.toggle("active", b === button));
       renderPengaduanList();
     });

     $("pengaduan-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       if (!pengaduanSelectedId) return;
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan...");
       try {
         const { error } = await supabaseClient
           .from("pengaduan")
           .update({
             status: $("pengaduan-status").value,
             tanggapan: $("pengaduan-tanggapan").value.trim(),
             updated_at: new Date().toISOString()
           })
           .eq("id", pengaduanSelectedId);
         if (error) { setStatus($("pengaduan-msg"), "Gagal menyimpan: " + error.message, true); return; }
         setStatus($("pengaduan-msg"), "Penanganan tersimpan.");
         await loadPengaduan();
       } finally {
         setBusy(submitBtn, false);
       }
     });
   }

   /* ---------------------------------------------------------
      BADGE JUMLAH PENGADUAN BARU DI TAB
      --------------------------------------------------------- */
   function updatePengaduanBadge() {
     const badge = $("pengaduan-badge");
     if (!badge) return;
     const baru = pengaduanList.filter((p) => p.status === "baru").length;
     badge.textContent = baru;
     badge.hidden = baru === 0;
   }

   /* ---------------------------------------------------------
      REALTIME PENGADUAN — pesan baru masuk tanpa refresh.
      Event INSERT/UPDATE dari tabel pengaduan memicu muat ulang
      daftar. RLS realtime mengikuti role yang login, jadi hanya
      admin (authenticated) yang menerima event ini.
      --------------------------------------------------------- */
   function wirePengaduanRealtime() {
     supabaseClient
       .channel("admin-pengaduan")
       .on("postgres_changes", { event: "*", schema: "public", table: "pengaduan" }, (payload) => {
         loadPengaduan();
         if (payload.eventType === "INSERT") {
           const tab = document.querySelector('[data-tab="pengaduan"]');
           if (tab) {
             tab.classList.remove("is-ping");
             void tab.offsetWidth; // restart animasi
             tab.classList.add("is-ping");
             setTimeout(() => tab.classList.remove("is-ping"), 2600);
           }
         }
       })
       .subscribe();
   }

   /* =========================================================
      9. EXCEL — Export / Import data penduduk
      Format kolom mengikuti lembar kerja sekretaris desa:
      ALAMAT DUSUN | KODE KELUARGA | NAMA KEPALA KELUARGA | NIK |
      NAMA ANGGOTA KELUARGA | JENIS KELAMIN | HUBUNGAN |
      TEMPAT LAHIR | TANGGAL LAHIR | USIA | STATUS | AGAMA |
      GOL DARAH | NEGARA | PENDIDIKAN | PEKERJAAN
      ========================================================= */
   const EXCEL_HEADERS = [
     "NO", "ALAMAT DUSUN", "KODE KELUARGA", "NAMA KEPALA KELUARGA", "N I K",
     "NAMA ANGGOTA KELUARGA", "JENIS KELAMIN", "HUBUNGAN", "TEMPAT LAHIR",
     "TANGGAL LAHIR", "USIA", "STATUS", "AGAMA", "GOL DARAH", "NEGARA",
     "PENDIDIKAN", "PEKERJAAN"
   ];

   function hitungUsia(tgl) {
     if (!tgl) return "";
     const lahir = new Date(tgl);
     if (isNaN(lahir)) return "";
     const kini = new Date();
     let usia = kini.getFullYear() - lahir.getFullYear();
     const m = kini.getMonth() - lahir.getMonth();
     if (m < 0 || (m === 0 && kini.getDate() < lahir.getDate())) usia--;
     return usia;
   }

   function fmtTanggalExcel(iso) {
     if (!iso) return "";
     const [y, m, d] = String(iso).slice(0, 10).split("-");
     return `${d}/${m}/${y}`;
   }

   async function exportPendudukExcel() {
     const btn = $("penduduk-export-btn");
     setBusy(btn, true, "Menyiapkan...");
     try {
       const { data, error } = await supabaseClient
         .from("keluarga")
         .select("*, dusun(nama), penduduk(*)")
         .order("created_at");
       if (error) throw error;

       const rows = [
         [`DATA DASAR KELUARGA TAHUN ${new Date().getFullYear()}`],
         ["DESA KALE KO'MARA KECAMATAN POLONGBANGKENG UTARA KABUPATEN TAKALAR"],
         [],
         EXCEL_HEADERS
       ];
       let no = 0;
       (data || []).forEach((kk) => {
         const namaDusun = kk.dusun && kk.dusun.nama || "";
         const anggota = (kk.penduduk || []).slice()
           .sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)));
         (anggota.length ? anggota : [null]).forEach((p) => {
           no++;
           rows.push([
             no,
             namaDusun,
             kk.no_kk,
             kk.kepala_keluarga,
             p ? p.nik || "" : "",
             p ? p.nama : "",
             p ? (p.jenis_kelamin === "P" ? "PEREMPUAN" : "LAKI-LAKI") : "",
             p ? p.status_hubungan || "" : "",
             p ? p.tempat_lahir || "" : "",
             p ? fmtTanggalExcel(p.tanggal_lahir) : "",
             p ? hitungUsia(p.tanggal_lahir) : "",
             p ? p.status_perkawinan || "" : "",
             p ? p.agama || "" : "",
             p ? p.gol_darah || "" : "",
             p ? p.negara || "" : "",
             p ? p.pendidikan || "" : "",
             p ? p.pekerjaan || "" : ""
           ]);
         });
       });

       const ws = XLSX.utils.aoa_to_sheet(rows);
       ws["!cols"] = EXCEL_HEADERS.map((h) => ({ wch: Math.max(String(h).length + 2, 16) }));
       ws["!merges"] = [0, 1].map((r) => ({ s: { r, c: 0 }, e: { r, c: EXCEL_HEADERS.length - 1 } }));
       const wb = XLSX.utils.book_new();
       XLSX.utils.book_append_sheet(wb, ws, "Data Penduduk");
       XLSX.writeFile(wb, `data-penduduk-kale-komara-${new Date().toISOString().slice(0, 10)}.xlsx`);
       setStatus($("keluarga-status"), "Export Excel berhasil diunduh.");
     } catch (err) {
       setStatus($("keluarga-status"), "Gagal export: " + err.message, true);
     } finally {
       setBusy(btn, false);
     }
   }

   // ---------- Import ----------
   const normHead = (s) => String(s ?? "").toUpperCase().replace(/[^A-Z]/g, "");
   const HEAD_MAP = {
     ALAMATDUSUN: "dusun",
     KODEKELUARGA: "no_kk", NOKK: "no_kk", "NOMOR KK": "no_kk",
     NAMAKEPALAKELUARGA: "kepala",
     NIK: "nik",
     NAMAANGGOTAKELUARGA: "nama", NAMA: "nama",
     JENISKELAMIN: "jk",
     HUBUNGAN: "hubungan",
     TEMPATLAHIR: "tempat_lahir",
     TANGGALLAHIR: "tgl",
     USIA: null,
     STATUS: "status_kawin",
     AGAMA: "agama",
     GOLDARAH: "gol_darah",
     NEGARA: "negara",
     PENDIDIKAN: "pendidikan",
     PEKERJAAN: "pekerjaan"
   };

   function normJK(v) {
     const s = String(v ?? "").toUpperCase().replace(/[^A-Z]/g, "");
     if (s === "P" || s === "PEREMPUAN" || s === "WANITA") return "P";
     return "L";
   }

   function parseTanggalExcel(v) {
     const out = (y, m, d) => `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
     const valid = (y, m, d) => {
       if (!(y >= 1900 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31)) return false;
       const dt = new Date(Date.UTC(y, m - 1, d));
       return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
     };
     if (v === "" || v == null) return null;
     if (v instanceof Date) {
       const y = v.getUTCFullYear(), m = v.getUTCMonth() + 1, d = v.getUTCDate();
       return valid(y, m, d) ? out(y, m, d) : null;
     }
     if (typeof v === "number") { // serial tanggal Excel
       const d0 = new Date(Math.round((v - 25569) * 86400000));
       const y = d0.getUTCFullYear(), m = d0.getUTCMonth() + 1, d = d0.getUTCDate();
       return !isNaN(d0) && valid(y, m, d) ? out(y, m, d) : null;
     }
     const s = String(v).trim();
     let m = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
     if (m) {
       const p = +m[1], q = +m[2], y = +m[3];
       if (valid(y, q, p)) return out(y, q, p); // DD/MM/YYYY (format dokumen)
       if (valid(y, p, q)) return out(y, p, q); // MM/DD/YYYY
       return null;
     }
     m = s.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
     if (m) {
       const y = +m[1], p = +m[2], q = +m[3];
       if (valid(y, p, q)) return out(y, p, q); // YYYY-MM-DD
       if (valid(y, q, p)) return out(y, q, p); // YYYY-DD-MM (sel tertukar)
     }
     return null;
   }

   async function importPendudukExcel(file) {
     const buf = await file.arrayBuffer();
     const wb = XLSX.read(buf);
     const ws = wb.Sheets[wb.SheetNames[0]];
     const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
     if (!aoa.length) throw new Error("Sheet pertama kosong.");

     // Judul kolom boleh berada di bawah judul dokumen — cari s.d. 15 baris pertama.
     let headIdx = -1;
     for (let i = 0; i < Math.min(aoa.length, 15); i++) {
       const norms = aoa[i].map(normHead);
       if (norms.includes("KODEKELUARGA") ||
           (norms.includes("NIK") && norms.includes("NAMAANGGOTAKELUARGA"))) { headIdx = i; break; }
     }
     if (headIdx < 0) {
       throw new Error("Judul kolom (KODE KELUARGA / NAMA ANGGOTA KELUARGA) tidak ditemukan di 15 baris pertama.");
     }
     const fields = aoa[headIdx].map((h) => HEAD_MAP[normHead(h)] || null);

     const mapped = [];
     for (let i = headIdx + 1; i < aoa.length; i++) {
       const out = {};
       aoa[i].forEach((val, c) => { if (fields[c]) out[fields[c]] = val; });
       if (String(out.nama ?? "").trim() && String(out.no_kk ?? "").trim()) {
         out.rowNo = i + 1;
         mapped.push(out);
       }
     }
     if (!mapped.length) throw new Error("Tidak ada baris data terisi di bawah judul kolom.");

     // Nomor KK hanya boleh angka — buang koma atas, spasi, huruf.
     mapped.forEach((r) => { r.no_kk = String(r.no_kk).replace(/\D/g, ""); });
     for (let i = mapped.length - 1; i >= 0; i--) if (!mapped[i].no_kk) mapped.splice(i, 1);
     if (!mapped.length) throw new Error("KODE KELUARGA tidak berisi angka sama sekali.");

     const [{ data: kkRows }, { data: pdRows }, { data: dusunRows }] = await Promise.all([
       supabaseClient.from("keluarga").select("id, no_kk, kepala_keluarga, dusun_id, alamat"),
       supabaseClient.from("penduduk").select("id, nik, keluarga_id"),
       supabaseClient.from("dusun").select("id, nama")
     ]);
     const kkByNo = new Map((kkRows || []).map((k) => [String(k.no_kk).replace(/\D/g, ""), k]));
     const pdByNik = new Map((pdRows || []).filter((p) => p.nik).map((p) => [p.nik, p]));
     const dusunByName = new Map((dusunRows || []).map((d) => [normHead(d.nama), d]));
     // Cocokkan nama dusun longgar: "BUTTADIDIA" ketemu "Dusun Buttadidia", dll.
     const cariDusun = (key) => {
       if (!key) return null;
       if (dusunByName.has(key)) return dusunByName.get(key);
       for (const [k, d] of dusunByName) {
         if (k.includes(key) || key.includes(k)) return d;
       }
       return null;
     };

     const groups = new Map();
     mapped.forEach((r) => {
       const kk = String(r.no_kk).trim();
       if (!groups.has(kk)) groups.set(kk, []);
       groups.get(kk).push(r);
     });

     // Kolom tambahan boleh belum ada di database (SQL 10 belum dijalankan):
     // kalau Postgres menolak, ulangi otomatis tanpa kolom tersebut.
     const EXTRA_COLS = ["tempat_lahir", "status_perkawinan", "agama", "gol_darah", "negara", "pendidikan"];
     let extraColsOk = true;
     const gagal = [];
     let kkBaru = 0, anggotaBaru = 0, anggotaUpdate = 0, dupDilewati = 0, tanggalKosong = 0;
     const contohBarisTgl = [];

     const clean = (p) => {
       const { rowNo, ...rest } = p;
       if (!extraColsOk) EXTRA_COLS.forEach((k) => delete rest[k]);
       return rest;
     };

     const pendudukWrite = (mode, arr) => mode === "insert"
       ? supabaseClient.from("penduduk").insert(arr).select("id, nik")
       : supabaseClient.from("penduduk").upsert(arr, { onConflict: "id" });

     // Batch 500 baris per request; kalau chunk ditolak, jatuh ke per-baris
     // supaya baris yang buruk ketahuan tanpa menggagalkan sisanya.
     async function bulkPenduduk(mode, items) {
       let ok = 0;
       for (let i = 0; i < items.length; i += 500) {
         const chunk = items.slice(i, i + 500);
         let { data, error } = await pendudukWrite(mode, chunk.map((x) => clean(x.p)));
         if (error && extraColsOk && /does not exist/i.test(error.message)) {
           extraColsOk = false;
           ({ data, error } = await pendudukWrite(mode, chunk.map((x) => clean(x.p))));
         }
         if (error) console.warn("Import chunk ditolak:", error.message);
         if (!error) {
           ok += chunk.length;
           if (data) data.forEach((d) => d.nik && pdByNik.set(d.nik, d));
           continue;
         }
         for (const x of chunk) {
           let r = await pendudukWrite(mode, [clean(x.p)]);
           if (r.error && extraColsOk && /does not exist/i.test(r.error.message)) {
             extraColsOk = false;
             r = await pendudukWrite(mode, [clean(x.p)]);
           }
           if (r.error) gagal.push(`baris ${x.rowNo} (${x.p.nama}): ${r.error.message}`);
           else {
             ok++;
             if (r.data) r.data.forEach((d) => d.nik && pdByNik.set(d.nik, d));
           }
         }
       }
       return ok;
     }

     // ---------- KK: batch insert + batch update kepala ----------
     const newKK = [], kkUpdate = [];
     for (const [noKK, rows] of groups) {
       const kepala = String(rows[0].kepala ?? "").trim();
       const dusunKey = normHead(rows[0].dusun ?? "");
       const dusun = cariDusun(dusunKey);
       const alamatDusun = dusun ? dusun.nama : String(rows[0].dusun ?? "").trim();
       const existing = kkByNo.get(noKK);
       if (!existing) {
         newKK.push({ no_kk: noKK, kepala_keluarga: kepala || "(tanpa nama)", dusun_id: dusun ? dusun.id : null, alamat: alamatDusun || null, rowNo: rows[0].rowNo });
       } else {
         const patch = { id: existing.id };
         let need = false;
         if (kepala && kepala !== existing.kepala_keluarga) { patch.kepala_keluarga = kepala; need = true; }
         if (String(existing.no_kk) !== noKK) { patch.no_kk = noKK; need = true; } // buang koma atas dll.
         if (dusun && !existing.dusun_id) { patch.dusun_id = dusun.id; need = true; }
         if (alamatDusun && !existing.alamat) { patch.alamat = alamatDusun; need = true; }
         if (need) kkUpdate.push(patch);
       }
     }
     for (let i = 0; i < newKK.length; i += 500) {
       const chunk = newKK.slice(i, i + 500);
       const { data, error } = await supabaseClient.from("keluarga")
         .insert(chunk.map(({ rowNo, ...rest }) => rest)).select("id, no_kk");
       if (!error) {
         kkBaru += data.length;
         data.forEach((k) => kkByNo.set(k.no_kk, k));
         continue;
       }
       for (const k of chunk) {
         const r = await supabaseClient.from("keluarga")
           .insert({ no_kk: k.no_kk, kepala_keluarga: k.kepala_keluarga, dusun_id: k.dusun_id, alamat: k.alamat })
           .select("id, no_kk");
         if (r.error) gagal.push(`KK ${k.no_kk} (baris ${k.rowNo}): ${r.error.message}`);
         else { kkBaru++; r.data.forEach((d) => kkByNo.set(d.no_kk, d)); }
       }
     }
     for (let i = 0; i < kkUpdate.length; i += 500) {
       await supabaseClient.from("keluarga").upsert(kkUpdate.slice(i, i + 500), { onConflict: "id" });
     }

     // ---------- Anggota: pisahkan insert baru vs update ----------
     const toInsert = [], toUpdate = [];
     const seenNik = new Set();
     for (const [noKK, rows] of groups) {
       const kk = kkByNo.get(noKK);
       if (!kk) {
         rows.forEach((r) => gagal.push(`baris ${r.rowNo}: KK ${noKK} gagal dibuat, anggota dilewati`));
         continue;
       }
       for (const r of rows) {
         const nik = String(r.nik ?? "").replace(/\D/g, "") || null;
         const dbRow = nik ? pdByNik.get(nik) : null;
         if (nik && !dbRow && seenNik.has(nik)) { dupDilewati++; continue; } // duplikat dalam file
         if (nik) seenNik.add(nik);
         const payload = {
           keluarga_id: kk.id,
           nama: String(r.nama).trim(),
           nik,
           jenis_kelamin: normJK(r.jk),
           status_hubungan: String(r.hubungan ?? "").trim() || null,
           tempat_lahir: String(r.tempat_lahir ?? "").trim() || null,
           tanggal_lahir: parseTanggalExcel(r.tgl),
           // (tanggal dicek setelah payload jadi)
           status_perkawinan: String(r.status_kawin ?? "").trim() || null,
           agama: String(r.agama ?? "").trim() || null,
           gol_darah: String(r.gol_darah ?? "").trim() || null,
           negara: String(r.negara ?? "").trim() || null,
           pendidikan: String(r.pendidikan ?? "").trim() || null,
           pekerjaan: String(r.pekerjaan ?? "").trim() || null
         };
         if (String(r.tgl ?? "").trim() && !payload.tanggal_lahir) {
           tanggalKosong++;
           if (contohBarisTgl.length < 5) contohBarisTgl.push(`baris ${r.rowNo}`);
         }
         if (dbRow) { payload.id = dbRow.id; toUpdate.push({ p: payload, rowNo: r.rowNo }); }
         else toInsert.push({ p: payload, rowNo: r.rowNo });
       }
     }

     anggotaBaru = await bulkPenduduk("insert", toInsert);
     anggotaUpdate = await bulkPenduduk("upsert", toUpdate);

     await Promise.all([loadKeluarga(), loadDusun(), loadStatistik()]);

     const catatan = [];
     if (!extraColsOk) catatan.push("kolom tambahan (agama, pendidikan, dll.) belum ada di database — jalankan 10-penduduk-excel.sql di SQL Editor supaya ikut tersimpan");
     if (dupDilewati) catatan.push(`${dupDilewati} NIK duplikat dalam file dilewati`);
     if (tanggalKosong) catatan.push(`${tanggalKosong} tanggal lahir tak terbaca, dikosongkan (${contohBarisTgl.join(", ")}${tanggalKosong > contohBarisTgl.length ? ", …" : ""}) — lengkapi lewat form edit anggota`);
     const ringkasan =
       `Import selesai: ${kkBaru} KK baru, ${anggotaBaru} anggota baru, ${anggotaUpdate} diperbarui.` +
       (catatan.length ? " Catatan: " + catatan.join("; ") + "." : "") +
       (gagal.length ? ` ${gagal.length} baris gagal — ` + gagal.slice(0, 5).join("; ") : "");
     setStatus($("keluarga-status"), ringkasan, gagal.length > 0 || !extraColsOk);
   }

   function wirePendudukExcel() {
     $("penduduk-export-btn").addEventListener("click", exportPendudukExcel);
     $("penduduk-import-btn").addEventListener("click", () => $("penduduk-import-file").click());
     $("penduduk-import-file").addEventListener("change", async (event) => {
       const file = event.target.files[0];
       event.target.value = "";
       if (!file) return;
       if (!window.confirm(`Import "${file.name}"?\n\nAnggota dengan NIK yang sudah ada akan DIPERBARUI, sisanya ditambahkan. KK baru dibuat otomatis.`)) return;
       const btn = $("penduduk-import-btn");
       setBusy(btn, true, "Mengimport...");
       try {
         await importPendudukExcel(file);
       } catch (err) {
         setStatus($("keluarga-status"), "Gagal import: " + err.message, true);
       } finally {
         setBusy(btn, false);
       }
     });
   }