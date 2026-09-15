# web

The console frontend. An nx monorepo on **bun 1.3.14** — two apps, five shared packages.

## Commands

```bash
bun run typecheck    # nx run-many -t typecheck
bun run lint
bun run test
bun run affected     # lint + typecheck + test, changed projects only
bun run dev:cloud    # cloud-react
bun run dev:admin    # serverless-web
```

Use `bun`, not npm or yarn — `bun.lock` is the lockfile and `packageManager` pins the version.

## Never verify with bare `tsc --noEmit`

In `apps/cloud-react` the root `tsconfig.json` is a project-references stub: `"files": []` plus references to `tsconfig.app.json` / `tsconfig.node.json` / `tsconfig.test.json`. `npx tsc --noEmit` there exits 0 having checked **no source files at all**.

A clean bare-`tsc` run reads as verification and proves nothing. It let `tab is not defined`, `navigate is not defined`, and a `res` identifier that did not exist reach production — each a plain TS2304 that `tsc -b` catches instantly.

**Always `bun run typecheck`** (= `tsc -b --force`). And never send its stderr to `/dev/null` — `tsc -b --force --listFiles 2>/dev/null` hides the diagnostics and recreates the same false all-clear.

## Layout

| Path | What |
|---|---|
| `apps/cloud-react` | The customer console |
| `apps/serverless-web` | The admin surface |
| `packages/common-ui` | Shared components |
| `packages/api-gateway`, `serverless`, `integration`, `workflows` | Shared clients and domain logic |

A change in `packages/` affects both apps. `bun run affected` is the cheap way to find out what it touched; `bun run typecheck` across everything is the safe way.

## Conventions the build enforces

- Scoped package names must be lowercase `@datadack/`. `bun run check:scope-case` fails CI on `@DataDack/`.
- Formatting is prettier: `bun run format` / `format:check`.
- Releases go through changesets — `bun run changeset`, then `version-packages`, then `release`. Do not hand-edit versions.
