// @datadack/common-ui — the DataDack design system.
//
// Every generic web surface piece lives here: the shadcn-derived primitives, the
// list/detail building blocks both consoles are made of, the charts, the theme,
// and the status→tone language they share. Domain kits build on this one;
// @datadack/serverless is the FaaS-specific layer.
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
export {
  DataTable,
  type DataTableBulkAction,
  type DataTableClientPagination,
  type DataTableColumnMeta,
  type DataTablePagination,
  type DataTableProps,
  type DataTableReorder,
  type DataTableServerPagination,
} from "./console/DataTable"
export { EmptyState } from "./console/EmptyState"
export { CopyButton } from "./console/CopyButton"
export { TagList } from "./console/TagList"
export {
  actionsColumn,
  copyColumn,
  dateColumn,
  nameColumn,
  statusColumn,
  tagsColumn,
  textColumn,
  type RowAction,
} from "./console/columns"
export { KeyValueGrid, type KeyValueItem } from "./console/KeyValueGrid"
export { Logo } from "./console/Logo"
export { PageHeader, type Breadcrumb } from "./console/PageHeader"
export { cellMono, cellText, ResourceTable } from "./console/ResourceTable"
export {
  StatCard,
  statGridClass,
  StatGrid,
  type StatCardProps,
  type StatColor,
} from "./console/StatCard"
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
export { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "./ui/accordion"
export {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog"
export {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "./ui/avatar"
export { Badge, badgeVariants } from "./ui/badge"
export { BirthdateField } from "./ui/birthdate-field"
export { Button, buttonVariants } from "./ui/button"
export { Calendar } from "./ui/calendar"
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
export { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"
export { Combobox, type ComboboxOption } from "./ui/combobox"
export { ComboboxInput, type ComboboxInputOption } from "./ui/combobox-input"
export {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "./ui/command"
export {
  ContextMenu,
  ContextMenuCheckboxItem,
  ContextMenuContent,
  ContextMenuGroup,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuPortal,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuShortcut,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from "./ui/context-menu"
export { DatePicker } from "./ui/date-picker"
export {
  DateRangePicker,
  type DateRange,
  type DateRangePickerProps,
} from "./ui/date-range-picker"
export { DayGridPicker } from "./ui/day-grid-picker"
export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog"
export {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuPortal,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu"
export {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  useFormField,
} from "./ui/form"
export { Input } from "./ui/input"
export { InputOTP, InputOTPGroup, InputOTPSeparator, InputOTPSlot } from "./ui/input-otp"
export { JsonCodeEditor, type JsonCodeEditorProps } from "./ui/json-code-editor"
export { JsonViewer, type JsonViewerProps } from "./ui/json-viewer"
export { Kbd, KbdGroup } from "./ui/kbd"
export { Label } from "./ui/label"
export { MONTHS, MonthYearPicker } from "./ui/month-year-picker"
export { Popover, PopoverAnchor, PopoverContent, PopoverTrigger } from "./ui/popover"
export {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable"
export { ScrollArea, ScrollBar } from "./ui/scroll-area"
export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "./ui/select"
export { Separator } from "./ui/separator"
export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "./ui/sheet"
export { Skeleton } from "./ui/skeleton"
export { Switch } from "./ui/switch"
export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table"
export { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs"
export { Textarea } from "./ui/textarea"
export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip"

// Style primitives — the tokens and helpers components are built from, exported
// so domain kits can style consistently instead of re-deriving them.
export {
  accordionAnimation,
  animatePulse,
  animateSpin,
  caretBlink,
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
export {
  parseTags,
  recordToTagRows,
  stringifyTags,
  tagRowsToRecord,
  type TagRow,
  type TagsInput,
} from "./lib/tags"

// The design system's emotion instance. Anything that styles on top of this kit
// must use these rather than importing @emotion/css directly, so every rule
// lands in the one prepended <style> block and the cascade stays predictable.
export { css, cx, keyframes, injectGlobal } from "./lib/emotion"
