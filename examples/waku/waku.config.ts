import { defineConfig } from 'waku/config';
import { decentMdx } from '@decentdocs/mdx/vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    resolve: {
      tsconfigPaths: true,
      dedupe: ['waku'],
    },

    plugins: [tailwindcss(), decentMdx()],
  },
});
