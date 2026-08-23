import { useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
  Button,
  DataTable,
  EmptyState,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  StatusBadge,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Ban, ExternalLink, Globe, Loader2, Play, RefreshCw, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { PageHeader } from "@/components/console"

import { HOSTING_ADMIN_ROUTES } from "../hosting.constants"
import {
  useAdminHostingAccounts,
  useAdminHostingLogin,
  useAdminSuspendAccount,
  useAdminSyncAccount,
  useAdminTerminateAccount,
  useAdminUnsuspendAccount,
  useHostingServers,
} from "../hosting.hooks"
import type { AdminHostingAccount } from "../hosting.types"
import { formatLimitMB, usageBarClass, usagePct } from "../hosting.utils"
import { ReasonDialog } from "./ReasonDialog"

const STATUSES = ["ACTIVE", "PENDING", "SUSPENDED", "FAILED", "TERMINATED"] as const

/**
 * Every customer's hosting service — the WHMCS "Clients → Services" screen.
 *
 * Actions here QUEUE panel work; the row's status only moves once the panel has
 * confirmed, which is why an account can read ACTIVE with a spinner beside it.
 */
export function HostingAccountsPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<string>("")
  const [serverId, setServerId] = useState<string>("")
  const [search, setSearch] = useState("")

  const { data: servers = [] } = useHostingServers()
  const {
    data: accounts = [],
    isLoading,
    isError,
    refetch,
    isFetching,
  } = useAdminHostingAccounts({
    status: status || undefined,
    server_id: serverId || undefined,
    q: search || undefined,
  })

  const suspend = useAdminSuspendAccount()
  const unsuspend = useAdminUnsuspendAccount()
  const terminate = useAdminTerminateAccount()
  const sync = useAdminSyncAccount()
  const login = useAdminHostingLogin()

  const [suspending, setSuspending] = useState<AdminHostingAccount | null>(null)
  const [terminating, setTerminating] = useState<AdminHostingAccount | null>(null)

  const columns = useMemo<ColumnDef<AdminHostingAccount>[]>(
    () => [
      {
        id: "domain",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Service</span>
        ),
        accessorFn: (a) => `${a.domain} ${a.username}`,
        cell: ({ row }) => (
          <button
            type="button"
            className="flex flex-col text-left"
            onClick={() => void navigate(HOSTING_ADMIN_ROUTES.account(row.original.id))}
          >
            <span className="flex items-center gap-2 text-[14px] font-semibold text-foreground hover:underline">
              <Globe className="size-4 text-muted-foreground" />
              {row.original.domain}
            </span>
            <span className="ml-6 mt-0.5 font-mono text-[11px] text-muted-foreground">
              {row.original.username} · {row.original.server_hostname || "—"}
            </span>
          </button>
        ),
      },
      {
        id: "plan",
        header: () => <span className="text-xs font-semibold uppercase tracking-wider">Plan</span>,
        accessorFn: (a) => a.plan_sku,
        cell: ({ row }) => (
          <div className="flex flex-col text-[13px]">
            <span>{row.original.plan?.name ?? row.original.plan_sku}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {row.original.package_name || "—"}
            </span>
          </div>
        ),
      },
      {
        id: "usage",
        header: () => <span className="text-xs font-semibold uppercase tracking-wider">Usage</span>,
        accessorFn: (a) => a.disk_used_mb,
        cell: ({ row }) => <UsageCell account={row.original} />,
      },
      {
        id: "status",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Status</span>
        ),
        accessorFn: (a) => a.status,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={row.original.status} pulse={row.original.status === "PENDING"} />
            {row.original.provisioning && (
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Loader2 className="size-3 animate-spin" /> work in flight
              </span>
            )}
            {row.original.status === "SUSPENDED" && row.original.suspended_by && (
              <Badge variant="outline" className="text-[10px]">
                by {row.original.suspended_by}
              </Badge>
            )}
          </div>
        ),
      },
      actionsColumn<AdminHostingAccount>({
        ariaLabel: "Account actions",
        actions: (account) => {
          const actions = []
          if (account.capabilities.includes("sso") && account.status === "ACTIVE") {
            actions.push({
              label: "Open control panel",
              icon: ExternalLink,
              onAction: (a: AdminHostingAccount) => {
                login.mutate(a.id)
              },
            })
          }
          if (account.capabilities.includes("usage")) {
            actions.push({
              label: "Refresh usage",
              icon: RefreshCw,
              onAction: (a: AdminHostingAccount) => {
                sync.mutate({ id: a.id })
              },
            })
          }
          if (account.status === "SUSPENDED") {
            actions.push({
              label: "Unsuspend",
              icon: Play,
              onAction: (a: AdminHostingAccount) => {
                unsuspend.mutate({ id: a.id })
              },
            })
          } else if (account.status !== "TERMINATED") {
            actions.push({ label: "Suspend", icon: Ban, onAction: setSuspending })
          }
          if (account.status !== "TERMINATED") {
            actions.push({
              label: "Terminate",
              icon: Trash2,
              destructive: true,
              onAction: setTerminating,
            })
          }
          return actions
        },
      }),
    ],
    [login, navigate, sync, unsuspend],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hosting accounts"
        description="Every customer service across the fleet."
        icon={Globe}
        actions={
          <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            Refresh
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          placeholder="Search domain or username"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
          }}
        />
        <Select
          value={status || "all"}
          onValueChange={(v) => {
            setStatus(v === "all" ? "" : v)
          }}
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Any status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any status</SelectItem>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={serverId || "all"}
          onValueChange={(v) => {
            setServerId(v === "all" ? "" : v)
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue placeholder="Any provider" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Any provider</SelectItem>
            {servers.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.hostname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        data={accounts}
        columns={columns}
        loading={isLoading}
        error={isError ? "Hosting accounts could not be loaded." : undefined}
        onRetry={() => void refetch()}
        empty={
          <EmptyState
            icon={Globe}
            title="No hosting accounts"
            description="Once a customer orders hosting — or you import an existing server — their services appear here."
          />
        }
      />

      <ReasonDialog
        open={Boolean(suspending)}
        title="Suspend this account?"
        description={`${suspending?.domain} will be suspended on ${suspending?.server_hostname}. The reason is recorded in the audit trail and shown on the control panel.`}
        confirmLabel="Suspend"
        loading={suspend.isPending}
        onClose={() => {
          setSuspending(null)
        }}
        onConfirm={(reason) => {
          if (!suspending) return
          suspend.mutate(
            { id: suspending.id, reason },
            {
              onSuccess: () => {
                setSuspending(null)
              },
            },
          )
        }}
      />

      <ReasonDialog
        open={Boolean(terminating)}
        title="Terminate this account?"
        description={`${terminating?.domain} will be removed from ${terminating?.server_hostname} and its billing subscription cancelled. This cannot be undone.`}
        confirmLabel="Terminate"
        destructive
        loading={terminate.isPending}
        onClose={() => {
          setTerminating(null)
        }}
        onConfirm={(reason) => {
          if (!terminating) return
          terminate.mutate(
            { id: terminating.id, reason },
            {
              onSuccess: () => {
                setTerminating(null)
              },
            },
          )
        }}
      />
    </div>
  )
}

/** Disk and bandwidth bars. Unlimited quotas show a figure, not a full bar. */
function UsageCell({ account }: Readonly<{ account: AdminHostingAccount }>) {
  const disk = usagePct(account.disk_used_mb, account.disk_limit_mb)
  return (
    <div className="flex w-40 flex-col gap-1">
      <span className="text-[12px]">
        {formatLimitMB(account.disk_used_mb)}
        {disk !== null ? ` / ${formatLimitMB(account.disk_limit_mb)}` : " · unlimited"}
      </span>
      {disk !== null && (
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div className={`h-full ${usageBarClass(disk)}`} style={{ width: `${disk}%` }} />
        </div>
      )}
      {!account.last_sync_at && (
        <span className="text-[10px] text-muted-foreground">never synced</span>
      )}
    </div>
  )
}
