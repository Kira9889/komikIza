import type { NextConfig } from 'next'

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
  ...(process.env.NODE_ENV === 'production'
    ? [{ key: 'Strict-Transport-Security', value: 'max-age=31536000' }]
    : []),
]

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  async headers() {
    return [{ source: '/:path*', headers: securityHeaders }]
  },
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return []
    const apiBase = (process.env.API_SERVER_URL || 'http://127.0.0.1:5001/api').replace(/\/$/, '')
    return [{ source: '/api/:path*', destination: `${apiBase}/:path*` }]
  },
}

export default nextConfig
