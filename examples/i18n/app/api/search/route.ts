import { source } from '@/lib/source';
import { createFromSource } from '@decentdocs/core/search/server';

// zero config: the default `multilingual` mode works for every language
export const { GET } = createFromSource(source);
