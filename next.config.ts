import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // Include orchestrator files in the /api/spawn serverless bundle
  // so we can read them at runtime and upload to Daytona
  outputFileTracingIncludes: {
    '/api/spawn': ['./orchestrator/**'],
  },
  // Prevent Next.js from bundling these packages — they rely on CJS
  // require() hooks (require-in-the-middle) that break in the bundler.
  serverExternalPackages: [
    '@daytonaio/sdk',
    '@opentelemetry/sdk-node',
    '@opentelemetry/instrumentation',
    'require-in-the-middle',
  ],
}

export default nextConfig
