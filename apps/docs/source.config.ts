import { defineConfig } from '@decentdocs/mdx/config';
import jsonSchema from '@decentdocs/mdx/plugins/json-schema';
import lastModified from '@decentdocs/mdx/plugins/last-modified';

export default defineConfig({
  compiler: 'satteri',
  plugins: [
    jsonSchema({
      insert: true,
    }),
    lastModified(),
  ],
});
