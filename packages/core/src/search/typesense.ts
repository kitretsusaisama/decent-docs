import type { Client, CollectionCreateSchema, CollectionFieldSchema } from 'typesense';
import type { StructuredData } from '@/mdx-plugins/remark-structure';
import type { LoaderConfig, LoaderOutput } from '@/source/loader';
import type { Awaitable } from '@/types';
import { buildBreadcrumbs, buildDocuments } from './server/build-index';

/**
 * Document record passed to the sync function.
 */
export interface DocumentRecord {
  title: string;
  description?: string;
  breadcrumbs?: string[];

  /**
   * URL to the page
   */
  url: string;
  structured: StructuredData;

  /**
   * Tag(s) to filter results
   */
  tag?: string | string[];
  locale?: string;
}

/**
 * Document in Typesense, for the title, headings and paragraphs of a page.
 */
export interface TypesenseDocument {
  objectID: string;
  title: string;
  searchable_title?: string;
  url: string;
  /**
   * Tag(s) to filter results by.
   */
  tag?: string[];
  /**
   * The id of page, used for group_by
   */
  page_id: string;
  /**
   * Heading content
   */
  section?: string;
  /**
   * Heading (anchor) id
   */
  section_id?: string;
  breadcrumbs?: string[];
  content: string;
}

export interface SyncOptions {
  /**
   * Typesense Collection Name for documents.
   */
  typesenseCollectionName: string;
  /**
   * Search indexes
   */
  documents: DocumentRecord[];
  /**
   * Typesense creates different collections for different locales. This allows you to set custom collection settings per locale.
   * ```
   *  zh: {
   *    token_separators: ["_", "-"]
   *  }
   * ```
   */
  customLocaleCollectionSettings?: Record<string, CustomSettings>;
}

export interface CustomSettings {
  token_separators?: string[];
  symbols_to_index?: string[];
  field_definitions?: CollectionFieldSchema[];
  enable_nested_fields?: boolean;
}

/**
 * Build the search documents of every page in a source.
 */
export async function toDocuments<C extends LoaderConfig>(
  source: LoaderOutput<C> | (() => Awaitable<LoaderOutput<C>>),
  options: {
    /** Tag to filter results by. */
    tag?: (page: C['page']) => string | string[];
  } = {},
): Promise<DocumentRecord[]> {
  const loader = typeof source === 'function' ? await source() : source;

  return buildDocuments(loader, (index, page) => ({
    title: index.title,
    description: index.description,
    breadcrumbs: buildBreadcrumbs(loader, page),
    url: index.url,
    structured: index.structuredData,
    tag: options.tag?.(page),
    locale: page.locale,
  }));
}

interface TypesenseHelperOptions {
  customSettings?: CustomSettings;
  locale?: string;
}

class TypesenseHelper {
  private typesenseClient: Client;
  private aliasName: string;
  private collectionNameTmp: string;
  private collectionLocale: string;
  private customSettings: CustomSettings | undefined;
  private typesenseVersion = 0;

  constructor(client: Client, aliasName: string, options: TypesenseHelperOptions) {
    this.typesenseClient = client;
    this.aliasName = aliasName;
    this.collectionNameTmp = `${aliasName}_${Date.now()}`;
    this.collectionLocale = options.locale ?? 'en';
    this.customSettings = options.customSettings;
  }

  async init(): Promise<void> {
    const version = (await this.typesenseClient.debug.retrieve()).version;
    if (version === 'nightly') this.typesenseVersion = 30;
    else this.typesenseVersion = parseInt(version.split('.')[0], 10);
  }

  async createTmpCollection(): Promise<void> {
    if (this.typesenseVersion === 0) await this.init();

    try {
      await this.typesenseClient.collections(this.collectionNameTmp).delete();
    } catch (error: unknown) {
      const e = error as { httpStatus?: number };
      if (e.httpStatus !== 404) throw error;
    }

    const textLocale = this.collectionLocale;
    const schema: CollectionCreateSchema = {
      name: this.collectionNameTmp,
      fields: getDefaultCollectionFields(textLocale),
      token_separators: ['_', '-'],
    };

    if (this.customSettings) {
      if (this.customSettings.token_separators)
        schema.token_separators = this.customSettings.token_separators;
      if (this.customSettings.symbols_to_index)
        schema.symbols_to_index = this.customSettings.symbols_to_index;
      if (this.customSettings.field_definitions)
        schema.fields = this.customSettings.field_definitions;
      if (this.customSettings.enable_nested_fields !== undefined)
        schema.enable_nested_fields = this.customSettings.enable_nested_fields;
    }

    await this.typesenseClient.collections().create(schema);
  }

