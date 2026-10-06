import { postInstall } from '@decentdocs/mdx/next';
import mdx from '@decentdocs/mdx/rolldown';
import { unrun } from 'unrun';

process.env.LINT = '1';
await postInstall();
await unrun({
  path: './scripts/lint.ts',
  inputOptions: {
    plugins: [mdx(await import('../source.config.ts'))],
  },
});
