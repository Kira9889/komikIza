// Seed katalog demo dari src/data/seed.ts ke database Neon.
// Aman dijalankan ulang: manga dengan slug yang sudah ada akan dilewati.
// Jalankan: npx tsx seed-demo.ts  (dari folder server/)
import 'dotenv/config'
import pg from 'pg'
import { genres, authors, seedManga } from '../src/data/seed.ts'

const dbUrl = process.env.DATABASE_URL
if (!dbUrl) {
  throw new Error('DATABASE_URL belum diisi. Salin server/.env.example menjadi server/.env terlebih dahulu.')
}
const u = new URL(dbUrl)
const pool = new pg.Pool({
  host: u.hostname,
  port: Number(u.port || 5432),
  user: decodeURIComponent(u.username),
  password: decodeURIComponent(u.password),
  database: u.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

const q = async (text: string, params?: unknown[]) => (await pool.query(text, params)).rows

// Pengaman: seed demo (data placeholder) dilarang di database yang sudah
// berisi data, kecuali dipaksa dengan --force. Pernah kejadian seed demo
// masuk ke production dan menimbulkan chapter duplikat/gambar placeholder.
const force = process.argv.includes('--force')
const existingManga = await q('select count(*)::int as n from manga')
if (existingManga[0].n > 0 && !force) {
  console.error(
    `BATAL: database sudah berisi ${existingManga[0].n} manga. ` +
    `Seed demo menimpa dengan data placeholder dan menimbulkan duplikat. ` +
    `Jalankan hanya di database kosong, atau tambah flag --force bila paham risikonya.`,
  )
  await pool.end()
  process.exit(1)
}

const genreIds: Record<string, string> = {}
for (const g of genres) {
  const rows = await q(
    `insert into genres (name) values ($1)
     on conflict (name) do update set name = excluded.name returning id`,
    [g.name],
  )
  genreIds[g.name] = rows[0].id
}

const authorIds: Record<string, string> = {}
for (const a of authors) {
  const rows = await q(
    `insert into authors (name, role) values ($1, $2)
     on conflict (name) do update set name = excluded.name returning id`,
    [a.name, a.role ?? 'author'],
  )
  authorIds[a.name] = rows[0].id
}

let inserted = 0
for (const m of seedManga) {
  const existing = await q('select id from manga where slug = $1', [m.slug])
  if (existing[0]) continue

  // pastikan semua author referensi manga ada di database (termasuk yang inline, a11+)
  for (const a of m.authors) {
    if (!authorIds[a.name]) {
      const rows = await q(
        `insert into authors (name, role) values ($1, $2)
         on conflict (name) do update set name = excluded.name returning id`,
        [a.name, a.role ?? 'author'],
      )
      authorIds[a.name] = rows[0].id
    }
  }

  const rows = await q(
    `insert into manga
      (slug, title, original_name, type, status, description, cover_url, banner_url,
       alternative_names, tags, views_count, follows_count, rating, rating_count,
       release_date, created_at)
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) returning id`,
    [
      m.slug, m.title, m.original_name ?? null, m.type, m.status, m.description,
      m.cover_url, m.banner_url ?? null, m.alternative_names, m.tags,
      m.views_count, m.follows_count, m.rating, m.rating_count,
      m.release_date || null, m.created_at,
    ],
  )
  const id = rows[0].id

  for (const g of m.genres) {
    await q('insert into manga_genres (manga_id, genre_id) values ($1,$2) on conflict do nothing', [id, genreIds[g.name]])
  }
  for (const a of m.authors) {
    await q('insert into manga_authors (manga_id, author_id) values ($1,$2) on conflict do nothing', [id, authorIds[a.name]])
  }

  const base = Math.floor(Date.now() / 1000)
  for (let i = 1; i <= 5; i++) {
    const pages = JSON.stringify([
      { id: `${i}-1`, url: `https://placehold.co/900x1350/111827/ffffff?text=${encodeURIComponent(m.title)}+-+Hal+1` },
      { id: `${i}-2`, url: `https://placehold.co/900x1350/1e293b/ffffff?text=${encodeURIComponent(m.title)}+-+Hal+2` },
      { id: `${i}-3`, url: `https://placehold.co/900x1350/1f2937/ffffff?text=${encodeURIComponent(m.title)}+-+Hal+3` },
    ])
    await q(
      `insert into chapters (manga_id, name, type, sort_order, release_timestamp, pages)
       values ($1, $2, 'chapter', $3, $4, $5::jsonb)`,
      [id, `Chapter ${i}`, i, base - (6 - i) * 86400, pages],
    )
  }

  inserted++
}

const counts = await q(`select
  (select count(*)::int from manga) as manga,
  (select count(*)::int from genres) as genres,
  (select count(*)::int from authors) as authors,
  (select count(*)::int from chapters) as chapters`)
console.log(`Seed selesai. Manga baru: ${inserted}.`)
console.log(`Isi database >> manga: ${counts[0].manga}, genre: ${counts[0].genres}, author: ${counts[0].authors}, chapter: ${counts[0].chapters}`)

await pool.end()