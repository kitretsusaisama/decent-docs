import { defineConfig } from 'tsdown';
import fs from 'node:fs/promises';
import { createConfigSchema } from './src/config.ts';
import { z } from 'zod';

export default defineConfig({
  entry: [
    './src/{index,config}.ts',
    './src/{codemod,project}/index.ts',
    './src/features/*.ts',
    './src/features/docs/index.ts',
  ],
  format: 'esm',
  dts: true,
  fixedExtension: false,
  target: 'node22',
  deps: {
    onlyBundle: [],
  },
  exports: {
    enabled: true,
    exclude: ['./index'],
    // Explicit command name: without this, tsdown derives the bin key from
    // the package name basename (`@decentdocs/cli` -> `cli`) on every build
    // and silently overwrites the user-facing `decent-docs` command.
    bin: {
      'decent-docs': './src/index.ts',
    },
  },
  async onSuccess() {
    console.log('JSON schema generated');
    await fs.mkdir('dist/schema', { recursive: true });
    await fs.writeFile(
      'dist/schema.json',
      JSON.stringify(
        z.toJSONSchema(await createConfigSchema(), {
          io: 'input',
        }),
      ),
    );
  },
});
