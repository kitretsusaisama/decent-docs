import { DocsLayout } from '@decentdocs/ui/layouts/docs';
import { DocsPage, type DocsPageProps } from '@decentdocs/ui/layouts/docs/page';
import type { Root } from '@decentdocs/core/page-tree';
import type { ReactNode } from 'react';
import { navigate } from 'astro:transitions/client';
import { RootProvider } from '@decentdocs/ui/provider/astro';
import type { AstroProviderProps } from '@decentdocs/core/framework/astro';
import SearchDialog from './search';

export function Docs({
  tree,
  children,
  pathname,
  params,
  page,
}: {
  tree: Root;
  children: ReactNode;
  pathname: string;
  params: AstroProviderProps['params'];
  page?: DocsPageProps;
}) {
  return (
    <RootProvider
      pathname={pathname}
      params={params}
      navigate={navigate}
      theme={{ enabled: false }}
      search={{ SearchDialog }}
    >
      <DocsLayout
        tree={tree}
        themeSwitch={{
          enabled: false,
        }}
        nav={{
          title: 'Decent Docs on Astro',
        }}
      >
        <DocsPage {...page}>{children}</DocsPage>
      </DocsLayout>
    </RootProvider>
  );
}
