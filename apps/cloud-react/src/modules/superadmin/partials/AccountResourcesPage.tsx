import { useMemo, useState } from "react"

import { Badge } from "@DataDack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { ArrowLeft, Boxes, CalendarClock, Clock, RefreshCw, Trash2, Wallet } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import {
  ConfirmDialog,
  dateColumn,
  EmptyState,
  nameColumn,
  PageHeader,
  ResourceTable,
  StatGrid,
  statusColumn,
  textColumn,
  type StatCardProps,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import { useScreen } from "@/services/api/screen"

import {
  useAdminAccountResources,
  useAdminAccountSpend,
  useAdminPlatformOverview,
  useDeleteAccount,
} from "../superadmin.hooks"
import type { AccountResource, OverviewAccount } from "../superadmin.types"

const ORGS_PATH = "/admin/organizations"

// Human label per billing resource-kind (Subscription.ResourceKind).
const KIND_LABELS: Record<string, string> = {
  compute: "Compute",
  storage: "Storage",
  network: "Network",
  loadbalancer: "Load Balancer",
}

// ₹ formatter — INR, two decimals, grouped. Used for every money figure here.
const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2,
})
const money = (v: number) => inr.format(v)

// Human label per backend resource type. Falls back to the raw type for anything
// not listed (so a newly added resource type still renders sensibly).
const TYPE_LABELS: Record<string, string> = {
  vm: "Virtual Machine",
  disk: "Disk",
  "ssh-key": "SSH Key",
  "load-balancer": "Load Balancer",
  vpc: "VPC Network",
  subnet: "Subnet",
  "static-ip": "Static IP",
  "network-interface": "Network Interface",
  "security-group": "Security Group",
}

function typeLabel(type: string): string {
  return TYPE_LABELS[type] ?? type
}

// Show a value or an em dash when it's empty/absent (region and status are blank
// for resources that don't carry them, e.g. SSH keys).
function orDash(v?: string): string {
  return v?.trim() ? v : "—"
}

