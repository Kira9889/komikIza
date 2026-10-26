// Kompresi gambar di browser → WebP kecil sebelum upload ke storage R2,
// supaya kuota egress tidak terkuras file asli ber-MB-megabyte.
// Strategi: resize mundur + turunkan kualitas sampai <= targetKB (default 200KB).
export async function compressImageToWebp(
  file: File,
  opts: { maxKB?: number; maxWidth?: number; keepGif?: boolean } = {},
): Promise<File> {
  const maxBytes = (opts.maxKB ?? 200) * 1024
  // GIF animasi dilempar apa adanya: canvas hanya mengambil frame pertama,
  // jadi kompresi bisa merusak animasinya.
  if (opts.keepGif && file.type === 'image/gif') return file
  if (file.type === 'image/webp' && file.size <= maxBytes) return file
  try {
    const bitmap = await createImageBitmap(file)
    try {
      const maxWidth = opts.maxWidth ?? 1280
      let scale = Math.min(1, maxWidth / bitmap.width)
      // Iterasi: turun kualitas → turun ukuran sampai masuk target atau mentok.
      for (let quality = 0.8; quality >= 0.3; quality -= 0.15) {
        const width = Math.max(1, Math.round(bitmap.width * scale))
        const height = Math.max(1, Math.round(bitmap.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) throw new Error('Canvas 2D tidak tersedia')
        ctx.drawImage(bitmap, 0, 0, width, height)
        const blob: Blob = await new Promise(resolve =>
          canvas.toBlob(b => resolve(b as Blob), 'image/webp', quality),
        )
        if (blob && blob.size <= maxBytes) {
          // Safari lama tidak bisa encode WebP dan mengembalikan PNG. Pakai
          // tipe/ekstensi asli blob supaya server & browser tidak salah tebak.
          const type = blob.type || 'image/webp'
          return new File([blob], renameForType(file.name, type), { type })
        }
        // Masih besar → coba skala 75% pada kualitas terendah sebelum nyerah.
        if (quality - 0.15 < 0.3) {
          if (scale <= 0.2) break
          scale = scale * 0.75
          quality = 0.8
        }
      }
      return file
    } finally {
      // Lepas memori bitmap besar segera — penting di HP RAM kecil.
      bitmap.close?.()
    }
  } catch {
    return file
  }
}

function renameForType(name: string, type: string): string {
  const ext = type === 'image/png' ? 'png' : type === 'image/jpeg' ? 'jpg' : type === 'image/gif' ? 'gif' : 'webp'
  return String(name).replace(/\.[^.]+$/, '') + '.' + ext
}
