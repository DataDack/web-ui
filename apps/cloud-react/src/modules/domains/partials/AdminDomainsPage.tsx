import { useMemo, useState } from "react"

import { Globe, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useDebounce } from "@/hooks/use-debounce"
import { useScreen } from "@/services/api/screen"

import { Button, DataTable, EmptyState, Tabs, TabsList, TabsTrigger } from "@datadack/common-ui"

import { DOMAINS_PAGE_SIZE } from "../domains.constants"
import { useAdminDomains } from "../domains.hooks"
import type { AdminDomainListParams, Domain } from "../domains.types"
import { buildDomainColumns } from "./domain-columns"
import { DomainsFilters, type DomainStatusFilter, type DomainTypeFilter } from "./DomainsFilters"

const SOURCE_TABS = ["all", "system", "custom"] as const
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type SourceTab = (typeof SOURCE_TABS)[number]

/**
 * The platform-wide domain registry: every hostname the platform answers for,
 * across every account, with who owns it. Same table as the tenant page plus
 * the Account column and an account_id scope filter.
 */
export function AdminDomainsPage() {
  useScreen("superadmin.domains")
  const { t } = useTranslation()

  // Hooks first, always — early returns (none here) come after every hook.
  const [tab, setTab] = useState<SourceTab>("all")
  const [type, setType] = useState<DomainTypeFilter>("all")
  const [status, setStatus] = useState<DomainStatusFilter>("all")
  const [search, setSearch] = useState("")
  const [accountId, setAccountId] = useState("")
  const [page, setPage] = useState(1)
  // Both text filters are debounced off their boxes — the request fires when
  // typing pauses, not per keystroke.
  const q = useDebounce(search.trim(), 300)
  const account = useDebounce(accountId.trim(), 300)
  // The backend 400s on anything that is not a full UUID, and a failed list
  // request blanks the whole table — so a partial paste or a mid-typing pause
  // must never reach the wire. Only a complete UUID becomes a filter.
  const accountFilter = UUID_RE.test(account) ? account : undefined

  const params = useMemo<AdminDomainListParams>(
    () => ({
      page,
      limit: DOMAINS_PAGE_SIZE,
      managed: tab === "all" ? undefined : tab === "system",
      type: type === "all" ? undefined : type,
      status: status === "all" ? undefined : status,
      q: q || undefined,
      account_id: accountFilter,
    }),
    [page, tab, type, status, q, accountFilter],
  )

  const { data, isLoading, isError, refetch, isFetching } = useAdminDomains(params)
  const rows = data?.rows ?? []

  const columns = useMemo(() => buildDomainColumns(t, { withAccount: true, linkResources: false }), [t])

  // Every filter change invalidates the page number, so each one resets it.
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
  const changeAccountId = (value: string) => {
    setAccountId(value)
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Globe}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("domains.title") }]}
        title={t("domains.title")}
        description={t("domains.adminSubtitle")}
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
            accountId={accountId}
            onAccountIdChange={changeAccountId}
          />
        }
        empty={
          <EmptyState
            icon={Globe}
            title={t("domains.empty")}
            description={t("domains.adminEmptySubtitle")}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />
    </div>
  )
}
