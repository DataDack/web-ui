# @datadack/serverless-ui

Shared console kit for DataDack web surfaces — the single source of truth for
the pieces the serverless-web console (this repo) and the cloud-react
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

None. The kit styles itself with `@emotion/css` at runtime — importing a
component is the whole setup. There is no Tailwind build to configure, no
`@source` scan, and no CSS file to import.

### Theming

Components read the console theme's design tokens (`--muted-foreground`,
`--brand-gold`, `--status-*`, glass tiers) as plain CSS custom properties, and
ship defaults for every one of them at **zero specificity** (`:where(:root)` /
`:where(.dark)`):

- A consumer that defines its own tokens — as both DataDack consoles do —
  overrides the defaults automatically, whatever the stylesheet order.
- A consumer that defines nothing renders the default console theme, in both
  light and dark (toggle by putting `.dark` on any ancestor, typically
  `<html>`).

`TONE_CLASSES` / `TONE_DOT_CLASSES` remain plain class-name strings, so
injecting them into any `className` keeps working — they are emotion-generated
now rather than Tailwind utilities.

## Release

Bump `version` here, then push a tag shaped `serverless-ui-v<version>` —
`.github/workflows/publish-packages.yml` builds and publishes it.
