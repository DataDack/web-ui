# @datadack/serverless-ui

Shared console kit for DataDack web surfaces — the single source of truth for
the pieces the serverless-admin console (this repo) and the cloud-react
customer console previously kept as drifting copies.

## What's inside

- **Design language**: `getStatusConfig` / `TONE_CLASSES` / `TONE_DOT_CLASSES`
  — the status→tone mapping every badge renders through.
- **Console building blocks**: `StatusBadge`, `PageHeader`, `EmptyState`,
  `KeyValueGrid`, `StatCard`/`StatGrid`, `ResourceTable` (+ `cellText`,
  `cellMono`).
- **Charts**: `BarTimeChart`, `LineTimeChart`, `ChartNote` — the hand-rolled
  SVG time charts.
- **Primitives**: shadcn-style `Badge`, `Button`, `Input`, `Skeleton`,
  `Table*`, `Tabs*`.
- **Utilities**: `cn`, `formatBytes`, `timeAgo`.

## Install

The package lives on GitHub Packages (auth required even for reads — see
`.npmrc.example` at the repo root):

```bash
bun add @datadack/serverless-ui
```

## Consumer requirements

The kit is Tailwind-styled and ships **no compiled utility CSS** — the
consumer's Tailwind v4 build generates the classes. In the app's CSS entry:

```css
@source "../node_modules/@datadack/serverless-ui/dist";
```

The components also reference the console theme's tokens (`--status-*`, glass
tiers, `animate-content-enter`). Both DataDack consoles already define them.
A fresh consumer can pull a working default set instead:

```css
@import '@datadack/serverless-ui/styles.css';
```

Do **not** import `styles.css` in an app that already defines the tokens.

## Release

Bump `version` here, then push a tag shaped `serverless-ui-v<version>` —
`.github/workflows/publish-packages.yml` builds and publishes it.
