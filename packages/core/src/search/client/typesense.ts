import { useMemo, useRef, useState } from 'react';
import { createContentHighlighter, type HighlightedText, type SortedResult } from '@/search';
import { useOnChange } from '@/utils/use-on-change';
import { useDebounce } from '@/utils/use-debounce';
import type { TypesenseDocument } from '@/search/typesense';
import type { Client, SearchResponseHighlight } from 'typesense';

/** A single hit returned by a Typesense search (or a custom `onSearch` implementation). */
export interface TypesenseSearchHit {
  document: TypesenseDocument;
  /**
   * Highlighted snippets per field, as returned by Typesense.
   */
  highlight?: SearchResponseHighlight<TypesenseDocument>;
}

/**
 * Response contract shared by the built-in Typesense query and custom
 * `onSearch` implementations.
 */
export interface TypesenseSearchResponse {
  found: number;
  out_of: number;
  page: number;
  search_time_ms: number;
  request_params: { q: string };
  hits?: TypesenseSearchHit[];
  grouped_hits?: Array<{ hits: TypesenseSearchHit[] }>;
}

interface SearchCacheEntry {
  results: SortedResult[] | 'empty';
  raw?: TypesenseSearchResponse;
}

export interface TypesenseOptions {
  /**
   * Typesense collection name (e.g., 'docs').
   */
  typesenseCollectionName: string;
  /**
   * Typesense client with a search-only API key.
   */
  client: Client;
  /**
   * Filter results with specific tag.
   */
  tag?: string;
  /**
   * Search locale.
   */
  locale?: string;
  /**
   * Support older versions of Decent Docs UI (< 16.6.0) by parsing `<mark>` tags into `contentWithHighlights`.
   * This might impact performance.
   *
   * @defaultValue false
   */
  legacy?: boolean;
  /**
   * Custom search function for server-side search or custom logic.
   */
  onSearch?: (query: string, tag?: string, locale?: string) => Promise<TypesenseSearchResponse>;
}

export interface UseTypesenseSearch {
  search: string;
  setSearch: (v: string) => void;
  query: {
    isLoading: boolean;
    data?: SortedResult[] | 'empty';
    raw_data?: TypesenseSearchResponse;
    error?: Error;
  };
}

/**
 * Hook for Typesense search.
 *
 * @example
 * ```tsx
 * import { useTypesenseSearch } from '@decentdocs/core/search/client/typesense';
 * import { Client } from 'typesense';
 *
 * const client = new Client({
 *   nodes: [{ url: process.env.NEXT_PUBLIC_TYPESENSE_URL! }],
 *   apiKey: process.env.NEXT_PUBLIC_TYPESENSE_SEARCH_KEY!,
 * });
 *
 * export function SearchDialog() {
 *   const { search, setSearch, query } = useTypesenseSearch({
 *     typesenseCollectionName: 'docs',
 *     client,
 *   });
 *   // ...
 * }
 * ```
 */
export function useTypesenseSearch(
  options: TypesenseOptions & {
    /**
     * The debounced delay for performing a search (in ms).
     * @defaultValue 100
     */
    delayMs?: number;
    /**
     * Still perform search even if query is empty.
     * @defaultValue false
     */
    allowEmpty?: boolean;
    /**
     * Custom cache key for the search.
     */
    key?: string;
  },
): UseTypesenseSearch {
  const {
    delayMs = 100,
    allowEmpty = false,
    key,
    typesenseCollectionName,
    client,
    tag,
    locale,
    legacy = false,
    onSearch,
  } = options;

  const [search, setSearch] = useState('');
  const [result, setResult] = useState<SearchCacheEntry>({ results: 'empty' });
  const [error, setError] = useState<Error>();
  const [isLoading, setIsLoading] = useState(false);
  const debouncedValue = useDebounce(search, delayMs);

  const cache = useRef(new Map<string, SearchCacheEntry>());

  const onStart = useRef<(() => void) | undefined>(undefined);

  const cacheKey = useMemo(() => {
    return key ?? JSON.stringify([debouncedValue, tag, locale]);
  }, [debouncedValue, tag, locale, key]);

  useOnChange(cacheKey, () => {
    if (onStart.current) {
      onStart.current();
      onStart.current = undefined;
    }
    const cached = cache.current.get(cacheKey);
    if (cached) {
      setIsLoading(false);
      setError(undefined);
      setResult(cached);
      return;
    }
    setIsLoading(true);
    let interrupt = false;
    onStart.current = () => {
      interrupt = true;
    };
    async function run(): Promise<SearchCacheEntry> {
      if (debouncedValue.length === 0 && !allowEmpty) return { results: 'empty' };
      return searchDocs(debouncedValue, {
        typesenseCollectionName,
        client,
        tag,
        locale,
        legacy,
        onSearch,
      });
    }
    run()
      .then((res) => {
        cache.current.set(cacheKey, res);
        if (interrupt) return;
        setError(undefined);
        setResult(res);
      })
      .catch((err) => {
        setError(err);
      })
      .finally(() => {
        if (!interrupt) setIsLoading(false);
      });
  });

  return {
    search,
    setSearch,
    query: {
      isLoading,
      data: result.results,
      raw_data: result.raw,
      error,
    },
  };
}

