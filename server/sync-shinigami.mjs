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
})
const query = async (text, params) => (await pool.query(text, params)).rows
const delay = ms => new Promise(r => setTimeout(r, ms))
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

async function main() {
  let mangas = await query(
    `select id, slug, title, shinigami_id from manga where shinigami_id is not null and shinigami_id <> '' order by title`,
  )
  if (args.manga) {
    mangas = mangas.filter(m => m.id === args.manga || m.slug === args.manga)
    if (!mangas.length) throw new Error(`Judul ${args.manga} tidak ditemukan / tidak punya shinigami_id`)
  }
  if (args.limit) mangas = mangas.slice(0, Number(args.limit))
  console.log(`Sync ${mangas.length} judul...`)

  let chapterTotal = 0
  let pageTotal = 0
  for (const m of mangas) {
    try {
      const payload = await shinigamiJson(
        `/v1/chapter/${encodeURIComponent(m.shinigami_id)}/list?page_size=3000`,
      )
      const chapters = mapChapters(m.id, payload).filter(c => isValidUuid(c.id))
      if (chapters.length) {
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
          [JSON.stringify(chapters)],
        )
      }
      chapterTotal += chapters.length

      if (!args['skip-pages']) {
        for (const c of chapters) {
          try {
            const detail = await shinigamiJson(`/v1/chapter/detail/${encodeURIComponent(c.id)}`)
            const pages = mapPages(detail)
              .filter(p => isAllowedImage(p.imageUrl))
              .map(p => ({ index: p.index, url: p.imageUrl }))
            if (pages.length) {
              await query('update chapters set pages = $1 where id = $2', [JSON.stringify(pages), c.id])
              pageTotal += pages.length
            }
            await delay(250)
          } catch (e) {
            console.error(`  [${m.title}] pages ${c.name} gagal: ${e.message}`)
          }
        }
      }
      console.log(`OK ${m.title}: ${chapters.length} chapter`)
    } catch (e) {
      console.error(`GAGAL ${m.title}: ${e.message}`)
    }
    await delay(250)
  }
  console.log(`Selesai. ${chapterTotal} chapter, ${pageTotal} halaman tersimpan.`)
  await pool.end()
}

main().catch(e => {
  console.error(e)
  process.exit(1)
})
