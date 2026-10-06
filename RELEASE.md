# Release runbook

How Decent Docs packages get to npm, who may publish, what happens on a bad
release, and how to recover. Companion to `.changeset/config.json` and
`.github/workflows/release.yml`.

## Versioning model

- **Lockstep (fixed group):** all 20 publishable `@decentdocs/*` /
  `create-decent-docs` packages share one version and are always published
  together. Private packages (6) are ignored by changesets.
- **Source of truth:** the `version` field in each `package.json`, moved only
  by `pnpm version-packages` (Changesets) — never by hand.
- **Branch:** `main`. CI requires a changeset file for any PR that changes
  publishable packages (`pnpm changeset status` runs in CI).

## Normal release flow

```
user                      GitHub                        npm
    |                          |                           |
    |-- pnpm changeset ------->|  (.changeset/*.md)        |
    |-- PR ------------------->|                           |
    |                    CI: status/build/test/lint/pack   |
    |                    merge to main                     |
    |                          |-- changesets/action       |
    |                          |   opens "Release PR"      |
    |                          |   (bumps versions +       |
    |                          |    CHANGELOGs)            |
    |<-- review/merge ---------|                           |
    |                          |-- pnpm release            |
    |                          |   changeset publish -------> 20 packages
    |                          |   + provenance (OIDC)        + tag v1.x.y
```

1. Author a PR with `pnpm changeset` (interactive) or a hand-written
   `.changeset/<name>.md`. CI fails if a versionable change ships without one.
2. Merge to `main`. The Release workflow opens/updates the **Release PR**.
3. Merge the Release PR. The workflow detects no pending changesets and runs
   `pnpm release` → `changeset publish` for every package in the fixed group.
4. Verify: `npm view @decentdocs/core version` and check the npm page for the
   provenance attestation.

## First publish (bootstrap)

Trusted publishing cannot be pre-configured for packages that do not exist
yet, so the first publish uses a token:

1. Confirm scope ownership: `npm whoami` (logged in) and
   `npm view @decentdocs/core version` must 404 (name free, scope owned by
   this account).
2. Create an **automation token** (npmjs.com → Access Tokens → Granular
   token, package permissions: read/write for the whole `@decentdocs` scope
   plus `create-decent-docs`) and add it as the repository secret `NPM_TOKEN`.
3. Merge the first Release PR. The workflow publishes with
   `NPM_CONFIG_PROVENANCE=true` — provenance works with token auth as long as
   `id-token: write` is set (it is).
4. Spot-check the tarball: `npm pack @decentdocs/core@1.0.0` → package.json
   must contain no `workspace:` ranges and `decent-docs` must be the CLI bin
   (also enforced by `pnpm check:pack` in CI).

## Switching to OIDC trusted publishing (after bootstrap)

1. npmjs.com → each package → **Trusted publishing** → add
   repository `<owner>/<repo>`, workflow filename `release.yml`
   (must match exactly), no environment.
   (`create-decent-docs` too - 20 packages total.)
2. Delete the `NPM_TOKEN` repository secret. `npm` then authenticates via the
   GitHub OIDC token automatically (`id-token: write` stays in the workflow).
3. Verify the next release publishes with a provenance badge and no token
   configured. If a publish fails with 403/E403, the trusted-publisher entry
   does not match the workflow file or repository name — fix the entry, do
   not reintroduce long-lived tokens.

## Rollback policy

npm registry versions are immutable in practice. **Do not unpublish.**
Recovery is forward-only:

| Situation                   | Action                                                                |
| --------------------------- | --------------------------------------------------------------------- |
| Bad version just published  | `npm dist-tag add <pkg>@<last-good> latest` — immediate pin, then fix |
| Bad version in the wild     | publish a fixed patch via a new changeset (normal flow)               |
| Dangerous/broken version    | `npm deprecate <pkg>@<ver> "<reason>"` so installs warn               |
| Security issue in a version | deprecate + patch release + advisory if warranted; never delete       |

Rules:

- `latest` must always point at a version that passes `pnpm check:pack`.
- Because the group is lockstep, a rollback patch re-publishes **all 20**
  packages, not just the broken one.
- Unpublish is only ever considered within npm's 72-hour window, for a
  package version with zero dependents, and requires an explicit decision —
  default answer is no.

## CI/CD security controls

- `ci.yml` / `release.yml` run on `main` only; `release.yml` never runs on
  pull requests, so a fork PR cannot trigger a publish.
- `GITHUB_TOKEN` is least-privilege per workflow; npm auth is `NPM_TOKEN`
  (bootstrap) or OIDC (steady state) — never a personal token in code.
- `dependency-review.yml` fails PRs that introduce high-severity
  dependencies; pnpm's `minimumReleaseAge` (72 h) applies to every install,
  including CI.
- Recommended repository settings: protect `main` (require PR review + the
  `build, test, lint, pack audit` check before merge), allow Actions only,
  keep the dependency graph enabled — full checklist below.

## Required repository settings (repo: `kitretsusaisama/decent-docs`)

Done in F4g: `main` pushed; `repository`/`homepage`/`bugs` added to all 20
publishable manifests; CI badge in README; docs links point at the repo
until a real domain exists (one search/replace of the repo host later).

Remaining, in the GitHub UI:

1. **Enable Actions** — Settings → Actions → General → Actions
   permissions. Until this is on, pushes show zero workflow runs (every
   workflow in `.github/workflows` is SHA-pinned, so "allow
   `kitretsusaisama/*`" is a safe policy).
2. **Workflow permissions** — same page: `Read and write` permissions, and
   tick _Allow GitHub Actions to create and approve pull requests_ — the
   Release workflow pushes version commits/tags and opens the Release PR.
3. **Branch protection on `main`** — require status check
   `build, test, lint, pack audit` (the exact job name in `ci.yml`), require
   PRs (no direct pushes), 1 review recommended.
4. **`NPM_TOKEN`** secret for the first release; remove it after trusted
   publishing is configured (see the bootstrap section above).
5. **Security features** — Settings → Code security:
   - enable **Private vulnerability reporting** — the reporting path that
     `SECURITY.md` and the docs security page point at;
   - enable **Dependabot alerts** and **secret scanning + push protection**
     (both free for public repos); `dependabot.yml` already schedules the
     version updates;
   - if GitHub turned on **CodeQL default setup**, turn it off — this repo
     ships its own `codeql.yml`, and default + advanced setup must not both
     run.

## Troubleshooting

- **`changeset status` → "must depend on the current version"**: a workspace
  manifest declares an explicit (non-`workspace:`) range on an internal
  package. Convert it to `workspace:*` (dependencies) or `workspace:^`
  (peers).
- **`check:pack` bin-drift failure**: a manifest writer changed an expected
  command name (e.g. `decent-docs` → `cli`). Restore the bin key; never rename
  published commands.
- **Release workflow does nothing**: pending changesets exist but the Release
  PR is unmerged — merge it; or no changesets and no version change —
  nothing to publish is the correct state.
- **Provenance missing**: `NPM_CONFIG_PROVENANCE` removed or
  `id-token: write` dropped from `release.yml`. Both are required.
