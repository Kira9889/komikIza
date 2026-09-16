import express from 'express'
import cors from 'cors'
import compression from 'compression'
import dotenv from 'dotenv'
import pg from 'pg'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { OAuth2Client } from 'google-auth-library'
import nodemailer from 'nodemailer'
import { randomInt } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = Number(process.env.PORT || 5001)
const JWT_SECRET = process.env.JWT_SECRET || 'tenshi-dev-secret-change-me'
const SHINIGAMI_API_URL = process.env.SHINIGAMI_API_URL || 'https://api.shngm.io'
const SHINIGAMI_ORIGIN = 'https://app.shinigami.asia'

if (!process.env.DATABASE_URL) {
  console.error('ERROR: variabel DATABASE_URL belum diisi. Salin server/.env.example menjadi server/.env lalu isi.')
  process.exit(1)
}

// Neon connection string — diurai supaya opsi seperti
// channel_binding tidak merusak driver `pg`.
const parsed = new URL(process.env.DATABASE_URL)
const pool = new pg.Pool({
  host: parsed.hostname,
  port: Number(parsed.port || 5432),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
})

const query = async (text, params) => {
  const r = await pool.query(text, params)
  return r.rows
}

// ---------------------------------------------------------------
// Bootstrap: buat skema (jika belum ada) + seed akun admin demo
// ---------------------------------------------------------------
async function ensureSchema() {
  const sql = readFileSync(join(__dirname, 'schema.sql'), 'utf8')
  await pool.query(sql)
  const hash = await bcrypt.hash('admin123', 10)
  await query(
    `insert into members (email, username, password_hash, role, email_verified)
     values ('admin@tenshi.id', 'admin', $1, 'admin', true)
     on conflict (email) do nothing`,
    [hash],
  )
  // Akun lama yang sudah ada sebelum era verifikasi dianggap terverifikasi.
  await query(`update members set email_verified = true where email = 'admin@tenshi.id'`)
  await query(`update members set email_verified = true where email = 'admin@izalib.test'`)
}

// ---------------------------------------------------------------
// Helpers auth
// ---------------------------------------------------------------
function signToken(row) {
  return jwt.sign({ sub: row.id, email: row.email }, JWT_SECRET, { expiresIn: '30d' })
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    username: row.username,
    role: row.role,
    email_verified: !!row.email_verified,
  }
}

// ---------------------------------------------------------------
// Verifikasi Gmail (khusus @gmail.com / @googlemail.com)
// ---------------------------------------------------------------
// Pendaftaran hanya untuk email Gmail asli. Kepemilikan alamat
// dibuktikan via kode 6 digit (SMTP) atau Login with Google.
function isGmail(email) {
  return /^[a-z0-9._%+-]+@(gmail|googlemail)\.com$/i.test(String(email || '').trim())
}

const CODE_TTL_MS = 10 * 60 * 1000 // kode berlaku 10 menit
const CODE_MAX_ATTEMPTS = 5
const RESEND_COOLDOWN_MS = 60 * 1000 // kirim ulang tiap 60 detik

let mailer = null
function getMailer() {
  if (mailer) return mailer
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null
  mailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 465),
    secure: Number(SMTP_PORT || 465) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  })
  return mailer
}

async function createAndSendCode(email) {
  const code = String(randomInt(100000, 1000000))
  const codeHash = await bcrypt.hash(code, 10)
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString()
  await query(
    `insert into email_verification_codes (email, code_hash, expires_at, attempts)
     values ($1, $2, $3, 0)
     on conflict (email) do update set
       code_hash = excluded.code_hash,
       expires_at = excluded.expires_at,
       attempts = 0,
       created_at = now()`,
    [email, codeHash, expiresAt],
  )

  const mail = getMailer()
  if (mail) {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER
    await mail.sendMail({
      from: `"Tenshi.id" <${from}>`,
      to: email,
      subject: `Kode verifikasi Tenshi.id: ${code}`,
      text: `Halo!\n\nKode verifikasi Tenshi.id kamu: ${code}\nBerlaku 10 menit. Jangan bagikan ke siapa pun.\n\nKalau kamu tidak merasa mendaftar, abaikan email ini.`,
      html: `<div style="font-family:sans-serif;max-width:480px;margin:auto;padding:24px;border:1px solid #eee;border-radius:12px">
        <h2 style="margin:0 0 8px">Tenshi<span style="color:#6f39ee">.id</span></h2>
        <p>Kode verifikasi kamu:</p>
        <p style="font-size:32px;font-weight:800;letter-spacing:8px;margin:8px 0">${code}</p>
        <p style="color:#888;font-size:13px">Berlaku 10 menit. Jangan bagikan ke siapa pun.</p>
      </div>`,
    })
    return { sent: true }
  }

  // SMTP belum dikonfigurasi (mode dev): tampilkan di log agar tetap bisa diuji.
  console.log(`[verifikasi] SMTP belum diset — kode untuk ${email}: ${code}`)
  const devCode = process.env.NODE_ENV === 'production' ? undefined : code
  return { sent: false, devCode }
}

// ---------------------------------------------------------------
// Google OAuth (Login with Google)
// Redirect URI = halaman callback frontend (lihat GOOGLE_REDIRECT_URI).
// ---------------------------------------------------------------
function getGoogleClient() {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI } = process.env
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) return null
  return new OAuth2Client(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI || 'https://tenshi.my.id/auth/google/callback',
  )
}

