/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // bundle the synced tier CSVs into the rankings serverless function
  outputFileTracingIncludes: {
    '/api/rankings': ['./public/tiers/**'],
  },
  async headers() {
    return [
      {
        // the tier CSVs are a public data feed for third-party consumers
        source: '/tiers/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Cache-Control', value: 'public, max-age=3600' },
        ],
      },
    ];
  },
}

module.exports = nextConfig
