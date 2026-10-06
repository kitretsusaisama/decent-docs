import defaultMdxComponents from '@decentdocs/ui/mdx';
import * as FilesComponents from '@decentdocs/ui/components/files';
import * as TabsComponents from '@decentdocs/ui/components/tabs';
import type { MDXComponents } from 'mdx/types';
import { Accordion, Accordions } from '@decentdocs/ui/components/accordion';

export function getMDXComponents(components?: MDXComponents) {
  return {
    ...defaultMdxComponents,
    ...TabsComponents,
    ...FilesComponents,
    Accordion,
    Accordions,
    ...components,
  } satisfies MDXComponents;
}

export const useMDXComponents = getMDXComponents;

declare global {
  type MDXProvidedComponents = ReturnType<typeof getMDXComponents>;
}
