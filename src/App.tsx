import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Library from './pages/Library'
import Search from './pages/Search'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminLayout from './pages/admin/AdminLayout'

// Rute berat di-split agar bundle awal ringan: diunduh saat dibuka saja.
const MangaDetail = lazy(() => import('./pages/MangaDetail'))
const ReadChapter = lazy(() => import('./pages/ReadChapter'))
const AdminManga = lazy(() => import('./pages/admin/AdminManga'))
const AdminGenres = lazy(() => import('./pages/admin/AdminGenres'))
const AdminAuthors = lazy(() => import('./pages/admin/AdminAuthors'))
const AdminChapters = lazy(() => import('./pages/admin/AdminChapters'))

function RouteFallback() {
  return (
    <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-24 text-center">
      <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-white/15 border-t-primary-500" />
      <p className="text-sm text-general-400">Memuat halaman…</p>
    </div>
  )
}

export default function App() {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/explore" element={<Explore />} />
        <Route path="/search" element={<Search />} />
        <Route path="/manga/:slug" element={<MangaDetail />} />
        <Route path="/manga/:slug/chapter/:chapterId" element={<ReadChapter />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Library hanya untuk user yang sudah login */}
        <Route
          path="/library"
          element={
            <ProtectedRoute>
              <Library />
            </ProtectedRoute>
          }
        />

        {/* Admin hanya untuk role admin */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/manga" replace />} />
          <Route path="manga" element={<AdminManga />} />
          <Route path="genres" element={<AdminGenres />} />
          <Route path="authors" element={<AdminAuthors />} />
          <Route path="chapters" element={<AdminChapters />} />
        </Route>

        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
    </Suspense>
  )
}