import { useDeferredValue, useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, Boxes, Download, Search, SlidersHorizontal } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

import { PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

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

import { useAdminResourceInventory } from "../superadmin.hooks"
import type { AdminResource, AdminResourceFilters } from "../superadmin.types"
import { ResourceDetailSheet } from "./AdminResources/ResourceDetailSheet"

const coreTypes = ["all", "vm", "vpc", "managed-app", "disk", "static-ip"]
const labels: Record<string, string> = {
  all: "All resources",
  vm: "Virtual machines",
  vpc: "VPCs",
  "managed-app": "Managed apps",
  disk: "Disks",
  "static-ip": "Static IPs",
  subnet: "Subnets",
  "ssh-key": "SSH keys",
  "load-balancer": "Load balancers",
  "network-interface": "Network interfaces",
  "security-group": "Security groups",
  router: "Routers",
  "internet-gateway": "Internet gateways",
  "nat-gateway": "NAT gateways",
  "vpn-gateway": "VPN gateways",
}
const param = (search: URLSearchParams, key: string) => search.get(key) ?? ""

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: Readonly<{
  label: string
  value: string
  options: { value: string; label: string; detail?: string }[]
  onChange: (value: string) => void
}>) {
  return (
    <label className="flex min-w-40 flex-col gap-1 text-xs font-medium text-muted-foreground">
      {label}
      <select
        value={value}
        onChange={(event) => {
          onChange(event.target.value)
        }}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
      >
        <option value="">All {label.toLowerCase()}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
            {option.detail ? ` · ${option.detail}` : ""}
          </option>
        ))}
      </select>
    </label>
  )
}

