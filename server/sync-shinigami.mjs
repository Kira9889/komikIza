// Sync chapter Shinigami dari LAPTOP (bukan dari server hosting).
//
// Latar: IP datacenter (mis. Render) diblokir api.shngm.io (HTTP 403),
// sedangkan dari IP rumah biasanya lolos. Skrip ini menarik daftar chapter
// + halaman tiap chapter lalu menyimpannya ke Neon, sehingga web production
// tinggal membaca dari DB (backend sudah fallback ke DB lokal).
//
// Pakai DB production (jangan DB dev lokal):
//   PowerShell:  $env:DATABASE_URL="postgresql://..." ; node sync-shinigami.mjs
//   (atau isi server/.env dengan connection string production)
//
// Opsi:
//   node sync-shinigami.mjs                    # semua judul mirror + pages
//   node sync-shinigami.mjs --skip-pages       # daftar chapter saja
//   node sync-shinigami.mjs --manga=<id|slug>  # satu judul saja
//   node sync-shinigami.mjs --limit=5          # batasi jumlah judul
//   node sync-shinigami.mjs --limit=100 --offset=200  # cicil per batch
//   node sync-shinigami.mjs --limit=100 --offset=0 --workers=8  # paralel, jauh lebih cepat
//   node sync-shinigami.mjs --refresh-pages    # paksa unduh ulang pages
//   node sync-shinigami.mjs --import           # impor katalog + hubungkan judul saja
//
// Chapter yang pages-nya sudah ada di DB otomatis dilewati,
// jadi batch boleh diulang/dicicil kapan saja tanpa mengulang kerja.
import dotenv from 'dotenv'
import pg from 'pg'

dotenv.config()

const SHINIGAMI_API_URL = process.env.SHINIGAMI_API_URL || 'https://api.shngm.io'
const SHINIGAMI_ORIGIN = 'https://app.shinigami.asia'
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL kosong. Isi server/.env atau set $env:DATABASE_URL dulu.')
  process.exit(1)
}

const args = Object.fromEntries(
  process.argv.slice(2).map(a => {
    const m = a.match(/^--([^=]+)(=(.*))?$/)
    return m ? [m[1], m[3] ?? true] : []
  }),
)

const parsed = new URL(process.env.DATABASE_URL)
const pool = new pg.Pool({
  host: parsed.hostname,
  port: Number(parsed.port || 5432),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
  statement_timeout: 30000,
  // Supabase Session Pooler free cuma pool_size 15 untuk SEMUA koneksi
  // (dashboard + backend + semua terminal sync). Batasi 1 proses sync
  // cuma boleh pegang 3 koneksi biar tidak EMAXCONNSESSION.
  max: 3,
})
async function query(text, params, retries = 5) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return (await pool.query(text, params)).rows
    } catch (e) {
      const msg = String(e?.message || '')
      const retryable =
        msg.includes('EMAXCONNSESSION') ||
        msg.includes('max clients') ||
        msg.includes('too many clients') ||
        e?.code === '53300' ||
        e?.code === '53400'
      if (!retryable || attempt >= retries) throw e
      await delay(1000 * (attempt + 1))
    }
  }
}
const delay = ms => new Promise(r => setTimeout(r, ms))
const toIso = v => {
  const t = Date.parse(v || '')
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}
// Paralelisasi unduhan pages (default 5, maks 16 via --workers=N).
// --jobs=N: jumlah judul jalan bareng dalam 1 terminal (default 1, maks 4).
// Contoh cepat 1 terminal: --jobs=3 --workers=5 (API ~15 paralel, DB tetap serial per judul).
const workers = Math.max(1, Math.min(Number(args.workers || 5), 16))
const jobs = Math.max(1, Math.min(Number(args.jobs || 1), 4))
const isValidUuid = v =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(v || ''))

