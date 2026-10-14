import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './screens/Home'
import Explore from './screens/Explore'
import Library from './screens/Library'
import Search from './screens/Search'
import Login from './screens/Login'
import Register from './screens/Register'
import VerifyEmail from './screens/VerifyEmail'
import GoogleCallback from './screens/GoogleCallback'
import AdminLayout from './screens/admin/AdminLayout'

// Rute berat di-split agar bundle awal ringan: diunduh saat dibuka saja.
const MangaDetail = lazy(() => import('./screens/MangaDetail'))
const ReadChapter = lazy(() => import('./screens/ReadChapter'))
const AdminManga = lazy(() => import('./screens/admin/AdminManga'))
const AdminGenres = lazy(() => import('./screens/admin/AdminGenres'))
const AdminAuthors = lazy(() => import('./screens/admin/AdminAuthors'))
const AdminChapters = lazy(() => import('./screens/admin/AdminChapters'))
const AdminComments = lazy(() => import('./screens/admin/AdminComments'))
const AdminAnnouncements = lazy(() => import('./screens/admin/AdminAnnouncements'))
const AdminBanners = lazy(() => import('./screens/admin/AdminBanners'))
const AnnouncementList = lazy(() => import('./screens/AnnouncementList'))
const AnnouncementDetail = lazy(() => import('./screens/AnnouncementDetail'))

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
        <Route path="/announcement" element={<AnnouncementList />} />
        <Route path="/announcement/:id" element={<AnnouncementDetail />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/auth/google/callback" element={<GoogleCallback />} />

        {/* Library: gerbang login chibi + popup ditangani di dalam halaman */}
        <Route path="/library" element={<Library />} />

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
          <Route path="comments" element={<AdminComments />} />
          <Route path="announcements" element={<AdminAnnouncements />} />
          <Route path="banners" element={<AdminBanners />} />
        </Route>

        <Route path="*" element={<Home />} />
      </Route>
    </Routes>
    </Suspense>
  )
}
