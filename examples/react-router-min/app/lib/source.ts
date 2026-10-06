import { loader } from '@decentdocs/core/source';
import { defineDocs } from '@decentdocs/mdx/macro';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    async: true,
  },
});

export const source = loader({
  source: docs.toDecentSource(),
  baseUrl: '/docs',
});