function downloadCsv(rows: AdminResource[]) {
  const escape = (value: unknown) => {
    let stringValue = ""
    if (typeof value === "string") stringValue = value
    else if (value != null) stringValue = JSON.stringify(value)
    return `"${stringValue.replaceAll('"', '""')}"`
  }
  const headers = [
    "name",
    "id",
    "type",
    "service",
    "status",
    "region",
    "account",
    "account_number",
    "owners",
    "failure_reason",
    "updated_at",
  ]
  const body = rows.map((row) =>
    [
      row.name,
      row.id,
      row.type,
      row.service,
      row.status,
      row.region,
      row.account_name,
      row.account_number,
      row.owners.map((owner) => owner.email).join("; "),
      row.failure_reason,
      row.updated_at,
    ]
      .map(escape)
      .join(","),
  )
  const blob = new Blob([[headers.join(","), ...body].join("\n")], {
    type: "text/csv;charset=utf-8",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "resource-estate-page.csv"
  link.click()
  URL.revokeObjectURL(url)
}

export function AdminResourcesPage() {
  useScreen("superadmin.resources")
  const [search, setSearch] = useSearchParams()
  const type = param(search, "type") || "all"
  const query = param(search, "q")
  const selectedKey = param(search, "resource")
  const page = Math.max(1, Number(param(search, "page")) || 1)
  const deferredQuery = useDeferredValue(query)
  const set = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(search)
    if (value) next.set(key, value)
    else next.delete(key)
    if (resetPage) next.delete("page")
    setSearch(next, { replace: true })
  }
  const filters: AdminResourceFilters = {
    q: deferredQuery,
    type: type === "all" ? undefined : type,
    status: param(search, "status"),
    region: param(search, "region"),
    service: param(search, "service"),
    account_id: param(search, "account"),
    owner_id: param(search, "owner"),
    failure_only: param(search, "failed") === "true" || undefined,
    include_deleted: param(search, "deleted") === "true" || undefined,
    page,
    limit: 50,
  }
  const { data, isLoading, isError, isFetching, refetch, dataUpdatedAt } =
    useAdminResourceInventory(filters)
  const selected =
    data?.items.find((row) => `${row.account_id}:${row.type}:${row.id}` === selectedKey) ?? null
  const closeDetail = () => {
    set("resource", "", false)
  }
  const types = [
    ...coreTypes,
    ...(data?.options.types ?? []).filter((item) => !coreTypes.includes(item)),
  ]
  const options = data?.options
  const columns = useMemo<ColumnDef<AdminResource>[]>(
    () => [
      {
        id: "name",
        header: "Resource",
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div>
            <div className="font-medium">{row.original.name}</div>
            <div
              className="max-w-48 truncate font-mono text-[11px] text-muted-foreground"
              title={row.original.id}
            >
              {row.original.id}
            </div>
          </div>
        ),
      },
      {
        id: "owner",
        header: "Account / owner",
        enableSorting: false,
        cell: ({ row }) => (
          <div>
            <Link
              onClick={(event) => {
                event.stopPropagation()
              }}
              className="font-medium text-link hover:underline"
              to={`/admin/accounts/${row.original.account_id}/resources`}
            >
              {row.original.account_name}
            </Link>
            <div className="font-mono text-[11px] text-muted-foreground">
              {row.original.account_number}
            </div>
            <div className="max-w-52 truncate text-xs text-muted-foreground">
              {row.original.owners.map((owner) => owner.email).join(", ") || "No owner"}
            </div>
          </div>
        ),
        meta: { interactive: true },
      },
      textColumn<AdminResource>({
        id: "type",
        header: "Type",
        accessor: (row) => labels[row.type] ?? row.type,
        muted: true,
      }),
      textColumn<AdminResource>({
        id: "region",
        header: "Region",
        accessor: (row) => (row.region?.trim() ? row.region : "—"),
        mono: true,
        responsive: "lg",
      }),
      statusColumn<AdminResource>({
        header: "Status",
        accessor: (row) => (row.status?.trim() ? row.status : "unknown"),
      }),
      {
        id: "failure",
        header: "Failure",
        accessorFn: (row) => row.failure_reason ?? "",
        cell: ({ row }) =>
          row.original.failure_reason ? (
            <div
              className="max-w-64 truncate text-xs text-status-danger"
              title={row.original.failure_reason}
            >
              <AlertTriangle className="mr-1 inline size-3" />
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
  const summary = data?.summary ?? {
    total: data?.total ?? 0,
    active: 0,
    pending: 0,
    failed: 0,
    by_type: {},
    by_status: {},
  }
  const clear = () => {
    setSearch(new URLSearchParams(), { replace: true })
  }
  return (
    <div className="space-y-5">
      <PageHeader
        icon={Boxes}
        breadcrumbs={[{ label: "Super Admin" }, { label: "Resources" }]}
        title="Resource estate"
        description="Every tenant resource, its owner, current state, and failure evidence in one operational ledger."
        actions={
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                downloadCsv(data?.items ?? [])
              }}
              disabled={!data?.items.length}
            >
              <Download className="size-4" />
              Export page
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              Refresh
            </Button>
          </div>
        }
      />
      <section
        aria-label="Estate health"
        className="grid grid-cols-2 border-y border-border sm:grid-cols-4"
      >
        <Summary label="Matching" value={summary.total} />
        <Summary label="Active" value={summary.active} tone="text-status-success" />
        <Summary label="In progress" value={summary.pending} tone="text-status-warning" />
        <Summary label="Failed" value={summary.failed} tone="text-status-danger" />
      </section>
      <Tabs
        value={type}
        onValueChange={(value) => {
          set("type", value === "all" ? "" : value)
        }}
      >
        <TabsList aria-label="Resource type">
          {types.map((value) => (
            <TabsTrigger key={value} value={value}>
              {labels[value] ?? value}
              <span className="font-mono text-[10px] text-muted-foreground">
                {value === "all" ? summary.total : (summary.by_type[value] ?? 0)}
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>
      <section
        aria-label="Resource filters"
        className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-muted/20 p-3"
      >
        <label
          htmlFor="resource-search"
          className="flex min-w-64 flex-1 flex-col gap-1 text-xs font-medium text-muted-foreground"
        >
          Search resources or accounts
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2" />
            <Input
              id="resource-search"
              type="search"
              value={query}
              onChange={(event) => {
                set("q", event.target.value)
              }}
              placeholder="Name, ID, account, or account number"
              className="pl-9"
            />
          </div>
        </label>
        <FilterSelect
          label="Status"
          value={param(search, "status")}
          options={(options?.statuses ?? []).map((value) => ({ value, label: value }))}
          onChange={(value) => {
            set("status", value)
          }}
        />
        <FilterSelect
          label="Region"
          value={param(search, "region")}
          options={(options?.regions ?? []).map((value) => ({ value, label: value }))}
          onChange={(value) => {
            set("region", value)
          }}
        />
        <FilterSelect
          label="Service"
          value={param(search, "service")}
          options={(options?.services ?? []).map((value) => ({ value, label: value }))}
          onChange={(value) => {
            set("service", value)
          }}
        />
        <FilterSelect
          label="Account"
          value={param(search, "account")}
          options={options?.accounts ?? []}
          onChange={(value) => {
            set("account", value)
          }}
        />
        <FilterSelect
          label="Owner"
          value={param(search, "owner")}
          options={options?.owners ?? []}
          onChange={(value) => {
            set("owner", value)
          }}
        />
        <label className="flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
          <input
            type="checkbox"
            checked={param(search, "failed") === "true"}
            onChange={(event) => {
              set("failed", event.target.checked ? "true" : "")
            }}
          />
          Failures only
        </label>
        <label className="flex h-9 items-center gap-2 rounded-md border border-input px-3 text-sm">
          <input
            type="checkbox"
            checked={param(search, "deleted") === "true"}
            onChange={(event) => {
              set("deleted", event.target.checked ? "true" : "")
            }}
          />
          Include deleted VMs
        </label>
        <Button variant="ghost" size="sm" onClick={clear}>
          <SlidersHorizontal className="size-4" />
          Clear
        </Button>
      </section>
      {(data?.failures.length ?? 0) > 0 && (
        <details className="rounded-lg border border-status-warning/40 bg-status-warning/10 p-3 text-sm">
          <summary className="cursor-pointer font-medium">
            <AlertTriangle className="mr-2 inline size-4 text-status-warning" />
            {data?.failures.length} resource sources could not be read
          </summary>
          <ul className="mt-3 space-y-2 border-t border-status-warning/20 pt-3">
            {data?.failures.map((failure) => (
              <li
                key={`${failure.account_id}-${failure.source}-${failure.reason}`}
                className="grid gap-1 sm:grid-cols-[8rem_1fr]"
              >
                <span className="font-mono text-xs">{failure.source}</span>
                <span className="break-words text-muted-foreground">
                  Account {failure.account_id}: {failure.reason}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
      <DataTable
        data={data?.items ?? []}
        columns={columns}
        loading={isLoading}
        error={isError ? "Resource inventory could not be loaded." : undefined}
        onRetry={() => void refetch()}
        getRowId={(row) => `${row.account_id}:${row.type}:${row.id}`}
        onRowClick={(row) => {
          set("resource", `${row.account_id}:${row.type}:${row.id}`, false)
        }}
        columnToolbar
        pagination={{
          page,
          pageSize: data?.limit ?? 50,
          total: data?.total ?? 0,
          onPageChange: (next) => {
            set("page", String(next), false)
          },
        }}
        empty={
          <EmptyState
            icon={Boxes}
            title="No matching resources"
            description="Adjust the resource type or filters to broaden the inventory."
          />
        }
      />
      <p className="text-right font-mono text-[10px] text-muted-foreground">
        Last refreshed {dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString() : "—"}
      </p>
      <ResourceDetailSheet resource={selected} onClose={closeDetail} />
    </div>
  )
}

function Summary({
  label,
  value,
  tone = "text-foreground",
}: Readonly<{ label: string; value: number; tone?: string }>) {
  return (
    <div className="border-r border-border px-4 py-3 last:border-r-0">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${tone}`}>{value}</div>
    </div>
  )
}
