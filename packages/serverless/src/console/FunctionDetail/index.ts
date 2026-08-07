// The shared function detail suite: the page shell, its header, every tab, and
// the label/template/tab constants an app composes them with.

export { AliasDialog, type AliasDialogProps } from "./AliasDialog"
export { AliasesTab, type AliasesTabProps } from "./AliasesTab"
export {
  CodeNotEditable,
  CodeTab,
  registerMonacoSetup,
  type CodeNotEditableProps,
  type CodeTabProps,
} from "./code"
export { ConfigurationTab, type ConfigurationSectionValue, type ConfigurationTabProps } from "./ConfigurationTab"
export { FunctionDetailHeader, type FunctionDetailHeaderProps } from "./FunctionDetailHeader"
export { FunctionDetailPage, type FunctionDetailPageProps } from "./FunctionDetailPage"
export {
  DEFAULT_FUNCTION_DETAIL_LABELS,
  mergeLabels,
  type DeepPartial,
  type FunctionDetailLabels,
} from "./labels"
export { MetricComingSoonCard, type MetricComingSoonCardProps } from "./MetricComingSoonCard"
export { MonitorTab, type MonitorTabProps } from "./MonitorTab"
export { FUNCTION_DETAIL_TABS, type FunctionDetailTabValue } from "./tabs"
export { TEST_EVENT_TEMPLATES, type TestEventTemplate } from "./testEvents"
export { TestTab, type TestTabProps } from "./TestTab"
export { VersionsTab, type VersionsTabProps } from "./VersionsTab"
