/* =========================================================
   KONEKSI SUPABASE — DESA KALE KO'MARA
   Dipakai bersama oleh index.html, berita-detail.html, dan
   admin.html. Wajib dimuat SETELAH library @supabase/supabase-js
   dan SEBELUM script.js / berita-detail.js / admin.js.

   anon key ini AMAN untuk ditaruh di kode sisi client — akses
   tulis/ubah/hapus tetap dibatasi oleh Row Level Security (RLS)
   yang sudah diatur di supabase-schema.sql (hanya akun admin yang
   login lewat Supabase Auth yang boleh mengubah data).
   ========================================================= */

const SUPABASE_URL = "https://pqkaqgcluqzwfxqecyhk.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBxa2FxZ2NsdXF6d2Z4cWVjeWhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc0NTk1MjAsImV4cCI6MjEwMzAzNTUyMH0.NEugwDIGXVKO6H4uGKYYFCPhPz-XYf0OutFVniPKx_M";

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Ubah tanggal ISO dari database ("2026-08-12") jadi format
// Indonesia ("12 Agustus 2026") seperti yang dipakai di tampilan.
function formatTanggalIndo(isoDate) {
  const bulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  const [tahun, bulanIdx, tanggal] = isoDate.split("-").map(Number);
  return `${tanggal} ${bulan[bulanIdx - 1]} ${tahun}`;
}