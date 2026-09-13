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
  const btn =
    'grid aspect-square w-10 place-items-center rounded border border-(--line) text-general-300 transition hover:border-primary-500 hover:text-primary-500 disabled:opacity-40'
  return (
    <div className="mt-8 flex items-center justify-center gap-2">
      <button
        onClick={() => onChange(1)}
        disabled={page <= 1}
        aria-label="Halaman pertama"
        className={btn}
      >
        <span className="flex items-center">
          <ArrowLeftIcon className="-mr-2.5 h-4 w-4" />
          <ArrowLeftIcon className="h-4 w-4" />
        </span>
      </button>
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        aria-label="Halaman sebelumnya"
        className={btn}
      >
        <ArrowLeftIcon className="h-4 w-4" />
      </button>
      <span className="min-w-24 px-3 text-center text-sm font-semibold text-general-300">
        {page} / {total}
      </span>
      <button
        onClick={() => onChange(Math.min(total, page + 1))}
        disabled={page >= total}
        aria-label="Halaman berikutnya"
        className={btn}
      >
        <ArrowRightIcon className="h-4 w-4" />
      </button>
      <button
        onClick={() => onChange(total)}
        disabled={page >= total}
        aria-label="Halaman terakhir"
        className={btn}
      >
        <span className="flex items-center">
          <ArrowRightIcon className="h-4 w-4" />
          <ArrowRightIcon className="-ml-2.5 h-4 w-4" />
        </span>
      </button>
    </div>
  )
}