# Decent Docs

[![CI](https://github.com/kitretsusaisama/decent-docs/actions/workflows/ci.yml/badge.svg)](https://github.com/kitretsusaisama/decent-docs/actions/workflows/ci.yml)

Documentation framework for Decent platform sites. Content collections, an MDX
pipeline, page trees, search, and OpenAPI docs for React frameworks:

- Next.js
- Astro (with React)
- Vite: TanStack Start, Waku, React Router

Documentation: [https://github.com/kitretsusaisama/decent-docs](https://github.com/kitretsusaisama/decent-docs)

## Quick start

Create a new project:

    npm create decent-docs@latest

Add docs to an existing app:

    npx @decentdocs/cli init

Both run interactively and wire up content, routes, and search.

## Packages

| Package                | What it does                                                   |
| ---------------------- | -------------------------------------------------------------- |
| `@decentdocs/core`     | Page trees, source loaders, MDX plugins, core UI components    |
| `@decentdocs/mdx`      | MDX build pipeline, `source.config.ts` loader, Vite plugin     |
| `@decentdocs/ui`       | Radix-based docs UI                                            |
| `@decentdocs/base-ui`  | Base UI-based docs UI                                          |
| `@decentdocs/cli`      | `decent-docs` command: features and codemods for existing apps |
| `create-decent-docs`   | Project scaffolder (`npm create decent-docs`)                  |
| `@decentdocs/openapi`  | Render OpenAPI specs as MDX docs                               |
| `@decentdocs/tailwind` | Tailwind CSS presets for the docs UI                           |

Every directory under `packages/` is a workspace package; `examples/` holds a
runnable demo site per supported framework.

## Development

| Command            | What it does                    |
| ------------------ | ------------------------------- |
| `pnpm install`     | Install workspace dependencies  |
| `pnpm build`       | Build all packages (turbo)      |
| `pnpm test`        | Run the test suite (vitest)     |
| `pnpm lint`        | Run oxlint across the workspace |
| `pnpm types:check` | Type-check every package        |

## Releases

Publishable packages version together as a fixed group via
[Changesets](https://github.com/changesets/changesets): PRs need a changeset,
CI opens a Release PR, and merging it publishes every package to npm with
provenance. See [RELEASE.md](./RELEASE.md) for the runbook, OIDC trusted
publishing setup, and rollback policy. Local audit: `pnpm check:pack`.

## Security

CodeQL + dependency review on every PR, SHA-pinned actions, pnpm
supply-chain policies, and provenance-signed publishes. To report a
vulnerability, use [SECURITY.md](./SECURITY.md) (private reporting via
GitHub Security Advisories).

## Compatibility

All packages are ESM only.

## License

MIT. See [LICENSE](./LICENSE) and [THIRD-PARTY-NOTICES](./THIRD-PARTY-NOTICES).
