#!/usr/bin/env node
/**
 * Run a single example's dev server with turbo dependency builds.
 *
 * Usage: pnpm example <name>
 *        pnpm example <name> -- <extra-args-for-dev>
 *
 * The example name is validated against the examples/ directory.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { x } from 'tinyexec';

const EXAMPLES_DIR = path.resolve('./examples');

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    console.log(`Usage: pnpm example <name> [-- <dev-args>]`);
    console.log('');
    const names = await listExamples();
    console.log('Available examples:');
    for (const name of names) {
      console.log(`  ${name}`);
    }
    process.exit(args.length === 0 ? 1 : 0);
  }

  const name = args[0];
  const extraArgs = args.slice(args.indexOf('--') + 1).filter(Boolean);

  const names = await listExamples();
  if (!names.includes(name)) {
    console.error(`Unknown example: ${name}`);
    console.error('');
    console.error('Available examples:');
    for (const n of names) {
      console.error(`  ${n}`);
    }
    process.exit(1);
  }

  const filter = `./examples/${name}`;
  const turboArgs = ['run', 'dev', '--filter', filter, ...extraArgs];
  console.log(`Running: turbo ${turboArgs.join(' ')}`);
  await x('turbo', turboArgs, { nodeOptions: { stdio: 'inherit' } });
}

async function listExamples() {
  try {
    const entries = await fs.readdir(EXAMPLES_DIR, { withFileTypes: true });
    return entries
      .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort();
  } catch {
    return [];
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
