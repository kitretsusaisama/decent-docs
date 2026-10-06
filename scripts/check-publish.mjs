#!/usr/bin/env node
/**
 * Publish-readiness checks for every workspace package with
 * `publishConfig.access: "public"`.
 *
 *   node scripts/check-publish.mjs          -> publint --strict per package
 *   node scripts/check-publish.mjs --pack   -> additionally pack the real
 *      tarball (pnpm rewrites workspace: protocols) and verify:
 *        - dist/ shipped, no src/ or test/ leakage
 *        - LICENSE and README.md included
 *        - no workspace: protocols left in any dependency field
 *        - every exports / bin target exists inside the tarball
 *
 * Exits non-zero when any package fails.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const withPack = process.argv.includes('--pack');

/** @returns {{ dir: string, pkg: any }[]} */
function publishablePackages() {
  const out = [];
  for (const entry of fs.readdirSync('packages', { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = path.join('packages', entry.name, 'package.json');
    if (!fs.existsSync(file)) continue;
    const pkg = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (pkg.publishConfig?.access === 'public') {
      out.push({ dir: path.dirname(file), pkg });
    }
  }
  return out.sort((a, b) => a.pkg.name.localeCompare(b.pkg.name));
}

function resolvePublintBin() {
  // publint does not export ./package.json; locate its manifest by walking up
  // from the resolved main entry.
  let dir = path.dirname(require.resolve('publint'));
  for (;;) {
    const manifest = path.join(dir, 'package.json');
    if (fs.existsSync(manifest)) {
      const pkg = JSON.parse(fs.readFileSync(manifest, 'utf8'));
      if (pkg.name === 'publint') {
        const bin = typeof pkg.bin === 'string' ? pkg.bin : pkg.bin.publint;
        if (!bin) throw new Error('publint manifest has no bin entry');
        return path.join(dir, bin);
      }
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  throw new Error('cannot locate the publint bin entry');
}

function quoteCmd(arg) {
  return /[\s"]/.test(arg) ? `"${arg.replaceAll('"', '""')}"` : arg;
}

function run(command, args, options = {}) {
  const { shell, ...rest } = options;
  const base = { encoding: 'utf8', windowsHide: true, ...rest };
  if (shell && process.platform === 'win32') {
    // .cmd shims (pnpm) cannot be spawned directly; route through cmd /c with
    // a single, manually quoted command line to avoid shell:true + args.
    const line = [command, ...args].map(quoteCmd).join(' ');
    return execFileSync('cmd.exe', ['/d', '/s', '/c', line], base);
  }
  return execFileSync(command, args, base);
}

function walkExportTargets(node, out = []) {
  if (typeof node === 'string') {
    out.push(node);
  } else if (node && typeof node === 'object') {
    for (const value of Object.values(node)) walkExportTargets(value, out);
  }
  return out;
}

const violations = [];
const fail = (name, message) => violations.push(`${name}: ${message}`);

// The user-facing command names are part of the public contract and must
// never drift (the @decentdocs/cli bin key was once found reverted from
// `decent-docs` to `cli` by an unidentified writer; this assertion turns any
// recurrence into a CI/release failure instead of a broken global install).
const EXPECTED_BINS = {
  '@decentdocs/cli': ['decent-docs'],
  '@decentdocs/local-content': ['decent-local-md'],
  '@decentdocs/mdx': ['decent-mdx'],
  'create-decent-docs': ['create-decent-docs'],
};

const publintBin = resolvePublintBin();
const packages = publishablePackages();
console.log(`checking ${packages.length} publishable packages (pack: ${withPack})`);

for (const { dir, pkg } of packages) {
  const name = pkg.name;

  // --- publint --strict -----------------------------------------------------
  try {
    run(process.execPath, [publintBin, '--strict', dir]);
  } catch (error) {
    const output = String(error.stdout ?? error.message).trim();
    fail(name, `publint --strict failed:\n${output}`);
  }

  // --- expected command names ----------------------------------------------
  const expectedBins = EXPECTED_BINS[name];
  if (expectedBins) {
    const bin = pkg.bin;
    const keys = typeof bin === 'string' ? [name] : Object.keys(bin ?? {});
    const ok = keys.length === expectedBins.length && expectedBins.every((k) => keys.includes(k));
    if (!ok) {
      fail(
        name,
        `bin commands drifted: expected [${expectedBins.join(', ')}], found [${keys.join(', ')}]`,
      );
    }
  }

  if (!withPack) continue;

  // --- real tarball audit ---------------------------------------------------
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'decent-pack-'));
  try {
    run('pnpm', ['pack', '--pack-destination', tmp], { cwd: dir, shell: true });
    const tarballs = fs.readdirSync(tmp).filter((f) => f.endsWith('.tgz'));
    if (tarballs.length !== 1) {
      fail(name, `expected 1 tarball, found ${tarballs.length}`);
      continue;
    }
    const tgz = path.join(tmp, tarballs[0]);
    const entries = run('tar', ['-tzf', tgz])
      .split('\n')
      .map((line) => line.trim().replace(/^package\//, ''))
      .filter(Boolean);
    const packed = JSON.parse(run('tar', ['-xOf', tgz, 'package/package.json']));
    const files = new Set(entries);

    if (!entries.some((f) => f.startsWith('dist/'))) {
      fail(name, 'tarball ships no dist/ files');
    }
    const leakage = entries.filter(
      (f) => /^(src|test|tests|examples)\//.test(f) || f.endsWith('.tsbuildinfo'),
    );
    if (leakage.length > 0) {
      fail(name, `tarball leaks source/test files: ${leakage.slice(0, 5).join(', ')}`);
    }
    if (!files.has('LICENSE')) fail(name, 'tarball misses LICENSE');
    if (!files.has('README.md')) fail(name, 'tarball misses README.md');

    for (const field of [
      'dependencies',
      'devDependencies',
      'peerDependencies',
      'optionalDependencies',
    ]) {
      for (const [dep, range] of Object.entries(packed[field] ?? {})) {
        if (String(range).includes('workspace:')) {
          fail(name, `${field}.${dep} still uses workspace: (${range})`);
        }
      }
    }

    const targets = new Set([
      ...walkExportTargets(packed.exports),
      ...(typeof packed.bin === 'string' ? [packed.bin] : Object.values(packed.bin ?? {})),
      packed.main,
      packed.module,
      packed.types,
    ]);
    for (const target of targets) {
      if (typeof target !== 'string') continue;
      if (!target.startsWith('./')) continue;
      if (target.includes('*')) continue; // pattern export, resolved at runtime
      const rel = target.slice(2);
      if (!files.has(rel)) fail(name, `export/bin target missing in tarball: ${rel}`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

if (violations.length > 0) {
  console.error(`\n${violations.length} violation(s):`);
  for (const v of violations) console.error('  ✗ ' + v);
  process.exit(1);
}
console.log(`\n✓ all ${packages.length} packages pass`);
