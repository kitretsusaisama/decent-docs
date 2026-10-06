import { source } from '@/lib/source';
import { createFromSource } from '@decentdocs/core/search/server';

export const { GET } = createFromSource(source);
