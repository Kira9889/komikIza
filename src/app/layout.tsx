import type { Metadata } from 'next'
import '../index.css'

export const metadata: Metadata = {
  metadataBase: new URL('https://tenshi.my.id'),
  title: {
    default: 'Tenshi.My.id — Digital Manga Library',
    template: '%s — Tenshi.My.id',
  },
  description: 'Baca komik, manhwa, dan manhua favoritmu di Tenshi.My.id.',
  openGraph: {
    siteName: 'Tenshi.My.id',
    title: 'Tenshi.My.id — Digital Manga Library',
    description: 'Baca komik, manhwa, dan manhua favoritmu.',
    url: 'https://tenshi.my.id/',
    images: ['/logo.jpg'],
  },
  twitter: { card: 'summary_large_image' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className="dark" data-scroll-behavior="smooth">
      <body>{children}</body>
    </html>
  )
}
