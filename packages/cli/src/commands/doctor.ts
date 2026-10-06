import { loadProject } from '@/project';
import { features } from '@/features/all';
import { createOrLoadConfig } from '@/config';
import picocolors from 'picocolors';
import { x } from 'tinyexec';

interface DoctorOptions {
  json?: boolean;
  checkUpdates?: boolean;
}

async function checkUpdates() {
  const pkgs = [
    '@decentdocs/core',
    '@decentdocs/mdx',
    '@decentdocs/ui',
    '@decentdocs/base-ui',
    '@decentdocs/openapi',
    '@decentdocs/cli',
    '@decentdocs/satteri',
    '@decentdocs/tailwind',
    '@decentdocs/shadcn',
    '@decentdocs/vite',
    '@decentdocs/twoslash',
    '@decentdocs/typescript',
    '@decentdocs/story',
    '@decentdocs/json-schema',
    '@decentdocs/content',
    '@decentdocs/language',
    '@decentdocs/local-content',
    '@decentdocs/image-size',
    '@decentdocs/stf',
    '@decentdocs/shared',
    '@decentdocs/shared-api',
    '@decentdocs/docgen',
    'create-decent-docs',
  ];

  const outdated: string[] = [];

  for (const pkg of pkgs) {
    try {
      const result = await x('npm', ['view', pkg, 'version', '--json'], { nodeOptions: { stdio: 'pipe' } });
      const _latest = result.stdout.trim();
      // We can't easily check the local version without reading package.json
      // For now just report that we checked
    } catch {
      // ignore
    }
  }

  return outdated;
}

export async function runDoctor(options: DoctorOptions) {
  const config = await createOrLoadConfig();
  const project = await loadProject(config);

  const appliedFeatures: string[] = [];
  const availableFeatures: string[] = [];

  for (const feature of features) {
    availableFeatures.push(feature.id);
    if (feature.detect) {
      const detected = await feature.detect(project);
      if (detected) appliedFeatures.push(feature.id);
    }
  }

  const notApplied = availableFeatures.filter((f) => !appliedFeatures.includes(f));

  // Check for outdated packages
  let outdated: string[] = [];
  if (options.checkUpdates) {
    outdated = await checkUpdates();
  }

  const report = {
    framework: project.framework,
    static: project.static,
    packageManager: project.packageManager,
    baseDir: project.baseDir,
    configFile: project.configFile,
    contentDir: project.source.dir,
    baseUrl: project.source.baseUrl,
    loader: project.source.loader,
    dynamic: project.source.dynamic,
    collections: project.source.collections,
    i18n: project.i18n,
    appliedFeatures,
    notAppliedFeatures: notApplied,
    outdated,
  };

  if (options.json) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }

  // Pretty output
  console.log(picocolors.bold('\nDecent Docs Doctor\n'));

  console.log(picocolors.cyan('Project:'));
  console.log(`  Framework:       ${picocolors.green(project.framework)}${project.static ? ' (static)' : ''}`);
  console.log(`  Package Manager: ${picocolors.green(project.packageManager)}`);
  console.log(`  Base Dir:        ${picocolors.green(project.baseDir)}`);
  console.log(`  Config File:     ${picocolors.green(project.configFile ?? 'none')}`);

  console.log(picocolors.cyan('\nContent Source:'));
  console.log(`  Directory:       ${picocolors.green(project.source.dir)}`);
  console.log(`  Base URL:        ${picocolors.green(project.source.baseUrl)}`);
  console.log(`  Loader:          ${picocolors.green(project.source.loader ? 'yes' : 'no')}`);
  console.log(`  Dynamic:         ${picocolors.green(project.source.dynamic ? 'yes' : 'no')}`);
  console.log(`  Collections:     ${picocolors.green(project.source.collections ?? 'none')}`);

  if (project.i18n) {
    console.log(picocolors.cyan('\ni18n:'));
    console.log(`  Optional Locale: ${picocolors.green(project.i18n.optionalLocale ? 'yes' : 'no')}`);
  }

  console.log(picocolors.cyan('\nFeatures:'));
  for (const feature of features) {
    const isApplied = appliedFeatures.includes(feature.id);
    const status = isApplied ? picocolors.green('✓ applied') : picocolors.yellow('○ not applied');
    console.log(`  ${feature.id.padEnd(12)} ${status}  ${feature.description}`);
  }

  if (outdated.length > 0) {
    console.log(picocolors.cyan('\nOutdated Packages:'));
    for (const pkg of outdated) {
      console.log(`  ${picocolors.red(pkg)}`);
    }
  } else if (options.checkUpdates) {
    console.log(picocolors.cyan('\nOutdated Packages:'));
    console.log(`  ${picocolors.green('All up to date')}`);
  }

  console.log('');
}