import { type ReactNode, useMemo, useState } from "react"

import { Skeleton } from "@DataDack/common-ui"
import { CircleAlert, Gauge, Hourglass, Plus, RefreshCw, TriangleAlert } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useSearchParams } from "react-router-dom"

import { AnimatedTabs, PageHeader, StatGrid } from "@/components/console"
import { Button } from "@/components/ui/button"
import { useScreen } from "@/services/api/screen"

import { MODULE_ORDER } from "./modules-meta"
import { ModuleSection } from "./ModuleSection"
import { RequestIncreaseDialog } from "./RequestIncreaseDialog"
import { RequestsTab } from "./RequestsTab"
import { QuotaRing } from "../../components/QuotaRing"
import { quotaTone } from "../../components/QuotaRing/quota-tone"
import { useQuotaRequests, useQuotas } from "../../quotas.hooks"
import type { EffectiveQuota } from "../../quotas.types"

type QuotasTab = "quotas" | "requests"

export function QuotasPage() {
  useScreen("governance.quotas")
  const { t } = useTranslation()
  const [searchParams, setSearchParams] = useSearchParams()

  const { data: quotas = [], isLoading, isError, refetch, isFetching } = useQuotas()
  const requestsQuery = useQuotaRequests()
  const requests = requestsQuery.data ?? []

  const [tab, setTab] = useState<QuotasTab>("quotas")

  // The request dialog opens either from the UI (local state) or a
  // ?request=<code> deep link (quota-gate toasts, proactive blockers). The
  // URL param wins while present and is cleared on close, so refresh/back
  // doesn't re-open the dialog.
  const requestParam = searchParams.get("request")
  const [manualOpen, setManualOpen] = useState(false)
  const [manualPreselect, setManualPreselect] = useState<string | null>(null)
  const dialogOpen = manualOpen || requestParam !== null
  const preselect = requestParam ?? manualPreselect

  const openRequestDialog = (code?: string) => {
    setManualPreselect(code ?? null)
    setManualOpen(true)
  }
  const onDialogOpenChange = (next: boolean) => {
    setManualOpen(next)
    if (!next) {
      setManualPreselect(null)
      if (searchParams.has("request")) {
        const params = new URLSearchParams(searchParams)
        params.delete("request")
        setSearchParams(params, { replace: true })
      }
    }
  }

  const sections = useMemo(() => groupByModule(quotas), [quotas])
  const nearLimit = quotas.filter((q) => quotaTone(q.usage, q.limit) === "warn").length
  const atLimit = quotas.filter((q) => quotaTone(q.usage, q.limit) === "full").length
  const pendingRequests = requests.filter((r) => r.status === "pending").length

  const tabs = [
    { value: "quotas", label: t("governance.quotas.tabs.quotas") },
    { value: "requests", label: t("governance.quotas.tabs.requests"), count: requests.length },
  ]

  let quotasContent: ReactNode
  if (isError) {
    quotasContent = <ErrorState onRetry={() => void refetch()} />
  } else if (isLoading) {
    quotasContent = <QuotasSkeleton />
  } else if (quotas.length === 0) {
    quotasContent = <QuotasEmpty />
  } else {
    quotasContent = (
      <div className="space-y-4">
        {sections.map(({ module, quotas: moduleQuotas }) => (
          <ModuleSection
            key={module}
            module={module}
            quotas={moduleQuotas}
            onRequest={openRequestDialog}
          />
        ))}
      </div>
    )
  }

  return (
    <div>
      <PageHeader
        icon={Gauge}
        breadcrumbs={[
          { label: t("console.nav.groups.governance") },
          { label: t("governance.quotas.title") },
        ]}
        title={t("governance.quotas.title")}
        description={t("governance.quotas.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button
              className="gap-2"
              onClick={() => {
                openRequestDialog()
              }}
            >
              <Plus className="w-4 h-4" />
              {t("governance.quotas.requestIncrease")}
            </Button>
          </>
        }
      />

      <StatGrid
        className="mb-6"
        stats={[
          {
            label: t("governance.quotas.summary.total"),
            value: quotas.length,
            icon: Gauge,
            loading: isLoading,
          },
          {
            label: t("governance.quotas.summary.nearLimit"),
            value: nearLimit,
            icon: TriangleAlert,
            color: nearLimit > 0 ? "warning" : "default",
            loading: isLoading,
          },
          {
            label: t("governance.quotas.summary.atLimit"),
            value: atLimit,
            icon: CircleAlert,
            color: atLimit > 0 ? "danger" : "default",
            loading: isLoading,
          },
          {
            label: t("governance.quotas.summary.pendingRequests"),
            value: pendingRequests,
            icon: Hourglass,
            color: pendingRequests > 0 ? "info" : "default",
            loading: requestsQuery.isLoading,
          },
        ]}
      />

      <AnimatedTabs
        tabs={tabs}
        value={tab}
        onChange={(value) => {
          setTab(value as QuotasTab)
        }}
        layoutId="governance-quotas-tabs"
        className="mb-5"
      />

      {tab === "quotas" && quotasContent}

      {tab === "requests" &&
        (requestsQuery.isError ? (
          <ErrorState onRetry={() => void requestsQuery.refetch()} />
        ) : (
          <RequestsTab
            requests={requests}
            isLoading={requestsQuery.isLoading}
            onRequest={() => {
              openRequestDialog()
            }}
          />
        ))}

      <RequestIncreaseDialog
        key={preselect ?? "blank"}
        open={dialogOpen}
        onOpenChange={onDialogOpenChange}
        quotas={quotas}
        initialCode={preselect}
      />
    </div>
  )
}

/** Bucket quotas into registry modules, keeping the canonical module order and
 *  appending any module the registry grows later so no row is ever dropped. */
function groupByModule(quotas: EffectiveQuota[]): { module: string; quotas: EffectiveQuota[] }[] {
  const buckets = new Map<string, EffectiveQuota[]>()
  for (const quota of quotas) {
    const bucket = buckets.get(quota.module)
    if (bucket) bucket.push(quota)
    else buckets.set(quota.module, [quota])
  }
  const known: readonly string[] = MODULE_ORDER
  const order = [
    ...known.filter((m) => buckets.has(m)),
    ...[...buckets.keys()].filter((m) => !known.includes(m)),
  ]
  return order.map((module) => ({ module, quotas: buckets.get(module) ?? [] }))
}

/** Module-card shaped shimmer — same heights as the loaded layout, no shift. */
function QuotasSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 3 }, (_, section) => (
        <div key={section} className="glass-1 overflow-hidden">
          <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
            <Skeleton className="size-9 rounded-lg" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
          <div className="divide-y divide-border/40">
            {Array.from({ length: 3 }, (_, row) => (
              <div key={row} className="flex h-14 items-center gap-4 px-4">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="hidden h-1.5 w-28 rounded-full md:block lg:w-40" />
                <Skeleton className="h-4 w-14" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function QuotasEmpty() {
  const { t } = useTranslation()
  return (
    <div className="glass-1 flex flex-col items-center justify-center px-6 py-14 text-center">
      <span aria-hidden="true" className="mb-4">
        <QuotaRing used={0} limit={10} size={56} strokeWidth={5} />
      </span>
      <h3 className="text-sm font-semibold text-foreground">{t("governance.quotas.empty")}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
        {t("governance.quotas.emptySubtitle")}
      </p>
    </div>
  )
}

function ErrorState({ onRetry }: Readonly<{ onRetry: () => void }>) {
  const { t } = useTranslation()
  return (
    <div className="glass-1 flex flex-col items-center justify-center px-6 py-14 text-center">
      <div className="glass-1 mb-4 flex size-12 items-center justify-center rounded-xl">
        <CircleAlert className="size-5 text-status-danger" />
      </div>
      <h3 className="text-sm font-semibold text-foreground">{t("governance.quotas.error")}</h3>
      <p className="mt-1 max-w-sm text-[13px] text-muted-foreground">
        {t("governance.quotas.errorSubtitle")}
      </p>
      <Button size="sm" variant="outline" className="mt-4" onClick={onRetry}>
        {t("governance.quotas.retry")}
      </Button>
    </div>
  )
}
