'use client';
import { defaultShikiOptions } from '@/lib/shiki';
import { createOpenAPIPage } from '@decentdocs/openapi/ui';

export const OpenAPIPage = createOpenAPIPage({
  shikiOptions: defaultShikiOptions,
});