async function shinigamiJson(path) {
  const res = await fetch(`${SHINIGAMI_API_URL}${path}`, {
    headers: {
      Accept: 'application/json',
      Origin: SHINIGAMI_ORIGIN,
      Referer: `${SHINIGAMI_ORIGIN}/`,
      'User-Agent': BROWSER_UA,
    },
    signal: AbortSignal.timeout(30_000),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status} untuk ${path}`)
  return res.json()
}

function mapChapters(mangaId, payload) {
  const list = Array.isArray(payload) ? payload : payload?.chapter_list || payload?.data || []
  if (!Array.isArray(list)) return []
  return [...list]
    .reverse()
    .map((item, index) => {
      const id = item.chapter_id || item.id
      if (!id) return null
      const number = String(item.chapter_number || item.name || item.number || '').replace(/\.0$/, '')
      const title = item.chapter_title || item.title || ''
      const timestamp = Date.parse(item.release_date || item.date || item.created_at || '')
      return {
        id: String(id),
        manga_id: mangaId,
        name: title ? `Chapter ${number} - ${title}` : `Chapter ${number}`,
        type: 'chapter',
        sort_order: index + 1,
        release_timestamp: Number.isNaN(timestamp) ? 0 : Math.floor(timestamp / 1000),
      }
    })
    .filter(Boolean)
}

function mapPages(payload) {
  if (Array.isArray(payload)) return payload.map((p, index) => ({ index, imageUrl: p.image_url || p.url || p }))
  const chapter = payload?.data?.chapter
  const pageList = payload?.page_list?.chapter_page
  const pages = chapter?.data || pageList?.pages || payload?.pages || []
  const baseUrl =
    payload?.data?.base_url || payload?.data?.base_url_low || payload?.base_url || (pageList ? 'https://storage.shngm.id' : '')
  const path = chapter?.path || pageList?.path || payload?.path || ''
  if (!Array.isArray(pages)) return []
  return pages.map((page, index) => ({
    index,
    imageUrl:
      typeof page === 'string' && /^https?:\/\//.test(page) ? page : `${baseUrl}${path}${page}`,
  }))
}

function isAllowedImage(value) {
  try {
    const url = new URL(value)
    return (
      url.protocol === 'https:' &&
      ['storage.shngm.id', 'delivery.shngm.id', 'assets.shngm.id'].includes(url.hostname)
    )
  } catch {
    return false
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

function normalizeTitleKey(str) {
  return String(str || '')
    .toLowerCase()
    .replace(/[\u2018\u2019'`]/g, "'")
    .replace(/[^a-z0-9]/g, '')
    .trim()
}

function catalogType(item) {
  const format = (item.taxonomy?.Format || []).map(e => e.name).join(' ').toLowerCase()
  if (format.includes('manhua')) return 'manhua'
  if (format.includes('manga')) return 'manga'
  return 'manhwa'
}