async function loadUserByToken(req) {
  const h = req.headers.authorization || ''
  const token = h.startsWith('Bearer ') ? h.slice(7) : null
  if (!token) return null
  try {
    const payload = jwt.verify(token, JWT_SECRET)
    const rows = await query('select id, email, username, role from members where id = $1', [payload.sub])
    return rows[0] || null
  } catch {
    return null
  }
}

async function requireAuth(req, res, next) {
  const user = await loadUserByToken(req)
  if (!user) return res.status(401).json({ error: 'Harus login' })
  req.user = user
  next()
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Akses admin diperlukan' })
  next()
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const isValidUuid = v => UUID_RE.test(String(v || ''))

// ---------------------------------------------------------------
// Helpers manga
// ---------------------------------------------------------------
const MANGA_SELECT = `
  select m.*,
    coalesce((select json_agg(json_build_object('id', g.id, 'name', g.name) order by g.name)
              from manga_genres mg join genres g on g.id = mg.genre_id where mg.manga_id = m.id), '[]') as genres,
    coalesce((select json_agg(json_build_object('id', a.id, 'name', a.name, 'role', a.role) order by a.name)
              from manga_authors ma join authors a on a.id = ma.author_id where ma.manga_id = m.id), '[]') as authors
  from manga m
`

function formatDate(d) {
  if (!d) return ''
  if (d instanceof Date) return d.toISOString().slice(0, 10)
  return String(d).slice(0, 10)
}

function mapManga(row) {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    original_name: row.original_name || undefined,
    type: row.type,
    status: row.status,
    description: row.description || '',
    cover_url: row.cover_url || '',
      banner_url: row.banner_url || undefined,
      shinigami_id: row.shinigami_id || undefined,
    alternative_names: row.alternative_names || [],
    views_count: Number(row.views_count || 0),
    follows_count: Number(row.follows_count || 0),
    rating: Number(row.rating || 0),
    rating_count: Number(row.rating_count || 0),
    tags: row.tags || [],
    genres: row.genres || [],
    authors: row.authors || [],
    release_date: formatDate(row.release_date),
    created_at: row.created_at ? new Date(row.created_at).toISOString() : '',
  }
}

function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

// Shinigami gateway. Semua request dari UI lewat backend supaya tidak terkena
// CORS dan agar URL gambar yang dapat diproxy dibatasi pada CDN sumbernya.
async function shinigamiJson(path) {
  const response = await fetch(`${SHINIGAMI_API_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      Origin: SHINIGAMI_ORIGIN,
      Referer: `${SHINIGAMI_ORIGIN}/`,
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    },
    signal: AbortSignal.timeout(30_000),
  })
  if (!response.ok) throw new Error(`Sumber chapter tidak tersedia (HTTP ${response.status})`)
  return response.json()
}

function shinigamiChapters(mangaId, payload) {
  const list = Array.isArray(payload)
    ? payload
    : payload?.chapter_list || payload?.data || []
  if (!Array.isArray(list)) return []
  // Sumber mengirim chapter terbaru lebih dulu, sementara reader lokal
  // mengharapkan urutan naik agar tombol sebelumnya/berikutnya benar.
  return [...list].reverse()
    .map((item, index) => {
      const id = item.chapter_id || item.id
      if (!id) return null
      const number = String(item.chapter_number || item.name || item.number || '').replace(/\.0$/, '')
      const title = item.chapter_title || item.title || ''
      const timestamp = Date.parse(item.release_date || item.date || item.created_at || '')
      return {
        id: String(id), manga_id: mangaId, name: title ? `Chapter ${number} - ${title}` : `Chapter ${number}`,
        type: 'chapter', sort_order: index + 1,
        release_timestamp: Number.isNaN(timestamp) ? 0 : Math.floor(timestamp / 1000), pages: [],
        source: 'shinigami',
      }
    })
    .filter(Boolean)
}

async function syncShinigamiChapters(mangaId, chapters) {
  const rows = chapters.filter(chapter => isValidUuid(chapter.id)).map(chapter => ({
    id: chapter.id,
    manga_id: mangaId,
    name: chapter.name,
    type: chapter.type,
    sort_order: chapter.sort_order,
    release_timestamp: chapter.release_timestamp,
    pages: [],
  }))
  if (!rows.length) return
  await query(
    `insert into chapters (id, manga_id, name, type, sort_order, release_timestamp, pages)
     select id, manga_id, name, type, sort_order, release_timestamp, pages
     from jsonb_to_recordset($1::jsonb) as source(
       id uuid, manga_id uuid, name text, type text, sort_order int, release_timestamp bigint, pages jsonb
     )
     on conflict (id) do update set
       name = excluded.name,
       sort_order = excluded.sort_order,
       release_timestamp = excluded.release_timestamp`,
    [JSON.stringify(rows)],
  )
}

function shinigamiPages(payload) {
  if (Array.isArray(payload)) return payload.map((p, index) => ({ index, imageUrl: p.image_url || p.url || p }))
  const chapter = payload?.data?.chapter
  const pageList = payload?.page_list?.chapter_page
  const pages = chapter?.data || pageList?.pages || payload?.pages || []
  const baseUrl = payload?.data?.base_url || payload?.data?.base_url_low || payload?.base_url || (pageList ? 'https://storage.shngm.id' : '')
  const path = chapter?.path || pageList?.path || payload?.path || ''
  if (!Array.isArray(pages)) return []
  return pages.map((page, index) => ({ index, imageUrl: typeof page === 'string' && /^https?:\/\//.test(page) ? page : `${baseUrl}${path}${page}` }))
}

function isAllowedShinigamiImage(value) {
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && ['storage.shngm.id', 'delivery.shngm.id', 'assets.shngm.id'].includes(url.hostname)
  } catch {
    return false
  }
}

function shinigamiMangaType(item) {
  const format = (item.taxonomy?.Format || []).map(entry => entry.name).join(' ').toLowerCase()
  if (format.includes('manhua')) return 'manhua'
  if (format.includes('manga')) return 'manga'
  return 'manhwa'
}

function shinigamiMangaStatus(value) {
  if (Number(value) === 2) return 'Completed'
  return 'Ongoing'
}

async function getShinigamiCatalog() {
  const first = await shinigamiJson('/v1/manga/list?page=1&page_size=100&sort=latest')
  const totalPages = Math.min(Number(first.meta?.total_page || 1), 1000)
  const catalog = [...(first.data || [])]
  for (let page = 2; page <= totalPages; page += 1) {
    const response = await shinigamiJson(`/v1/manga/list?page=${page}&page_size=100&sort=latest`)
    catalog.push(...(response.data || []))
  }
  return catalog.filter(item => item?.manga_id && item?.title)
}

function normalizeTitleKey(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[\u2018\u2019'`]/g, "'")
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

