// Console component library — shared building blocks for all modules.
// Shell
export { AppShell } from "./shell/AppShell"
export { Sidebar, SidebarBrand, SidebarNav } from "./shell/Sidebar"
export { Topbar } from "./shell/Topbar"
export { SearchTrigger } from "./shell/SearchTrigger"
export { ALL_NAV_GROUPS, CONSOLE_SERVICES, findServiceByPath } from "./shell/sidebar-nav"
export type { ConsoleService, SidebarNavItem } from "./shell/sidebar-nav"

// Page scaffolding
export { PageHeader } from "./PageHeader"
export type { Breadcrumb } from "./PageHeader"
export { Section } from "./Section"
export { StatCard, StatGrid } from "./StatCard"
export type { StatCardProps, StatColor } from "./StatCard"
export { Sparkline } from "./Sparkline"
export { MetricChart } from "./MetricChart"
// EmptyState, CopyButton and TagList now live in the design system.
export { SegmentedControl } from "./SegmentedControl"
export type { SegmentedOption } from "./SegmentedControl"
export { ComingSoon, ComingSoonPanel } from "./ComingSoon"
// KeyValueGrid now lives in the design system. The app copy is gone: the kit
// version carries the `copyable` items and the 2-column default this console
// relies on, so call sites did not have to change.
export { KeyValueGrid } from "@datadack/common-ui"
export type { KeyValueItem } from "@datadack/common-ui"
export { CidrInput } from "./CidrInput"
export type { CidrInputProps } from "./CidrInput"
export { TagEditor } from "./TagEditor"
export { ConfirmDialog } from "./ConfirmDialog"
export { DetailPage } from "./DetailPage"
export type { DetailTab } from "./DetailPage"

// Smart select — the async, rich-row picker
export { SmartSelect } from "./select/SmartSelect"
export { SmartSelectRow } from "./select/SmartSelect/SmartSelectRow"
export { SmartSelectField } from "./select/SmartSelectField"
export type {
  SmartSelectMode,
  SmartSelectOption,
  SmartSelectProps,
  SmartSelectRowProps,
} from "./select/SmartSelect/smart-select.types"

// Form
export { FieldRow } from "./form/FieldRow"
export { OverrideField } from "./form/OverrideField"

// Status
export { StatusBadge } from "./StatusBadge"
export { getStatusConfig } from "./status-config"
export type { StatusTone } from "./status-config"

// Table
// The console's one table, from the design system. Every list page renders
// through this; the app's own ResourceTable it replaced is gone. It covers the
// same ground — loading, error and retry, empty and no-results, selection with
// bulk actions, client or server paging, responsive and interactive columns —
// and is shared with the serverless console rather than maintained twice.
export { DataTable } from "@datadack/common-ui"
export type {
  DataTableBulkAction,
  DataTableColumnMeta,
  DataTablePagination,
  DataTableProps,
  DataTableServerPagination,
} from "@datadack/common-ui"

/** @deprecated Renamed to DataTableColumnMeta; kept so column factories compile. */
export type { DataTableColumnMeta as ColumnMeta } from "@datadack/common-ui"
export { BulkActionsBar } from "./table/BulkActionsBar"
export type { BulkAction } from "./table/BulkActionsBar"
export {
  actionsColumn,
  copyColumn,
  CopyButton,
  dateColumn,
  EmptyState,
  nameColumn,
  statusColumn,
  tagsColumn,
  TagList,
  textColumn,
  type RowAction,
} from "@datadack/common-ui"

// Wizard
export { CreateWizard } from "./wizard/CreateWizard"
export type { WizardStep } from "./wizard/CreateWizard"
export { WizardStepper } from "./wizard/WizardStepper"
export { WizardReviewStep } from "./wizard/WizardReviewStep"
export type { ReviewGroup } from "./wizard/WizardReviewStep"

// Motion primitives
export { DUR, EASE, staggerDelay } from "./motion/motion-config"
export { MotionProvider } from "./motion/MotionProvider"
export { AnimatedNumber } from "./motion/AnimatedNumber"
export { AnimatedTabs } from "./motion/AnimatedTabs"
export type { AnimatedTab } from "./motion/AnimatedTabs"
export { FadeIn } from "./motion/FadeIn"
export { Stagger, StaggerItem } from "./motion/Stagger"
