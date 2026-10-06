import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { runDevServerCli } from './server';

const pkgPath = join(dirname(fileURLToPath(import.meta.url)), '../../../package.json');
const { version } = JSON.parse(readFileSync(pkgPath, 'utf8')) as { version: string };

await runDevServerCli({ name: 'decent-local-md', version });
