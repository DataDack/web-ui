# Contributing

## Setup

```bash
bun install     # also installs the husky pre-commit hook via `prepare`
bun run dev     # builds packages, serves the app on :3000/admin/
```

Run `make run-server` from the `serverless_faas` root alongside the dev server —
the Vite proxy forwards `/v1`, `/function`, `/async-function`, `/system` and
`/metrics` to `http://127.0.0.1:8080`.

## Before you push

```bash
bun run lint
bun run typecheck
bun run format:check
bun run build
```

These are exactly what `ci.yml` runs, so a green local run means a green PR. The
pre-commit hook runs ESLint and Prettier over **staged files only** — it is a
convenience, not a substitute for the above.

## Pull requests

The title is validated as a conventional commit and must start lowercase:

```
feat: add runtime filter to the workers table
fix: stop the studio editor remounting on theme change
```

Allowed types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`,
`build`, `ci`, `chore`, `revert`.

Labels and a size label are applied automatically. Fill in the PR template's
**Downstream impact** section — this repository is embedded in another service,
so a change here can break a build you are not looking at.

## Downstream impact

`apps/serverless-web/dist` is embedded into the `serverless_faas` Go binary
through `assets.go`. Two consequences:

1. If the admin build stops emitting `dist/index.html`, CI fails here rather
   than as a confusing `go:embed` error in the service image build.
2. After merging, the `serverless_faas` submodule pointer needs bumping before
   the change ships. Merging here alone changes nothing downstream.

If you change the published package's version, tag `function-studio-v<version>`
to release it. The publish workflow refuses to run when the tag and the
`package.json` version disagree.

## Linting philosophy

Errors are defects; warnings are signals. If a rule is an error, the codebase is
clean against it and a new hit means the change under review introduced it —
fix it rather than downgrading the rule.

If you believe a rule is wrong, change it in `config/eslint-config` with a
comment explaining why, so the next person reads a reason and not a mystery.
Inline `eslint-disable` needs the same justification on the line above.

## Code style

Prettier owns formatting — do not hand-format, and do not argue with it in
review. `.editorconfig` covers editors without a Prettier plugin.

Read colour through a design token (`text-status-danger`, `bg-card`,
`var(--chart-1)`) rather than a literal, so light and dark stay correct in one
place.
