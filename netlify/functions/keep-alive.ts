// Netlify Scheduled Function — Keep-Alive.
// Dipanggil otomatis tiap 4 menit agar:
//  1. NeonDB tidak masuk mode sleep (query ringan SELECT NOW() langsung ke DB).
//  2. Backend Render paket Free tidak spin-down (sentuh /api/health).
// Tanpa ini, kunjungan pertama setelah idle bisa menunggu cold start ±1 menit.
//
// Env yang wajib diisi di Netlify Dashboard → Environment variables:
//   DATABASE_URL = connection string Neon (sama seperti di Render)
//   BACKEND_URL  = mis. https://tenshi-api.onrender.com (tanpa /api di belakang)
// Lihat log eksekusi di Netlify Dashboard → Functions → keep-alive.
import type { Config } from '@netlify/functions'
import { neon } from '@neondatabase/serverless'

async function pingNeon(): Promise<{ ok: boolean; now?: string; error?: string }> {
  try {
    if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL belum diisi di Environment variables')
    const sql = neon(process.env.DATABASE_URL)
    const rows = await sql`SELECT NOW() as now`
    return { ok: true, now: String(rows[0]?.now ?? '') }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

async function pingBackend(): Promise<{ ok: boolean; status?: number; error?: string }> {
  try {
    const base = (process.env.BACKEND_URL || 'https://tenshi-api.onrender.com').replace(/\/$/, '')
    const res = await fetch(`${base}/api/health`, { signal: AbortSignal.timeout(20_000) })
    return { ok: res.ok, status: res.status }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export default async () => {
  const [neonRes, backendRes] = await Promise.all([pingNeon(), pingBackend()])
  const ok = neonRes.ok && backendRes.ok
  console.log(JSON.stringify({ at: new Date().toISOString(), neon: neonRes, backend: backendRes }))
  return new Response(JSON.stringify({ ok, neon: neonRes, backend: backendRes }), {
    status: ok ? 200 : 500,
    headers: { 'Content-Type': 'application/json' },
  })
}

export const config: Config = {
  schedule: '*/4 * * * *',
}
