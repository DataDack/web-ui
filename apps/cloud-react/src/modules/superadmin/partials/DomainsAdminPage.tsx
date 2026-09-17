import { useMemo, useState } from "react"

import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Tabs,
  TabsList,
  TabsTrigger,
} from "@datadack/common-ui"
import { Globe, RefreshCw } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader } from "@/components/console"
import { useDebounce } from "@/hooks/use-debounce"
import { useQueryParamState } from "@/hooks/use-query-param-state"
import { DOMAINS_PAGE_SIZE } from "@/modules/domains/domains.constants"
import { useAdminDomains } from "@/modules/domains/domains.hooks"
import type { Domain, DomainAdminListParams } from "@/modules/domains/domains.types"
import {
  buildDomainColumns,
  type DomainAccountLabel,
} from "@/modules/domains/partials/domain-columns"
import {
  DomainsFilters,
  type DomainStatusFilter,
  type DomainTypeFilter,
} from "@/modules/domains/partials/DomainsFilters"
import { useScreen } from "@/services/api/screen"

import { useAdminPlatformOverview } from "../superadmin.hooks"

// Custom first: a customer-brought domain is the one that needs an operator —
// it can sit unverified, point at the wrong place, or be claimed by the wrong
// account. System names are minted by the platform and are mostly reference.
const TABS = ["custom", "system"] as const
type DomainsTab = (typeof TABS)[number]

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// The account lookup is one page of the tenancy list; the server caps a page at
// 100. An account beyond it still renders, as its copyable id.
const ACCOUNT_LOOKUP_LIMIT = 100

/**
 * Domain management: every hostname the platform answers for, across every
 * account, split the way an operator asks about them — the domains customers
 * brought (managed=false) and the names the platform minted (managed=true).
 *
 * Read-only on purpose. Verify, redirect and remove act as the owning tenant,
 * and those routes are tenant-scoped; offering them here would run them against
 * the operator's own account.
 */
export function DomainsAdminPage() {
  useScreen("superadmin.domains")
  const { t } = useTranslation()

  const [tab, setTab] = useQueryParamState<DomainsTab>("tab", TABS, "custom")
  const [type, setType] = useState<DomainTypeFilter>("all")
  const [status, setStatus] = useState<DomainStatusFilter>("all")
  const [search, setSearch] = useState("")
  const [accountId, setAccountId] = useState("")
  const [page, setPage] = useState(1)
  const q = useDebounce(search.trim(), 300)

  // A half-pasted id would be a 400 — apply the filter only once it is whole.
  const trimmedAccount = accountId.trim()
  const accountFilter = UUID.test(trimmedAccount) ? trimmedAccount : undefined

  const params = useMemo<DomainAdminListParams>(
    () => ({
      page,
      limit: DOMAINS_PAGE_SIZE,
      managed: tab === "system",
      type: type === "all" ? undefined : type,
      status: status === "all" ? undefined : status,
      q: q || undefined,
      account_id: accountFilter,
    }),
    [page, tab, type, status, q, accountFilter],
  )

  const { data, isLoading, isError, refetch, isFetching } = useAdminDomains(params)
  const rows = data?.rows ?? []

  // Tab counts are the unfiltered size of each side, so the numbers on the tabs
  // do not jump while someone types in the search box.
  const { data: customCount } = useAdminDomains({ page: 1, limit: 1, managed: false })
  const { data: systemCount } = useAdminDomains({ page: 1, limit: 1, managed: true })

  const { data: overview } = useAdminPlatformOverview("accounts", "", 1, ACCOUNT_LOOKUP_LIMIT)
  const accounts = useMemo(
    () =>
      new Map<string, DomainAccountLabel>(
        (overview?.accounts ?? []).map((a) => [a.id, { name: a.name, number: a.account_number }]),
      ),
    [overview],
  )

  // linkResources off: the tenant resource pages fetch under the operator's own
  // account header, so a link to another tenant's VM lands on "not found".
  const columns = useMemo(
    () => buildDomainColumns(t, { linkResources: false, accounts }),
    [t, accounts],
  )

  // Page 4 of one filter combination means nothing under another.
  const resetting =
    <T,>(set: (value: T) => void) =>
    (value: T) => {
      set(value)
      setPage(1)
    }

  const countBadge = (count: number | undefined) =>
    count === undefined ? null : (
      <Badge variant="outline" className="ml-2 tabular-nums">
        {count}
      </Badge>
    )

  return (
    <div className="space-y-4">
      <PageHeader
        className="mb-0"
        icon={Globe}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.domains.title") }]}
        title={t("superAdmin.domains.title")}
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
          resetting(setTab)(value as DomainsTab)
        }}
      >
        <TabsList>
          <TabsTrigger value="custom">
            {t("superAdmin.domains.tabs.custom")}
            {countBadge(customCount?.total)}
          </TabsTrigger>
          <TabsTrigger value="system">
            {t("superAdmin.domains.tabs.system")}
            {countBadge(systemCount?.total)}
          </TabsTrigger>
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
            onTypeChange={resetting(setType)}
            status={status}
            onStatusChange={resetting(setStatus)}
            search={search}
            onSearchChange={resetting(setSearch)}
            accountId={accountId}
            onAccountIdChange={resetting(setAccountId)}
          />
        }
        empty={
          <EmptyState
            icon={Globe}
            title={t("domains.empty")}
            description={t("domains.adminEmptySubtitle")}
          />
        }
      />
    </div>
  )
}
