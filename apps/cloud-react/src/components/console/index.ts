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
export { EmptyState } from "./EmptyState"
export { SegmentedControl } from "./SegmentedControl"
export type { SegmentedOption } from "./SegmentedControl"
export { ComingSoon } from "./ComingSoon"
export { CopyButton } from "./CopyButton"
export { KeyValueGrid } from "./KeyValueGrid"
export type { KeyValueItem } from "./KeyValueGrid"
export { CidrInput } from "./CidrInput"
export type { CidrInputProps } from "./CidrInput"
export { TagList } from "./TagList"
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
export { ResourceTable } from "./table/ResourceTable"
export type { ColumnMeta } from "./table/ResourceTable"

// The design system's table. List pages are moving onto this from the local
// ResourceTable above: it covers the same ground — loading, error and retry,
// empty and no-results, selection with bulk actions, client or server paging —
// and is shared with the other console rather than maintained twice.
export { DataTable } from "@datadack/common-ui"
export type {
  DataTableBulkAction,
  DataTablePagination,
  DataTableProps,
  DataTableServerPagination,
} from "@datadack/common-ui"
export { BulkActionsBar } from "./table/BulkActionsBar"
export type { BulkAction } from "./table/BulkActionsBar"
export {
  actionsColumn,
  copyColumn,
  dateColumn,
  nameColumn,
  statusColumn,
  tagsColumn,
  textColumn,
} from "./table/resource-table-columns"
export type { RowAction } from "./table/resource-table-columns"

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
