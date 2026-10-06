import type * as Breadcrumb from '@decentdocs/core/breadcrumb';
import type * as TOC from '@decentdocs/core/toc';
import type * as Search from '@decentdocs/core/search';
import type * as PageTree from '@decentdocs/core/page-tree';
import type * as MDX from '@decentdocs/core/mdx-plugins';

export type SortedResult = Search.SortedResult;

export type StructureOptions = MDX.StructureOptions;

export type BreadcrumbItem = Breadcrumb.BreadcrumbItem;

export type ScrollProviderProps = TOC.ScrollProviderProps;
export type AnchorProviderProps = TOC.AnchorProviderProps;

export type TOCItemType = TOC.TOCItemType;

export type PageTreeItem = PageTree.Item;
export type PageTreeFolder = PageTree.Folder;
export type PageTreeRoot = PageTree.Root;
export type PageTreeSeparator = PageTree.Separator;

export type RemarkImageOptions = MDX.RemarkImageOptions;
