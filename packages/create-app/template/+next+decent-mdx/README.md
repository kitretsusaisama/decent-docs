This is a Next.js application generated with
Create Decent Docs.

Run development server:

```bash
npm run dev
# or
pnpm dev
# or
yarn dev
```

Open http://localhost:3000 with your browser to see the result.

## Explore

In the project, you can see:

- `lib/source.ts`: Code for content source adapter, [`loader()`](https://github.com/kitretsusaisama/decent-docs/docs/headless/source-api) provides the interface to access your content.
- `lib/layout.shared.tsx`: Shared options for layouts, optional but preferred to keep.

| Route                     | Description                                            |
| ------------------------- | ------------------------------------------------------ |
| `app/(home)`              | The route group for your landing page and other pages. |
| `app/docs`                | The documentation layout and pages.                    |
| `app/api/search/route.ts` | The Route Handler for search.                          |

### Decent Docs MDX

Collections are defined with the [Macro API](https://github.com/kitretsusaisama/decent-docs/docs/mdx/macro) in `lib/source.ts`.

Read the [Introduction](https://github.com/kitretsusaisama/decent-docs/docs/mdx) for further details.

## Learn More

To learn more about Next.js and Decent Docs, take a look at the following
resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js
  features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [Decent Docs](https://github.com/kitretsusaisama/decent-docs) - learn about Decent Docs
