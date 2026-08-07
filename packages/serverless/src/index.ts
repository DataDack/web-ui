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
export { familyLabel, RuntimeIcon } from "./console/RuntimeIcon"
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
  AliasesTab,
  CodeNotEditable,
  CodeTab,
  ConfigurationTab,
  DEFAULT_FUNCTION_DETAIL_LABELS,
  FUNCTION_DETAIL_TABS,
  FunctionDetailHeader,
  FunctionDetailPage,
  MonitorTab,
  TEST_EVENT_TEMPLATES,
  TestTab,
  VersionsTab,
  type CodeNotEditableProps,
  type CodeTabProps,
  type ConfigurationSectionValue,
  type FunctionDetailHeaderProps,
  type FunctionDetailLabels,
  type FunctionDetailPageProps,
  type FunctionDetailTabValue,
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
  useDeleteAlias,
  useDeleteFunction,
  useDeleteFunctionCodeFile,
  useDeployCodeDraft,
  useDiscardCodeDraft,
  useFunction,
  useFunctionAliases,
  useFunctionCode,
  useFunctionCodeFile,
  useFunctionTriggers,
  useFunctionVersions,
  useInvokeFunction,
  usePutAlias,
  usePutFunctionCodeFile,
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
  CreatedFunction,
  FunctionAlias,
  FunctionCode,
  FunctionCodeEntry,
  FunctionCodeFile,
  FunctionEntity,
  FunctionVersion,
  InvokeResult,
  LayerRef,
  PackageType,
  PutAliasInput,
  StarterTemplate,
  TemplateFile,
  Trigger,
  UpdateFunctionConfigInput,
} from "./data/types"

// Re-exported so this package's published surface is unchanged for the repos
// that already install it. New code should import these from
// @datadack/common-ui directly; they are re-exported here for compatibility,
// not because they are FaaS-specific.
export * from "@datadack/common-ui"
