/** @type {import('next').NextConfig} */
const nextConfig = {
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
