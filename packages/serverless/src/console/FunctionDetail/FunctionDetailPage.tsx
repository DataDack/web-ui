import { useMemo, useState, type ReactNode } from "react"

import { ArrowLeft, Package, Trash2 } from "lucide-react"
import { toast } from "sonner"

import {
  Button,
  EmptyState,
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  css,
  cx,
} from "@datadack/common-ui"

import { useDeleteFunction, useFunction } from "../../data/queries"
import { useServerlessContext } from "../../data/transport"
import { CodeEditorPlaceholder } from "../CodeEditorPlaceholder"
import { ConfirmDialog } from "../ConfirmDialog"
import { fullHeightPane } from "../layoutConstants"
import { AliasesTab } from "./AliasesTab"
import { ConfigurationTab, type ConfigurationSectionValue } from "./ConfigurationTab"
import { errorMessage } from "./errorMessage"
import { FunctionDetailHeader } from "./FunctionDetailHeader"
import { mergeLabels, type DeepPartial, type FunctionDetailLabels } from "./labels"
import { MonitorTab } from "./MonitorTab"
import { FUNCTION_DETAIL_TABS, type FunctionDetailTabValue } from "./tabs"
import { TestTab } from "./TestTab"
import { VersionsTab } from "./VersionsTab"

const page = css`
  display: flex;
  flex-direction: column;
  ${fullHeightPane}
`

const tabs = css`
  flex: 1;
  min-height: 0;
`

/* The Code and Configuration panels grow to fill the page; the other tabs
   (Test, Monitor, Aliases, Versions) stay their natural content height. */
const fillTabContent = css`
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
`

const backButton = css`
  margin-left: -8px;
  margin-bottom: 12px;
  gap: 6px;
  color: var(--muted-foreground);
`

const skeletonStack = css`
  display: flex;
  flex-direction: column;
  gap: 16px;
`

const skeletonTitle = css`
  height: 32px;
  width: 256px;
`

const skeletonSubtitle = css`
  height: 16px;
  width: 384px;
`

const skeletonBody = css`
  height: 384px;
  border-radius: 0.75rem;
`

export interface FunctionDetailPageProps {
  /** Function name (route param). The transport MUST implement getFunction for this suite. */
  name: string
  /** Cache partition; cloud-react passes activeRegionCode. */
  scope?: string
  /** Controlled tab. The app owns ?tab= URL state. */
  activeTab: FunctionDetailTabValue
  onTabChange: (tab: FunctionDetailTabValue) => void
  /** Renders the ghost back Button. Omit to render no back link (app supplies its own chrome). */
  onBack?: () => void
  /** Called after a confirmed delete succeeds — the app navigates to its list route. */
  onDeleted?: () => void
  /** Force-hide tabs beyond capability-driven hiding (e.g. a console with no Code tab). */
  hiddenTabs?: readonly FunctionDetailTabValue[]
  /** Extra header actions rendered left of the Delete button. */
  headerActions?: ReactNode
  /** Deep-partial label overrides; defaults are DEFAULT_FUNCTION_DETAIL_LABELS. */
  labels?: DeepPartial<FunctionDetailLabels>
  /** Optional controlled Configuration section (apps may persist ?section=). */
  activeConfigSection?: ConfigurationSectionValue
  onConfigSectionChange?: (section: ConfigurationSectionValue) => void
  className?: string
}

/**
 * The shared function detail page: identity header, Lambda-ordered tabs, and a
 * type-to-confirm delete flow. Everything an app owns — routing, i18n, region
 * scoping — arrives through props; the page itself only knows the transport.
 */
