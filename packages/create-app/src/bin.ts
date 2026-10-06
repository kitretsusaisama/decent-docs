#!/usr/bin/env node
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  cancel,
  confirm,
  group,
  intro,
  isCancel,
  outro,
  select,
  spinner,
  text,
} from '@clack/prompts';
import pc from 'picocolors';
import { getPackageManager, managers, type PackageManager } from './auto-install';
import { create, type Template, type TemplatePlugin } from './index';
import { isCI, templates } from './constants';
import { cac } from 'cac';
import { feature } from './plugins/feature';
import { lint } from '@decentdocs/cli/features/lint';
import { og } from '@decentdocs/cli/features/og';
import { search, type SearchProvider } from '@decentdocs/cli/features/search';
import { llms } from '@decentdocs/cli/features/llms';
import { mcp } from '@decentdocs/cli/features/mcp';
import { webmcp } from '@decentdocs/cli/features/webmcp';

const linters = ['eslint', 'oxlint', 'biome'] as const;
const searchProviders = [
  'orama',
  'orama-cloud',
  'algolia',
  'meilisearch',
  'typesense',
  'mixedbread',
] as const;
const ogImages = ['next-og', 'takumi'] as const;
const templateNames = templates.map((item) => item.value);

interface CliOptions {
  src?: boolean;
  install?: boolean;
  noInstall?: boolean;
  git: boolean;
  yes?: boolean;
  linter?: (typeof linters)[number];
  search?: SearchProvider | 'orama';
  ogImage?: (typeof ogImages)[number];
  template?: Template;
  pm: PackageManager;
  llms?: boolean;
  mcp?: boolean;
  webmcp?: boolean;
  listTemplates?: boolean;
  json?: boolean;
}

const cli = cac('create-decent-docs');

cli
  .command('[name]', 'create a Decent Docs app, [name] is the project name')
  .option('--src', '(Next.js only) enable `src/` directory')
  .option('--install', 'install packages automatically')
  .option('--no-install', 'write dependencies to package.json without installing (alias for --install=false)')
  .option('--no-git', 'disable auto Git repository initialization')
  .option('-y, --yes', 'skip prompts and use defaults for unspecified options')
  .option(
    '--linter <name>',
    `configure a linter/formatter, ESLint is currently Next.js only. (${linters.join(', ')})`,
  )
  .option('--search <name>', `configure a search solution (${searchProviders.join(', ')})`)
  .option('--og-image <name>', `configure OG image generation (${ogImages.join(', ')})`)
  .option('--llms', 'configure LLMS.txt generation')
  .option('--mcp', 'configure MCP server')
  .option('--webmcp', 'configure WebMCP (experimental)')
  .option('--template <name>', `choose a template (${templateNames.join(', ')})`)
  .option('--pm <name>', `choose a package manager (${managers.join(', ')})`, {
    default: getPackageManager(),
  })
  .option('--list-templates', 'list available templates and exit')
  .option('--json', 'output selected options as JSON and exit')
  .action(main);

function checkOption(name: string, value: string | undefined, choices: readonly string[]) {
  if (value !== undefined && !choices.includes(value))
    throw new Error(`invalid value for --${name}: ${value}, expected: ${choices.join(', ')}`);
}

