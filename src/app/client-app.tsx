'use client'

import { BrowserRouter, StaticRouter } from 'react-router-dom'
import App from '../App'
import { AuthProvider } from '../context/AuthContext'
import { LibraryProvider } from '../context/LibraryContext'

export default function ClientApp({ location }: { location: string }) {
  const app = (
    <AuthProvider>
      <LibraryProvider>
        <App />
      </LibraryProvider>
    </AuthProvider>
  )

  // Next server-renders existing React Router routes; the browser takes over
  // with BrowserRouter during hydration and keeps current client navigation.
  return typeof window === 'undefined'
    ? <StaticRouter location={location}>{app}</StaticRouter>
    : <BrowserRouter>{app}</BrowserRouter>
}
