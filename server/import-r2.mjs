// Impor 1 folder R2 langsung jadi buku + chapter di database.
// Struktur R2 yang didukung: <prefix>/chap-1/*.webp, <prefix>/chap-2/*, ...
// Dijalankan dari LAPTOP (butuh kredensial R2 + DATABASE_URL di server/.env).
//
// Isi dulu di server/.env (JANGAN di-commit):
//   R2_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
//   R2_ACCESS_KEY_ID="..."
//   R2_SECRET_ACCESS_KEY="..."
//   R2_BUCKET="chapter"
//   R2_PUBLIC_URL="https://img.tenshi.my.id"   (atau pub-xxx.r2.dev sementara)
//
// Pakai:
//   node import-r2.mjs --title="Man With The Ghost" --prefix="man with the ghost" --type=manhwa
//   node import-r2.mjs --title="Judul" --prefix="judul-slug" --type=manga --status=Completed
//
// Aman diulang: manga yang slug-nya sama dipakai lagi, chapter yang namanya
// sudah ada dilewati.
// Script node import-r2.mjs --title="Man With The Ghost" --prefix="man with the ghost" --type=manhwa

import dotenv from 'dotenv'
import pg from 'pg'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

dotenv.config()

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(=(.*))?$/)
    return m ? [m[1], m[3] ?? true] : []
  }),
)

const TITLE = String(args.title || '').trim()
const PREFIX = String(args.prefix || '').trim().replace(/^\/+|\/+$/g, '')
const TYPE = ['manhwa', 'manga', 'manhua'].includes(args.type) ? args.type : 'manhwa'
const STATUS = ['Ongoing', 'Completed', 'Hiatus', 'Dropped'].includes(args.status) ? args.status : 'Ongoing'

if (!TITLE || !PREFIX) {
  console.error('Pakai: node import-r2.mjs --title="Judul" --prefix="nama-folder" [--type=manhwa] [--status=Ongoing]')
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
  console.error('ERROR: R2_PUBLIC_URL kosong. Isi di server/.env (mis. https://img.tenshi.my.id).')
  process.exit(1)
}

// Bentuk benar: https://<account-id>.r2.cloudflarestorage.com (TANPA /nama-bucket).
// Kalau keisi .../chapter, SDK salah alamat dan R2 jawab "key does not exist".
let endpoint = String(process.env.R2_ENDPOINT || '').trim().replace(/\/+$/, '')
{
  const m = endpoint.match(/^(https:\/\/[a-z0-9]+\.r2\.cloudflarestorage\.com)(\/.*)?$/)
  if (m) endpoint = m[1]
}
const s3 = new S3Client({
  region: 'auto',
  endpoint,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
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

// Urutan natural: chap-2 sebelum chap-10, imgi_2 sebelum imgi_10.
const natKey = s => String(s).split(/(\d+)/).map(p => (/^\d+$/.test(p) ? String(Number(p)).padStart(10, '0') : p)).join('')
const natSort = (a, b) => (natKey(a) < natKey(b) ? -1 : natKey(a) > natKey(b) ? 1 : 0)
const isImage = k => /\.(jpe?g|png|webp|gif|avif|bmp)$/i.test(k)
// Encode tiap segmen path (spasi -> %20) tapi pertahankan garis miring.
const publicUrl = key => `${PUBLIC_URL}/${key.split('/').map(encodeURIComponent).join('/')}`
const slugify = t => String(t).toLowerCase().trim().replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-')
const chapNum = p => {
  const m = String(p).match(/chap(?:ter)?[\s-_]*(\d+)/i)
  return m ? Number(m[1]) : null
}

async function listAll(prefix, delimiter) {
  const out = []
  let token
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: BUCKET, Prefix: prefix, Delimiter: delimiter, ContinuationToken: token, MaxKeys: 1000,
    }))
    out.push(res)
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)
  return out
}

