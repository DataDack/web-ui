import { useMemo, type ReactNode } from "react"

import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowDownToLine, ChartColumn, Coins, PiggyBank, UserRound, Wallet } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

import {
  PageHeader,
  Section,
  SmartSelect,
  StatGrid,
  type SmartSelectOption,
  type StatCardProps,
} from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { useAdminPlatformOverview, useAdminUsageReport } from "../superadmin.hooks"
import type {
  OverviewAccount,
  OverviewUser,
  UsageReportLine,
  UsageReportModule,
} from "../superadmin.types"

// How far back the month picker reaches. Statements are kept indefinitely, but
// two years covers every question an operator has actually asked.
const MONTHS_BACK = 24

const MODULE_LABELS: Record<string, string> = {
  compute: "Compute",
  storage: "Storage",
  network: "Network",
  loadbalancer: "Load Balancer",
}

const moduleLabel = (module: string) => MODULE_LABELS[module] ?? (module || "Other")

// 1 credit = ₹1, and the customer's statement speaks in credits, so this does too.
const creditFmt = new Intl.NumberFormat("en-IN", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})
const credits = (v: number) => `${creditFmt.format(v)} cr`
const rateFmt = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 6 })

/** YYYY-MM for a UTC month — billing posts by UTC date. */
function monthKey(d: Date) {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

function monthOptions(): { value: string; label: string }[] {
  const now = new Date()
  return Array.from({ length: MONTHS_BACK }, (_, i) => {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    return {
      value: monthKey(d),
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric", timeZone: "UTC" }),
    }
  })
}

const lineColumns: ColumnDef<UsageReportLine>[] = [
  {
    id: "resource",
    accessorFn: (l) => `${l.service} ${l.description} ${l.resource_urn}`,
    header: () => "Resource",
    cell: ({ row }) => (
      <div className="min-w-0">
        <div className="truncate font-medium">
          {row.original.description || row.original.service}
        </div>
        <div className="truncate font-mono text-xs text-muted-foreground">
          {row.original.resource_urn || "—"}
        </div>
      </div>
    ),
  },
  {
    id: "module",
    accessorFn: (l) => moduleLabel(l.module),
    header: () => "Service",
    cell: ({ row }) => (
      <div className="flex flex-col gap-0.5">
        <Badge variant="secondary" className="w-fit">
          {moduleLabel(row.original.module)}
        </Badge>
        <span className="text-xs text-muted-foreground">{row.original.service}</span>
      </div>
    ),
  },
  {
    id: "usage",
    accessorFn: (l) => l.quantity,
    header: () => "Usage",
    cell: ({ row }) => (
      <span className="tabular-nums">
        {rateFmt.format(row.original.quantity)} {row.original.unit}
      </span>
    ),
  },
  {
    id: "rate",
    accessorFn: (l) => l.price,
    header: () => "Rate",
    meta: { responsive: "md" },
    cell: ({ row }) => (
      <span className="tabular-nums text-muted-foreground">
        {rateFmt.format(row.original.price)} cr/{row.original.unit}
      </span>
    ),
  },
  {
    id: "credits",
    accessorFn: (l) => l.credits,
    header: () => "Charged",
    cell: ({ row }) => (
      <span className="font-medium tabular-nums">{credits(row.original.credits)}</span>
    ),
  },
  {
    id: "posted",
    accessorFn: (l) => l.posted_at,
    header: () => "First posted",
    meta: { responsive: "lg" },
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {new Date(row.original.posted_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          timeZone: "UTC",
        })}
      </span>
    ),
  },
]

/**
 * Per-user monthly usage, the way an operator asks for it: "what did this
 * person spend in August". Billing is per ACCOUNT, not per user, so choosing a
 * user resolves to the account(s) they belong to; with more than one, the
 * operator picks which. The selection lives in the URL so a report can be
 * linked from a support ticket.
 */
