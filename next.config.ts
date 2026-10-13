import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  turbopack: { root: process.cwd() },
  async rewrites() {
    if (process.env.NODE_ENV === 'production') return []
    const apiBase = (process.env.API_SERVER_URL || 'http://127.0.0.1:5001/api').replace(/\/$/, '')
    return [{ source: '/api/:path*', destination: `${apiBase}/:path*` }]
  },
}

export default nextConfig