async function importCatalog() {
  const first = await shinigamiJson('/v1/manga/list?page=1&page_size=100&sort=latest')
  const totalPages = Math.min(Number(first.meta?.total_page || 1), 1000)
  const catalog = [...(first.data || [])]
  for (let page = 2; page <= totalPages; page += 1) {
    const res = await shinigamiJson(`/v1/manga/list?page=${page}&page_size=100&sort=latest`)
    catalog.push(...(res.data || []))
    if (page % 10 === 0) console.log(`  katalog hal ${page}/${totalPages}...`)
    await delay(200)
  }
  const items = catalog.filter(i => i?.manga_id && i?.title)
  console.log(`Katalog: ${items.length} judul`)

  const existing = await query('select id, title, shinigami_id from manga')
  const byTitle = new Map(existing.map(r => [normalizeTitleKey(r.title), r]))
  let linked = 0
  for (const item of items) {
    const local = byTitle.get(normalizeTitleKey(item.title))
    if (local && !local.shinigami_id) {
      await query('update manga set shinigami_id = $1 where id = $2', [item.manga_id, local.id])
      local.shinigami_id = item.manga_id
      linked += 1
    }
  }

  const rows = items.map(item => ({
    slug: `${slugify(item.title).slice(0, 80) || 'manga'}-${String(item.manga_id).slice(0, 8)}`,
    title: item.title,
    type: catalogType(item),
    status: Number(item.status) === 2 ? 'Completed' : 'Ongoing',
    description: item.description || '',
    cover_url: item.cover_portrait_url || item.cover_image_url || '',
    banner_url: item.cover_image_url || '',
    shinigami_id: item.manga_id,
    alternative_names: String(item.alternative_title || '').split(',').map(n => n.trim()).filter(Boolean),
    tags: (item.taxonomy?.Genre || []).map(g => g.name).filter(Boolean),
    shinigami_views: Math.trunc(Number(item.view_count || 0)) || 0,
    shinigami_bookmarks: Math.trunc(Number(item.bookmark_count || 0)) || 0,
    shinigami_rating: Number(item.user_rate || 0) || 0,
    shinigami_rank: Math.trunc(Number(item.rank ?? 9999)) || 9999,
    shinigami_updated_at: toIso(item.updated_at),
    latest_chapter_number: Math.trunc(Number(item.latest_chapter_number || 0)) || 0,
    latest_chapter_time: toIso(item.latest_chapter_time),
  }))
  const result = await query(
    `insert into manga (slug, title, type, status, description, cover_url, banner_url, shinigami_id, alternative_names, tags,
                        shinigami_views, shinigami_bookmarks, shinigami_rating, shinigami_rank, shinigami_updated_at,
                        latest_chapter_number, latest_chapter_time)
     select slug, title, type, status, description, cover_url, banner_url, shinigami_id, alternative_names, tags,
            shinigami_views, shinigami_bookmarks, shinigami_rating, shinigami_rank, shinigami_updated_at,
            latest_chapter_number, latest_chapter_time
     from jsonb_to_recordset($1::jsonb) as source(
       slug text, title text, type text, status text, description text, cover_url text, banner_url text,
       shinigami_id text, alternative_names text[], tags text[],
       shinigami_views bigint, shinigami_bookmarks bigint, shinigami_rating numeric,
       shinigami_rank int, shinigami_updated_at timestamptz,
       latest_chapter_number int, latest_chapter_time timestamptz
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
       tags = excluded.tags,
       shinigami_views = excluded.shinigami_views,
       shinigami_bookmarks = excluded.shinigami_bookmarks,
       shinigami_rating = excluded.shinigami_rating,
       shinigami_rank = excluded.shinigami_rank,
       shinigami_updated_at = excluded.shinigami_updated_at,
       latest_chapter_number = excluded.latest_chapter_number,
       latest_chapter_time = excluded.latest_chapter_time
     returning id`,
    [JSON.stringify(rows)],
  )
  console.log(`Impor selesai: ${linked} judul lokal dihubungkan, ${result.length} baris katalog tersimpan.`)
}

