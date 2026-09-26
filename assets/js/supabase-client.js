/* =========================================================
   KONEKSI SUPABASE — DESA KALE KO'MARA
   Dipakai bersama oleh index.html, berita-detail.html, dan
   admin.html. Wajib dimuat SETELAH library @supabase/supabase-js
   dan SEBELUM script.js / berita-detail.js / admin.js.

   URL & anon key TIDAK ditulis langsung di file ini lagi.
   Nilainya disuntikkan saat build oleh scripts/build.js dari
   environment variable:

     SUPABASE_URL       → URL proyek Supabase (https://xxxx.supabase.co)
     SUPABASE_ANON_KEY  → anon key (role "anon")

   Lokal  : salin .env.local.example menjadi .env.local, isi nilainya,
            jalankan `npm run build`, lalu serve folder public/.
   Vercel : Project Settings → Environment Variables, tambahkan kedua
            variabel untuk Production, Preview, dan Development.

   Catatan keamanan: anon key memang dirancang untuk dipakai di sisi
   client, tapi dia TETAP akan terlihat di JS hasil build (buka saja
   DevTools). Jadi jangan mengandalkan "key tidak ada di repo" sebagai
   pengamanan — akses tulis/ubah/hapus tetap harus dibatasi oleh Row
   Level Security (RLS) di supabase-schema.sql (hanya akun admin yang
   login lewat Supabase Auth yang boleh mengubah data).
   ========================================================= */

const SUPABASE_URL = "__SUPABASE_URL__";
const SUPABASE_ANON_KEY = "__SUPABASE_ANON_KEY__";

// Jaring pengaman: kalau placeholder belum diganti (mis. file ini
// dijalankan langsung tanpa `npm run build`), jangan bikin error aneh —
// beri pesan yang jelas di konsol.
const supabaseConfigValid =
  SUPABASE_URL.startsWith("https://") && !SUPABASE_ANON_KEY.includes("__SUPABASE");

if (!supabaseConfigValid) {
  console.error(
    "Konfigurasi Supabase belum disuntikkan. Jalankan `npm run build` " +
    "setelah mengisi .env.local (lokal) atau environment variable di Vercel."
  );
}

const supabaseClient = (supabaseConfigValid && window.supabase)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

/* =========================================================
   UTIL KEAMANAN RENDER — dipakai bersama oleh script.js,
   berita-detail.js, dan admin.js.
   Semua data dari database yang masuk ke HTML (lewat
   innerHTML atau atribut) WAJIB dibungkus esc() supaya tidak
   bisa disalahgunakan sebagai XSS.
   ========================================================= */

// Escape karakter khusus HTML supaya teks dari database tidak
// bisa "keluar" dari elemen/atribut tempat dia ditempatkan.
function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Hanya izinkan URL http/https — blokir javascript:, data:, dsb.
// Dipakai untuk src/href yang nilainya berasal dari database.
// Mengembalikan "" kalau URL tidak valid.
function safeUrl(url) {
  const value = String(url ?? "").trim();
  return /^https?:\/\//i.test(value) ? value : "";
}

// Ubah tanggal ISO dari database ("2026-08-12") jadi format
// Indonesia ("12 Agustus 2026") seperti yang dipakai di tampilan.
function formatTanggalIndo(isoDate) {
  const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  // Ambil bagian tanggalnya saja ("2026-08-12") — aman juga kalau
  // kolom tanggal suatu saat berubah jadi timestamp lengkap.
  const [tahun, bulanIdx, tanggal] = String(isoDate || "").slice(0, 10).split("-").map(Number);
  if (!tahun || !bulanIdx || !tanggal || bulanIdx < 1 || bulanIdx > 12) {
    return String(isoDate ?? "");
  }
  return `${tanggal} ${bulan[bulanIdx - 1]} ${tahun}`;
}
