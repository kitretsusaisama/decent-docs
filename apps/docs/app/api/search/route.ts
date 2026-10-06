import { source } from '@/lib/source';
import { flexsearchFromSource } from '@decentdocs/core/search/flexsearch';

export const { GET } = flexsearchFromSource(source);
