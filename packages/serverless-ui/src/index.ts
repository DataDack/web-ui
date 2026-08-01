// @datadack/serverless-ui — the shared console kit for DataDack web surfaces.
//
// One source of truth for the pieces both consoles (the serverless-admin app
// in this repo and the cloud-react customer console) kept as drifting copies:
// the status→tone mapping, the badge that renders it, the list/detail
// building blocks, and the small shadcn-style primitives they stand on.
//
// Styling is @emotion/css at runtime: importing the kit is the whole setup.
// No Tailwind build, no `@source` scan, no CSS file to import. Components
// read the console theme's tokens (--muted-foreground, --status-*, glass
// tiers), and ship zero-specificity defaults for all of them (lib/tokens.ts)
// — so a consumer that defines its own tokens wins automatically, and a
// consumer that defines nothing still renders the default theme, light and
// dark both.

// Zero-specificity token defaults — imported for its injectGlobal side effect.
import './lib/tokens'

// Design language
export {
  getStatusConfig,
  TONE_CLASSES,
  TONE_DOT_CLASSES,
  type StatusConfig,
  type StatusTone,
} from './console/status-config'

// Console building blocks
export {
  CodeEditorPlaceholder,
  type CodeEditorPlaceholderProps,
} from './console/CodeEditorPlaceholder'
export { EmptyState } from './console/EmptyState'
export { KeyValueGrid, type KeyValueItem } from './console/KeyValueGrid'
export { PageHeader } from './console/PageHeader'
export { ResourceTable, cellMono, cellText } from './console/ResourceTable'
export { StatCard, StatGrid, type StatCardProps, type StatColor } from './console/StatCard'
export { StatusBadge } from './console/StatusBadge'

// Charts
export {
  BarTimeChart,
  ChartNote,
  formatTick,
  LineTimeChart,
  type BarTimeChartProps,
  type ChartPoint,
  type ChartSeries,
  type LineTimeChartProps,
} from './charts/TimeChart'

// Primitives (shadcn-style)
export { Badge, badgeVariants } from './ui/badge'
export { Button, buttonVariants } from './ui/button'
export { Input } from './ui/input'
export { Skeleton } from './ui/skeleton'
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table'
export { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs'

// Utilities
export { cn, formatBytes, timeAgo } from './lib/cn'
