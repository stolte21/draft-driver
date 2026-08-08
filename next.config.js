/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // bundle the synced tier CSVs into the rankings serverless function
  outputFileTracingIncludes: {
    '/api/rankings': ['./data/tiers/**'],
  },
}

module.exports = nextConfig
