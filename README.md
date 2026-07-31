# serverless-ui

Monorepo for the serverless-faas web surfaces and the publishable UI packages
they share. Managed with [bun](https://bun.sh) workspaces and
[Nx](https://nx.dev).

> `apps/serverless-admin` **is** the admin console served at `/admin`. Its
> `dist/` is embedded into the Go binary via `assets.go` but is **not**
> committed — build it with `make admin-ui-build` from the repository root, or
> `nx build serverless-admin` here, before building a release binary.

## Layout

```
serverless-ui/
├── config/                    # shared presets, never published
│   ├── typescript-config/     # base / react-library / vite-app tsconfigs
│   └── eslint-config/         # flat configs: base and react
├── packages/                  # publishable, reusable across apps
│   └── function-studio/       # @datadack/function-studio — authoring UI
└── apps/
    └── serverless-admin/      # Vite + React app consuming the package
```

`config/*` packages are `private` — they are consumed through workspace links
and never hit a registry. `packages/*` are versioned and publishable.

## Getting started

```bash
cd serverless-ui
bun install
bun run dev          # builds packages, then serves the app on :3000/admin/
```

The dev server proxies `/v1`, `/function`, `/async-function`, `/system` and
`/metrics` to `http://127.0.0.1:8080`, so run `make run-server` from the
repository root alongside it. Override the target with `CONTROL_PLANE_URL`.

## Tasks

Every task runs through Nx from the workspace root:

| Command             | What it does                                             |
| ------------------- | -------------------------------------------------------- |
| `bun run build`     | Builds packages (tsup → ESM + CJS + d.ts), then the app  |
| `bun run dev`       | Watches packages and runs the Vite dev server            |
| `bun run typecheck` | `tsc --noEmit` across all workspaces                     |
| `bun run lint`      | ESLint flat config across all workspaces                 |
| `bun run affected`  | Lints, typechecks and builds only what changed vs `main` |
| `bun run graph`     | Opens the interactive Nx project graph                   |
| `bun run format`    | Prettier write                                           |
| `bun run clean`     | Removes every `dist/`, then resets the Nx cache          |

### Nx CLI

`nx` is the interface for everything, and `nx <target> <project>` is the
single-project form of any root script:

```bash
bunx nx build @datadack/function-studio   # one project
bunx nx dev serverless-admin           # builds the packages first, then serves
bunx nx run-many -t build              # every project, respecting the graph
bunx nx run-many -t lint -p tag:scope:package
bunx nx affected -t build              # only what your branch touched
bunx nx show projects                  # what Nx sees
bunx nx show project serverless-admin --web
bunx nx graph                          # dependency graph in the browser
bunx nx reset                          # clear the local cache and daemon
```

Add `--verbose` to see the underlying command, and `--skip-nx-cache` to force a
task to re-run. Convenience aliases exist for the app: `bun run dev:admin`,
`bun run build:admin`, `bun run preview:admin`.

Nx infers a project per bun workspace and reads its `package.json` scripts as
targets — there is no `project.json` to keep in sync. `nx.json` supplies only
the cross-cutting rules: `dependsOn: ["^build"]` so nothing ever compiles
against stale package output, `outputs: ["{projectRoot}/dist"]` so cached runs
restore artifacts, and named inputs that keep Markdown out of a task's hash.

`apps/serverless-admin/dist` is excluded from the `default` input set, so the
app's own output cannot feed its own hash and defeat the cache.

Projects carry tags (`scope:app`, `scope:package`, `scope:config`, and
`publishable` on the published package) so `-p tag:<tag>` selects a slice of the
graph — that is how `bun run release` builds exactly the publishable set.

### Nx Console

`.vscode/extensions.json` recommends [Nx
Console](https://marketplace.visualstudio.com/items?itemName=nrwl.angular-console),
which reads `nx.json` directly: it lists every project and target in a sidebar,
runs them with the same caching as the CLI, and renders the project graph in the
editor. VS Code offers to install it on first open of this folder; JetBrains
users can install the "Nx Console" plugin for the same view.

## Adding a package

1. `mkdir packages/<name>` with a `package.json` named `@datadack/<name>` — that
   is the scope the publish workflow authenticates against.
2. Extend `@serverless-ui/typescript-config/react-library.json` in `tsconfig.json`.
3. Re-export from `eslint.config.js`: `export { default } from '@serverless-ui/eslint-config/react'`.
4. Add `build`, `dev`, `typecheck`, `lint` and `clean` scripts — Nx turns each
   script into a target and applies the `nx.json` defaults automatically.
5. Add `"nx": { "tags": ["scope:package", "publishable"] }` so tag-based
   selection and the release script pick it up.
6. Copy `tsup.config.ts` from `packages/function-studio` and mark peers as `external`.

`bun install` is enough for Nx to see the new project — confirm with
`bunx nx show projects`.

## Publishing

Versioning and changelogs run through [changesets](https://github.com/changesets/changesets):

```bash
bun run changeset          # describe the change, pick a bump
bun run version-packages   # apply bumps and write CHANGELOGs
bun run release            # build packages, then publish
```

`release` builds `-p tag:publishable` before handing off to `changeset publish`.
`serverless-admin` is listed in `.changeset/config.json` under `ignore`, so the
app is never versioned or published; it also lacks the `publishable` tag, so the
release build skips it.

`.github/workflows/publish-packages.yml` publishes to GitHub Packages on a tag
shaped like `function-studio-v0.1.0`, and refuses to publish when the tag and the
package's version disagree.

Internal dependencies use the `workspace:*` protocol. A package that depends on
another workspace package should declare it as a **peer** with a plain semver
range as well, so the published artifact does not carry a `workspace:` specifier
into a consumer's `node_modules`.

## Styling

Tailwind CSS v4, via `@tailwindcss/vite`. Design tokens are CSS custom properties
declared in `apps/serverless-admin/src/index.css` — a light block and a `.dark`
block — and exposed to Tailwind through `@theme`. Components compose classes with
`clsx` and `tailwind-merge` (the `cn` helper) and vary with
`class-variance-authority`.

Read colour through a token (`text-status-danger`, `bg-card`, `var(--chart-1)`)
rather than a literal, so both themes stay correct in one place.