  async addRecords(records: TypesenseDocument[], url: string, fromSitemap: boolean): Promise<void> {
    const recordCount = records.length;

    try {
      for (let i = 0; i < recordCount; i += 50) {
        const chunk = records.slice(i, i + 50);
        const failedItems = (
          await this.typesenseClient
            .collections(this.collectionNameTmp)
            .documents()
            .import(chunk, { action: 'create' })
        ).filter((r) => r.success === false);

        if (failedItems.length > 0) {
          console.error('Typesense Import Failed:', JSON.stringify(failedItems, null, 2));
          throw new Error('Failed to import some records');
        }
      }
    } catch (error: unknown) {
      console.error('Error [Typesense] Error adding records:', error);
      throw error;
    }

    const color = fromSitemap ? '96' : '94';
    const prefix = url ? ` ${url}` : '';
    console.log(`    Indexed${prefix} \x1b[${color}m${recordCount} records\x1b[0m`);
  }

  async commitTmpCollection(): Promise<void> {
    const oldCollectionName = await this.getOldCollectionName();
    if (oldCollectionName) {
      await this.transferSynonyms(oldCollectionName);
      await this.transferOverrides(oldCollectionName);
    }
    await this.typesenseClient
      .aliases()
      .upsert(this.aliasName, { collection_name: this.collectionNameTmp });
    if (oldCollectionName) await this.typesenseClient.collections(oldCollectionName).delete();
  }

  private async getOldCollectionName(): Promise<string | null> {
    try {
      return (await this.typesenseClient.aliases(this.aliasName).retrieve()).collection_name;
    } catch (error: unknown) {
      const e = error as { httpStatus?: number };
      if (e.httpStatus === 404) return null;
      throw error;
    }
  }

  private async transferSynonyms(oldCollectionName: string): Promise<void> {
    const oldSchema = await this.typesenseClient.collections(oldCollectionName).retrieve();

    // Global synonym sets (typesense >= 30) are server-wide and referenced by
    // name; carry the references over to the new collection.
    if (oldSchema.synonym_sets?.length) {
      await this.typesenseClient
        .collections(this.collectionNameTmp)
        .update({ synonym_sets: oldSchema.synonym_sets });
    }

    // Per-collection synonyms are copied one by one.
    const synonyms =
      (await this.typesenseClient.collections(oldCollectionName).synonyms().retrieve()).synonyms ||
      [];
    for (const synonym of synonyms) {
      const { id: _id, ...synonymKeys } = synonym;
      await this.typesenseClient
        .collections(this.collectionNameTmp)
        .synonyms()
        .upsert(synonym.id, synonymKeys);
    }
  }

  private async transferOverrides(oldCollectionName: string): Promise<void> {
    const oldSchema = await this.typesenseClient.collections(oldCollectionName).retrieve();

    // Global curation sets (typesense >= 30) are referenced by name as well.
    if (oldSchema.curation_sets?.length) {
      await this.typesenseClient
        .collections(this.collectionNameTmp)
        .update({ curation_sets: oldSchema.curation_sets });
    }

    const overrides =
      (await this.typesenseClient.collections(oldCollectionName).overrides().retrieve())
        .overrides || [];
    for (const override of overrides) {
      const { id: _id, ...overrideKeys } = override;
      await this.typesenseClient
        .collections(this.collectionNameTmp)
        .overrides()
        .upsert(override.id, overrideKeys);
    }
  }
}

function getDefaultCollectionFields(locale: string): CollectionFieldSchema[] {
  return [
    {
      name: 'page_id',
      type: 'string',
      facet: true,
    },
    {
      name: 'objectID',
      type: 'string',
      index: false,
    },
    {
      name: 'title',
      type: 'string',
      index: false,
    },
    {
      name: 'searchable_title',
      type: 'string',
      optional: true,
      locale,
    },
    {
      name: 'content',
      type: 'string',
      locale,
    },
    {
      name: 'section',
      type: 'string',
      optional: true,
      index: false,
    },
    {
      name: 'breadcrumbs',
      type: 'string[]',
      index: false,
      optional: true,
    },
    {
      name: 'url',
      type: 'string',
      index: false,
    },
    {
      name: 'tag',
      type: 'string[]',
      facet: true,
      optional: true,
    },
    {
      name: 'section_id',
      type: 'string',
      index: false,
      optional: true,
    },
  ];
}

