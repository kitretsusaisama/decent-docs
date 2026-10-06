import { llms, loader } from '@decentdocs/core/source';
import { lucideIconsPlugin } from '@decentdocs/core/source/lucide-icons';
import { docsContentRoute, docsImageRoute, docsRoute } from './shared';
import { defineDocs } from '@decentdocs/mdx/macro';
import { metaSchema, pageSchema } from '@decentdocs/core/source/schema';

const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

// See https://github.com/kitretsusaisama/decent-docs/docs/headless/source-api for more info
export const source = loader({
  baseUrl: docsRoute,
  source: docs.toDecentSource(),
  plugins: [lucideIconsPlugin()],
});

export const docsLlms = llms(source, {
  renderPage: async (page) => `# ${page.data.title} (${page.url})

${await page.data.getText('processed')}`,
});
