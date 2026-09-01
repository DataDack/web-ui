# Structure — cloud console

**Verified:** 2026-09-01 by extraction — module list and line counts from the
filesystem, route composition from `App.tsx`, conventions by checking which
files each module actually has.

The console is the web UI for the whole platform: **33 modules, ~116,000 lines**
of TypeScript and TSX. Before this document it had 11 markdown files, all of them
repository boilerplate — README, CONTRIBUTING, SECURITY — and nothing describing
how it is put together.

---

## The workspace

```
web/
  apps/cloud-react/       the console itself
  packages/common-ui/     the design system — every primitive, Radix-based
  packages/serverless/    the serverless section, as a package
  packages/integration/   integrations UI
  packages/workflows/     automation/workflow UI
  config/eslint-config/   the shared flat configs (base + react)
  config/typescript-config/
```

Bun workspaces over `apps/*`, `packages/*` and `config/*`, orchestrated by Nx.
The whole tree is copied into the Docker build because an install needs every
workspace manifest — see the Dockerfile's comment on the console build stage.

**Bun is pinned exactly** in two places that a test keeps in agreement; see
`serverless/docs/platform/REPO_OPERATIONS.md`.

## A module

Every module follows the same shape, and the consistency is real rather than
aspirational — of 33 modules, 23 carry all four files:

```
modules/<name>/
  <name>.router.tsx     route objects, exported and composed in App.tsx
  <name>.api.ts         the HTTP surface. One function per endpoint
  <name>.hooks.ts       TanStack Query hooks. Query keys, polling, invalidation
  <name>.types.ts       backend DTOs, snake_case, matching the Go JSON contract
  <name>.constants.ts   routes, query keys, enums
  partials/             page-level components for this module only
  components/           reusable pieces for this module only
```

The rule that keeps it navigable: **`partials/` is pages, `components/` is
pieces.** Anything a second module needs moves to `packages/common-ui`.

### Why `.types.ts` mirrors Go

The DTOs are written in `snake_case` to match the Go JSON contract exactly,
rather than being camel-cased at the boundary. A rename at the edge means two
names for one field and a mapping layer nobody maintains; keeping the wire shape
means a backend field can be traced to its consumer by grep.

## Routing

`App.tsx` imports each module's exported route array and composes them into one
`createBrowserRouter`. A module owns its own paths; nothing central lists them.

Two `handle` flags change the shell:

| Flag | Effect |
|---|---|
| `hideSidebar: true` | Drops the service sidebar — for full-bleed create wizards |
| `fullBleed: true` | Also drops the shell's padding, for a page that is itself a workbench (the serverless editor, the build workbench) |

## The shell

`components/console/shell/`:

| File | Role |
|---|---|
| `AppShell.tsx` | Layout, the skip link, the `<main>` landmark, route-driven shell modes |
| `Sidebar.tsx` | The service navigation. `aria-current` on the active item; collapsed items carry an `aria-label` because the tooltip is a **visual** label only |
| `sidebar-nav.ts` | The nav map — 10 services, 34 items, 7 flagged `comingSoon` |
| `Topbar.tsx`, `SearchTrigger.tsx`, `UserMenu.tsx`, `RegionSelector.tsx` | The top chrome |

Navigation is two-level: a service, then its items — 10 services over 34
items. A flat strip of that many is a menu you read twice.

## Data access

`services/api/client.ts` owns the axios instance, error extraction and the
shared list query. Modules never construct their own client: the interceptors
carry auth, the active scope and the device identity, and a second client would
be a second place to get those wrong.

TanStack Query everywhere. The conventions worth knowing:

- **Query keys are factories**, in `<module>.constants.ts` — never inline
  arrays, so an invalidation can target a prefix.
- **Polling is conditional on state**, not always-on. `refetchInterval` is a
  function of the data: a transitional build polls every 3s, a settled one not
  at all.
- **A filter belongs in the key.** Sharing one key across filters shows the
  previous filter's rows under the new heading while the refetch is in flight.

## Accessibility

Enforced: `jsx-a11y` is extended in `config/eslint-config/react.js` and reports
**0 findings**.

Not enforceable by a linter, and each was a real defect fixed on 2026-09-01:

- **An icon-only control needs an `aria-label`.** A Radix tooltip is a visual
  label; it gives the trigger no accessible name. A collapsed sidebar announced
  every item as an unnamed "link".
- **Active state must be announced, not only coloured** — `aria-current="page"`.
  Setting it explicitly also matters where several nav items share a pathname
  and differ by `?tab=`: `NavLink`'s own version marks all of them current.
- **A skip link is required** when navigation is long. Every nav item was
  tabbed through on each navigation before one existed.

## Internationalisation

`services/language_service/locales/{en,hi}.json`. Keys are added to **both** in
the same change; a missing key renders as the key.

## Testing

`bun test` — 109 tests across 13 files, at `apps/cloud-react/tests/`. The suite
is weighted toward **pure functions with a failure mode that is invisible in the
UI**: log tone parsing, env parsing, project list derivation, the `https`
upgrade. A component that merely renders is not usually worth a test here; a
function whose bug looks like working software is.

## Commands

```bash
bun run dev          # vite
bun run typecheck    # tsc -b --force
bun run lint         # eslint .
bun test             # bun's runner
bun run build        # vite build
```

## Known state

- **`modules/automations/automations.client.ts:180`** has a standing typecheck
  error (`integrationsRequest` not in `AIAutomationsTransport`). It predates
  this document and is the only one in the tree.
- **`kubernetes` and `autoscaling`** are coming-soon pages, along with 5 other
  nav items — declared in `sidebar-nav.ts`, not accidental.
- **`region`** is 36 lines and `console` has no router; both are support
  modules rather than sections.