function parseSnippet(snippet: string): HighlightedText[] {
  return snippet
    .split(/(<mark>.*?<\/mark>)/g)
    .map((part): HighlightedText => {
      if (part.startsWith('<mark>') && part.endsWith('</mark>')) {
        return {
          type: 'text',
          content: part.replace(/<\/?mark>/g, ''),
          styles: { highlight: true },
        };
      }
      return {
        type: 'text',
        content: part,
      };
    })
    .filter((part) => part.content.length > 0);
}

function groupResults(hits: TypesenseSearchHit[], query: string, legacy: boolean): SortedResult[] {
  const grouped: SortedResult[] = [];
  const scannedUrls = new Set<string>();
  const highlighter = createContentHighlighter(query);

  for (const doc of hits) {
    const hit = doc.document;
    const highlight = doc.highlight;

    if (!scannedUrls.has(hit.url)) {
      scannedUrls.add(hit.url);
      const titleSnippet =
        highlight?.searchable_title?.snippet ?? highlight?.title?.snippet ?? hit.title;

      grouped.push({
        id: hit.url,
        type: 'page',
        breadcrumbs: hit.breadcrumbs,
        url: hit.url,
        content: legacy ? hit.title : highlighter.highlightMarkdown(hit.title).trim(),
        contentWithHighlights: legacy ? parseSnippet(titleSnippet) : undefined,
      });
    }

    const contentSnippet = highlight?.content?.snippet ?? hit.content;
    grouped.push({
      id: hit.objectID,
      type: hit.content === hit.section ? 'heading' : 'text',
      url: hit.section_id ? `${hit.url}#${hit.section_id}` : hit.url,
      content: legacy ? hit.content : highlighter.highlightMarkdown(hit.content).trim(),
      contentWithHighlights: legacy ? parseSnippet(contentSnippet) : undefined,
    });
  }
  return grouped;
}

async function searchDocs(query: string, options: TypesenseOptions): Promise<SearchCacheEntry> {
  if (query.trim().length === 0) {
    return {
      results: 'empty',
      raw: {
        found: 0,
        hits: [],
        out_of: 0,
        page: 0,
        search_time_ms: 0,
        request_params: { q: '' },
      },
    };
  }

  const { typesenseCollectionName, client, tag, locale, legacy = false, onSearch } = options;

  const collectionName = locale ? `${typesenseCollectionName}_${locale}` : typesenseCollectionName;

  let searchResult: TypesenseSearchResponse;

  if (onSearch) {
    searchResult = await onSearch(query, tag, locale);
  } else {
    // `documents().search()` is untyped on the client (`document: object`), but the
    // runtime shape matches this contract — we always pass `q` ourselves.
    searchResult = (await client
      .collections(collectionName)
      .documents()
      .search({
        q: query,
        query_by: 'searchable_title,content',
        group_by: 'page_id',
        exclude_fields: 'out_of,search_time_ms',
        group_limit: 3,
        limit: 10,
        filter_by: tag ? `tag:${tag}` : undefined,
      })) as unknown as TypesenseSearchResponse;
  }

  const hits = searchResult.grouped_hits
    ? searchResult.grouped_hits.flatMap((group) => group.hits)
    : searchResult.hits;

  if (!hits || hits.length === 0) {
    return {
      results: 'empty',
      raw: searchResult,
    };
  }

  return {
    results: groupResults(hits, query, legacy),
    raw: searchResult,
  };
}
