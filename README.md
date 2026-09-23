# Tenshi.id — Prototype Digital Manga Library

Prototype website perpustakaan komik/manhwa/manhua (mirip Shinigami Scans) dibangun dengan **React + TypeScript + Vite + Tailwind CSS** (frontend) dan **Node/Express + Neon Postgres** (backend + auth).

## Fitur

### Pengguna (user)
- **Register / Login** — buat akun untuk membaca dan menyimpan favorit (auth JWT, password di-hash bcrypt).
- **Home** — banner, pengumuman, rekomendasi (Manhwa/Manga/Manhua), update, dan populer.
- **Explore** — filter tipe, genre, dan urutan (terbaru/populer/rating).
- **Search** — cari judul dengan debounce.
- **Library** — simpan komik favorit (per-akun; harus login).
- **Manga Detail** — banner, info, tombol "Tambah ke Library", daftar chapter.
- **Read Chapter** — reader halaman per halaman dengan navigasi prev/next.

### Admin
- Dashboard admin di `/admin` (hanya role `admin` yang bisa akses).
- **Buku (Manga)** — CRUD: judul, judul alternatif, pengarang, artist, tipe komik (manhwa/manga/manhua), status, genre, tag, cover, banner, sinopsis, tanggal rilis.
- **Genre** — tambah/hapus genre.
- **Pengarang** — tambah/hapus author/artist + peran.
- **Chapter** — tambah/edit/hapus chapter beserta daftar halaman (URL gambar).
- **Mirror chapter live** — isi ID Shinigami pada buku untuk mengambil daftar chapter dan halaman terbaru otomatis saat dibuka.

## Chapter otomatis dari Shinigami

Pada menu **Admin → Buku**, edit atau tambah judul lalu isi **ID Shinigami** dengan UUID yang terdapat setelah `/series/` pada URL seri. Contoh URL `https://app.shinigami.asia/series/UUID-SERI` berarti yang diisikan hanya `UUID-SERI`.

Setelah backend direstart, kolom sumber dibuat otomatis. Saat halaman detail atau admin chapter dibuka, chapter live akan di-upsert ke database sehingga chapter baru muncul di daftar tanpa input manual. Gambar melewati proxy backend yang hanya menerima CDN Shinigami; jangan arahkan field ini ke sumber yang tidak memiliki izin untuk Anda tampilkan.

Untuk menambahkan seluruh katalog sumber, gunakan tombol **Impor Shinigami** pada Admin → Buku. Impor menyimpan metadata semua judul dan menghubungkan judul lokal dengan nama yang sama; daftar chapter tiap judul lalu tersinkron ketika halaman judul atau admin chapter dibuka.


Setiap user yang mendaftar otomatis ber-role `user` (hanya bisa baca, register, dan simpan favorit).

## Menjalankan (2 terminal)

Backend dulu (otomatis membuat tabel di Neon + seed akun admin):

```bash
cd prototype/server
npm install
copy .env.example .env   # Windows — isi DATABASE_URL
npm run dev              # server di http://localhost:5001
```

Lalu frontend:

```bash
cd prototype
npm install
npm run dev              # Vite di http://localhost:5173 (proxy /api -> 5001)
```

Mode produksi frontend:

```bash
cd prototype
npm run build
npm run preview
```

## Neon (Data Base)

Data disimpan di **Neon** (Postgres serverless). Skema tabel otomatis dibuat saat server backend dinyalakan (`server/schema.sql`): `members`, `manga`, `genres`, `manga_genres`, `authors`, `manga_authors`, `chapters`, `likes` + trigger `bump_follows` + index.

1. Buat project di [neon.tech](https://neon.tech).
2. Salin **Connection string** (Neon Dashboard → Connection Details).
3. Isi `server/.env`:
   ```env
   DATABASE_URL="postgresql://user:password@host.neon.tech/neondb?sslmode=require"
   JWT_SECRET="ganti-dengan-string-acak-panjang"
   PORT=5001
   ```
4. Nyalakan server — tabel langsung dibuat, akun admin `admin@tenshi.id / admin123` otomatis di-seed.

> URL backend hanya dipakai di sisi **server** (`server/.env`) — kredensial database tidak pernah masuk ke browser.

## Struktur

```
prototype/
├─ index.html
├─ vite.config.ts           # proxy /api -> localhost:5001 (dev)
├─ .env.example
├─ server/                  # backend Node/Express
│  ├─ index.js              # API: auth, manga, genre, author, chapter, likes
│  ├─ schema.sql            # skema Postgres Neon (auto-run saat server start)
│  └─ .env                  # DATABASE_URL (tidak di-commit)
└─ src/
   ├─ main.tsx / App.tsx    # routing
   ├─ index.css             # tema (dark ala Shinigami)
   ├─ lib/api.ts            # fetch wrapper + token JWT + deteksi backend
   ├─ api/library.ts        # data layer (REST backend + fallback mock)
   ├─ data/seed.ts, store.ts# mock / seed data + store in-memory
   ├─ types/index.ts        # tipe TypeScript
   ├─ context/AuthContext.tsx      # login/register/logout + role
   ├─ context/LibraryContext.tsx   # favorit per-akun (sync backend)
   ├─ components/
   │  ├─ layout/            # Navbar, Footer, MobileNav, Layout
   │  ├─ ui/                # SectionTitle, FilterTabs, Pagination
   │  ├─ ProtectedRoute.tsx # proteksi rute (user/admin)
   │  └─ manga/MangaCard.tsx
   ├─ icons/
   └─ pages/                # Home, Explore, Library, Search, MangaDetail,
                            # ReadChapter, Login, Register,
                            # admin/AdminManga, admin/AdminGenres,
                            # admin/AdminAuthors, admin/AdminChapters
```

## Catatan prototype

- Gambar memakai placeholder (`placehold.co`). Ganti dengan URL storage/CDN milikmu lewat CRUD admin.
- Saat backend **tidak berjalan**, frontend otomatis memakai **mock data** (`data/store.ts`) supaya tetap bisa dilihat.
- Saat backend **berjalan**, semua CRUD admin, login/register, dan favorit tersimpan permanen di Neon.
- Halaman reader memakai gambar placeholder — ganti `pages` jsonb dengan URL gambar sungguhan.
