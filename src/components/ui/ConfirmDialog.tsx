interface ConfirmDialogProps {
  open: boolean
  title: string
  message?: string
  confirmLabel?: string
  busy?: boolean
  onCancel: () => void
  onConfirm: () => void
}

// Popup konfirmasi dalam aplikasi (pengganti confirm()/alert() bawaan browser).
export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Hapus',
  busy = false,
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-[90] grid place-items-center bg-black/60 p-4 backdrop-blur-md"
      onClick={onCancel}
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-xs rounded-2xl border border-(--line) bg-(--card) p-5 text-center shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="font-display text-base font-extrabold text-general-100">{title}</h3>
        {message && <p className="mt-1.5 text-sm leading-relaxed text-general-400">{message}</p>}
        <div className="mt-4 flex gap-2">
          <button
            onClick={onCancel}
            disabled={busy}
            className="btn-ghost flex-1 rounded-lg px-4 py-2 text-sm font-semibold disabled:opacity-60"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex-1 rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? 'Memproses…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
