import { loader } from '@decentdocs/core/source';
import { i18n } from '@/lib/i18n';
import { defineDocs } from '@decentdocs/mdx/macro';

const docs = defineDocs({
  dir: 'content/docs',
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toDecentSource(),
  i18n,
});
