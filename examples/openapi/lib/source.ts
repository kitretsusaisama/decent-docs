import { loader } from '@decentdocs/core/source';
import { openapi } from './openapi';
import { defineDocs } from '@decentdocs/mdx/macro';

const docs = defineDocs({
  dir: 'content/docs',
});

export const source = loader(
  {
    docs: docs.toDecentSource(),
    openapi: await openapi.staticSource({
      groupBy: 'tag',
    }),
  },
  {
    baseUrl: '/docs',
    plugins: [openapi.loaderPlugin()],
  },
);
