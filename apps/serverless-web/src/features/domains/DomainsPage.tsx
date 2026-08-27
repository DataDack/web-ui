import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Globe, PauseCircle, ShieldQuestion, UserSquare } from "lucide-react"

import { apiErrorMessage, type DomainQuery } from "@/lib/api"
import { useDomains } from "@/lib/queries"
import type { Domain } from "@/lib/schemas"

import {
  Badge,
  CopyButton,
  DataTable,
  EmptyState,
  Input,
  PageHeader,
  StatCard,
  StatGrid,
  cellMono,
  cellText,
  cn,
  timeAgo,
} from "@datadack/common-ui"

/**
 * Every hostname the platform has handed out, across every tenant and every
 * product.
 *
 * This is the operator's view, and it lives here — beside the service that owns
 * the rows — rather than in the cloud console where it used to. The registry moved
 * into this control plane because the API gateway asks one service about a
 * hostname; the view of it followed, so there is one operator surface for
 * hostnames rather than two that can disagree about what is registered.
 *
 * The one thing this view CANNOT show is an account's name. The accounts table
 * lives in the cloud console's database and there is no join across services, so
 * the owner is an id — copyable, because pasting it into the console is what an
 * operator does with it next.
 */

const PAGE_SIZE = 100

/** The four hostname types, plus "all". A product each, and a zone each. */
const TYPE_FILTERS = [
  { label: "All", value: undefined },
  { label: "Functions", value: "func" },
  { label: "Apps", value: "app" },
  { label: "VMs", value: "vm" },
  { label: "Load balancers", value: "lb" },
] as const

/**
 * System vs custom is NOT a type. It is `managed`: true when the platform minted
 * the name, false when a tenant brought one they own. The distinction matters more
 * than it looks — a custom row has to prove ownership before it is served, and only
 * a managed name is released automatically when its resource goes away.
 */
const OWNERSHIP_FILTERS = [
  { label: "All", value: undefined },
  { label: "System", value: true },
  { label: "Custom", value: false },
] as const

const STATUS_FILTERS = [
  { label: "Live", value: undefined },
  { label: "Pending", value: "pending" },
  { label: "Active", value: "active" },
  { label: "Suspended", value: "suspended" },
  { label: "Released", value: "released" },
] as const

const STATUS_CLASSES: Record<string, string> = {
  active: "text-status-success",
  pending: "text-status-warning",
  suspended: "text-status-warning",
  released: "text-muted-foreground",
}

/**
 * Whether a hostname actually answers right now.
 *
 * Deliberately not `status === "active"`. A vm or lb name carries its own A record,
 * and the registry marks the row active as soon as its resource has an address —
 * the record is written by a reconciler afterwards. `dns_synced_ip` is what that
 * reconciler last wrote, so an active record-mode row with none resolves nowhere.
 * Collapsing the two is exactly how an operator concludes DNS is fine when it is
 * not.
 */
function resolves(domain: Domain): boolean {
  if (domain.status !== "active") return false
  return domain.dns_mode !== "record" || Boolean(domain.dns_synced_ip)
}

/** What the row points at: an address to proxy to, or a function to invoke. */
function destination(domain: Domain): string {
  if (domain.target === "invoke") {
    return domain.function_qualifier
      ? `${domain.function_name}:${domain.function_qualifier}`
      : domain.function_name
  }
  const address = domain.private_ip || domain.public_ip
  if (!address) return ""
  return domain.port ? `${address}:${String(domain.port)}` : address
}

