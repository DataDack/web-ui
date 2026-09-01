import { useMemo, useState } from "react"

import { Button, DataTable, EmptyState, Tabs, TabsList, TabsTrigger } from "@datadack/common-ui"
import { Globe, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useDebounce } from "@/hooks/use-debounce"
import { useProjects } from "@/modules/managed-apps/managed-apps.hooks"
import { useScreen } from "@/services/api/screen"

import { DOMAINS_PAGE_SIZE } from "../domains.constants"
import { useDomains } from "../domains.hooks"
import type { Domain, DomainListParams } from "../domains.types"
import { buildDomainColumns } from "./domain-columns"
import { DomainsFilters, type DomainStatusFilter, type DomainTypeFilter } from "./DomainsFilters"

// The tabs map straight onto the `managed` param: System = platform-minted
// hostnames (managed=true), Custom = the tenant's own domains (managed=false).
const SOURCE_TABS = ["all", "system", "custom"] as const
type SourceTab = (typeof SOURCE_TABS)[number]

export function DomainsListPage() {
  useScreen("domains.registry-list")
  const { t } = useTranslation()

  // Hooks first, always — early returns (none here) come after every hook.
  const [tab, setTab] = useState<SourceTab>("all")
  const [type, setType] = useState<DomainTypeFilter>("all")
  const [status, setStatus] = useState<DomainStatusFilter>("all")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  // The request is debounced off the box so typing isn't a round trip per key.
  const q = useDebounce(search.trim(), 300)

  const params = useMemo<DomainListParams>(
    () => ({
      page,
      limit: DOMAINS_PAGE_SIZE,
      managed: tab === "all" ? undefined : tab === "system",
      type: type === "all" ? undefined : type,
      status: status === "all" ? undefined : status,
      q: q || undefined,
    }),
    [page, tab, type, status, q],
  )

  const { data, isLoading, isError, refetch, isFetching } = useDomains(params)
  const { data: projects = [] } = useProjects()
  const rows = data?.rows ?? []

  const projectNames = useMemo(
    () => new Map(projects.map((project) => [project.id, project.name])),
    [projects],
  )
  const columns = useMemo(
    () => buildDomainColumns(t, { resourceNames: projectNames }),
    [projectNames, t],
  )

  // Changing any filter invalidates the page number — page 4 of one filter
  // combination means nothing under another — so every change resets it.
  const changeTab = (value: SourceTab) => {
    setTab(value)
    setPage(1)
  }
  const changeType = (value: DomainTypeFilter) => {
    setType(value)
    setPage(1)
  }
  const changeStatus = (value: DomainStatusFilter) => {
    setStatus(value)
    setPage(1)
  }
  const changeSearch = (value: string) => {
    setSearch(value)
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Globe}
        breadcrumbs={[
          { label: t("console.nav.groups.domains") },
          { label: t("domains.title") },
        ]}
        title={t("domains.title")}
        description={t("domains.subtitle")}
        actions={
          <Button
            variant="ghost"
            size="icon"
            onClick={() => void refetch()}
            disabled={isFetching}
            aria-label={t("common.refresh")}
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
        }
      />

      {/* The tab bar only switches the `managed` param — the one table below
          re-fetches, so there is no per-tab TabsContent to mount. */}
      <Tabs
        value={tab}
        onValueChange={(value) => {
          changeTab(value as SourceTab)
        }}
      >
        <TabsList>
          {SOURCE_TABS.map((value) => (
            <TabsTrigger key={value} value={value}>
              {t(`domains.tabs.${value}`)}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <DataTable<Domain>
        data={rows}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(domain) => domain.id}
        pagination={{
          page,
          pageSize: DOMAINS_PAGE_SIZE,
          total: data?.total ?? rows.length,
          onPageChange: setPage,
        }}
        toolbar={
          <DomainsFilters
            type={type}
            onTypeChange={changeType}
            status={status}
            onStatusChange={changeStatus}
            search={search}
            onSearchChange={changeSearch}
          />
        }
        empty={
          <EmptyState
            icon={Globe}
            title={t("domains.empty")}
            description={t("domains.emptySubtitle")}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />
    </div>
  )
}