async function importShinigamiCatalog() {
  const catalog = await getShinigamiCatalog()
  const existing = await query('select id, title, shinigami_id from manga')
  const byTitle = new Map(existing.map(row => [normalizeTitleKey(row.title), row]))
  let linked = 0

  // Hubungkan dahulu judul lokal yang namanya sama agar tidak muncul duplikat.
  for (const item of catalog) {
    const local = byTitle.get(normalizeTitleKey(item.title))
    if (local && !local.shinigami_id) {
      await query('update manga set shinigami_id = $1 where id = $2', [item.manga_id, local.id])
      local.shinigami_id = item.manga_id
      linked += 1
    }
  }

  const rows = catalog.map(item => ({
    slug: `${slugify(item.title).slice(0, 80) || 'manga'}-${String(item.manga_id).slice(0, 8)}`,
    title: item.title,
    type: shinigamiMangaType(item),
    status: shinigamiMangaStatus(item.status),
    description: item.description || '',
    cover_url: item.cover_portrait_url || item.cover_image_url || '',
    banner_url: item.cover_image_url || '',
    shinigami_id: item.manga_id,
    alternative_names: String(item.alternative_title || '').split(',').map(name => name.trim()).filter(Boolean),
    tags: (item.taxonomy?.Genre || []).map(genre => genre.name).filter(Boolean),
  }))
  if (!rows.length) return { total: 0, linked, imported: 0 }

  const result = await query(
    `insert into manga (slug, title, type, status, description, cover_url, banner_url, shinigami_id, alternative_names, tags)
     select slug, title, type, status, description, cover_url, banner_url, shinigami_id, alternative_names, tags
     from jsonb_to_recordset($1::jsonb) as source(
       slug text, title text, type text, status text, description text, cover_url text, banner_url text,
       shinigami_id text, alternative_names text[], tags text[]
     )
     on conflict (shinigami_id) where shinigami_id is not null do update set
       title = excluded.title,
       type = excluded.type,
       status = excluded.status,
       description = excluded.description,
       cover_url = case when manga.cover_url like '%placehold.co%' or manga.cover_url = '' or manga.cover_url is null
                        then excluded.cover_url else manga.cover_url end,
       banner_url = case when manga.banner_url like '%placehold.co%' or manga.banner_url = '' or manga.banner_url is null
                         then excluded.banner_url else manga.banner_url end,
       alternative_names = excluded.alternative_names,
       tags = excluded.tags
     returning id`,
    [JSON.stringify(rows)],
  )
  return { total: catalog.length, linked, imported: result.length }
}

async function setLinks(mangaId, genreNames, authorNames) {
  await query('delete from manga_genres where manga_id = $1', [mangaId])
  await query('delete from manga_authors where manga_id = $1', [mangaId])
  for (const name of genreNames) {
    if (!name.trim()) continue
    const g = await query(
      `insert into genres (name) values ($1)
       on conflict (name) do update set name = excluded.name returning id`,
      [name.trim()],
    )
    await query('insert into manga_genres (manga_id, genre_id) values ($1, $2) on conflict do nothing', [mangaId, g[0].id])
  }
  for (const name of authorNames) {
    if (!name.trim()) continue
    const a = await query(
      `insert into authors (name) values ($1)
       on conflict (name) do update set name = excluded.name returning id`,
      [name.trim()],
    )
    await query('insert into manga_authors (manga_id, author_id) values ($1, $2) on conflict do nothing', [mangaId, a[0].id])
  }
}

// ---------------------------------------------------------------
// App
// ---------------------------------------------------------------
const app = express()
app.use(cors())
app.use(compression())
app.use(express.json({ limit: '2mb' }))

// ---------------------------------------------------------------
// In-Memory Cache untuk performa instan (< 5ms)
// ---------------------------------------------------------------
let mangaCache = null
let mangaCacheTime = 0
const CACHE_TTL = 3 * 60 * 1000 // 3 menit

