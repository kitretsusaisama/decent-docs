import { source } from '@/lib/source';
import { llms } from '@decentdocs/core/source';
import { getSection } from './source/navigation';

export const docsLlms = llms(source, {
  renderPage: async (page) => {
    if (page.type !== 'docs' || !('getText' in page.data)) return '';

    const section = getSection(page.slugs[0]);
    const category =
      {
        framework: 'Decent Docs (Framework Mode)',
        ui: 'Decent Docs UI (the default theme of Decent Docs)',
        headless: 'Decent Docs Core (the core library of Decent Docs)',
        mdx: 'Decent Docs MDX (the built-in content source)',
        cli: 'Decent Docs CLI (the CLI tool for automating Decent Docs apps)',
      }[section] ?? section;

    let processed: string;
    try {
      processed = await page.data.getText('processed');
    } catch {
      return '';
    }

    return `# ${category}: ${page.data.title}
URL: ${page.url}

${page.data.description ?? ''}

${processed}`;
  },
});