export function AccountResourcesPage() {
  useScreen("superadmin.accountResources")
  const navigate = useNavigate()
  const { accountId } = useParams<{ accountId: string }>()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const deleteAccount = useDeleteAccount()

  const {
    data: resources = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useAdminAccountResources(accountId)

  const { data: spend, isLoading: spendLoading } = useAdminAccountSpend(accountId)

  // The account's display metadata (name, number, org) lives in the cached
  // platform-overview graph — reuse it rather than adding another endpoint.
  // Read the FLAT accounts list: an account may have no organization, so
  // searching org.accounts would miss individual/unlinked accounts.
  const { data: overview } = useAdminPlatformOverview()
  let account: (OverviewAccount & { orgName: string }) | undefined
  const found = (overview?.accounts ?? []).find((x) => x.id === accountId)
  if (found) {
    const org = (overview?.organizations ?? []).find((o) => o.id === found.organization_id)
    account = { ...found, orgName: org?.name ?? "—" }
  }

  // Per-type counts for the summary strip, ordered by descending count.
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const r of resources) m.set(r.type, (m.get(r.type) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }, [resources])

  const columns = useMemo<ColumnDef<AccountResource>[]>(
    () => [
      nameColumn<AccountResource>({
        header: "Name",
        accessor: (r) => r.name,
      }),
      {
        id: "type",
        header: () => "Type",
        enableSorting: true,
        accessorFn: (r) => r.type,
        cell: ({ row }) => (
          <Badge variant="outline" className="font-normal">
            {typeLabel(row.original.type)}
          </Badge>
        ),
      },
      textColumn<AccountResource>({
        id: "region",
        header: "Region",
        accessor: (r) => orDash(r.region),
        mono: true,
        muted: true,
      }),
      statusColumn<AccountResource>({
        header: "Status",
        accessor: (r) => orDash(r.status),
      }),
      textColumn<AccountResource>({
        id: "meta",
        header: "Details",
        accessor: (r) => orDash((r.meta ?? []).filter(Boolean).join(" · ")),
        muted: true,
        responsive: "lg",
      }),
      dateColumn<AccountResource>({
        header: "Updated",
        accessor: (r) => r.updated_at ?? "",
        responsive: "lg",
      }),
    ],
    [],
  )

  const title = account ? account.name : `Account ${accountId ?? ""}`
  const total = String(resources.length)
  const deleteConfirmText = account?.account_number ?? accountId ?? ""
  const deleteDisabled =
    !accountId ||
    deleteAccount.isPending ||
    account?.status === "deleting" ||
    account?.status === "deleted"

  // Spend tiles: monthly run-rate (combined), its two components, and wallet.
  const spendStats: StatCardProps[] = [
    {
      label: "Monthly run-rate",
      value: spend?.monthly_total ?? 0,
      format: money,
      icon: CalendarClock,
      loading: spendLoading,
    },
    {
      label: "Monthly recurring",
      value: spend?.monthly_recurring ?? 0,
      format: money,
      icon: CalendarClock,
      loading: spendLoading,
    },
    {
      label: "Hourly run-rate",
      value: spend?.hourly_rate ?? 0,
      format: (v) => `${money(v)}/hr`,
      icon: Clock,
      loading: spendLoading,
    },
    {
      label: "Wallet balance",
      value: spend?.wallet_balance ?? 0,
      format: money,
      icon: Wallet,
      color: (spend?.wallet_balance ?? 0) > 0 ? "success" : "danger",
      loading: spendLoading,
    },
  ]

  // Non-active subscriptions (overdue / suspended / cancelled) worth flagging.
  const flaggedStatuses = Object.entries(spend?.by_status ?? {}).filter(
    ([status, n]) => status !== "active" && n > 0,
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Boxes}
        breadcrumbs={[
          { label: "Super Admin" },
          { label: "Organizations", to: ORGS_PATH },
          { label: title },
        ]}
        title={title}
        description={
          account
            ? `${account.account_number} · ${account.orgName} · ${total} resources`
            : `${total} resources`
        }
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void navigate(ORGS_PATH)}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={isFetching ? "size-4 animate-spin" : "size-4"} />
              Refresh
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                setDeleteOpen(true)
              }}
              disabled={deleteDisabled}
            >
              <Trash2 className="size-4" />
              Delete account
            </Button>
          </div>
        }
      />

      <StatGrid stats={spendStats} />

      {(spend?.by_kind.length ?? 0) > 0 && (
        <div className="space-y-2">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Active spend by service ({spend?.active_resources ?? 0} resources)
          </div>
          <div className="flex flex-wrap gap-2">
            {spend?.by_kind.map((k) => (
              <div
                key={k.kind}
                className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-1.5"
              >
                <span className="text-[13px] font-medium">{KIND_LABELS[k.kind] ?? k.kind}</span>
                <span className="font-mono text-[11px] text-muted-foreground">×{k.count}</span>
                <span className="font-mono text-[13px] font-semibold tabular-nums">
                  {money(k.monthly_amount)}
                  <span className="text-[11px] font-normal text-muted-foreground">/mo</span>
                </span>
              </div>
            ))}
          </div>
          {flaggedStatuses.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1">
              {flaggedStatuses.map(([status, n]) => (
                <Badge
                  key={status}
                  variant="outline"
                  className="border-status-warning/40 font-normal text-status-warning"
                >
                  {status}
                  <span className="ml-1.5 font-mono font-semibold">{n}</span>
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {counts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {counts.map(([type, n]) => (
            <Badge key={type} variant="secondary" className="font-normal">
              {typeLabel(type)}
              <span className="ml-1.5 font-mono font-semibold">{n}</span>
            </Badge>
          ))}
        </div>
      )}

      <ResourceTable<AccountResource>
        data={resources}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(r) => `${r.type}:${r.id}`}
        initialSorting={[{ id: "type", desc: false }]}
        emptyState={
          <EmptyState
            icon={Boxes}
            title="No resources"
            description="This account isn't consuming any resources right now."
          />
        }
      />

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete account"
        description={
          <div className="space-y-3">
            <p>
              This starts teardown for {title}. All active resources will be deleted, including VMs,
              load balancers, disks, VPC resources, and related networking state.
            </p>
            <ul className="list-disc space-y-1 pl-4">
              <li>Static IPs will be released back to the pool.</li>
              <li>
                Billing history, invoices, ledger entries, payments, and usage records will be kept.
              </li>
              <li>Auth users are not deleted.</li>
            </ul>
          </div>
        }
        confirmLabel="Delete account"
        confirmText={deleteConfirmText}
        loading={deleteAccount.isPending}
        onConfirm={() => {
          if (!accountId) return
          deleteAccount.mutate(accountId, {
            onSuccess: () => {
              setDeleteOpen(false)
            },
          })
        }}
      />
    </div>
  )
}
