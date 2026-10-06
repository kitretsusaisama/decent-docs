'use client';

import dynamic from 'next/dynamic';

export const OpenAPIPageLazy = dynamic(() =>
  import('@/components/openapi-page').then((mod) => mod.OpenAPIPage),
);
