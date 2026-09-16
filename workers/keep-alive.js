// Cloudflare Worker — Keep-Alive (pengganti Netlify Scheduled Function).
// Tugas: sentuh backend tiap 5 menit agar Render + Neon tidak sleep.
// /api/health sudah termasuk query ringan ke DB (lihat server/index.js).
//
// Cara pasang (dashboard, tanpa install apa-apa):
//   1. Workers & Pages → Create → Create Worker → beri nama mis. tenshi-keep-alive → Deploy.
//   2. Worker itu → Settings → Variables:
//        BACKEND_URL = https://api.tenshi.my.id  (tanpa /api di belakang)
//   3. Triggers → Add Cron Trigger → isi: */5 * * * *  → Add.
//   4. Selesai. Cek log di Logs → setiap 5 menit ada "keep-alive".
//
// Manual test: buka https://<nama-worker>.workers.dev → harus {"ok":true,...}.

export default {
  // Dipanggil otomatis oleh Cron Trigger.
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(ping(env));
  },

  // Dipanggil saat URL worker dibuka manual (buat ngetes).
  async fetch(_request, env) {
    const result = await ping(env);
    const ok = result.backend?.ok === true;
    return Response.json(result, {
      status: ok ? 200 : 500,
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

async function ping(env) {
  const base = String(env?.BACKEND_URL || 'https://api.tenshi.my.id').replace(/\/$/, '');
  const started = Date.now();
  try {
    const res = await fetch(`${base}/api/health`, {
      signal: AbortSignal.timeout(20_000),
    });
    const body = await res.text().catch(() => '');
    const out = {
      at: new Date().toISOString(),
      backend: { ok: res.ok, status: res.status, ms: Date.now() - started },
    };
    console.log(JSON.stringify({ ...out, body: body.slice(0, 200) }));
    return out;
  } catch (e) {
    const out = {
      at: new Date().toISOString(),
      backend: { ok: false, error: e instanceof Error ? e.message : String(e) },
    };
    console.log(JSON.stringify(out));
    return out;
  }
}