export function DomainsPage() {
  const [type, setType] = useState<string | undefined>(undefined)
  const [managed, setManaged] = useState<boolean | undefined>(undefined)
  const [status, setStatus] = useState<string | undefined>(undefined)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)

  // The search term goes to the SERVER, not to the table's own filter: the listing
  // is paged server-side, so filtering in the browser would only search the page
  // the operator is looking at and quietly report no matches for the rest.
  const query: DomainQuery = {
    type,
    managed,
    status,
    q: search || undefined,
    page,
    limit: PAGE_SIZE,
  }
  const { data, isLoading, isFetching, refetch, error } = useDomains(query)
  const domains = data?.domains ?? []
  const total = data?.total ?? 0

  const columns = useMemo<ColumnDef<Domain>[]>(
    () => [
      {
        accessorKey: "hostname",
        header: "Hostname",
        cell: ({ row }) => (
          <div className="flex min-w-0 items-center gap-1.5">
            <CopyButton
              value={row.original.hostname}
              className="min-w-0 text-foreground font-medium"
            />
            {!row.original.managed && (
              <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                custom
              </Badge>
            )}
            {/* A resource may hold several names; only one is its address. */}
            {!row.original.is_primary && row.original.managed && (
              <Badge variant="outline" className="text-muted-foreground shrink-0 text-[10px]">
                alias
              </Badge>
            )}
          </div>
        ),
      },
      {
        accessorKey: "type",
        header: "Type",
        cell: ({ row }) => (
          <Badge variant="outline" className="font-mono text-[11px]">
            {row.original.type || "—"}
          </Badge>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => (
          <div className="flex flex-col gap-0.5">
            <span
              className={cn("font-mono text-[12px]", STATUS_CLASSES[row.original.status] ?? "")}
            >
              {row.original.status}
            </span>
            {/* The distinction the status alone hides. Only said out loud for the
                rows where it can be false, so it is signal rather than decoration. */}
            {row.original.status === "active" && !resolves(row.original) && (
              <span className="text-status-warning text-[11px]">no DNS record yet</span>
            )}
          </div>
        ),
      },
      {
        id: "destination",
        header: "Points at",
        accessorFn: destination,
        cell: ({ row }) => cellMono(destination(row.original)),
      },
      {
        accessorKey: "resource_id",
        header: "Resource",
        cell: ({ row }) => (
          <div className="flex min-w-0 flex-col">
            <span className="text-muted-foreground truncate text-[11px]">
              {row.original.resource_type || "—"}
            </span>
            <div className="flex min-w-0 items-center gap-1">
              {row.original.resource_id ? (
                <CopyButton
                  value={row.original.resource_id}
                  className="min-w-0 text-foreground text-[11px]"
                />
              ) : (
                <span className="font-mono text-[11px]">—</span>
              )}
            </div>
          </div>
        ),
      },
      {
        accessorKey: "account_id",
        header: "Account",
        cell: ({ row }) => {
          // The all-zeroes UUID is a real stored value: it is the platform's own
          // rows, not a missing owner.
          const platformOwned = /^0{8}-0{4}-0{4}-0{4}-0{12}$/.test(row.original.account_id)
          if (platformOwned) {
            return <span className="text-muted-foreground text-[11px] italic">platform</span>
          }
          return (
            <div className="flex min-w-0 items-center gap-1">
              <CopyButton
                value={row.original.account_id}
                className="min-w-0 text-foreground text-[11px]"
              />
            </div>
          )
        },
      },
      {
        id: "verification",
        header: "Verified",
        cell: ({ row }) => {
          // Only custom rows carry a verification object; a platform name has
          // nothing to prove, so the cell says nothing rather than "n/a".
          const verification = row.original.verification
          if (!verification) return cellText()
          if (verification.verified) {
            return <span className="text-status-success font-mono text-[11px]">yes</span>
          }
          return (
            <div className="flex flex-col">
              <span className="text-status-warning font-mono text-[11px]">
                pending{verification.attempts > 0 && ` · ${String(verification.attempts)} tries`}
              </span>
              {verification.last_error && (
                <span
                  className="text-muted-foreground max-w-56 truncate text-[11px]"
                  title={verification.last_error}
                >
                  {verification.last_error}
                </span>
              )}
            </div>
          )
        },
      },
      {
        accessorKey: "created_at",
        header: "Created",
        cell: ({ row }) => (
          <span className="text-muted-foreground text-[12px] whitespace-nowrap">
            {timeAgo(row.original.created_at)}
          </span>
        ),
      },
    ],
    [],
  )

  const custom = domains.filter((domain) => !domain.managed).length
  const unverified = domains.filter(
    (domain) => domain.verification && !domain.verification.verified,
  ).length
  const notServing = domains.filter((domain) => domain.status === "suspended").length

  /** Reset to the first page whenever the filters change what is being counted. */
  const applyFilter = (change: () => void) => {
    change()
    setPage(1)
  }

  return (
    <>
      <PageHeader
        title="Domains"
        icon={Globe}
        description="Every hostname the platform hands out — function URLs, managed-app names, load-balancer and VM names, and the domains tenants bring themselves."
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <FilterGroup
          options={TYPE_FILTERS}
          current={type}
          onSelect={(value) => {
            applyFilter(() => {
              setType(value)
            })
          }}
        />
        <FilterGroup
          options={OWNERSHIP_FILTERS}
          current={managed}
          onSelect={(value) => {
            applyFilter(() => {
              setManaged(value)
            })
          }}
        />
        <FilterGroup
          options={STATUS_FILTERS}
          current={status}
          onSelect={(value) => {
            applyFilter(() => {
              setStatus(value)
            })
          }}
        />
      </div>

      <StatGrid className="mb-6">
        <StatCard label="Hostnames" value={total} icon={Globe} loading={isLoading} />
        <StatCard label="Customer domains" value={custom} icon={UserSquare} loading={isLoading} />
        <StatCard
          label="Awaiting proof"
          value={unverified}
          icon={ShieldQuestion}
          color={unverified > 0 ? "warning" : "default"}
          loading={isLoading}
        />
        <StatCard
          label="Suspended"
          value={notServing}
          icon={PauseCircle}
          color={notServing > 0 ? "warning" : "default"}
          loading={isLoading}
        />
      </StatGrid>

      <DataTable
        data={domains}
        columns={columns}
        loading={isLoading}
        toolbar={
          <Input
            value={search}
            onChange={(event) => {
              applyFilter(() => {
                setSearch(event.target.value)
              })
            }}
            placeholder="Filter by hostname…"
            className="h-8 w-56 font-mono text-[12px]"
          />
        }
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total,
          onPageChange: setPage,
        }}
        empty={
          <EmptyState
            icon={Globe}
            title="No hostnames registered"
            description="A hostname appears here when a product hands one out — a function URL is created, an app is deployed, a load balancer or a VM gets a public address — or when a tenant brings a domain of their own."
          />
        }
        noResults={
          <EmptyState
            icon={Globe}
            title="No hostnames match"
            description="Widen the filters, or clear the hostname search."
          />
        }
        onRefresh={() => void refetch()}
        refreshing={isFetching}
        error={error ? apiErrorMessage(error) : undefined}
        onRetry={() => void refetch()}
      />
    </>
  )
}

/**
 * One segmented filter. Generic over the value so the tri-state ownership filter
 * (true / false / undefined) uses the same control as the string ones — and so
 * `undefined` stays a real, selectable option rather than being conflated with
 * "nothing chosen yet".
 */
function FilterGroup<T>({
  options,
  current,
  onSelect,
}: Readonly<{
  options: readonly { readonly label: string; readonly value: T }[]
  current: T
  onSelect: (value: T) => void
}>) {
  return (
    <div className="border-border bg-card inline-flex overflow-hidden rounded-lg border">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => {
            onSelect(option.value)
          }}
          className={cn(
            "px-2.5 py-1 font-mono text-[11px] transition-colors",
            option.value === current
              ? "bg-accent text-foreground"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
