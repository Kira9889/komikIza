import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProtectedRoute from './components/ProtectedRoute'
import Home from './pages/Home'
import Explore from './pages/Explore'
import Library from './pages/Library'
import Search from './pages/Search'
import MangaDetail from './pages/MangaDetail'
import ReadChapter from './pages/ReadChapter'
import Login from './pages/Login'
import Register from './pages/Register'
import AdminLayout from './pages/admin/AdminLayout'
import AdminManga from './pages/admin/AdminManga'
import AdminGenres from './pages/admin/AdminGenres'
import AdminAuthors from './pages/admin/AdminAuthors'
import AdminChapters from './pages/admin/AdminChapters'

export default function App() {
  return (
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
  )
}