async function getCachedMangaList(force = false) {
  const now = Date.now()
  if (!force && mangaCache && now - mangaCacheTime < CACHE_TTL) {
    return mangaCache
  }
  const rows = await query(`${MANGA_SELECT} order by m.views_count desc limit 3000`)
  mangaCache = rows.map(mapManga)
  mangaCacheTime = Date.now()
  return mangaCache
}

function invalidateMangaCache() {
  mangaCache = null
  mangaCacheTime = 0
}

// URL absolut ke backend sendiri (relatif /api/... rusak saat frontend
// di-host terpisah seperti Netlify). Di localhost pakai protokol request,
// di hosting selalu https agar tidak mixed-content.
function absoluteUrl(req, path) {
  const host = req.get('host') || ''
  const proto = /localhost|127\.0\.0\.1/.test(host) ? req.protocol : 'https'
  return `${proto}://${host}${path}`
}

function proxyImageUrl(req, imageUrl) {
  return absoluteUrl(req, `/api/shinigami/image?url=${encodeURIComponent(imageUrl)}`)
}

// Health check sekaligus jaga Neon tetap hangat (SELECT ringan).
// Dipanggil Cron tiap 5 menit agar Render + Neon tidak sleep.
app.get('/api/health', async (_req, res) => {
  try {
    await query('select 1 as ok')
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ ok: false })
  }
})

// ---------------- SHINIGAMI (live chapter source) ----------------
app.get('/api/shinigami/chapter/:chapterId/pages', async (req, res) => {
  try {
    // 1) Utamakan pages yang sudah tersimpan di DB (hasil sync lokal) —
    //    tetap bisa dibaca meski IP server diblokir sumber.
    if (isValidUuid(req.params.chapterId)) {
      const stored = await query('select pages from chapters where id = $1', [req.params.chapterId])
      const saved = stored[0]?.pages
      if (Array.isArray(saved) && saved.length) {
        return res.json(
          saved.map((page, index) => ({
            index,
            url: proxyImageUrl(req, typeof page === 'string' ? page : page.url),
          })),
        )
      }
    }
    // 2) Live dari sumber.
    const payload = await shinigamiJson(`/v1/chapter/detail/${encodeURIComponent(req.params.chapterId)}`)
    const pages = shinigamiPages(payload)
      .filter(page => isAllowedShinigamiImage(page.imageUrl))
      .map(page => ({ index: page.index, url: proxyImageUrl(req, page.imageUrl) }))
    res.json(pages)
  } catch (e) {
    console.error(e)
    res.status(502).json({ error: e.message || 'Gagal mengambil halaman chapter' })
  }
})

app.get('/api/shinigami/image', async (req, res) => {
  const imageUrl = String(req.query.url || '')
  if (!isAllowedShinigamiImage(imageUrl)) return res.status(400).json({ error: 'URL gambar tidak diizinkan' })
  try {
    const upstream = await fetch(imageUrl, {
      headers: {
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
        Origin: SHINIGAMI_ORIGIN,
        Referer: `${SHINIGAMI_ORIGIN}/`,
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(30_000),
    })
    if (!upstream.ok) throw new Error(`Gambar tidak tersedia (HTTP ${upstream.status})`)
    res.set('Content-Type', upstream.headers.get('content-type') || 'image/jpeg')
    res.set('Cache-Control', 'public, max-age=3600')
    res.send(Buffer.from(await upstream.arrayBuffer()))
  } catch (e) {
    console.error(e)
    res.status(502).json({ error: e.message || 'Gagal memuat gambar' })
  }
})

app.post('/api/admin/shinigami/import', requireAuth, requireAdmin, async (_req, res) => {
  try {
    const r = await importShinigamiCatalog()
    invalidateMangaCache()
    res.json(r)
  } catch (e) {
    console.error(e)
    res.status(502).json({ error: e.message || 'Gagal mengimpor katalog Shinigami' })
  }
})

// ---------------- AUTH ----------------
// Pendaftaran khusus Gmail: buat akun (belum aktif) lalu kirim kode verifikasi.
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, username, password } = req.body || {}
    if (!email || !username || !password) return res.status(400).json({ error: 'Semua field wajib diisi' })
    const mail = String(email).toLowerCase().trim()
    if (!isGmail(mail)) return res.status(400).json({ error: 'Pendaftaran hanya untuk email @gmail.com' })
    if (String(password).length < 6) return res.status(400).json({ error: 'Password minimal 6 karakter' })
    if (String(username).trim().length < 3) return res.status(400).json({ error: 'Username minimal 3 karakter' })

    const existing = (await query('select * from members where email = $1', [mail]))[0]
    if (existing && existing.email_verified) {
      return res.status(400).json({ error: 'Email sudah terdaftar. Silakan masuk.' })
    }
    const hash = await bcrypt.hash(String(password), 10)
    if (existing) {
      await query('update members set username = $1, password_hash = $2 where email = $3', [
        String(username).trim(),
        hash,
        mail,
      ])
    } else {
      await query(
        `insert into members (email, username, password_hash, email_verified) values ($1, $2, $3, false)`,
        [mail, String(username).trim(), hash],
      ).catch(e => {
        if (String(e.code) === '23505') {
          const err = new Error('Email sudah terdaftar. Silakan masuk.')
          err.status = 400
          throw err
        }
        throw e
      })
    }
    const result = await createAndSendCode(mail)
    res.json({ needsVerification: true, email: mail, emailSent: result.sent, devCode: result.devCode })
  } catch (e) {
    console.error(e)
    res.status(e.status || 500).json({ error: e.message || 'Gagal mendaftar' })
  }
})

