'use client';
import type { FC } from 'react';
import { defaultShikiFactory } from '@decentdocs/core/highlight/shiki/full';
import type {
  CreateOpenAPIRendererOptions,
  OpenAPIRenderOptions,
  OpenAPIRuntimeOptions,
} from '@/utils/create-page';
import type {
  OpenAPIPageProps,
  OpenAPIPageProps_Preloaded,
  OpenAPIPageProps_Spec,
} from '@/utils/pages/builder';
import { createOpenAPIPageBase } from './base';

export type { OpenAPIPageProps, OpenAPIPageProps_Spec, OpenAPIPageProps_Preloaded };

export interface CreateOpenAPIPageOptions extends OpenAPIRuntimeOptions, OpenAPIRenderOptions {
  /**
   * Replace parts of the UI with your own components.
   */
  components?: Partial<CreateOpenAPIRendererOptions['components']>;
}

/**
 * Create `<OpenAPIPage />` (a client component).
 */
export function createOpenAPIPage(options: CreateOpenAPIPageOptions = {}): FC<OpenAPIPageProps> {
  return createOpenAPIPageBase({
    ...options,
    shiki: options.shiki ?? defaultShikiFactory,
  });
}
