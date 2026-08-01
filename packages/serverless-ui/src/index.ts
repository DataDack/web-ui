// @datadack/serverless-ui — the shared console kit for DataDack web surfaces.
//
// One source of truth for the pieces both consoles (the serverless-admin app
// in this repo and the cloud-react customer console) kept as drifting copies:
// the status→tone mapping, the badge that renders it, the list/detail
// building blocks, and the small shadcn-style primitives they stand on.
//
// The kit is Tailwind-styled but ships no compiled CSS for its classes — the
// CONSUMER's Tailwind build generates them. Two requirements on the consumer:
//
//   1. Scan this package for class names, e.g. in the app's CSS entry:
//        @source "../node_modules/@datadack/serverless-ui/dist";
//   2. Define the design tokens the classes reference (--status-*, glass
//      tiers, animate-content-enter). Both existing consoles already do; a
//      fresh consumer can `@import "@datadack/serverless-ui/styles.css";`
//      for a working default set instead.

// Design language
export {
  getStatusConfig,
  TONE_CLASSES,
  TONE_DOT_CLASSES,
  type StatusConfig,
  type StatusTone,
} from './console/status-config'

// Console building blocks
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
