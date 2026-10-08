// Impor judul dari Luvyaa (WordPress TsReader) ke R2 + database.
// Alur per chapter: baca halaman chapter → ambil daftar gambar → unduh ke R2
// → simpan chapter dengan URL R2. Gambar jadi milik sendiri (tidak hotlink).
//
// SOPAN: semua request sekuensial (1 koneksi), jeda acak antar request,
// retry dengan backoff kalau kena 429/5xx. JANGAN naikkan kecepatan —
// IP rumah bisa di-block kalau agresif.
//
// Butuh di server/.env: DATABASE_URL + R2_* (sama seperti import-r2.mjs).
//
// Pakai:
//   node import-luvyaa.mjs --series=man-with-the-ghost --prefix="man with the ghost" --from=10
//   node import-luvyaa.mjs --series=man-with-the-ghost --prefix="man with the ghost" --from=10 --to=20 --type=manhwa
//
// Aman diulang: chapter yang namanya sudah ada di DB dilewati.
import dotenv from 'dotenv'
import pg from 'pg'
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'

dotenv.config()

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(=(.*))?$/)
    return m ? [m[1], m[3] ?? true] : []
  }),
)

const BASE = (process.env.LUVYAA_BASE || 'https://v5.luvyaa.co').replace(/\/$/, '')
const SERIES = String(args.series || '').trim().replace(/^\/+|\/+$/g, '')
const PREFIX = String(args.prefix || '').trim().replace(/^\/+|\/+$/g, '')
const TYPE = ['manhwa', 'manga', 'manhua'].includes(args.type) ? args.type : 'manhwa'
const STATUS = ['Ongoing', 'Completed', 'Hiatus', 'Dropped'].includes(args.status) ? args.status : 'Ongoing'
const FROM = args.from ? Number(args.from) : 0
const TO = args.to ? Number(args.to) : Infinity
const LIMIT = args.limit ? Number(args.limit) : Infinity
const TITLE_OVERRIDE = String(args.title || '').trim()

if (!SERIES || !PREFIX) {
  console.error('Pakai: node import-luvyaa.mjs --series=<slug-luvyaa> --prefix="<folder-r2>" [--from=10] [--to=20]')
  process.exit(1)
}
for (const k of ['R2_ENDPOINT', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'DATABASE_URL']) {
  if (!process.env[k]) {
    console.error(`ERROR: ${k} kosong. Isi dulu di server/.env.`)
    process.exit(1)
  }
}
const BUCKET = process.env.R2_BUCKET || 'chapter'
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '')
if (!PUBLIC_URL) {
  console.error('ERROR: R2_PUBLIC_URL kosong. Isi di server/.env.')
  process.exit(1)
}

let endpoint = String(process.env.R2_ENDPOINT || '').trim().replace(/\/+$/, '')
{
  const m = endpoint.match(/^(https:\/\/[a-z0-9]+\.r2\.cloudflarestorage\.com)(\/.*)?$/)
  if (m) endpoint = m[1]
}
const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: { accessKeyId: process.env.R2_ACCESS_KEY_ID, secretAccessKey: process.env.R2_SECRET_ACCESS_KEY },
})

const parsed = new URL(process.env.DATABASE_URL)
const pool = new pg.Pool({
  host: parsed.hostname,
  port: Number(parsed.port || 5432),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  max: 2,
})
const query = async (text, params) => (await pool.query(text, params)).rows

// Samakan dengan UA Chrome asli (clearance bisa gagal kalau beda versi).
// Isi di server/.env: LUVYAA_UA="<isi navigator.userAgent dari F12 Console>"
const BROWSER_UA = process.env.LUVYAA_UA ||
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
// Cookie pinjaman dari browser asli (atasi challenge "Just a moment...").
// Isi di server/.env: LUVYAA_COOKIE="cf_clearance=....."
// Cara ambil: Chrome buka v5.luvyaa.co → F12 → Application → Cookies →
// copy nilai cf_clearance. Berlaku berminggu-minggu selama IP rumah sama.
const EXTRA_COOKIE = String(process.env.LUVYAA_COOKIE || '').trim()
const sleep = ms => new Promise(r => setTimeout(r, ms))
const rand = (a, b) => a + Math.floor(Math.random() * (b - a + 1))
const slugify = t => String(t).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
const publicUrl = key => `${PUBLIC_URL}/${key.split('/').map(encodeURIComponent).join('/')}`
const extOf = url => {
  const m = String(url).split('?')[0].match(/\.([a-z0-9]+)$/i)
  return m ? m[1].toLowerCase() : 'webp'
}

// Fetch sopan dengan retry backoff (429/5xx ditunggu, bukan dihajar).
async function politeFetch(url, { referer, binary = false } = {}, retries = 4) {
  for (let attempt = 0; ; attempt += 1) {
    const headers = {
      'User-Agent': BROWSER_UA,
      Accept: binary ? 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8' : 'text/html,application/xhtml+xml',
      'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
      Referer: referer || `${BASE}/`,
    }
    if (EXTRA_COOKIE) headers.Cookie = EXTRA_COOKIE
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(30_000) })
    if (res.ok) return binary ? Buffer.from(await res.arrayBuffer()) : res.text()
    const retryable = res.status === 429 || res.status >= 500
    if (!retryable || attempt >= retries) throw new Error(`HTTP ${res.status} untuk ${url}`)
    const retryAfter = Number(res.headers.get('retry-after') || 0)
    const wait = retryAfter > 0 ? retryAfter * 1000 : Math.min(3000 * (attempt + 1), 20000)
    console.log(`  HTTP ${res.status} — tunggu ${Math.round(wait / 1000)}s lalu coba lagi...`)
    await sleep(wait)
  }
}