function toTagArray(tag: string | string[] | undefined): string[] | undefined {
  if (tag === undefined) return undefined;
  return Array.isArray(tag) ? tag : [tag];
}

function toTypesenseDocument(page: DocumentRecord): TypesenseDocument[] {
  let id = 0;
  const documentRecords: TypesenseDocument[] = [];
  const scannedHeadings = new Set<string>();
  let titleIndexed = false;

  function createDocument(
    section: string | undefined,
    sectionId: string | undefined,
    content: string,
  ): TypesenseDocument {
    const doc: TypesenseDocument = {
      objectID: `${page.url}-${(id++).toString()}`,
      breadcrumbs: page.breadcrumbs,
      title: page.title,
      url: page.url,
      page_id: page.url,
      tag: toTagArray(page.tag),
      section,
      section_id: sectionId,
      content,
    };
    if (!titleIndexed) {
      doc.searchable_title = page.title;
      titleIndexed = true;
    }
    return doc;
  }

  if (page.description)
    documentRecords.push(createDocument(undefined, undefined, page.description));

  const { headings, contents } = page.structured;
  for (const p of contents) {
    const heading = p.heading ? headings.find((h) => p.heading === h.id) : null;
    const index = createDocument(heading?.content, heading?.id, p.content);
    if (heading && !scannedHeadings.has(heading.id)) {
      scannedHeadings.add(heading.id);
      documentRecords.push(createDocument(heading.content, heading.id, heading.content));
    }
    documentRecords.push(index);
  }
  for (const h of headings)
    if (!scannedHeadings.has(h.id))
      documentRecords.push(createDocument(h.content, h.id, h.content));

  return documentRecords;
}

/**
 * Configure the index and replace its documents, existing documents stay searchable until the new ones are indexed.
 *
 * @param client - Typesense Server Client with Write Permissions
 * @param options - Sync Options
 */
export async function sync(client: Client, options: SyncOptions): Promise<void> {
  const { documents, typesenseCollectionName } = options;
  const docsByLocale = new Map<string, DocumentRecord[]>();

  for (const doc of documents) {
    const locale = doc.locale ?? 'en';
    if (!docsByLocale.has(locale)) docsByLocale.set(locale, []);
    docsByLocale.get(locale)!.push(doc);
  }

  console.log(`\n Typesense Decent Docs Adapter: Syncing ${docsByLocale.size} locales...`);
  const singleLocaleMode = docsByLocale.size === 1;

  for (const [locale, docs] of docsByLocale) {
    const localizedCollectionName =
      locale && !singleLocaleMode
        ? `${typesenseCollectionName}_${locale}`
        : typesenseCollectionName;
    const schemaLocale = locale ?? 'en';

    console.log(
      `\n [${schemaLocale}] Indexing ${docs.length} pages -> "${localizedCollectionName}"`,
    );

    const collectionSettings = locale
      ? options.customLocaleCollectionSettings?.[locale]
      : undefined;

    await updateDocuments(
      client,
      {
        ...options,
        typesenseCollectionName: localizedCollectionName,
        documents: docs,
      },
      collectionSettings,
      schemaLocale,
    );
  }

  console.log('\n [Typesense] Syncing Complete.');
}

async function updateDocuments(
  client: Client,
  options: SyncOptions,
  collectionSettings: CustomSettings | undefined,
  locale: string,
): Promise<void> {
  const helper = new TypesenseHelper(client, options.typesenseCollectionName, {
    customSettings: collectionSettings,
    locale,
  });

  try {
    await helper.init();
    await helper.createTmpCollection();
    const objects = options.documents.flatMap(toTypesenseDocument);
    await helper.addRecords(objects, '', false);
    await helper.commitTmpCollection();
    console.log(`   [${locale}] Completed`);
  } catch (error) {
    console.error('[Typesense] Indexing Failed:');
    throw error;
  }
}

export { getDefaultCollectionFields };
