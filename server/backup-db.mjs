// Backup mingguan Supabase -> JSON lokal (server/backups/YYYY-MM-DD/).
// Supabase free backup-nya terbatas — JANGAN andalkan, dump sendiri.
// Dijalankan dari LAPTOP via Task Scheduler tiap Minggu (lihat panduan).
// Isi backup ADA hash password + email user: simpan baik-baik, JANGAN
// di-upload/commit ke mana pun (folder backups/ sudah di .gitignore).
//
// Pakai: node backup-db.mjs
import dotenv from 'dotenv'
import pg from 'pg'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

dotenv.config()

const __dirname = dirname(fileURLToPath(import.meta.url))
if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL kosong. Isi server/.env dulu.')
  process.exit(1)
}

// email_verification_codes sengaja dilewati (kode sekali pakai, kedaluwarsa).
const TABLES = [
  'members', 'genres', 'authors', 'manga', 'manga_genres', 'manga_authors',
  'chapters', 'likes', 'history', 'read_chapters', 'comments',
]

const parsed = new URL(process.env.DATABASE_URL)
const pool = new pg.Pool({
  host: parsed.hostname,
  port: Number(parsed.port || 5432),
  user: decodeURIComponent(parsed.username),
  password: decodeURIComponent(parsed.password),
  database: parsed.pathname.slice(1),
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15000,
  max: 2,
})

async function main() {
  const day = new Date().toISOString().slice(0, 10)
  const dir = join(__dirname, 'backups', day)
  mkdirSync(dir, { recursive: true })
  let total = 0
  for (const t of TABLES) {
    const r = await pool.query(`select * from ${t}`)
    writeFileSync(join(dir, `${t}.json`), JSON.stringify(r.rows))
    total += r.rows.length
    console.log(`${t}: ${r.rows.length} baris`)
  }
  console.log(`Selesai. ${total} baris di ${dir}`)
  await pool.end()
}

main().catch(async e => {
  console.error('GAGAL:', e.message)
  await pool.end().catch(() => {})
  process.exit(1)
})