// Verifikasi kode 6 digit → akun aktif + langsung login (dapat token).
app.post('/api/auth/verify-email', async (req, res) => {
  try {
    const { email, code } = req.body || {}
    if (!email || !code) return res.status(400).json({ error: 'Email dan kode wajib diisi' })
    const mail = String(email).toLowerCase().trim()
    const row = (await query('select * from email_verification_codes where email = $1', [mail]))[0]
    if (!row) return res.status(400).json({ error: 'Kode tidak ditemukan. Minta kode baru.', needsCode: true })
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await query('delete from email_verification_codes where email = $1', [mail])
      return res.status(400).json({ error: 'Kode kedaluwarsa. Minta kode baru.', needsCode: true })
    }
    if (Number(row.attempts) >= CODE_MAX_ATTEMPTS) {
      await query('delete from email_verification_codes where email = $1', [mail])
      return res.status(429).json({ error: 'Terlalu banyak percobaan. Minta kode baru.', needsCode: true })
    }
    const ok = await bcrypt.compare(String(code).trim(), row.code_hash)
    if (!ok) {
      await query('update email_verification_codes set attempts = attempts + 1 where email = $1', [mail])
      return res.status(401).json({ error: 'Kode salah. Periksa lagi 6 digitnya.' })
    }
    await query('delete from email_verification_codes where email = $1', [mail])
    const users = await query(
      `update members set email_verified = true where email = $1
       returning id, email, username, role, email_verified`,
      [mail],
    )
    const user = users[0]
    if (!user) return res.status(404).json({ error: 'Akun tidak ditemukan. Daftar ulang.' })
    res.json({ token: signToken(user), user: publicUser(user) })
  } catch (e) {
    console.error(e)
    res.status(e.status || 500).json({ error: e.message || 'Gagal verifikasi' })
  }
})

// Kirim ulang kode (ada jeda 60 detik anti-spam).
app.post('/api/auth/resend-code', async (req, res) => {
  try {
    const { email } = req.body || {}
    if (!email) return res.status(400).json({ error: 'Email wajib diisi' })
    const mail = String(email).toLowerCase().trim()
    if (!isGmail(mail)) return res.status(400).json({ error: 'Pendaftaran hanya untuk email @gmail.com' })
    const member = (await query('select * from members where email = $1', [mail]))[0]
    if (!member) return res.status(404).json({ error: 'Email belum terdaftar. Daftar dulu.' })
    if (member.email_verified) return res.status(400).json({ error: 'Email sudah terverifikasi. Silakan masuk.' })
    const last = (await query('select * from email_verification_codes where email = $1', [mail]))[0]
    if (last) {
      const waitMs = new Date(last.created_at).getTime() + RESEND_COOLDOWN_MS - Date.now()
      if (waitMs > 0) {
        const err = new Error(`Tunggu ${Math.ceil(waitMs / 1000)} detik sebelum minta kode baru.`)
        err.status = 429
        throw err
      }
    }
    const result = await createAndSendCode(mail)
    res.json({ ok: true, email: mail, emailSent: result.sent, devCode: result.devCode })
  } catch (e) {
    console.error(e)
    res.status(e.status || 500).json({ error: e.message || 'Gagal mengirim kode' })
  }
})

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {}
    if (!email || !password) return res.status(400).json({ error: 'Email dan password wajib diisi' })
    const rows = await query('select * from members where email = $1', [String(email).toLowerCase().trim()])
    const row = rows[0]
    if (!row) return res.status(401).json({ error: 'Email atau password salah' })
    if (!row.password_hash) {
      return res.status(401).json({ error: 'Akun ini memakai Login with Google. Gunakan tombol Google.' })
    }
    const ok = await bcrypt.compare(String(password), row.password_hash)
    if (!ok) return res.status(401).json({ error: 'Email atau password salah' })
    if (!row.email_verified) {
      return res.status(403).json({ error: 'Email belum diverifikasi. Cek kode di Gmail kamu.', needsVerification: true, email: row.email })
    }
    res.json({ token: signToken(row), user: publicUser(row) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal login' })
  }
})

// URL login Google (frontend redirect ke sini hasilnya).
app.get('/api/auth/google/url', (req, res) => {
  const client = getGoogleClient()
  if (!client) return res.status(500).json({ error: 'Login Google belum dikonfigurasi di server.' })
  const url = client.generateAuthUrl({
    access_type: 'online',
    scope: ['openid', 'email', 'profile'],
    prompt: 'select_account',
  })
  res.json({ url })
})

