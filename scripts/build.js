#!/usr/bin/env node
/* =========================================================
   BUILD — DESA KALE KO'MARA
   1. Menyalin seluruh situs ke folder public/ sambil mengganti
      placeholder __SUPABASE_URL__ dan __SUPABASE_ANON_KEY__
      dengan nilai dari environment variable.
   2. Membuat sitemap.xml (home + semua halaman berita, diambil
      langsung dari Supabase saat build) dan robots.txt —
      bekal supaya situs terindeks Google.

   Dipakai oleh:
     - `npm run build` (lokal, nilai dibaca dari .env.local)
     - Vercel (nilai dari Project Settings → Environment
       Variables; lihat vercel.json)

   Kalau variabel Supabase belum diisi, build DIGAGALKAN dengan
   pesan jelas — lebih baik deploy gagal daripada situs tayang
   tanpa koneksi Supabase.
   ========================================================= */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const OUT = path.join(ROOT, "public");

// Alamat publik situs — dipakai untuk canonical/sitemap/robots.
// Bisa ditimpa lewat env SITE_URL (mis. nanti pindah domain).
const SITE_BASE = (process.env.SITE_URL || "https://kale-komara.vercel.app").replace(/\/+$/, "");

/* ---------- Muat .env.local kalau ada (untuk pengembangan lokal).
   Di Vercel variabel sudah tersedia sebagai process.env, jadi
   langkah ini otomatis tidak melakukan apa-apa. ---------- */
function loadEnvLocal() {
  const file = path.join(ROOT, ".env.local");
  if (!fs.existsSync(file)) return;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!match || line.trim().startsWith("#")) continue;
    let value = match[2];
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(match[1] in process.env)) process.env[match[1]] = value;
  }
}
loadEnvLocal();

/* ---------- Cek kelengkapan variabel ---------- */
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    [
      "",
      "✗ Build gagal: variabel lingkungan Supabase belum lengkap.",
      "",
      "  Lokal  : salin .env.local.example menjadi .env.local lalu isi:",
      "             SUPABASE_URL=https://xxxx.supabase.co",
      "             SUPABASE_ANON_KEY=eyJ...",
      "  Vercel : Project Settings → Environment Variables → tambahkan",
      "           SUPABASE_URL dan SUPABASE_ANON_KEY untuk semua",
      "           environment (Production, Preview, Development).",
      ""
    ].join("\n")
  );
  process.exit(1);
}

const REPLACEMENTS = {
  __SUPABASE_URL__: SUPABASE_URL,
  __SUPABASE_ANON_KEY__: SUPABASE_ANON_KEY
};

/* ---------- Apa yang TIDAK ikut ke hasil build ---------- */
const SKIP_DIRS = new Set(["public", "node_modules", "scripts", ".git", ".vercel", ".cache"]);
const SKIP_FILES = new Set([
  "package.json",
  "package-lock.json",
  "vercel.json",
  ".gitignore",
  ".env.local",
  ".env.local.example"
]);
// Hanya file teks yang boleh dicari-ganti placeholder-nya;
// file lain (gambar, video, PDF) cukup disalin apa adanya.
const TEXT_EXTENSIONS = new Set([".html", ".js", ".css", ".json", ".svg", ".txt", ".xml", ".webmanifest"]);

/* ---------- Salin proyek ke public/ ---------- */
let replacedCount = 0;

function copyDir(srcDir, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
    const src = path.join(srcDir, entry.name);
    const dest = path.join(destDir, entry.name);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) copyDir(src, dest);
      continue;
    }
    if (!entry.isFile()) continue;
    if (SKIP_FILES.has(entry.name)) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (ext === ".md" || ext === ".sql") continue; // dokumen/schema, bukan bagian situs

    if (TEXT_EXTENSIONS.has(ext)) {
      let text = fs.readFileSync(src, "utf8");
      for (const [token, value] of Object.entries(REPLACEMENTS)) {
        if (text.includes(token)) {
          text = text.split(token).join(value);
          replacedCount += 1;
        }
      }
      fs.writeFileSync(dest, text);
    } else {
      fs.copyFileSync(src, dest);
    }
  }
}

/* ---------- Pastikan tidak ada placeholder yang lolos ---------- */
function assertNoPlaceholders(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      assertNoPlaceholders(fullPath);
      continue;
    }
    if (!TEXT_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;
    const text = fs.readFileSync(fullPath, "utf8");
    if (text.includes("__SUPABASE_URL__") || text.includes("__SUPABASE_ANON_KEY__")) {
      console.error(`✗ Placeholder Supabase masih tersisa di ${path.relative(OUT, fullPath)}`);
      process.exit(1);
    }
  }
}

/* ---------- SEO: sitemap.xml + robots.txt ---------- */
const escapeXml = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

async function generateSitemap() {
  const urls = [{ loc: `${SITE_BASE}/`, changefreq: "daily", priority: "1.0", lastmod: "" }];

  try {
    // Ambil daftar berita langsung dari Supabase (butuh Node 18+).
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/news?select=slug,updated_at,created_at&order=date.desc`,
      { headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` } }
    );
    if (res.ok) {
      for (const row of await res.json()) {
        urls.push({
          loc: `${SITE_BASE}/berita-detail.html?slug=${encodeURIComponent(row.slug)}`,
          changefreq: "weekly",
          priority: "0.8",
          lastmod: String(row.updated_at || row.created_at || "").slice(0, 10)
        });
      }
    } else {
      console.warn(`Peringatan: Supabase menjawab ${res.status} — sitemap dibuat tanpa daftar berita.`);
    }
  } catch (err) {
    // Jangan gagalkan deploy hanya karena sitemap tidak lengkap.
    console.warn("Peringatan: gagal mengambil daftar berita untuk sitemap:", err.message);
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls
      .map(
        (u) =>
          `  <url>\n    <loc>${escapeXml(u.loc)}</loc>\n` +
          (u.lastmod ? `    <lastmod>${u.lastmod}</lastmod>\n` : "") +
          `    <changefreq>${u.changefreq}</changefreq>\n    <priority>${u.priority}</priority>\n  </url>`
      )
      .join("\n") +
    `\n</urlset>\n`;

  fs.writeFileSync(path.join(OUT, "sitemap.xml"), xml);
  console.log(`✓ sitemap.xml dibuat (${urls.length} URL)`);
}

function generateRobots() {
  const txt = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin.html",
    "",
    `Sitemap: ${SITE_BASE}/sitemap.xml`,
    ""
  ].join("\n");
  fs.writeFileSync(path.join(OUT, "robots.txt"), txt);
  console.log("✓ robots.txt dibuat");
}

/* ---------- Jalankan ---------- */
(async () => {
  if (fs.existsSync(OUT)) fs.rmSync(OUT, { recursive: true, force: true });
  copyDir(ROOT, OUT);
  assertNoPlaceholders(OUT);
  await generateSitemap();
  generateRobots();
  console.log(`✓ Build selesai → ${path.relative(ROOT, OUT)}/ (${replacedCount} placeholder diganti)`);
})();
