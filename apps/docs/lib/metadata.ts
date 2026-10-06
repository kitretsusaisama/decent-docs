import type { Metadata } from 'next/types';
import { Page } from './source';

export function createMetadata(override: Metadata): Metadata {
  return {
    ...override,
    openGraph: {
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      url: 'https://github.com/kitretsusaisama/decent-docs',
      images: '/banner.png',
      siteName: 'Decent Docs',
      ...override.openGraph,
    },
    twitter: {
      card: 'summary_large_image',
      title: override.title ?? undefined,
      description: override.description ?? undefined,
      images: '/banner.png',
      ...override.twitter,
    },
  };
}

export function getPageImageUrl(page: Page) {
  const segments = [...page.slugs, 'image.webp'];

  return {
    segments,
    url: '/' + [page.locale, 'og', ...segments].filter(Boolean).join('/'),
  };
}

export const baseUrl =
  process.env.NODE_ENV === 'development' || !process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? new URL('http://localhost:3000')
    : new URL(`https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`);
