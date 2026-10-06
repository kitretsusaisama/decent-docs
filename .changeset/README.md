# Changesets

Every publishable change needs a changeset: run `pnpm changeset`, pick the
bump type, and commit the generated markdown file.

Release flow (see `.github/workflows/release.yml`):

1. Merges to `main` with pending changesets open/update a **Release PR**
   (`pnpm version-packages` — all packages in the fixed group version
   together).
2. Merging the Release PR runs `pnpm release` (`changeset publish`),
   publishing to npm with provenance via OIDC.

Private workspace packages (`docs`, `@decentdocs/shared`,
`@decentdocs/shared-api`, `@decentdocs/vite`, `tsconfig`,
`create-decent-docs-versions`) are ignored by changesets.
