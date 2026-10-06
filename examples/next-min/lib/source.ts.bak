import { loader } from '@decentdocs/core/source';
import { defineDocs } from '@decentdocs/mdx/macro';

const docs = defineDocs({
  dir: 'content/docs',
});

export const source = loader({
  baseUrl: '/docs',
  source: docs.toDecentSource(),
});
