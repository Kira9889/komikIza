'use client'

export default function MaintenanceScreen() {
  const handleReload = () => {
    if (typeof window !== 'undefined') {
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen bg-(--bg-dark) text-(--text) flex flex-col items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 bg-primary-600/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-80 h-80 bg-primary-500/10 rounded-full blur-2xl pointer-events-none" />

      <main className="relative z-10 max-w-lg w-full bg-(--card)/80 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sm:p-8 shadow-2xl text-center animate-rise">
        {/* Top Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/15 text-primary-400 border border-primary-500/30 mb-6">
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-ping" />
          <span>PEMELIHARAAN SISTEM</span>
        </div>

        {/* Brand & Icon */}
        <div className="flex justify-center items-center gap-2 mb-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-primary-600 to-primary-400 flex items-center justify-center shadow-lg shadow-primary-500/25">
            <span className="text-2xl font-black text-white tracking-wider">T</span>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight mb-3">
          Kami Sedang Berbenah!
        </h1>

        <p className="text-sm sm:text-base text-general-300 leading-relaxed mb-6">
          Sistem <span className="text-white font-medium">Tenshi</span> sedang menjalani peningkatan infrastruktur server berkala demi pengalaman membaca komik yang lebih cepat, mulus, dan stabil.
        </p>

        {/* Schedule & Info Box */}
        <div className="bg-black/30 border border-white/5 rounded-xl p-4 mb-6 text-left space-y-2.5 text-xs sm:text-sm">
          <div className="flex items-center justify-between">
            <span className="text-general-400">Jadwal Mulai</span>
            <span className="font-semibold text-general-100">15 Oktober 2026, 08:00 WIB</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-general-400">Status Server</span>
            <span className="inline-flex items-center gap-1.5 font-medium text-amber-400">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Upgrade Infrastruktur
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-general-400">Database & Data Akun</span>
            <span className="text-emerald-400 font-medium">100% Aman</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            type="button"
            onClick={handleReload}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-primary-500 hover:bg-primary-600 active:scale-95 text-white font-medium text-sm transition-all shadow-lg shadow-primary-500/25 cursor-pointer"
          >
            Coba Muat Ulang
          </button>
        </div>

        <p className="mt-6 text-xs text-general-400">
          Terima kasih banyak atas kesabaran dan dukungan teman-teman pembaca setia Tenshi!
        </p>
      </main>

      <footer className="mt-6 text-xs text-general-400 relative z-10">
        &copy; {new Date().getFullYear()} Tenshi.My.id &bull; Digital Manga Library
      </footer>
    </div>
  )
}