async function main() {
  if (args.import) {
    await importCatalog()
    await pool.end()
    return
  }
  let mangas = await query(
    `select id, slug, title, shinigami_id from manga where shinigami_id is not null and shinigami_id <> '' order by title`,
  )
  if (args.manga) {
    mangas = mangas.filter(m => m.id === args.manga || m.slug === args.manga)
    if (!mangas.length) throw new Error(`Judul ${args.manga} tidak ditemukan / tidak punya shinigami_id`)
  }
  const offset = Number(args.offset || 0)
  const limit = args.limit ? Number(args.limit) : mangas.length
  mangas = mangas.slice(offset, offset + limit)
  console.log(`Sync ${mangas.length} judul...`)

  const stats = { chapterTotal: 0, pageTotal: 0 }
  async function syncOne(m) {
    try {
      const payload = await shinigamiJson(
        `/v1/chapter/${encodeURIComponent(m.shinigami_id)}/list?page_size=3000`,
      )
      const chapters = mapChapters(m.id, payload).filter(c => isValidUuid(c.id))
      // Cegah duplikat nama: baris lama yang kosong/placeholder diganti,
      // yang sudah ada isinya dilewati (kecuali --refresh-pages).
      const existingRows = await query(`select name, pages from chapters where manga_id = $1`, [m.id])
      const byName = new Map()
      for (const r of existingRows) {
        if (!byName.has(r.name)) byName.set(r.name, [])
        byName.get(r.name).push(r)
      }
      const isReal = pages =>
        Array.isArray(pages) && pages.length > 0 && !JSON.stringify(pages).includes('placehold.co')
      const fresh = []
      let skipped = 0
      for (const c of chapters) {
        const olds = byName.get(c.name) || []
        if (!args['refresh-pages'] && olds.some(r => isReal(r.pages))) {
          skipped += 1
          continue
        }
        if (olds.length) {
          await query('delete from chapters where manga_id = $1 and name = $2', [m.id, c.name])
        }
        fresh.push(c)
      }
      if (skipped) console.log(`  [${m.title}] lewati ${skipped} chapter (sudah ada)`)
      const chaptersToSync = fresh
      if (!chaptersToSync.length) {
        console.log(`OK ${m.title}: 0 baru, ${skipped} sudah ada`)
      } else {
        await query(
          `insert into chapters (id, manga_id, name, type, sort_order, release_timestamp, pages)
           select id, manga_id, name, type, sort_order, release_timestamp, '[]'::jsonb
           from jsonb_to_recordset($1::jsonb) as source(
             id uuid, manga_id uuid, name text, type text, sort_order int, release_timestamp bigint
           )
           on conflict (id) do update set
             name = excluded.name,
             sort_order = excluded.sort_order,
             release_timestamp = excluded.release_timestamp`,
          [JSON.stringify(chaptersToSync)],
        )
      }
      stats.chapterTotal += chaptersToSync.length

      if (!args['skip-pages'] && chaptersToSync.length) {
        for (let i = 0; i < chaptersToSync.length; i += workers) {
          const batch = chaptersToSync.slice(i, i + workers)
          if (!batch.length) continue
          // 1. Fetch API paralel (tidak pakai koneksi DB)
          const fetched = await Promise.allSettled(
            batch.map(async c => {
              const detail = await shinigamiJson(`/v1/chapter/detail/${encodeURIComponent(c.id)}`)
              const pages = mapPages(detail)
                .filter(p => isAllowedImage(p.imageUrl))
                .map(p => ({ index: p.index, url: p.imageUrl }))
              return { c, pages }
            }),
          )
          // 2. Update DB serial satu-per-satu (hemat koneksi pool)
          for (let bi = 0; bi < fetched.length; bi += 1) {
            const r = fetched[bi]
            if (r.status === 'fulfilled') {
              stats.pageTotal += r.value.pages.length
              if (r.value.pages.length) {
                try {
                  await query('update chapters set pages = $1 where id = $2', [
                    JSON.stringify(r.value.pages),
                    r.value.c.id,
                  ])
                } catch (e) {
                  console.error(`  [${m.title}] pages ${batch[bi].name} gagal: ${e.message}`)
                }
              }
            } else {
              console.error(`  [${m.title}] pages ${batch[bi].name} gagal: ${r.reason?.message || r.reason}`)
            }
          }
          const done = Math.min(i + workers, chaptersToSync.length)
          if (done % 10 < workers) console.log(`  [${m.title}] ${done}/${chaptersToSync.length} chapter...`)
          await delay(200)
        }
      }
      console.log(`OK ${m.title}: ${chaptersToSync.length} chapter`)
    } catch (e) {
      console.error(`GAGAL ${m.title}: ${e.message}`)
    }
    await delay(250)
  }

  // 1 terminal, N judul jalan bareng — tetap 1 pool (max 3) jadi aman dari EMAXCONNSESSION.
  for (let i = 0; i < mangas.length; i += jobs) {
    const group = mangas.slice(i, i + jobs)
    await Promise.all(group.map(syncOne))
  }
  console.log(`Selesai. ${stats.chapterTotal} chapter, ${stats.pageTotal} halaman tersimpan.`)
  await pool.end()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
