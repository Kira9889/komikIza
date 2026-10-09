// Paket stiker publik (CDN jsdelivr, tanpa API key) — pola yang sama
// dipakai situs baca lain. Klik = tempel markdown ![nama](url).
export interface StickerPack {
  id: string
  label: string
  base: string
  files: string[]
}

const pepe = [
  'pepe_badut.png', 'pepe_barter.png', 'pepe_braindead.png', 'pepe_copium.png',
  'pepe_cross.png', 'pepe_duit.png', 'pepe_happy.png', 'pepe_king.png',
  'pepe_liatinaja.png', 'pepe_lopyu.png', 'pepe_love.png', 'pepe_makan.png',
  'pepe_marah.png', 'pepe_mikir.png', 'pepe_monkas.png', 'pepe_nangis.png',
  'pepe_ngotak.png', 'pepe_oof.png', 'pepe_owo.png', 'pepe_popcorn.png',
  'pepe_rose.png', 'pepe_sheesh.png', 'pepe_sus.png', 'pepe_sweat.png',
  'pepe_tamvan.png', 'pepe_toast.png', 'pepe_trollface.png', 'pepe_vomit.png',
  'pepe_whatif.png', 'pepe_wkwk.png', 'pepe_wow.png', 'pepe_wtf.png',
]

const papan = [
  'papan_back.png', 'papan_bitch.png', 'papan_boi.png', 'papan_bro.png',
  'papan_bruh.png', 'papan_chill.png', 'papan_damn.png', 'papan_frick.png',
  'papan_fucku.png', 'papan_gtfo.png', 'papan_ily.png', 'papan_imdone.png',
  'papan_kid.png', 'papan_noob.png', 'papan_ok.png', 'papan_ping.png',
  'papan_pog.png', 'papan_retard.png', 'papan_stfu.png', 'papan_urfat.png',
  'papan_urgay.png', 'papan_why.png', 'papan_wtf.png',
]

export const STICKER_PACKS: StickerPack[] = [
  {
    id: 'pepe',
    label: 'Pepe',
    base: 'https://cdn.jsdelivr.net/gh/sugarlessmuffins/pepemoji@1.0.1',
    files: pepe,
  },
  {
    id: 'papan',
    label: 'Papan',
    base: 'https://cdn.jsdelivr.net/gh/sugarlessmuffins/papanmoji@v.0.0.1',
    files: papan,
  },
]

export function stickerName(file: string): string {
  return file.replace(/\.(png|jpg|jpeg|webp|gif)$/i, '')
}
