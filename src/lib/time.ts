// Label waktu relatif Indonesia: "Baru saja / 5 menit lalu / 3 jam lalu".
// Menerima ISO string, milidetik, atau detik (timestamp chapter).
export function timeAgo(input: string | number): string {
  const ts =
    typeof input === 'number'
      ? input < 1e12
        ? input * 1000
        : input
      : new Date(input).getTime()
  if (!ts || Number.isNaN(ts)) return ''
  const diff = Math.max(0, Date.now() - ts)
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'Baru saja'
  if (minutes < 60) return `${minutes} menit lalu`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} hari lalu`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} minggu lalu`
  return new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}
