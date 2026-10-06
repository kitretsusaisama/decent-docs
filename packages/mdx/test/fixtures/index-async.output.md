```ts title="server.ts"
// @ts-nocheck
import { frontmatter as __fd_glob_3 } from "./generate-index/index.mdx?collection=blogs&only=frontmatter"
import { frontmatter as __fd_glob_2 } from "./generate-index/folder/test.mdx?collection=blogs&only=frontmatter"
import { frontmatter as __fd_glob_1 } from "./generate-index/index.mdx?collection=docs&only=frontmatter"
import { frontmatter as __fd_glob_0 } from "./generate-index/folder/test.mdx?collection=docs&only=frontmatter"
import { server } from '@decentdocs/mdx/runtime/server';
import type * as Config from './config';

const create = server<typeof Config, import("@decentdocs/mdx/runtime/types").InternalTypeConfig & {
  DocData: {
    blogs: {
      /**
       * extracted references (e.g. hrefs, paths), useful for analyzing relationships between pages.
       */
      extractedReferences: import("@decentdocs/mdx").ExtractedReference[];
    },
  }
}>();

export const docs = await create.docLazy("docs", "packages/mdx/test/fixtures/generate-index", {"folder/test.mdx": __fd_glob_0, "index.mdx": __fd_glob_1, }, {"folder/test.mdx": () => import("./generate-index/folder/test.mdx?collection=docs"), "index.mdx": () => import("./generate-index/index.mdx?collection=docs"), });

export const blogs = await create.docLazy("blogs", "packages/mdx/test/fixtures/generate-index", {"folder/test.mdx": __fd_glob_2, "index.mdx": __fd_glob_3, }, {"folder/test.mdx": () => import("./generate-index/folder/test.mdx?collection=blogs"), "index.mdx": () => import("./generate-index/index.mdx?collection=blogs"), });
```

```ts title="dynamic.ts"
// @ts-nocheck
import { dynamic } from '@decentdocs/mdx/runtime/dynamic';
import * as Config from './config';

const create = await dynamic<typeof Config, import("@decentdocs/mdx/runtime/types").InternalTypeConfig & {
  DocData: {
    blogs: {
      /**
       * extracted references (e.g. hrefs, paths), useful for analyzing relationships between pages.
       */
      extractedReferences: import("@decentdocs/mdx").ExtractedReference[];
    },
  }
}>(Config, {"environment":"dynamic","root":"","configPath":"packages/mdx/test/fixtures/config.ts","outDir":"packages/mdx/test/fixtures"});
```

```ts title="browser.ts"
// @ts-nocheck
import { browser } from '@decentdocs/mdx/runtime/browser';
import type * as Config from './config';

const create = browser<typeof Config, import("@decentdocs/mdx/runtime/types").InternalTypeConfig & {
  DocData: {
    blogs: {
      /**
       * extracted references (e.g. hrefs, paths), useful for analyzing relationships between pages.
       */
      extractedReferences: import("@decentdocs/mdx").ExtractedReference[];
    },
  }
}>();
const browserCollections = {
  docs: create.doc("docs", {"folder/test.mdx": () => import("./generate-index/folder/test.mdx?collection=docs"), "index.mdx": () => import("./generate-index/index.mdx?collection=docs"), }),
  blogs: create.doc("blogs", {"folder/test.mdx": () => import("./generate-index/folder/test.mdx?collection=blogs"), "index.mdx": () => import("./generate-index/index.mdx?collection=blogs"), }),
};
export default browserCollections;
```