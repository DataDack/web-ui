// @DataDack/common-ui — the DataDack design system.
//
// Every generic web surface piece lives here: the shadcn-derived primitives, the
// list/detail building blocks both consoles are made of, the charts, the theme,
// and the status→tone language they share. Domain kits build on this one;
// @DataDack/serverless-ui is the FaaS-specific layer.
//
// Styling is @emotion/css at runtime: importing the kit is the whole setup. No
// Tailwind build, no `@source` scan, no CSS file to import — which is what makes
// it safe to consume from a monorepo package. Components read the console theme's
// tokens (--muted-foreground, --status-*, glass tiers) and ship zero-specificity
// defaults for all of them (lib/tokens.ts), so a consumer that defines its own
// tokens wins automatically, and one that defines nothing still renders the
// default theme, light and dark both.

// Zero-specificity token defaults — imported for its injectGlobal side effect.
import "./lib/tokens"

// Design language
export {
  getStatusConfig,
  TONE_CLASSES,
  TONE_DOT_CLASSES,
  type StatusConfig,
  type StatusTone,
} from "./console/status-config"

// Console building blocks
export { EmptyState } from "./console/EmptyState"
export { KeyValueGrid, type KeyValueItem } from "./console/KeyValueGrid"
export { Logo } from "./console/Logo"
export { PageHeader } from "./console/PageHeader"
export { cellMono, cellText, ResourceTable } from "./console/ResourceTable"
export { StatCard, StatGrid, type StatCardProps, type StatColor } from "./console/StatCard"
export { StatusBadge } from "./console/StatusBadge"
export { ThemeProvider, useTheme } from "./console/ThemeProvider"
export { ThemeToggle } from "./console/ThemeToggle"

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
} from "./charts/TimeChart"

// Primitives (shadcn-style)
export {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./ui/avatar"
export { Badge, badgeVariants } from "./ui/badge"
export { Button, buttonVariants } from "./ui/button"
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./ui/card"
export { Checkbox } from "./ui/checkbox"
export { Input } from "./ui/input"
export { Label } from "./ui/label"
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./ui/popover"
export { Separator } from "./ui/separator"
export { Skeleton } from "./ui/skeleton"
export { Switch } from "./ui/switch"
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
export { Textarea } from "./ui/textarea"
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

// Style primitives — the tokens and helpers components are built from, exported
// so domain kits can style consistently instead of re-deriving them.
export {
  animatePulse,
  animateSpin,
  contentEnter,
  fontMono,
  glass1,
  glass2,
  glass3,
  media,
  mix,
  overlayAnimation,
  popperAnimation,
} from "./lib/styles"

// Utilities
export { cn, formatBytes, timeAgo } from "./lib/cn"