// Callback: tukar code Google → verifikasi → buat/tautkan akun → token JWT.
app.post('/api/auth/google', async (req, res) => {
  try {
    const client = getGoogleClient()
    if (!client) return res.status(500).json({ error: 'Login Google belum dikonfigurasi di server.' })
    const { code } = req.body || {}
    if (!code) return res.status(400).json({ error: 'Kode Google tidak ada.' })

    const { tokens } = await client.getToken(String(code))
    if (!tokens.id_token) return res.status(401).json({ error: 'Token Google tidak valid.' })
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload() || {}
    if (!payload.email_verified) return res.status(401).json({ error: 'Email Google belum terverifikasi.' })
    const mail = String(payload.email || '').toLowerCase().trim()
    if (!isGmail(mail)) return res.status(403).json({ error: 'Hanya akun @gmail.com yang bisa masuk.' })
    const sub = String(payload.sub || '')
    if (!sub) return res.status(401).json({ error: 'Akun Google tidak valid.' })

    let row = (await query('select * from members where google_sub = $1', [sub]))[0]
    if (!row) {
      const byEmail = (await query('select * from members where email = $1', [mail]))[0]
      if (byEmail) {
        // Tautkan akun lama (daftar via password) ke Google.
        row = (await query(
          `update members set google_sub = $1, email_verified = true where email = $2
           returning id, email, username, role, email_verified`,
          [sub, mail],
        ))[0]
      } else {
        // Akun baru dari Google: username dari nama/email, unik otomatis.
        const base = String(payload.name || mail.split('@')[0]).trim().slice(0, 24) || 'user'
        const uname = `${base}-${sub.slice(-4)}`.toLowerCase().replace(/[^a-z0-9._-]/g, '') || `user-${sub.slice(-4)}`
        row = (await query(
          `insert into members (email, username, password_hash, role, email_verified, google_sub)
           values ($1, $2, null, 'user', true, $3)
           returning id, email, username, role, email_verified`,
          [mail, uname, sub],
        ))[0]
      }
    }
    res.json({ token: signToken(row), user: publicUser(row) })
  } catch (e) {
    console.error(e)
    res.status(401).json({ error: 'Login Google gagal. Coba lagi.' })
  }
})

app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: publicUser(req.user) }))

// Ganti username sendiri (login wajib).
app.put('/api/me/username', requireAuth, async (req, res) => {
  try {
    const username = String((req.body || {}).username || '').trim()
    if (username.length < 3) return res.status(400).json({ error: 'Username minimal 3 karakter' })
    if (username.length > 24) return res.status(400).json({ error: 'Username maksimal 24 karakter' })
    const rows = await query(
      `update members set username = $1 where id = $2
       returning id, email, username, role, email_verified`,
      [username, req.user.id],
    )
    if (!rows[0]) return res.status(404).json({ error: 'Akun tidak ditemukan' })
    res.json({ user: publicUser(rows[0]) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal memperbarui username' })
  }
})

// ---------------- MANGA (public read) ----------------
app.get('/api/manga/home', async (_req, res) => {
  try {
    const list = await getCachedMangaList()
    const byCreated = [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    const byViews = [...list].sort((a, b) => b.views_count - a.views_count)
    const byFollows = [...list].sort((a, b) => b.follows_count - a.follows_count)

    res.json({
      updates: byCreated.slice(0, 12),
      recommendation: {
        manhwa: list.filter(m => m.type === 'manhwa').slice(0, 6),
        manga: list.filter(m => m.type === 'manga').slice(0, 6),
        manhua: list.filter(m => m.type === 'manhua').slice(0, 6),
      },
      popular: {
        daily: byViews.slice(0, 8),
        weekly: list.slice(0, 8),
        all: byFollows.slice(0, 8),
      },
    })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal mengambil data home' })
  }
})

app.get('/api/manga', async (req, res) => {
  try {
    const { type, search, genre, order, limit, offset } = req.query
    const all = await getCachedMangaList()
    let result = all

    if (type && type !== 'semua') {
      result = result.filter(m => m.type === type)
    }
    if (genre && genre !== 'Semua') {
      const gLower = String(genre).toLowerCase()
      result = result.filter(m =>
        (m.genres || []).some(g => g.name.toLowerCase() === gLower) ||
        (m.tags || []).some(t => String(t).toLowerCase() === gLower)
      )
    }
    if (search) {
      const q = String(search).toLowerCase().trim()
      result = result.filter(m => {
        return (
          m.title.toLowerCase().includes(q) ||
          (m.original_name && m.original_name.toLowerCase().includes(q)) ||
          (m.alternative_names || []).some(a => String(a).toLowerCase().includes(q))
        )
      })
    }

    if (order === 'latest') {
      result = [...result].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    } else if (order === 'follows') {
      result = [...result].sort((a, b) => b.follows_count - a.follows_count)
    } else if (order === 'rating') {
      result = [...result].sort((a, b) => b.rating - a.rating)
    } else if (order === 'title') {
      result = [...result].sort((a, b) => a.title.localeCompare(b.title))
    } else {
      result = [...result].sort((a, b) => b.views_count - a.views_count)
    }

    if (limit) {
      const l = parseInt(String(limit), 10) || 100
      const o = parseInt(String(offset || 0), 10) || 0
      result = result.slice(o, o + l)
    }

    res.json(result)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal mengambil data' })
  }
})

app.get('/api/manga/:slug', async (req, res) => {
  try {
    if (mangaCache) {
      const found = mangaCache.find(m => m.slug === req.params.slug)
      if (found) return res.json(found)
    }
    const rows = await query(`${MANGA_SELECT} where m.slug = $1 limit 1`, [req.params.slug])
    if (!rows[0]) return res.status(404).json({ error: 'Judul tidak ditemukan' })
    res.json(mapManga(rows[0]))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal mengambil data' })
  }
})

// ---------------- MANGA (admin write) ----------------
app.post('/api/manga', requireAuth, requireAdmin, async (req, res) => {
  try {
    const b = req.body || {}
    if (!b.title) return res.status(400).json({ error: 'Judul wajib diisi' })
    const slug = slugify(b.slug || b.title)
    const rows = await query(
      `insert into manga (slug, title, original_name, type, status, description, cover_url, banner_url,
                          shinigami_id, alternative_names, release_date, tags)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) returning id`,
      [slug, b.title, b.original_name || null, b.type, b.status,
       b.description || '', b.cover_url || '', b.banner_url || null,
         String(b.shinigami_id || '').trim() || null,
         (b.alternative_names || []).filter(Boolean), b.release_date || null,
         (b.tags || []).filter(Boolean)],
    )
    await setLinks(rows[0].id, b.genreNames || [], b.authorNames || [])
    invalidateMangaCache()
    res.json({ id: rows[0].id })
  } catch (e) {
    console.error(e)
    if (String(e.code) === '23505') return res.status(400).json({ error: 'Slug atau judul sudah dipakai' })
    res.status(500).json({ error: 'Gagal menyimpan buku' })
  }
})

app.put('/api/manga/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!isValidUuid(id)) return res.status(400).json({ error: 'ID tidak valid' })
    const b = req.body || {}
    const slug = slugify(b.slug || b.title)
    await query(
      `update manga set slug=$1, title=$2, original_name=$3, type=$4, status=$5, description=$6,
        cover_url=$7, banner_url=$8, shinigami_id=$9, alternative_names=$10, release_date=$11, tags=$12
       where id=$13`,
      [slug, b.title, b.original_name || null, b.type, b.status,
       b.description || '', b.cover_url || '', b.banner_url || null,
         String(b.shinigami_id || '').trim() || null,
         (b.alternative_names || []).filter(Boolean), b.release_date || null,
         (b.tags || []).filter(Boolean), id],
    )
    await setLinks(id, b.genreNames || [], b.authorNames || [])
    invalidateMangaCache()
    res.json({ id })
  } catch (e) {
    console.error(e)
    if (String(e.code) === '23505') return res.status(400).json({ error: 'Slug atau judul sudah dipakai' })
    res.status(500).json({ error: 'Gagal memperbarui buku' })
  }
})

app.delete('/api/manga/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!isValidUuid(id)) return res.status(400).json({ error: 'ID tidak valid' })
    await query('delete from manga where id = $1', [id])
    invalidateMangaCache()
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal menghapus buku' })
  }
})

