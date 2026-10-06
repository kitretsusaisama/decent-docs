# Security Policy

## Reporting a Vulnerability

Report security vulnerabilities through **GitHub Private Vulnerability
Reporting** (repository: `Settings` -> `Security` -> `Advisories` -> `New
draft security advisory`):

https://github.com/kitretsusaisama/decent-docs/security/advisories/new

- Never open a public issue for an exploitable vulnerability.
- Include the affected package (`@decentdocs/*` or `create-decent-docs`),
  version, reproduction steps, and impact.
- Expect an acknowledgement within 72 hours and a status update within
  7 days. Fixes ship as patch releases on the lockstep line.

If private reporting is unavailable, open a plain public issue asking for
a secure contact channel - put no vulnerability details in it.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |

Releases are lockstep: every publishable package versions and publishes
together (see [RELEASE.md](./RELEASE.md)). Only the latest line receives
fixes; upgrading means bumping all `@decentdocs/*` packages at once.

## Trust Model

- **Content is trusted.** MDX compiles to executable JavaScript at build
  time. Never build documentation from untrusted content without
  isolating the build.
- **Secrets stay server-side.** Only `NEXT_PUBLIC_`/`VITE_`-prefixed
  configuration may reach the browser. The `feature search` command
  separates public keys from write/admin keys (`privateEnv`) - keep that
  separation when adding integrations.
- **Dev servers are local.** The local content dev server binds
  `127.0.0.1` only.
- **Publishing is provenance-signed.** CI publishes to npm with provenance
  (OIDC), from a protected `main` branch, after dependency review and the
  tarball audit in `pnpm check:pack`. Full release and rollback policy:
  [RELEASE.md](./RELEASE.md).

## Hardening in This Repository

- Every GitHub Action is pinned to a commit SHA; Dependabot updates them
  weekly alongside npm dependencies.
- CodeQL analyzes every push and pull request (`.github/workflows/codeql.yml`).
- Dependency review fails PRs on high-severity vulnerabilities and
  disallowed licenses.
- pnpm enforces `minimumReleaseAge` (delay window on brand-new publishes)
  and an install-script allowlist (`allowBuilds`), so unexpected lifecycle
  scripts are blocked by default. Vulnerable dependencies are patched via
  `patchedDependencies` instead of waiting upstream.

User-facing guidance (trust model, header recipe, rate-limit advice):
`apps/docs/content/docs/(framework)/guides/security.mdx`.
