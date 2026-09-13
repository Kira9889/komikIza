import { ArrowLeftIcon, ArrowRightIcon } from '../../icons'

export default function Pagination({
  page,
  total,
  onChange,
}: {
  page: number
  total: number
  onChange: (p: number) => void
}) {
  if (total <= 1) return null
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Halaman sebelumnya"
        className="grid aspect-square w-10 place-items-center rounded border border-(--line) text-general-300 transition hover:border-primary-500 hover:text-primary-500 disabled:opacity-40"
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </button>
      {Array.from({ length: total }, (_, i) => i + 1).map(p => (
        <button
          key={p}
          onClick={() => onChange(p)}
          className={`grid aspect-square w-10 place-items-center rounded border text-sm font-semibold transition ${
            p === page
              ? 'border-primary-500 bg-primary-500 text-white'
              : 'border-(--line) text-general-300 hover:border-primary-500'
          }`}
        >
          {p}
        </button>
      ))}
      <button
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page >= total}
        aria-label="Halaman berikutnya"
        className="grid aspect-square w-10 place-items-center rounded border border-(--line) text-general-300 transition hover:border-primary-500 hover:text-primary-500 disabled:opacity-40"
      >
        <ArrowRightIcon className="h-4 w-4" />
      </button>
    </div>
  )
}