// ---------------- GENRES & AUTHORS ----------------
app.get('/api/genres', async (req, res) => {
  try {
    res.json(await query('select id, name from genres order by name asc'))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal mengambil genre' })
  }
})

app.post('/api/genres', requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = String((req.body || {}).name || '').trim()
    if (!name) return res.status(400).json({ error: 'Nama genre wajib diisi' })
    await query(`insert into genres (name) values ($1) on conflict (name) do nothing`, [name])
    const rows = await query('select id, name from genres where name = $1', [name])
    res.json(rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal menambah genre' })
  }
})

app.delete('/api/genres/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!isValidUuid(id)) return res.status(400).json({ error: 'ID tidak valid' })
    await query('delete from genres where id = $1', [id])
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal menghapus genre' })
  }
})

app.get('/api/authors', async (req, res) => {
  try {
    res.json(await query('select id, name, role from authors order by name asc'))
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal mengambil pengarang' })
  }
})

app.post('/api/authors', requireAuth, requireAdmin, async (req, res) => {
  try {
    const name = String((req.body || {}).name || '').trim()
    const role = String((req.body || {}).role || 'author').trim()
    if (!name) return res.status(400).json({ error: 'Nama pengarang wajib diisi' })
    await query(`insert into authors (name, role) values ($1, $2) on conflict (name) do nothing`, [name, role])
    const rows = await query('select id, name, role from authors where name = $1', [name])
    res.json(rows[0])
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal menambah pengarang' })
  }
})

app.delete('/api/authors/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!isValidUuid(id)) return res.status(400).json({ error: 'ID tidak valid' })
    await query('delete from authors where id = $1', [id])
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal menghapus pengarang' })
  }
})

// ---------------- CHAPTERS ----------------
app.get('/api/manga/:mangaId/chapters', async (req, res) => {
  try {
    const { mangaId } = req.params
    if (!isValidUuid(mangaId)) return res.status(400).json({ error: 'ID tidak valid' })
    const source = await query('select shinigami_id from manga where id = $1', [mangaId])
    if (!source[0]) return res.status(404).json({ error: 'Judul tidak ditemukan' })
    // Live-first: coba ambil dari sumber. Kalau gagal (mis. IP server
    // diblokir sumber) jatuh ke baris lokal hasil sync agar tidak 500.
    if (source[0].shinigami_id) {
      try {
        const payload = await shinigamiJson(`/v1/chapter/${encodeURIComponent(source[0].shinigami_id)}/list?page_size=3000`)
        const chapters = shinigamiChapters(mangaId, payload)
        await syncShinigamiChapters(mangaId, chapters)
        return res.json(chapters)
      } catch (liveError) {
        console.error(liveError)
      }
    }
    // ?slim=1: daftar tanpa blob pages (jauh lebih ringan untuk judul
    // dengan ratusan chapter). Reader/admin yang butuh pages memintanya
    // terpisah via endpoint pages.
    const slim = req.query.slim === '1'
    const rows = await query(
      slim
        ? 'select id, manga_id, name, type, sort_order, release_timestamp, pdf_url from chapters where manga_id = $1 order by sort_order asc'
        : 'select id, manga_id, name, type, sort_order, release_timestamp, pages, pdf_url from chapters where manga_id = $1 order by sort_order asc',
      [mangaId],
    )
    res.json(
      rows.map(r => ({
        ...r,
        pages: slim ? [] : r.pages || [],
        pdf_url: r.pdf_url || undefined,
        // Baris lokal milik judul mirror diperlakukan seperti chapter
        // sumber agar reader memuat pages lewat endpoint shinigami
        // (yang membaca dari DB lebih dulu).
        ...(source[0].shinigami_id ? { source: 'shinigami' } : {}),
      })),
    )
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal mengambil chapter' })
  }
})

