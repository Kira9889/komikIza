export function driveFileId(url: string): string | null {
  const m = (url || '').trim().match(/\/file\/d\/([^/?#]+)/)
  return m ? m[1] : null
}

export function toDrivePreview(url: string): string {
  const id = driveFileId(url)
  if (id) return `https://drive.google.com/file/d/${id}/preview`
  const t = url.trim()
  if (t.includes('/preview')) return t
  return t
}

export function toDriveImage(url: string): string {
  const id = driveFileId(url)
  if (id) return `https://drive.google.com/thumbnail?id=${id}&sz=w1200`
  return url.trim()
}