/* =========================================================
   ADMIN PANEL — DESA KALE KO'MARA
   Login pakai Supabase Auth, semua data dibaca/ditulis langsung
   ke Supabase (tabel & storage bucket sesuai supabase-schema.sql).
   ========================================================= */

   const $ = (id) => document.getElementById(id);
   const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
   
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
   
   async function uploadToStorage(file, folder) {
     const ext = (file.name.split(".").pop() || "bin").toLowerCase();
     const path = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
     const { error } = await supabaseClient.storage.from("site-media").upload(path, file);
     if (error) throw error;
     return supabaseClient.storage.from("site-media").getPublicUrl(path).data.publicUrl;
   }
   
   function confirmDelete(message) {
     return window.confirm(message);
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
       loadStatistik();
       loadDusun();
       loadKeluarga();
       loadAnggaran();
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
     wireStatistikForm();
     wireDusunForm();
     wireKeluargaForm();
     wireAnggotaForm();
     wireAnggaranForm();
   });
   
   /* =========================================================
      1. BERITA
      ========================================================= */
   let beritaList = [];
   let beritaEditingId = null;
   let beritaSlugTouched = false;
   
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
     $("berita-form").reset();
     $("berita-image-url").value = "";
     $("berita-image-preview").innerHTML = "";
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
     $("berita-content").value = (item.content || []).join("\n");
     $("berita-form-title").textContent = "Ubah berita";
     $("berita-delete-btn").hidden = false;
     renderBeritaList();
   }
   
   function wireBeritaForm() {
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
   
     $("berita-form").addEventListener("submit", async (event) => {
       event.preventDefault();
       const submitBtn = event.currentTarget.querySelector('button[type="submit"]');
       setBusy(submitBtn, true, "Menyimpan berita...");
       try {
         const payload = {
           title: $("berita-title").value.trim(),
           slug: slugify($("berita-slug").value),
           category: $("berita-category").value,
           date: $("berita-date").value,
           image_url: $("berita-image-url").value || null,
           excerpt: $("berita-excerpt").value.trim(),
           content: $("berita-content").value.split("\n").map((p) => p.trim()).filter(Boolean)
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
     wrap.innerHTML = galeriList.map((item) => `
       <div class="admin-row ${item.id === galeriEditingId ? "is-active" : ""}">
         <div class="admin-row-main"><strong>${esc(item.title)}</strong><span>${esc(item.category)} · ${item.images.length} foto</span></div>
         <div class="admin-row-actions">
           <button class="button" type="button" data-edit="${item.id}">Ubah</button>
         </div>
       </div>`).join("");
     wrap.querySelectorAll("[data-edit]").forEach((btn) => btn.addEventListener("click", () => editGaleri(btn.dataset.edit)));
     staggerRows(wrap);
   }
   
   function renderGaleriChips() {
     const wrap = $("galeri-image-chips");
     wrap.innerHTML = galeriImages.map((url, index) => `
       <div class="admin-image-chip"><img src="${esc(url)}" alt=""><button type="button" data-remove="${index}">✕</button></div>`).join("");
     wrap.querySelectorAll("[data-remove]").forEach((btn) => btn.addEventListener("click", () => {
       galeriImages.splice(Number(btn.dataset.remove), 1);
       renderGaleriChips();
     }));
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
         if (itemId) {
           const { error } = await supabaseClient.from("gallery_items").update(itemPayload).eq("id", itemId);
           if (error) { setStatus($("galeri-status"), "Gagal menyimpan: " + error.message, true); return; }
           await supabaseClient.from("gallery_images").delete().eq("gallery_item_id", itemId);
         } else {
           const { data, error } = await supabaseClient.from("gallery_items").insert(itemPayload).select().single();
           if (error) { setStatus($("galeri-status"), "Gagal menyimpan: " + error.message, true); return; }
           itemId = data.id;
         }
   
         const imageRows = galeriImages.map((url, index) => ({ gallery_item_id: itemId, image_url: url, sort_order: index }));
         const { error: imgError } = await supabaseClient.from("gallery_images").insert(imageRows);
         if (imgError) { setStatus($("galeri-status"), "Item tersimpan, tapi foto gagal disimpan: " + imgError.message, true); return; }
   
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
           no_kk: $("keluarga-no-kk").value.trim(),
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
           pekerjaan: $("anggota-pekerjaan").value.trim() || null
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
     clone.querySelector(".budget-row-nilai").value = nilai;
     clone.querySelector(".admin-row-remove").addEventListener("click", (event) => {
       event.target.closest(".admin-budget-row").remove();
     });
     $(containerId).appendChild(clone);
   }
   
   function readBudgetRows(containerId) {
     return [...$(containerId).querySelectorAll(".admin-budget-row")].map((row) => ({
       label: row.querySelector(".budget-row-label").value.trim(),
       nilai: Number(row.querySelector(".budget-row-nilai").value) || 0
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
         if (tahunId) {
           const { error } = await supabaseClient.from("anggaran_tahun").update(tahunPayload).eq("id", tahunId);
           if (error) { setStatus($("anggaran-status"), "Gagal menyimpan: " + error.message, true); return; }
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
           if (itemError) { setStatus($("anggaran-status"), "Tahun tersimpan, tapi rincian gagal disimpan: " + itemError.message, true); return; }
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