```ts title="server.ts"
// @ts-nocheck
import { default as __fd_glob_0 } from "./generate-index/meta.json?collection=docs"
import { server } from '@decentdocs/mdx/runtime/server';
import type * as Config from './config';

const create = server<typeof Config, import("@decentdocs/mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();

export const docs = await create.meta("docs", "packages/mdx/test/fixtures/generate-index", {"meta.json": __fd_glob_0, });
```

```ts title="dynamic.ts"
// @ts-nocheck
import { dynamic } from '@decentdocs/mdx/runtime/dynamic';
import * as Config from './config';

const create = await dynamic<typeof Config, import("@decentdocs/mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>(Config, {"environment":"dynamic","root":"","configPath":"packages/mdx/test/fixtures/config.ts","outDir":"packages/mdx/test/fixtures"});
```

```ts title="browser.ts"
// @ts-nocheck
import { browser } from '@decentdocs/mdx/runtime/browser';
import type * as Config from './config';

const create = browser<typeof Config, import("@decentdocs/mdx/runtime/types").InternalTypeConfig & {
  DocData: {
  }
}>();
const browserCollections = {
};
export default browserCollections;
```