async function main() {
  // 1. Daftar folder chapter di bawah prefix.
  const top = await listAll(PREFIX + '/', '/')
  const folders = (top.flatMap(r => r.CommonPrefixes || []).map(p => p.Prefix)).sort(natSort)
  if (!folders.length) {
    const root = await listAll('', '/')
    const names = root.flatMap(r => r.CommonPrefixes || []).map(p => p.Prefix)
    throw new Error(
      `Tidak ada subfolder di ${BUCKET}/${PREFIX}/.` +
      (names.length ? ` Folder di root bucket: ${names.join(' | ')} — pakai salah satu sebagai --prefix.` : ' Bucket kosong / prefix salah.') +
      ' Perhatikan huruf besar-kecil dan spasi harus persis.',
    )
  }
  console.log(`Ketemu ${folders.length} folder chapter.`)

  // 2. List gambar tiap folder.
  const chapters = []
  for (const folder of folders) {
    const pages = await listAll(folder)
    const files = pages.flatMap(r => r.Contents || []).map(o => o.Key).filter(isImage).sort(natSort)
    if (!files.length) {
      console.log(`  lewati ${folder} (kosong/bukan gambar)`)
      continue
    }
    const n = chapNum(folder) ?? chapters.length + 1
    chapters.push({
      folder,
      name: `Chapter ${n}`,
      sort: n,
      pages: files.map((key, i) => ({ index: i, url: publicUrl(key) })),
    })
    console.log(`  ${folder} -> Chapter ${n} (${files.length} hal)`)
  }
  if (!chapters.length) throw new Error('Tidak ada gambar di subfolder mana pun.')

  // 3. Pastikan baris manga (pakai lagi kalau slug sudah ada).
  const slug = slugify(TITLE).slice(0, 80) || 'manga'
  let manga = (await query('select id, slug, title, cover_url from manga where slug = $1', [slug]))[0]
  if (!manga) {
    const rows = await query(
      `insert into manga (slug, title, type, status, description, cover_url, banner_url)
       values ($1, $2, $3, $4, '', $5, '') returning id, slug, title, cover_url`,
      [slug, TITLE, TYPE, STATUS, chapters[0].pages[0]?.url || ''],
    )
    manga = rows[0]
    console.log(`Buku baru: ${TITLE} (${slug})`)
  } else {
    console.log(`Pakai buku lama: ${manga.title} (${manga.slug})`)
    if (!manga.cover_url && chapters[0].pages[0]) {
      await query('update manga set cover_url = $1 where id = $2', [chapters[0].pages[0].url, manga.id])
    }
  }

  // 4. Masukkan chapter yang belum ada (berdasar nama).
  const existing = await query('select name from chapters where manga_id = $1', [manga.id])
  const have = new Set(existing.map(r => r.name))
  const fresh = chapters.filter(c => !have.has(c.name))
  console.log(`${have.size} chapter sudah ada, ${fresh.length} baru.`)
  if (fresh.length) {
    const now = Math.floor(Date.now() / 1000)
    await query(
      `insert into chapters (manga_id, name, type, sort_order, release_timestamp, pages)
       select manga_id, name, type, sort_order, release_timestamp, pages
       from jsonb_to_recordset($1::jsonb) as source(
         manga_id uuid, name text, type text, sort_order int, release_timestamp bigint, pages jsonb
       )`,
      [JSON.stringify(fresh.map(c => ({
        manga_id: manga.id, name: c.name, type: 'chapter',
        // Nomor polos (1, 2, 3...) — sama dengan skema backend & Shinigami
        // agar chapter manual + impor selalu berurut benar.
        sort_order: c.sort, release_timestamp: now, pages: c.pages,
      })))],
    )
  }
  const pagesTotal = fresh.reduce((a, c) => a + c.pages.length, 0)
  console.log(`Selesai. Buku: ${manga.slug} — ${fresh.length} chapter baru, ${pagesTotal} halaman.`)
  await pool.end()
}

main().catch(async e => {
  console.error('GAGAL:', e.message)
  await pool.end().catch(() => {})
  process.exit(1)
})
