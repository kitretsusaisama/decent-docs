import createBundleAnalyzer from '@next/bundle-analyzer';
import { createMDX } from '@decentdocs/mdx/next';
import { createNextStory } from '@decentdocs/story/next';
import type { NextConfig } from 'next';

const withAnalyzer = createBundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ];
  },
  allowedDevOrigins: ['192.168.52.84'],
  serverExternalPackages: ['ts-morph', 'typescript', 'shiki', '@takumi-rs/core'],
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
      },
    ],
  },
};

const withStory = createNextStory();
const withMDX = createMDX();

export default withAnalyzer(withStory(withMDX(config)));