export function UsageReportsPage() {
  useScreen("superadmin.usage-reports")
  const [params, setParams] = useSearchParams()
  const months = useMemo(() => monthOptions(), [])
  const userId = params.get("user") ?? undefined
  const month = params.get("month") ?? months[0].value

  const overview = useAdminPlatformOverview()
  const userAccounts = useMemo(
    () =>
      userId
        ? (overview.data?.accounts ?? []).filter((a) => a.members.some((m) => m.user_id === userId))
        : [],
    [overview.data, userId],
  )
  const requestedAccount = params.get("account")
  const account = userAccounts.find((a) => a.id === requestedAccount) ?? userAccounts.at(0)

  const update = (next: Record<string, string | undefined>) => {
    const merged = new URLSearchParams(params)
    for (const [k, v] of Object.entries(next)) {
      if (v) merged.set(k, v)
      else merged.delete(k)
    }
    setParams(merged, { replace: true })
  }

  const userOptions: SmartSelectOption<OverviewUser>[] = (overview.data?.users ?? []).map((u) => ({
    value: u.id,
    item: u,
    searchText: `${u.name} ${u.email} ${u.org_name}`,
  }))

  let body: ReactNode
  if (!userId) {
    body = (
      <EmptyState
        icon={UserRound}
        title="Select a user to view their usage report"
        description="Pick a user and a month above."
      />
    )
  } else if (account) {
    body = <ReportBody account={account} month={month} />
  } else if (!overview.isLoading) {
    body = (
      <EmptyState
        icon={Wallet}
        title="This user belongs to no account"
        description="Usage is billed to accounts, so there is nothing to report until they join or create one."
      />
    )
  }

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ChartColumn}
        breadcrumbs={[{ label: "Super Admin" }, { label: "Usage reports" }]}
        title="Usage reports"
        description="What a user's account consumed in a month, line by line, as billed from the wallet."
      />

      <div className="grid gap-4 sm:grid-cols-[minmax(0,22rem)_minmax(0,18rem)_minmax(0,14rem)]">
        <div className="space-y-1.5">
          <Label htmlFor="usage-user">User</Label>
          <SmartSelect<OverviewUser>
            id="usage-user"
            options={userOptions}
            value={userId}
            onValueChange={(value) => {
              update({ user: value, account: undefined })
            }}
            renderRow={(o) => ({
              leading: <UserRound className="size-4 text-muted-foreground" />,
              primary: o.item.name || o.item.email,
              secondary: o.item.name ? o.item.email : o.item.org_name || undefined,
            })}
            renderValue={(o) => o.item.name || o.item.email}
            loading={overview.isLoading}
            fetching={overview.isFetching}
            error={overview.isError}
            onRefresh={() => void overview.refetch()}
            placeholder="Select user"
            searchPlaceholder="Search by name or email"
            emptyText="No users on the platform"
            noMatchText={(q) => `No user matches “${q}”`}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="usage-account">Account</Label>
          <Select
            value={account?.id}
            onValueChange={(value) => {
              update({ account: value })
            }}
            disabled={userAccounts.length < 2}
          >
            <SelectTrigger id="usage-account" className="w-full">
              <SelectValue placeholder={userId ? "No account" : "Pick a user first"} />
            </SelectTrigger>
            <SelectContent>
              {userAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                  {a.org_name ? ` · ${a.org_name}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="usage-month">Month (UTC)</Label>
          <Select
            value={month}
            onValueChange={(value) => {
              update({ month: value })
            }}
          >
            <SelectTrigger id="usage-month" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {body}
    </div>
  )
}

/** The report for one account and month, once both are known. */
function ReportBody({ account, month }: Readonly<{ account: OverviewAccount; month: string }>) {
  const report = useAdminUsageReport(account.id, month)
  const data = report.data

  if (report.isError) {
    return (
      <EmptyState
        icon={ChartColumn}
        title="Could not load the usage report"
        description="The billing service did not answer. Try again in a moment."
        action={{ label: "Try again", onClick: () => void report.refetch() }}
      />
    )
  }

  const stats: StatCardProps[] = [
    { label: "Usage charged", value: data?.usage_credits ?? 0, icon: Coins },
    { label: "Opening balance", value: data?.opening_balance ?? 0, icon: Wallet },
    { label: "Credits added", value: data?.credits_added ?? 0, icon: ArrowDownToLine },
    { label: "Closing balance", value: data?.closing_balance ?? 0, icon: PiggyBank },
  ].map((s) => ({ ...s, format: credits, loading: report.isLoading }))
  const live = data?.source === "live"

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        {data && (
          <>
            <Badge variant={live ? "outline" : "secondary"}>
              {live ? "Live · month still open" : "Closed statement"}
            </Badge>
            <span>
              {live
                ? "Read from the wallet ledger now; figures move until the month closes."
                : "The month-end snapshot sent to the customer."}
            </span>
          </>
        )}
        <Button variant="link" size="sm" className="ml-auto h-auto p-0" asChild>
          <Link to={`/admin/accounts/${account.id}/resources`}>Open account</Link>
        </Button>
      </div>

      <StatGrid stats={stats} />

      {data && data.by_module.length > 0 && (
        <ModuleBreakdown modules={data.by_module} total={data.usage_credits} />
      )}

      <Section title="Billed lines">
        <DataTable<UsageReportLine>
          data={data?.lines ?? []}
          columns={lineColumns}
          loading={report.isLoading}
          getRowId={(l) => l.ledger_id}
          defaultSorting={[{ id: "credits", desc: true }]}
          searchable
          searchPlaceholder="Filter by resource or service"
          empty={
            <EmptyState
              icon={Coins}
              title="No billed usage this month"
              description="Top-ups and adjustments are not usage, so they do not appear here."
            />
          }
        />
      </Section>
    </>
  )
}

/** Where the month's credits went, largest share first. */
function ModuleBreakdown({
  modules,
  total,
}: Readonly<{ modules: UsageReportModule[]; total: number }>) {
  return (
    <Section title="By service">
      <ul className="space-y-3">
        {modules.map((m) => {
          const share = total > 0 ? (m.credits / total) * 100 : 0
          return (
            <li key={m.module} className="space-y-1">
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium">
                  {moduleLabel(m.module)}
                  <span className="ml-2 text-xs font-normal text-muted-foreground">
                    {m.resources} {m.resources === 1 ? "resource" : "resources"}
                  </span>
                </span>
                <span className="tabular-nums">
                  {credits(m.credits)}
                  <span className="ml-2 text-xs text-muted-foreground">{share.toFixed(1)}%</span>
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
              </div>
            </li>
          )
        })}
      </ul>
    </Section>
  )
}
