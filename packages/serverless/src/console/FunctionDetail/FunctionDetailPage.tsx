import { useMemo, useState, type ReactNode } from "react"

import { ChevronRight, Package, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button, EmptyState, Skeleton, css, cx, fontMono, mix } from "@datadack/common-ui"

import { useDeleteFunction, useFunction, useFunctionUrls } from "../../data/queries"
import { useServerlessContext } from "../../data/transport"
import { ConfirmDialog } from "../ConfirmDialog"
import { fullHeightPane } from "../layoutConstants"
import { AliasesTab } from "./AliasesTab"
import { CodeTab } from "./code"
import { CONFIGURATION_SECTIONS, type ConfigurationSectionValue } from "./configuration/sections"
import { ConfigurationTab } from "./ConfigurationTab"
import { errorMessage } from "./errorMessage"
import { FunctionNavRail } from "./FunctionNavRail"
import { mergeLabels, type DeepPartial, type FunctionDetailLabels } from "./labels"
import { MonitorTab } from "./MonitorTab"
import { FUNCTION_DETAIL_TABS, type FunctionDetailTabValue } from "./tabs"
import { TestTab } from "./TestTab"
import { VersionsTab } from "./VersionsTab"

/* Square and ringless: the detail page is a full surface, not a card on one.
   Its host mounts it edge to edge (cloud-react's route is `fullBleed`), and a
   rounded outline inside that only draws a seam where the workbench meets the
   window. The glass-1 tier rather than --card, so the page reads as the console
   shell's own surface — it sits directly on the shell's gradient with nothing
   between the two to make it look pasted on. */
const page = css`
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  border-radius: 0;
  background: var(--glass-1-bg);
  ${fullHeightPane}
`

const topBar = css`
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-bottom: 1px solid ${mix("--border", 55)};
  padding: 10px 16px;
  background: var(--glass-1-bg);
`

const crumbs = css`
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  font-size: 15px;
  color: var(--muted-foreground);
`

const crumbLink = css`
  border: none;
  background: transparent;
  padding: 0;
  font: inherit;
  color: inherit;
  cursor: pointer;

  &:hover {
    color: var(--foreground);
  }
`

const crumbCurrent = css`
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--foreground);
  font-weight: 600;
`

const crumbName = css`
  font-family: ${fontMono};
  color: var(--foreground);
`

const crumbCaret = css`
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  opacity: 0.55;
`

const topActions = css`
  display: flex;
  flex-shrink: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
`

const body = css`
  display: flex;
  flex: 1;
  min-height: 0;
`

/* The Code tab is edge-to-edge — it is a workbench, and a workbench with a
   margin round it wastes the only thing it needs. Every other pane keeps the
   page's padding and scrolls on its own. */
const contentFlush = css`
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
`

const contentPadded = css`
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: auto;
  padding: 20px;
`

const fillPane = css`
  display: flex;
  flex: 1;
  min-height: 0;
`

const backButton = css`
  align-self: flex-start;
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
  border-radius: 0;
`

