# serverless-admin

Vite + React admin console for the serverless-faas control plane.

This is the console served at `http://localhost:8080/admin`. Views live under
`src/features/`, the shell and shared pieces under `src/components/`, and the
data layer — axios client, zod schemas, react-query hooks — under `src/lib/`.
Function authoring is not implemented here: it comes from
[`@datadack/function-studio`](../../packages/function-studio).

## Run

```bash
# from serverless-ui/
bunx nx dev serverless-admin
```

Serves on `http://localhost:3000/admin/` and proxies `/v1`, `/function`,
`/async-function`, `/system` and `/metrics` to `http://127.0.0.1:8080`. Start the
control plane with `make run-server` from the repository root, or point somewhere
else with `CONTROL_PLANE_URL`.

The port is `strictPort`, so a busy 3000 fails loudly rather than drifting to
another port and leaving you wondering why the proxy stopped working.

## Build

```bash
bunx nx build serverless-admin   # builds the workspace package, type-checks, then emits dist/
```

`dist/` is **not** committed — it is a build artifact. `assets.go` embeds it at
compile time via `//go:embed all:dist`, so the directory is tracked (through a
`.gitkeep`) while its contents are not. `go build` therefore works on a fresh
clone, and `/admin` returns 404 until you build the bundle.

`TestAdminUIServesBuiltAssets` in `tests/e2e` skips when no bundle is present and
verifies serving when one is.

## Styling

Tailwind CSS v4 through `@tailwindcss/vite`. Tokens are CSS custom properties in
`src/index.css` — a light block and a `.dark` block — surfaced to Tailwind via
`@theme`. Compose classes with the `cn` helper (`clsx` + `tailwind-merge`) and
vary them with `class-variance-authority`.

Always read colour through a token (`text-status-danger`, `bg-card`,
`var(--chart-1)`) rather than a literal, so both themes stay correct in one place.
Chart series have their own `--chart-*` tokens: the status tones are tuned to read
as text on a tinted badge, and reusing them as large chart fills fails the
contrast and chroma checks a categorical palette has to pass.
