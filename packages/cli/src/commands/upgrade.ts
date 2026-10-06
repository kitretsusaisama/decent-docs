import { loadProject } from '@/project';
import { createOrLoadConfig } from '@/config';
import { runDoctor } from '@/commands/doctor';
import picocolors from 'picocolors';
import { x } from 'tinyexec';
import fs from 'node:fs/promises';
import path from 'node:path';

const DECENTDOCS_PACKAGES = [
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
  'create-decent-docs-versions',
];

async function getLatestVersions(packages: string[]): Promise<Map<string, string>> {
  const versions = new Map<string, string>();
  
  for (const pkg of packages) {
    try {
      const result = await x('npm', ['view', pkg, 'version', '--json'], { 
        nodeOptions: { stdio: 'pipe' } 
      });
      const version = result.stdout.trim();
      if (version) versions.set(pkg, version);
    } catch {
      // ignore
    }
  }
  
  return versions;
}

async function getLocalVersions(cwd: string): Promise<Map<string, string>> {
  const versions = new Map<string, string>();
  const pkgPath = path.join(cwd, 'package.json');
  
  try {
    const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    
    for (const name of Object.keys(allDeps)) {
      if (name.startsWith('@decentdocs/') || name === 'create-decent-docs' || name === 'create-decent-docs-versions') {
        versions.set(name, allDeps[name]);
      }
    }
  } catch {
    // ignore
  }
  
  return versions;
}

async function updatePackageJson(cwd: string, updates: Map<string, string>) {
  const pkgPath = path.join(cwd, 'package.json');
  const pkg = JSON.parse(await fs.readFile(pkgPath, 'utf-8'));
  let changed = false;
  
  for (const [name, version] of updates) {
    const current = pkg.dependencies?.[name] || pkg.devDependencies?.[name];
    if (current && current !== version) {
      if (pkg.dependencies?.[name]) {
        pkg.dependencies[name] = version;
        changed = true;
      }
      if (pkg.devDependencies?.[name]) {
        pkg.devDependencies[name] = version;
        changed = true;
      }
    }
  }
  
  if (changed) {
    await fs.writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  }
  
  return changed;
}

export async function runUpgrade(options: { check?: boolean; yes?: boolean }) {
  const config = await createOrLoadConfig();
  const project = await loadProject(config);
  const cwd = project.cwd;
  
  console.log(picocolors.bold('\nDecent Docs Upgrade\n'));
  console.log(`Project: ${project.framework}${project.static ? ' (static)' : ''}`);
  console.log(`Package Manager: ${project.packageManager}\n`);
  
  // Get current and latest versions
  const localVersions = await getLocalVersions(cwd);
  const latestVersions = await getLatestVersions(DECENTDOCS_PACKAGES);
  
  // Find outdated packages
  const outdated: Array<{ name: string; current: string; latest: string }> = [];
  
  for (const [name, current] of localVersions) {
    const latest = latestVersions.get(name);
    if (latest && current !== latest) {
      outdated.push({ name, current, latest });
    }
  }
  
  if (outdated.length === 0) {
    console.log(picocolors.green('All @decentdocs/* packages are up to date!'));
    return;
  }
  
  console.log(picocolors.cyan('Outdated packages:'));
  for (const { name, current, latest } of outdated) {
    console.log(`  ${name.padEnd(30)} ${picocolors.red(current)} → ${picocolors.green(latest)}`);
  }
  console.log('');
  
  if (options.check) {
    console.log(picocolors.yellow('Check mode: no changes made.'));
    return;
  }
  
  // Confirm unless --yes
  if (!options.yes) {
    const { confirm } = await import('@clack/prompts');
    const proceed = await confirm({
      message: `Upgrade ${outdated.length} package(s)?`,
      initialValue: true,
    });
    if (!proceed) {
      console.log('Upgrade cancelled.');
      return;
    }
  }
  
  // Update package.json
  const updates = new Map(outdated.map(({ name, latest }) => [name, latest]));
  const changed = await updatePackageJson(cwd, updates);
  
  if (!changed) {
    console.log(picocolors.yellow('No changes to package.json'));
    return;
  }
  
  console.log(picocolors.green('Updated package.json'));
  
  // Install dependencies
  console.log(picocolors.cyan('\nInstalling dependencies...'));
  await x(project.packageManager, ['install'], { 
    nodeOptions: { cwd, stdio: 'inherit' } 
  });
  
  // Run doctor to show updated state
  console.log(picocolors.cyan('\nRunning post-upgrade health check...\n'));
  await runDoctor({ json: false, checkUpdates: false });
  
  console.log(picocolors.bold(picocolors.greenBright('\n✓ Upgrade complete!')));
}