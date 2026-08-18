// @datadack/serverless — the serverless-FaaS layer of the DataDack UI.
//
// Only pieces that know about functions and runtimes belong here. Everything
// generic — primitives, list/detail building blocks, charts, theme, the
// status→tone language — lives in @datadack/common-ui, which this package builds
// on and re-exports below.
//
// Styling is @emotion/css at runtime, inherited from common-ui: importing either
// kit is the whole setup, with no Tailwind build and no `@source` scan.

// FaaS-specific
export {
  CodeEditorPlaceholder,
  type CodeEditorPlaceholderProps,
} from "./console/CodeEditorPlaceholder"
export {
  RuntimeCatalog,
  type RuntimeCatalogProps,
  type RuntimeInfo,
} from "./console/RuntimeCatalog"
export { familyFromRuntime, familyLabel, RuntimeIcon } from "./console/RuntimeIcon"
export {
  MonitoringPlaceholder,
  type MonitoringPlaceholderProps,
} from "./console/MonitoringPlaceholder"
export {
  CreateFunctionForm,
  PackageOptionCard,
  SummaryPanel,
  type CreateFunctionFormProps,
  type EnvRow,
} from "./console/CreateFunctionForm"
export { EnvEditor, type EnvEditorProps } from "./console/CreateFunctionForm/EnvEditor"
export { ConfirmDialog, type ConfirmDialogProps } from "./console/ConfirmDialog"
export {
  AliasDialog,
  CreateVersionDialog,
  AliasesTab,
  CodeNotEditable,
  CodeTab,
  CONFIGURATION_SECTIONS,
  ConfigurationTab,
  DEFAULT_FUNCTION_DETAIL_LABELS,
  FUNCTION_DETAIL_TABS,
  FunctionDetailPage,
  FunctionNavRail,
  MetricCard,
  MonitorTab,
  registerMonacoSetup,
  TEST_EVENT_TEMPLATES,
  TestTab,
  VersionsTab,
  type CodeNotEditableProps,
  type CodeTabProps,
  type ConfigurationSectionMeta,
  type ConfigurationSectionValue,
  type FunctionDetailLabels,
  type FunctionDetailPageProps,
  type FunctionDetailTabValue,
  type FunctionNavRailProps,
  type MetricCardProps,
} from "./console/FunctionDetail"

// Data layer. The transport is injected by the host console — see
// ./data/transport for why the two consoles cannot share one client.
export {
  ServerlessProvider,
  useServerlessContext,
  type ServerlessCapabilities,
  type ServerlessContextValue,
  type ServerlessProviderProps,
  type ServerlessTransport,
} from "./data/transport"
export {
  serverlessKeys,
  useCreateFromPackage,
  useCreateFromSource,
  useCreateFunctionUrl,
  useDeleteAlias,
  useDeleteFunction,
  useDeleteFunctionCodeFile,
  useDeleteFunctionUrl,
  useDeleteTrigger,
  useDeployCodeDraft,
  useDiscardCodeDraft,
  useFunction,
  useFunctionAliases,
  useFunctionCode,
  useFunctionCodeFile,
  useFunctionMetrics,
  useFunctionTriggers,
  useFunctionUrls,
  useCreateVersion,
  useFunctionVersions,
  useLayers,
  useInvokeFunction,
  usePutAlias,
  usePutFunctionCodeFile,
  usePutTrigger,
  useRuntimes,
  useUpdateFunctionConfig,
  useUploadArtifact,
  type PutCodeFileInput,
} from "./data/queries"
export { familySupportsBlank, templateForFamily } from "./data/templates"
export { MAX_CODE_FILE_BYTES, MAX_INLINE_EDIT_BYTES } from "./data/types"
export type {
  ArtifactRef,
  CodeArtifact,
  CodeNotEditableReason,
  CreateFromPackageInput,
  CreateFromSourceInput,
  CreateFunctionUrlInput,
  CreateVersionInput,
  CreatedFunction,
  FunctionAlias,
  FunctionCode,
  FunctionCodeEntry,
  FunctionCodeFile,
  FunctionEntity,
  FunctionMetricTotal,
  FunctionUrl,
  FunctionVersion,
  InvokeResult,
  LayerRef,
  LayerVersionSummary,
  MetricBucket,
  MetricSeries,
  MetricSeriesQuery,
  MetricTotals,
  PackageType,
  PutAliasInput,
  PutTriggerInput,
  StarterTemplate,
  TemplateFile,
  Trigger,
  UpdateFunctionConfigInput,
} from "./data/types";
export * from "@datadack/common-ui"
