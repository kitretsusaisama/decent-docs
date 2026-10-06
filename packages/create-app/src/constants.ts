import { fileURLToPath } from 'node:url';
import versionPkg from '../../create-app-versions/package.json';
import * as corePkg from '../../core/package.json';
import * as mdxPkg from '../../mdx/package.json';
import * as basePkg from '../../base-ui/package.json';

export const sourceDir = fileURLToPath(new URL(`../`, import.meta.url).href);

export const isCI = Boolean(process.env.CI);

export interface TemplateInfo {
  value:
    | '+next+decent-mdx'
    | 'astro'
    | 'waku'
    | 'react-router'
    | 'tanstack-start'
    | '+next+decent-mdx+static';
  label: string;
  appDir: string;
  /**
   * path to root provider, relative to `appDir``
   */
  rootProviderPath: string;
  hint?: string;
  /**
   * rename files when copying from template
   */
  rename?: (name: string) => string;
}

export const templates: TemplateInfo[] = [
  {
    value: '+next+decent-mdx',
    label: 'Next.js: Decent Docs MDX',
    hint: 'recommended: powerful and mature',
    appDir: '',
    rootProviderPath: 'app/layout.tsx',
  },
  {
    value: 'waku',
    label: 'Waku: Decent Docs MDX',
    hint: 'recommended: fast and simple',
    appDir: 'src',
    rootProviderPath: 'components/provider.tsx',
  },
  {
    value: '+next+decent-mdx+static',
    label: 'Next.js Static: Decent Docs MDX',
    appDir: '',
    rootProviderPath: 'components/provider.tsx',
  },
  {
    value: 'react-router',
    label: 'React Router: Decent Docs MDX (not RSC)',
    appDir: 'app',
    rootProviderPath: 'root.tsx',
  },
  {
    value: 'tanstack-start',
    label: 'Tanstack Start: Decent Docs MDX (not RSC)',
    appDir: 'src',
    rootProviderPath: 'routes/__root.tsx',
  },
  {
    value: 'astro',
    label: 'Astro: React Islands',
    hint: 'partial support only, uses Astro Content Collections.',
    appDir: 'src',
    rootProviderPath: 'components/docs.tsx',
  },
];

const workspaces = [corePkg, mdxPkg, basePkg];

export const depVersions = versionPkg.dependencies;

for (const workspace of workspaces) {
  depVersions[workspace.name as keyof typeof depVersions] = workspace.version;
}

depVersions['@decentdocs/ui'] = `npm:${basePkg.name}@${basePkg.version}`;
