/** @type {import('next').NextConfig} */
const nextConfig = {
  outputFileTracingRoot: __dirname,
  turbopack: { root: __dirname },
  images: {
    unoptimized: true,
  },
  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
        { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'" },
      ],
    }, {
      source: '/auth/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store' },
        { key: 'X-Robots-Tag', value: 'noindex' },
      ],
    }, {
      source: '/admin',
      headers: [
        { key: 'Cache-Control', value: 'no-store' },
        { key: 'X-Robots-Tag', value: 'noindex' },
      ],
    }, {
      source: '/admin/:path*',
      headers: [
        { key: 'Cache-Control', value: 'no-store' },
        { key: 'X-Robots-Tag', value: 'noindex' },
      ],
    }, {
      source: '/api/auth/:path*',
      headers: [{ key: 'Cache-Control', value: 'no-store' }],
    }, {
      source: '/api/account/:path*',
      headers: [{ key: 'Cache-Control', value: 'no-store' }],
    }, {
      source: '/api/admin/:path*',
      headers: [{ key: 'Cache-Control', value: 'no-store' }],
    }, {
      source: '/api/stripe/:path*',
      headers: [{ key: 'Cache-Control', value: 'no-store' }],
    }]
  },
  async redirects() {
    return [
      {
        // Rediriger nomad403.com vers www.nomad403.com
        source: '/:path*',
        has: [
          {
            type: 'host',
            value: 'nomad403.com',
          },
        ],
        destination: 'https://www.nomad403.com/:path*',
        permanent: true,
      },
      {
        // Rediriger http vers https
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'http',
          },
        ],
        destination: 'https://www.nomad403.com/:path*',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