export function FunctionDetailPage({
  name,
  scope,
  activeTab,
  onTabChange,
  onBack,
  onDeleted,
  hiddenTabs,
  headerActions,
  labels,
  activeConfigSection,
  onConfigSectionChange,
  className,
}: Readonly<FunctionDetailPageProps>) {
  const merged = useMemo(() => mergeLabels(labels), [labels])
  const { capabilities } = useServerlessContext()
  const { data: fn, isLoading, isError, error } = useFunction(name, scope)
  const deleteFunction = useDeleteFunction(scope)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const visibleTabs = useMemo(
    () =>
      FUNCTION_DETAIL_TABS.filter((tab) => {
        if (hiddenTabs?.includes(tab.value)) return false
        switch (tab.value) {
          case "test":
            return capabilities.invoke
          case "versions":
            return capabilities.versions
          case "aliases":
            return capabilities.aliases
          default:
            return true
        }
      }),
    [hiddenTabs, capabilities],
  )

  // A hidden/unknown activeTab renders the first visible tab without calling
  // onTabChange — correcting the app's URL state is not this page's business.
  const resolvedTab = visibleTabs.some((tab) => tab.value === activeTab)
    ? activeTab
    : (visibleTabs[0]?.value ?? "code")

  const back = onBack && (
    <Button variant="ghost" size="sm" className={backButton} onClick={onBack}>
      <ArrowLeft size={14} />
      {merged.backLabel}
    </Button>
  )

  if (isLoading) {
    return (
      <div className={cx(skeletonStack, className)}>
        <Skeleton className={skeletonTitle} />
        <Skeleton className={skeletonSubtitle} />
        <Skeleton className={skeletonBody} />
      </div>
    )
  }

  // No getFunction on the transport (no reachable FaaS base for this region):
  // the disabled query settles with no data, which must not read as "this
  // function was deleted" — the function may exist and simply be unreachable
  // from this console.
  if (!capabilities.functionRead) {
    return (
      <div className={className}>
        {back}
        <EmptyState
          icon={Package}
          title={merged.unavailable.title}
          description={merged.unavailable.description}
        />
      </div>
    )
  }

  // A genuine 404 keeps the friendlier not-found state. The transports throw
  // plain Errors carrying the server's message, so the FaaS "function not
  // found" text is the only signal available here.
  const looksDeleted =
    isError && error instanceof Error && /not found/i.test(error.message)

  // Any other failed fetch (network, 5xx, expired session) is not a deletion;
  // show the transport's own message when it carries one.
  if (isError && !looksDeleted) {
    return (
      <div className={className}>
        {back}
        <EmptyState
          icon={Package}
          title={merged.errors.loadFailed}
          description={errorMessage(error, merged.unavailable.description)}
        />
      </div>
    )
  }

  if (!fn) {
    return (
      <div className={className}>
        {back}
        <EmptyState
          icon={Package}
          title={merged.notFound.title(name)}
          description={merged.notFound.description}
        />
      </div>
    )
  }

  return (
    <div className={cx(page, className)}>
      {back}

      <FunctionDetailHeader
        fn={fn}
        labels={merged}
        actions={
          <>
            {headerActions}
            {capabilities.functionDelete && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfirmingDelete(true)
                }}
              >
                <Trash2 size={14} />
                {merged.actions.delete}
              </Button>
            )}
          </>
        }
      />

      <Tabs
        className={tabs}
        value={resolvedTab}
        onValueChange={(next) => {
          onTabChange(next as FunctionDetailTabValue)
        }}
      >
        <TabsList>
          {visibleTabs.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>
              <tab.icon />
              {merged.tabs[tab.value]}
            </TabsTrigger>
          ))}
        </TabsList>

        {visibleTabs.map((tab) => {
          const fillsPage = tab.value === "code" || tab.value === "configuration"
          return (
            <TabsContent
              key={tab.value}
              value={tab.value}
              className={fillsPage ? fillTabContent : undefined}
            >
              {tab.value === "code" && (
                <CodeEditorPlaceholder
                  functionName={fn.name}
                  runtime={fn.runtime}
                  sizeBytes={fn.version?.codeArtifact?.sizeBytes}
                  version={fn.version?.version}
                  title={merged.code.title}
                  message={merged.code.message}
                />
              )}
              {tab.value === "test" && <TestTab fn={fn} scope={scope} labels={merged} />}
              {tab.value === "monitor" && <MonitorTab fn={fn} labels={merged} />}
              {tab.value === "configuration" && (
                <ConfigurationTab
                  fn={fn}
                  scope={scope}
                  labels={merged}
                  activeSection={activeConfigSection}
                  onSectionChange={onConfigSectionChange}
                  className={fillTabContent}
                />
              )}
              {tab.value === "aliases" && <AliasesTab fn={fn} scope={scope} labels={merged} />}
              {tab.value === "versions" && <VersionsTab fn={fn} scope={scope} labels={merged} />}
            </TabsContent>
          )
        })}
      </Tabs>

      <ConfirmDialog
        open={confirmingDelete}
        onOpenChange={setConfirmingDelete}
        title={merged.deleteConfirm.title(fn.name)}
        description={merged.deleteConfirm.description}
        confirmLabel={merged.deleteConfirm.confirmLabel}
        cancelLabel={merged.deleteConfirm.cancelLabel}
        confirmText={fn.name}
        typeToConfirmLabel={merged.deleteConfirm.typeToConfirm}
        destructive
        loading={deleteFunction.isPending}
        onConfirm={() => {
          deleteFunction.mutate(fn.name, {
            onSuccess: () => {
              toast.success(merged.deleteConfirm.success(fn.name))
              setConfirmingDelete(false)
              onDeleted?.()
            },
            onError: (error) => {
              toast.error(errorMessage(error, merged.errors.deleteFailed))
            },
          })
        }}
      />
    </div>
  )
}
