import { useDeferredValue, useMemo, useState } from "react"
import { AlertTriangle, Boxes, RefreshCw, Search, SlidersHorizontal } from "lucide-react"
import { Link } from "react-router-dom"
import type { ColumnDef } from "@tanstack/react-table"
import {
  Button,
  DataTable,
  EmptyState,
  Input,
  Tabs,
  TabsList,
  TabsTrigger,
  dateColumn,
  statusColumn,
  textColumn,
} from "@datadack/common-ui"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"
import { useAdminResourceInventory } from "../superadmin.hooks"
import type { AdminResource, AdminResourceFilters } from "../superadmin.types"

const RESOURCE_TABS = [
  ["all", "All resources"],
  ["vm", "Virtual machines"],
  ["vpc", "VPCs"],
  ["managed-app", "Managed apps"],
  ["disk", "Disks"],
  ["static-ip", "Static IPs"],
] as const

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string
  value: string
  options: string[]
  onChange: (value: string) => void
}>) {
  return (
    <label className="flex min-w-36 flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  )
}

export function AdminResourcesPage() {
  useScreen("superadmin.resources")
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState("all")
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState("")
  const [region, setRegion] = useState("")
  const [service, setService] = useState("")
  const [failureOnly, setFailureOnly] = useState(false)
  const deferredQuery = useDeferredValue(query)
  const filters: AdminResourceFilters = {
    q: deferredQuery,
    type: tab === "all" ? undefined : tab,
    status,
    region,
    service,
    failure_only: failureOnly || undefined,
    page,
    limit: 50,
  }
  const { data, isLoading, isError, isFetching, refetch } = useAdminResourceInventory(filters)

  const updateFilter = (setter: (value: string) => void) => (value: string) => {
    setter(value)
    setPage(1)
  }
  const columns = useMemo<ColumnDef<AdminResource>[]>(
    () => [
      {
        id: "name",
        header: "Resource",
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div className="font-mono text-[11px] text-muted-foreground">{row.original.id}</div>
          </div>
        ),
      },
      {
        id: "owner",
        header: "Account / owner",
        enableSorting: false,
        cell: ({ row }) => (
          <div className="space-y-0.5">
            <Link
              className="font-medium text-link hover:underline"
              to={`/admin/accounts/${row.original.account_id}/resources`}
            >
              {row.original.account_name}
            </Link>
            <div className="font-mono text-[11px] text-muted-foreground">
              {row.original.account_number}
            </div>
            {row.original.owners.map((owner) => (
              <div key={owner.id}>
                <Link
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  to={`/admin/users/${owner.id}`}
                >
                  {owner.name || owner.email}
                </Link>
              </div>
            ))}
          </div>
        ),
        meta: { interactive: true },
      },
      textColumn<AdminResource>({
        id: "type",
        header: "Type",
        accessor: (row) => row.type,
        muted: true,
      }),
      textColumn<AdminResource>({
        id: "region",
        header: "Region",
        accessor: (row) => row.region || "—",
        mono: true,
        responsive: "lg",
      }),
      textColumn<AdminResource>({
        id: "details",
        header: "Details",
        accessor: (row) => row.meta?.filter(Boolean).join(" · ") || "—",
        muted: true,
        responsive: "xl",
      }),
      statusColumn<AdminResource>({ header: "Status", accessor: (row) => row.status || "unknown" }),
      {
        id: "failure",
        header: "Failure reason",
        accessorFn: (row) => row.failure_reason ?? "",
        cell: ({ row }) =>
          row.original.failure_reason ? (
            <div
              className="max-w-72 text-xs text-status-danger"
              title={row.original.failure_reason}
            >
              {row.original.failure_reason}
            </div>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
        meta: { responsive: "lg" },
      },
      dateColumn<AdminResource>({
        header: "Updated",
        accessor: (row) => row.updated_at ?? "",
        responsive: "xl",
      }),
    ],
    [],
  )

  const options = data?.options ?? { types: [], services: [], statuses: [], regions: [] }
  const clearFilters = () => {
    setQuery("")
    setStatus("")
    setRegion("")
    setService("")
    setFailureOnly(false)
    setPage(1)
  }
  return (
    <div className="space-y-5">
      <PageHeader
        icon={Boxes}
        breadcrumbs={[{ label: "Super Admin" }, { label: "Resources" }]}
        title="Resource estate"
        description="Inspect every tenant-owned resource, its account, lifecycle state, and provisioning failures."
        actions={
          <Button variant="outline" size="sm" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
            Refresh
          </Button>
        }
      />

      {data && (
        <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 border-y border-border py-3">
          <span className="font-mono text-2xl font-semibold tabular-nums">{data.total}</span>
          <span className="text-sm text-muted-foreground">matching resources</span>
          <span className="text-xs text-muted-foreground">
            Across all customer accounts and resource regions
          </span>
        </div>
      )}

      <Tabs
        value={tab}
        onValueChange={(value) => {
          setTab(value)
          setPage(1)
        }}
      >
        <TabsList aria-label="Resource type">
          {RESOURCE_TABS.map(([value, label]) => (
            <TabsTrigger key={value} value={value}>
              {label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <section
        aria-label="Resource filters"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/20 p-3"
      >
        <label className="flex min-w-64 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground">
          Search resources or accounts
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder="Name, ID, account, or account number"
              className="pl-9"
            />
          </div>
        </label>
        <FilterSelect
          label="Status"
          value={status}
          options={options.statuses}
          onChange={updateFilter(setStatus)}
        />
        <FilterSelect
          label="Region"
          value={region}
          options={options.regions}
          onChange={updateFilter(setRegion)}
        />
        <FilterSelect
          label="Service"
          value={service}
          options={options.services}
          onChange={updateFilter(setService)}
        />
        <label className="flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
          <input
            type="checkbox"
            checked={failureOnly}
            onChange={(event) => {
              setFailureOnly(event.target.checked)
              setPage(1)
            }}
          />
          Failures only
        </label>
        <Button variant="ghost" size="sm" onClick={clearFilters}>
          <SlidersHorizontal className="size-4" />
          Clear
        </Button>
      </section>

      {(data?.failures.length ?? 0) > 0 && (
        <div
          role="alert"
          className="flex gap-3 rounded-lg border border-status-warning/40 bg-status-warning/10 p-3 text-sm"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-status-warning" />
          <div>
            <div className="font-medium">Some resource sources could not be read</div>
            <div className="text-muted-foreground">
              Showing available data. {data?.failures.length} account/source checks failed; refresh
              after the affected regional service recovers.
            </div>
          </div>
        </div>
      )}

      <DataTable
        data={data?.items ?? []}
        columns={columns}
        loading={isLoading}
        error={isError ? "Resource inventory could not be loaded." : undefined}
        onRetry={() => void refetch()}
        getRowId={(row) => `${row.account_id}:${row.type}:${row.id}`}
        pagination={{
          page,
          pageSize: data?.limit ?? 50,
          total: data?.total ?? 0,
          onPageChange: setPage,
        }}
        empty={
          <EmptyState
            icon={Boxes}
            title="No matching resources"
            description="Adjust the resource type or filters to broaden the inventory."
          />
        }
      />
    </div>
  )
}