app.post('/api/manga/:mangaId/chapters', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { mangaId } = req.params
    if (!isValidUuid(mangaId)) return res.status(400).json({ error: 'ID tidak valid' })
    const b = req.body || {}
    if (!b.name) return res.status(400).json({ error: 'Nama chapter wajib diisi' })
    const count = await query('select count(*)::int as n from chapters where manga_id = $1', [mangaId])
    const rows = await query(
      `insert into chapters (manga_id, name, type, sort_order, release_timestamp, pages, pdf_url)
       values ($1, $2, $3, $4, $5, $6, $7) returning id`,
      [mangaId, b.name, 'chapter', count[0].n + 1, Math.floor(Date.now() / 1000), JSON.stringify(b.pages || []), b.pdf_url || null],
    )
    res.json({ id: rows[0].id })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal menambah chapter' })
  }
})

app.put('/api/chapters/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!isValidUuid(id)) return res.status(400).json({ error: 'ID tidak valid' })
    const b = req.body || {}
    await query('update chapters set name = $1, pages = $2, pdf_url = $3 where id = $4', [b.name, JSON.stringify(b.pages || []), b.pdf_url || null, id])
    res.json({ id })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal memperbarui chapter' })
  }
})

app.delete('/api/chapters/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params
    if (!isValidUuid(id)) return res.status(400).json({ error: 'ID tidak valid' })
    await query('delete from chapters where id = $1', [id])
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal menghapus chapter' })
  }
})

// ---------------- LIKES / LIBRARY ----------------
app.get('/api/me/likes', requireAuth, async (req, res) => {
  try {
    const rows = await query('select manga_id from likes where user_id = $1', [req.user.id])
    res.json({ ids: rows.map(r => r.manga_id) })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal mengambil library' })
  }
})

app.post('/api/me/likes/:mangaId', requireAuth, async (req, res) => {
  try {
    const { mangaId } = req.params
    if (!isValidUuid(mangaId)) return res.status(400).json({ error: 'ID tidak valid' })
    const exists = await query('select 1 from likes where user_id = $1 and manga_id = $2', [req.user.id, mangaId])
    let liked
    if (exists[0]) {
      await query('delete from likes where user_id = $1 and manga_id = $2', [req.user.id, mangaId])
      liked = false
    } else {
      await query('insert into likes (user_id, manga_id) values ($1, $2) on conflict do nothing', [req.user.id, mangaId])
      liked = true
    }
    res.json({ liked })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal memperbarui library' })
  }
})

// ---------------- HISTORY / RIWAYAT BACA ----------------
app.get('/api/me/history', requireAuth, async (req, res) => {
  try {
    const rows = await query(
      `select h.manga_id, h.chapter_id, h.chapter_name, h.updated_at,
              m.slug, m.title, m.cover_url
       from history h join manga m on m.id = h.manga_id
       where h.user_id = $1 order by h.updated_at desc`,
      [req.user.id],
    )
    res.json(rows)
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal mengambil riwayat' })
  }
})

app.put('/api/me/history', requireAuth, async (req, res) => {
  try {
    const { manga_id, chapter_id, chapter_name } = req.body || {}
    if (!manga_id || !isValidUuid(manga_id)) return res.status(400).json({ error: 'ID judul tidak valid' })
    if (chapter_id && !isValidUuid(chapter_id)) return res.status(400).json({ error: 'ID chapter tidak valid' })
    await query(
      `insert into history (user_id, manga_id, chapter_id, chapter_name, updated_at)
       values ($1, $2, $3, $4, now())
       on conflict (user_id, manga_id) do update set
         chapter_id = excluded.chapter_id,
         chapter_name = excluded.chapter_name,
         updated_at = now()`,
      [req.user.id, manga_id, chapter_id || null, String(chapter_name || '')],
    )
    res.json({ ok: true })
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal menyimpan riwayat' })
  }
})

app.delete('/api/me/history/:mangaId', requireAuth, async (req, res) => {
  try {
    await query('delete from history where user_id = $1 and manga_id = $2', [req.user.id, req.params.mangaId])
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal menghapus riwayat' })
  }
})

app.delete('/api/me/history', requireAuth, async (req, res) => {
  try {
    await query('delete from history where user_id = $1', [req.user.id])
    res.status(204).end()
  } catch (e) {
    console.error(e)
    res.status(500).json({ error: 'Gagal menghapus riwayat' })
  }
})

// ---------------------------------------------------------------
// Start
// ---------------------------------------------------------------
ensureSchema()
  .then(() => {
    const server = app.listen(PORT)
    server.on('error', err => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} sudah digunakan. Hentikan server lama (atau ubah PORT di server/.env), lalu jalankan ulang.`)
        process.exit(1)
      }
      throw err
    })
    server.on('listening', () => {
      console.log(`Tenshi.id server berjalan di http://localhost:${PORT}`)
      console.log('Database Neon: OK (skema siap)')
      console.log('Akun admin demo: admin@tenshi.id / admin123')
    })
  })
  .catch(err => {
    console.error('Gagal menyiapkan database:', err.message)
    process.exit(1)
  })