async function main(defaultName: string | undefined, config: CliOptions): Promise<void> {
  // Handle --list-templates early
  if (config.listTemplates) {
    console.log('Available templates:');
    for (const template of templates) {
      console.log(`  ${template.value.padEnd(30)} ${template.label}${template.hint ? ` — ${template.hint}` : ''}`);
    }
    process.exit(0);
  }

  checkOption('linter', config.linter, linters);
  checkOption('search', config.search, searchProviders);
  checkOption('og-image', config.ogImage, ogImages);
  checkOption('template', config.template, templateNames);
  checkOption('pm', config.pm, managers);
  
  // Validate --src is only used with Next.js templates
  if (config.src && config.template && !config.template.startsWith('+next')) {
    throw new Error(`--src is only supported with Next.js templates (those starting with "+next")`);
  }

  const skipPrompts = isCI || config.yes === true;
  intro(pc.bgCyan(pc.bold('Create Decent Docs App')));

  const options = await group(
    {
      name: async () => {
        if (defaultName) return defaultName;
        if (skipPrompts) return 'untitled';

        return text({
          message: 'Project name',
          placeholder: 'my-app',
          defaultValue: 'my-app',
        });
      },
      template: async () => {
        if (config.template) return config.template;
        if (skipPrompts) return '+next+decent-mdx';

        return select<Template>({
          message: 'Choose a template',
          initialValue: '+next+decent-mdx',
          options: templates,
        });
      },
      src: async ({ results }: { results: { template?: Template } }) => {
        if (config.src !== undefined) return config.src;
        if (skipPrompts || !results.template?.startsWith('+next')) return false;

        return confirm({
          message: 'Use `/src` directory?',
          initialValue: false,
        });
      },
      lint: async ({ results }: { results: { template?: Template } }) => {
        if (config.linter !== undefined) return config.linter;
        if (skipPrompts) return 'disabled';

        return select({
          message: 'Configure linter?',
          options: results.template?.startsWith('+next')
            ? [
                {
                  value: 'disabled',
                  label: 'Disabled',
                },
                {
                  value: 'eslint',
                  label: 'ESLint',
                },
                {
                  value: 'biome',
                  label: 'Biome',
                },
                {
                  value: 'oxlint',
                  label: 'Oxlint',
                },
              ]
            : [
                {
                  value: 'disabled',
                  label: 'Disabled',
                },
                {
                  value: 'biome',
                  label: 'Biome',
                },
                {
                  value: 'oxlint',
                  label: 'Oxlint',
                },
              ],
        });
      },
      search: async () => {
        if (config.search !== undefined) return config.search;
        if (skipPrompts) return 'orama';

        return select({
          message: 'Choose a search solution?',
          options: [
            {
              value: 'orama',
              label: 'Default',
              hint: 'local search powered by ZBSearch, recommended',
            },
            {
              value: 'orama-cloud',
              label: 'Orama Cloud',
              hint: '3rd party search solution, signup needed',
            },
            { value: 'algolia', label: 'Algolia', hint: 'signup needed' },
            { value: 'meilisearch', label: 'Meilisearch', hint: 'self-hosted or cloud' },
            { value: 'typesense', label: 'Typesense', hint: 'self-hosted or cloud' },
            { value: 'mixedbread', label: 'Mixedbread', hint: 'AI search, signup needed' },
          ],
        });
      },
      ogImage: async ({ results }: { results: { template?: Template } }) => {
        if (config.ogImage !== undefined) return config.ogImage;
        if (!results.template?.startsWith('+next')) return 'takumi';
        if (skipPrompts) return 'next/og';

        return select({
          message: 'Configure Open Graph Image generation?',
          options: [
            {
              value: 'next/og',
              label: 'next/og',
              hint: 'Next.js built-in solution',
            },
            {
              value: 'takumi',
              label: 'Takumi',
              hint: 'Output WebP format, framework-agnostic',
            },
          ],
        });
      },
      llms: async () => {
        if (config.llms !== undefined) return config.llms;
        if (skipPrompts) return false;

        return confirm({
          message: 'Configure LLMS.txt generation?',
          initialValue: false,
        });
      },
      mcp: async () => {
        if (config.mcp !== undefined) return config.mcp;
        if (skipPrompts) return false;

        return confirm({
          message: 'Configure MCP server?',
          initialValue: false,
        });
      },
      webmcp: async () => {
        if (config.webmcp !== undefined) return config.webmcp;
        if (skipPrompts) return false;

        return confirm({
          message: 'Configure WebMCP (experimental)?',
          initialValue: false,
        });
      },
      installDeps: async () => {
        // --no-install takes precedence over --install
        const install = config.noInstall === true ? false : config.install;
        if (install !== undefined) return install;
        if (skipPrompts) return false;

        return confirm({
          message: `Do you want to install packages automatically? (detected as ${config.pm})`,
        });
      },
    },
    {
      onCancel: () => {
        cancel('Installation Stopped.');
        process.exit(0);
      },
    },
  );

  const projectName = options.name.toLowerCase().replace(/\s/, '-');
  if (!isCI) await checkDir(projectName, skipPrompts);

  const info = spinner();
  info.start(`Generating Project`);
  const plugins: TemplatePlugin[] = [];

  if (options.src) {
    const { nextUseSrc } = await import('./plugins/next-use-src');
    plugins.push(nextUseSrc());
  }

  if (options.search !== 'orama') plugins.push(feature(search, { provider: options.search }));
  if (options.lint !== 'disabled') plugins.push(feature(lint, { linter: options.lint }));
  if (options.ogImage === 'takumi' && options.template.startsWith('+next'))
    plugins.push(feature(og, { engine: 'takumi' }));
  if (options.llms) plugins.push(feature(llms, {}));
  if (options.mcp) plugins.push(feature(mcp, {}));
  if (options.webmcp) plugins.push(feature(webmcp, {}));

  // Handle --json output
  if (config.json) {
    console.log(JSON.stringify({
      name: projectName,
      template: options.template,
      src: options.src,
      search: options.search,
      linter: options.lint,
      ogImage: options.ogImage,
      llms: options.llms,
      mcp: options.mcp,
      webmcp: options.webmcp,
      installDeps: options.installDeps,
      git: config.git,
      packageManager: config.pm,
    }, null, 2));
    process.exit(0);
  }

  await create({
    packageManager: config.pm,
    template: options.template,
    outputDir: projectName,
    installDeps: options.installDeps,
    initializeGit: config.git,
    plugins,
    log: (message) => {
      info.message(message);
    },
  });

  info.stop('Project Generated');

  outro(pc.bgGreen(pc.bold('Done')));

  console.log(pc.bold('\nOpen the project'));
  console.log(pc.cyan(`cd ${projectName}`));

  console.log(pc.bold('\nRun Development Server'));
  if (config.pm === 'npm' || config.pm === 'bun') {
    console.log(pc.cyan(`${config.pm} run dev`));
  } else {
    console.log(pc.cyan(`${config.pm} dev`));
  }
  console.log(pc.bold('\nYou can now open the project and start writing documents'));

  process.exit(0);
}

async function checkDir(outputDir: string, skipPrompts: boolean) {
  const destDir = await fs.readdir(outputDir).catch(() => null);
  if (!destDir || destDir.length === 0) return;
  if (skipPrompts) {
    cancel(`directory ${outputDir} already exists and is not empty.`);
    process.exit(1);
  }
  const del = await confirm({
    message: `directory ${outputDir} already exists, do you want to delete its files?`,
  });

  if (isCancel(del)) {
    cancel();
    process.exit(1);
  }

  if (!del) return;

  const info = spinner();
  info.start(`Deleting files in ${outputDir}`);

  await Promise.all(
    destDir.map((item) => {
      return fs.rm(path.join(outputDir, item), {
        recursive: true,
        force: true,
      });
    }),
  );

  info.stop(`Deleted files in ${outputDir}`);
}

cli.help();

try {
  cli.parse(process.argv, { run: false });
  await cli.runMatchedCommand();
} catch (e) {
  console.error(pc.red(e instanceof Error ? e.message : String(e)));
  process.exit(1);
}
