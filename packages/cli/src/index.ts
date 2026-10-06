#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import { cac } from 'cac';
import picocolors from 'picocolors';
import { initConfig } from '@/config';
import { type JsonTreeNode, treeToJavaScript, treeToMdx } from '@/commands/file-tree';
import { runTree } from '@/utils/file-tree/run-tree';
import packageJson from '../package.json';
import { registerFeatureCommands } from '@/commands/feature';
import { runDoctor } from '@/commands/doctor';
import { runCodemod, codemods } from '@/commands/codemod';
import { runUpgrade } from '@/commands/upgrade';

const cli = cac('decent-docs');
cli.option('--config <string>', 'path to the config file');

cli.command('', 'init a `cli.json` config file').action(async () => {
  if (await initConfig()) {
    console.log(picocolors.green('Initialized a `./cli.json` config file.'));
  } else {
    console.log(picocolors.redBright('A config file already exists.'));
  }
});

registerFeatureCommands(cli);

cli
  .command('doctor', 'run a health check on the current project')
  .option('--json', 'output as JSON')
  .option('--check-updates', 'check for outdated @decentdocs/* packages')
  .action(async (options: { json?: boolean; checkUpdates?: boolean }) => {
    await runDoctor(options);
  });

cli
  .command('upgrade', 'upgrade @decentdocs/* packages to latest versions')
  .option('--check', 'only check for updates, do not apply')
  .option('-y, --yes', 'skip confirmation prompt')
  .action(async (options: { check?: boolean; yes?: boolean }) => {
    await runUpgrade(options);
  });

cli
  .command('codemod [name] [file] [args...]', 'run a codemod on a file')
  .option('--list', 'list available codemods')
  .action(async (name: string | object | undefined, file: string | undefined, ...rest: unknown[]) => {
    // cac passes options object as first arg when first positional is optional
    let opts: { list?: boolean } = {};
    let actualName = name;
    let actualFile = file;
    let actualArgs: string[] = [];
    
    if (name && typeof name === 'object') {
      // first arg is options object
      opts = name as { list?: boolean };
      actualName = file;
      actualFile = rest[0] as string | undefined;
      actualArgs = rest.slice(1) as string[];
    } else {
      opts = (rest[rest.length - 1] as { list?: boolean }) || {};
      actualArgs = rest.slice(0, -1) as string[];
    }
    
    if (opts.list) {
      console.log('Available codemods:');
      for (const c of codemods) {
        console.log(`  ${c.name}`);
      }
      return;
    }
    await runCodemod([actualName, actualFile, ...actualArgs].filter((x): x is string => Boolean(x)));
  });

cli
  .command(
    'tree [json_or_args] [output]',
    'generate a file tree for the Files component, from a directory or JSON output of `tree`',
  )
  .option('--js', 'output as JavaScript file')
  .option('--no-root', 'remove the root node')
  .option('--import-name <name>', 'where to import components (JS only)')
  .action(
    async (
      str: string | undefined,
      output: string | undefined,
      { js, root, importName }: { js: boolean; root: boolean; importName?: string },
    ) => {
      const jsExtensions = ['.js', '.tsx', '.jsx'];
      const noRoot = !root;
      let nodes: JsonTreeNode[];

      try {
        nodes = JSON.parse(str ?? '') as JsonTreeNode[];
      } catch {
        nodes = await runTree(str ?? './');
      }

      const out =
        js || (output && jsExtensions.includes(path.extname(output)))
          ? treeToJavaScript(nodes, noRoot, importName)
          : treeToMdx(nodes, noRoot);

      if (output) {
        await fs.mkdir(path.dirname(output), { recursive: true });
        await fs.writeFile(output, out);
      } else {
        console.log(out);
      }
    },
  );

cli.help();
cli.version(packageJson.version);

try {
  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
} catch (e) {
  console.error(picocolors.redBright(e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
