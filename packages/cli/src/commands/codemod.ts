import picocolors from 'picocolors';
import { createSourceFile } from '@/codemod';
import { enableProcessedMarkdown } from '@/codemod/source';
import { addVitePlugin, wrapNextConfig, addNextRewrites } from '@/codemod/config';
import { addTanstackPrerender } from '@/codemod/tanstack-start';
import { addReactRouterPrerenderArray, addReactRouterRoute } from '@/codemod/react-router';
import { addProxyMatcher } from '@/codemod/next-proxy';
import path from 'node:path';

interface CodemodInfo {
  name: string;
  description: string;
  run: (file: string, ...args: string[]) => Promise<boolean>;
}

export const codemods: CodemodInfo[] = [
  {
    name: 'enable-processed-markdown',
    description: 'Enable includeProcessedMarkdown on defineDocs() call (source.config.ts or lib/source.ts)',
    run: async (file) => {
      const source = await createSourceFile(file);
      return enableProcessedMarkdown(source);
    },
  },
  {
    name: 'add-vite-plugin',
    description: 'Add a Vite plugin to config (vite.config.ts, waku.config.ts)',
    run: async (file, name, from, call, ...pathParts) => {
      const source = await createSourceFile(file);
      return addVitePlugin(source, { name, from, call }, pathParts.length ? pathParts : ['plugins']);
    },
  },
  {
    name: 'wrap-next-config',
    description: 'Wrap next.config.* default export with createMDX()',
    run: async (file) => {
      const source = await createSourceFile(file);
      return wrapNextConfig(source);
    },
  },
  {
    name: 'add-next-rewrites',
    description: 'Add rewrites to next.config.*',
    run: async (file, ...rewritePairs) => {
      const source = await createSourceFile(file);
      const rewrites: { source: string; destination: string }[] = [];
      for (let i = 0; i < rewritePairs.length; i += 2) {
        if (rewritePairs[i + 1]) {
          rewrites.push({ source: rewritePairs[i], destination: rewritePairs[i + 1] });
        }
      }
      return addNextRewrites(source, rewrites);
    },
  },
  {
    name: 'add-tanstack-prerender',
    description: 'Add prerender paths to tanstack-start config',
    run: async (file, ...paths) => {
      const source = await createSourceFile(file);
      return addTanstackPrerender(source, paths) !== undefined;
    },
  },
  {
    name: 'add-react-router-prerender',
    description: 'Add paths to react-router prerender array',
    run: async (file, array, ...paths) => {
      const source = await createSourceFile(file);
      addReactRouterPrerenderArray(source, array as 'paths' | 'excluded', paths);
      return true;
    },
  },
  {
    name: 'add-react-router-route',
    description: 'Add routes to react-router config',
    run: async (file, ...routePairs) => {
      const source = await createSourceFile(file);
      const routes: ({ path: string; entry: string } | string)[] = [];
      for (let i = 0; i < routePairs.length; i += 2) {
        if (routePairs[i + 1]) {
          routes.push({ path: routePairs[i], entry: routePairs[i + 1] });
        }
      }
      return addReactRouterRoute(source, routes);
    },
  },
  {
    name: 'filter-react-router-route',
    description: 'Filter routes from react-router config',
    run: async (_file) => {
      console.log(picocolors.yellow('filter-react-router-route requires programmatic usage'));
      return false;
    },
  },
  {
    name: 'add-proxy-matcher',
    description: 'Add matcher patterns to next.js middleware config',
    run: async (file, ...patterns) => {
      const source = await createSourceFile(file);
      return addProxyMatcher(source, patterns);
    },
  },
];

function printHelp() {
  console.log(picocolors.bold('\nDecent Docs Codemods\n'));
  console.log('Usage: decent-docs codemod <name> <file> [args...]');
  console.log(picocolors.gray('\nAvailable codemods:'));
  for (const c of codemods) {
    console.log(`  ${c.name.padEnd(30)} ${c.description}`);
  }
  console.log('');
}

export async function runCodemod(args: string[]) {
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    printHelp();
    return;
  }

  if (args[0] === '--list') {
    console.log('Available codemods:');
    for (const c of codemods) {
      console.log(`  ${c.name}`);
    }
    return;
  }

  const name = args[0];
  const codemod = codemods.find((c) => c.name === name);
  if (!codemod) {
    console.error(picocolors.red(`Unknown codemod: ${name}`));
    printHelp();
    process.exit(1);
  }

  if (args.length < 2) {
    console.error(picocolors.red(`Missing file argument for ${name}`));
    process.exit(1);
  }

  const file = path.resolve(args[1]);
  const codemodArgs = args.slice(2);

  try {
    const result = await codemod.run(file, ...codemodArgs);
    if (result) {
      console.log(picocolors.green(`✓ ${name} applied to ${file}`));
    } else {
      console.log(picocolors.yellow(`⚠ ${name} made no changes to ${file}`));
    }
  } catch (e) {
    console.error(picocolors.red(`Error: ${e instanceof Error ? e.message : String(e)}`));
    process.exit(1);
  }
}