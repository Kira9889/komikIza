import Logo from '../Logo'

export default function Footer() {
  return (
    <footer className="mt-16 border-t border-(--line) bg-(--bg-dark)">
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col items-center justify-center gap-6 text-center">
          <div className="flex items-center gap-2">
            <Logo size={48} />
            <span className="font-display text-xl font-extrabold">
              Tenshi<span className="text-primary-500">.id</span>
            </span>
          </div>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-general-300">
            <a href="#" className="hover:text-primary-500">Tentang Kami</a>
            <a href="#" className="hover:text-primary-500">Kebijakan</a>
            <a href="#" className="hover:text-primary-500">Persyaratan</a>
            <a href="#" className="hover:text-primary-500">Kontak</a>
            <a href="#" className="hover:text-primary-500">Donasi</a>
          </div>
          <p className="text-xs text-general-400">
            © 2026 Tenshi.id — Prototype Digital Manga Library. Semua judul dimiliki oleh masing-masing
            kreator. Dibangun dengan React.
          </p>
        </div>
      </div>
    </footer>
  )
}