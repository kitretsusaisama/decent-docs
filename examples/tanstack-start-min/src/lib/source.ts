import { loader } from '@decentdocs/core/source';
import { defineDocs } from '@decentdocs/mdx/macro';
import { lucideIconsPlugin } from '@decentdocs/core/source/lucide-icons';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    async: true,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
});

export const source = loader({
  source: docs.toDecentSource(),
  baseUrl: '/docs',
  plugins: [lucideIconsPlugin()],
});