export interface FunctionDetailPageProps {
  /** Function name (route param). The transport MUST implement getFunction for this suite. */
  name: string
  /** Cache partition; cloud-react passes activeRegionCode. */
  scope?: string
  /** Controlled tab. The app owns ?tab= URL state. */
  activeTab: FunctionDetailTabValue
  onTabChange: (tab: FunctionDetailTabValue) => void
  /** Renders the breadcrumb's Functions link and the rail's back row. */
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
 * The shared function detail page: a breadcrumb strip, the function's own
 * navigation rail, and one pane.
 *
 * The rail is the page's spine. Both consoles render this route full-bleed —
 * their service sidebar steps aside — so the rail carries everything the
 * console sidebar used to: which function this is, the way back to the list,
 * and every surface the function has, tabs and configuration sections in one
 * list. Everything an app owns — routing, i18n, region scoping — still arrives
 * through props; the page itself only knows the transport.
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
  // Its own query rather than a field on the function: URLs are a separate
  // resource in the control plane, and a console wired to one without a
  // function-URL surface simply never fires this.
  const { data: functionUrls } = useFunctionUrls(name, scope)
  const deleteFunction = useDeleteFunction(scope)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // The section is the page's state now, not ConfigurationTab's: the rail on
  // the left renders the section list, so it needs to know which one is lit
  // even before the Configuration pane mounts. An app that persists ?section=
  // still wins through activeConfigSection.
  const [internalSection, setInternalSection] = useState<ConfigurationSectionValue>("general")

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
      }).map((tab) => tab.value),
    [hiddenTabs, capabilities],
  )

  const visibleSections = useMemo(
    () =>
      CONFIGURATION_SECTIONS.filter(
        (section) => section.value !== "triggers" || capabilities.triggers,
      ).map((section) => section.value),
    [capabilities],
  )

  // A hidden/unknown activeTab renders the first visible tab without calling
  // onTabChange — correcting the app's URL state is not this page's business.
  const resolvedTab = visibleTabs.includes(activeTab) ? activeTab : (visibleTabs[0] ?? "code")
  const requestedSection = activeConfigSection ?? internalSection
  const resolvedSection = visibleSections.includes(requestedSection) ? requestedSection : "general"

  const selectSection = (section: ConfigurationSectionValue) => {
    setInternalSection(section)
    onConfigSectionChange?.(section)
    if (resolvedTab !== "configuration") onTabChange("configuration")
  }

  const back = onBack && (
    <Button variant="ghost" size="sm" className={backButton} onClick={onBack}>
      {merged.nav.functions}
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
  const looksDeleted = isError && error instanceof Error && /not found/i.test(error.message)

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

  const currentLabel =
    resolvedTab === "configuration"
      ? merged.configuration.nav[resolvedSection]
      : merged.tabs[resolvedTab]

  const flush = resolvedTab === "code"

  return (
    <div className={cx(page, className)}>
      <header className={topBar}>
        <nav className={crumbs} aria-label="Breadcrumb">
          <span>{merged.nav.service}</span>
          <ChevronRight className={crumbCaret} aria-hidden />
          {onBack ? (
            <button type="button" className={crumbLink} onClick={onBack}>
              {merged.nav.functions}
            </button>
          ) : (
            <span>{merged.nav.functions}</span>
          )}
          <ChevronRight className={crumbCaret} aria-hidden />
          <span className={cx(crumbCurrent, crumbName)}>{fn.name}</span>
          <ChevronRight className={crumbCaret} aria-hidden />
          <span className={crumbCurrent} aria-current="page">
            {currentLabel}
          </span>
        </nav>

        <div className={topActions}>
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
        </div>
      </header>

      <div className={body}>
        <FunctionNavRail
          fn={fn}
          labels={merged}
          tabs={visibleTabs}
          sections={visibleSections}
          activeTab={resolvedTab}
          activeSection={resolvedSection}
          onSelectTab={onTabChange}
          onSelectSection={selectSection}
          onBack={onBack}
        />

        <div className={flush ? contentFlush : contentPadded}>
          {resolvedTab === "code" && (
            <CodeTab
              fn={fn}
              scope={scope}
              labels={merged}
              urls={functionUrls}
              onManageEnv={() => {
                selectSection("env")
              }}
            />
          )}
          {resolvedTab === "test" && <TestTab fn={fn} scope={scope} labels={merged} />}
          {resolvedTab === "monitor" && <MonitorTab fn={fn} scope={scope} labels={merged} />}
          {resolvedTab === "configuration" && (
            <ConfigurationTab
              fn={fn}
              scope={scope}
              labels={merged}
              activeSection={resolvedSection}
              onSectionChange={selectSection}
              className={fillPane}
            />
          )}
          {resolvedTab === "aliases" && <AliasesTab fn={fn} scope={scope} labels={merged} />}
          {resolvedTab === "versions" && <VersionsTab fn={fn} scope={scope} labels={merged} />}
        </div>
      </div>

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