const meta = (html, prop) => {
  const m = html.match(new RegExp(`<meta[^>]+property=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'))
    || html.match(new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${prop}["']`, 'i'))
  return m ? m[1] : ''
}

// Ambil objek JSON ts_reader.run({...}) dengan pencocokan kurung seimbang.
function extractTsReader(html) {
  const start = html.indexOf('ts_reader.run(')
  if (start < 0) return null
  let i = html.indexOf('{', start)
  let depth = 0
  let inStr = false
  let esc = false
  for (let j = i; j < html.length; j += 1) {
    const c = html[j]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
    } else if (c === '"') inStr = true
    else if (c === '{') depth += 1
    else if (c === '}') {
      depth -= 1
      if (depth === 0) return JSON.parse(html.slice(i, j + 1))
    }
  }
  return null
}

async function main() {
  console.log(`Seri: ${BASE}/${SERIES}/`)
  const seriesHtml = await politeFetch(`${BASE}/${SERIES}/`)
  await sleep(rand(800, 1500))

  let title = TITLE_OVERRIDE
  if (!title) {
    const og = meta(seriesHtml, 'og:title')
    title = og.replace(/^baca\s+/i, '').replace(/\s+bahasa indonesia\s*-\s*luvyaa\s*$/i, '').trim() || SERIES
  }
  const description = meta(seriesHtml, 'og:description')
  const ogImage = meta(seriesHtml, 'og:image')
  console.log(`Judul: ${title}`)

  // Daftar chapter dari HTML statis.
  const linkRe = new RegExp(`href="((${BASE.replace(/\//g, '\\/')}/[a-z0-9\\-]+/))"`, 'g')
  const found = new Map()
  let lm
  while ((lm = linkRe.exec(seriesHtml))) {
    const url = lm[1]
    const slug = url.slice(BASE.length + 1).replace(/\/$/, '')
    if (!slug.startsWith(`${SERIES}-chapter-`)) continue
    const cm = slug.match(/-chapter-(\d+)(?:-(\d+))?$/)
    if (!cm || found.has(url)) continue
    const n = Number(cm[1])
    const minor = cm[2] ? Number(cm[2]) : 0
    if (n < FROM || n > TO) continue
    found.set(url, { url, n, minor, name: minor ? `Chapter ${n}.${minor}` : `Chapter ${n}`, sort: n * 10 + minor })
  }
  let chapters = [...found.values()].sort((a, b) => a.sort - b.sort).slice(0, LIMIT)
  if (!chapters.length) throw new Error('Tidak ada chapter ketemu di halaman seri (atau di luar rentang --from/--to).')
  console.log(`${chapters.length} chapter masuk rentang.`)

  // Pastikan baris manga + cover di R2.
  const slug = slugify(title).slice(0, 80) || SERIES
  let manga = (await query('select id, slug, title, cover_url from manga where slug = $1', [slug]))[0]
  if (!manga) {
    let coverUrl = ''
    if (ogImage) {
      try {
        const buf = await politeFetch(ogImage, { referer: `${BASE}/${SERIES}/`, binary: true })
        const key = `${PREFIX}/cover.${extOf(ogImage)}`
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET, Key: key, Body: buf, ContentType: 'image/jpeg',
        }))
        coverUrl = publicUrl(key)
        console.log('Cover tersimpan:', coverUrl)
        await sleep(rand(400, 800))
      } catch (e) {
        console.log('  cover gagal, lanjut tanpa cover:', e.message)
      }
    }
    const rows = await query(
      `insert into manga (slug, title, type, status, description, cover_url, banner_url)
       values ($1, $2, $3, $4, $5, $6, '') returning id, slug, title, cover_url`,
      [slug, title, TYPE, STATUS, description, coverUrl],
    )
    manga = rows[0]
  } else {
    console.log(`Pakai buku lama: ${manga.title} (${manga.slug})`)
  }

  const existing = await query('select name from chapters where manga_id = $1', [manga.id])
  const have = new Set(existing.map(r => r.name))
  let done = 0
  let skipped = 0
  for (const ch of chapters) {
    if (have.has(ch.name)) {
      skipped += 1
      continue
    }
    try {
      const html = await politeFetch(ch.url, {}, 4)
      await sleep(rand(600, 1200))
      const data = extractTsReader(html)
      const images = data?.sources?.[0]?.images || []
      if (!images.length) {
        console.log(`  ${ch.name}: tidak ada gambar, lewati`)
        continue
      }
      const folder = `${PREFIX}/chap-${ch.n}${ch.minor ? `-${ch.minor}` : ''}`
      const pages = []
      for (let i = 0; i < images.length; i += 1) {
        const src = String(images[i])
        const base = src.split('?')[0].split('/').pop() || `p${i + 1}.webp`
        const key = `${folder}/${base}`
        const buf = await politeFetch(src, { referer: ch.url, binary: true })
        await s3.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: buf }))
        pages.push({ index: i, url: publicUrl(key) })
        await sleep(rand(250, 600))
      }
      await query(
        `insert into chapters (manga_id, name, type, sort_order, release_timestamp, pages)
         values ($1, $2, 'chapter', $3, $4, $5)`,
        [manga.id, ch.name, ch.sort, Math.floor(Date.now() / 1000), JSON.stringify(pages)],
      )
      done += 1
      console.log(`  OK ${ch.name}: ${pages.length} hal`)
    } catch (e) {
      console.log(`  GAGAL ${ch.name}: ${e.message} (server/chapter ini dilewati, bisa diulang)`)
    }
    await sleep(rand(1000, 2000))
  }
  console.log(`Selesai. ${done} baru, ${skipped} sudah ada. Buku: ${manga.slug}`)
  await pool.end()
}

main().catch(async e => {
  console.error('GAGAL:', e.message)
  await pool.end().catch(() => {})
  process.exit(1)
})
