import { useCallback, useMemo, useState } from "react"

import {
  actionsColumn,
  Badge,
  Button,
  DataTable,
  EmptyState,
  StatusBadge,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { AlertTriangle, Pencil, Plus, PlugZap, Server, ShieldAlert, Trash2 } from "lucide-react"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { ConfirmDialog, PageHeader } from "@/components/console"

import { HOSTING_ADMIN_ROUTES } from "../hosting.constants"
import { useDeleteHostingServer, useHostingServers, useTestHostingServer } from "../hosting.hooks"
import type { HostingServer } from "../hosting.types"
import { usageBarClass } from "../hosting.utils"

/**
 * The WHM/cPanel fleet.
 *
 * The grid answers one question first — will an order land here — and the
 * `allocatable` flag is computed server-side so the badge and the allocator can
 * never disagree about it.
 */
export function HostingServersPage() {
  const navigate = useNavigate()
  const { data: servers = [], isLoading, isError, refetch, isFetching } = useHostingServers()
  const test = useTestHostingServer()
  const remove = useDeleteHostingServer()

  const [deleting, setDeleting] = useState<HostingServer | null>(null)

  const runTest = useCallback(
    (server: HostingServer) => {
      test.mutate(server.id, {
        onSuccess: (result) => {
          // A refusing server is an ANSWER, not a failure — the operator asked
          // whether the box responds, and "no, here is why" is what they need.
          if (!result.ok) {
            toast.error(`${server.hostname}: ${result.message}`)
            return
          }
          const details = [
            result.version === "" ? null : `WHM ${result.version}`,
            result.accounts === 0 ? null : `${result.accounts} accounts`,
          ].filter(Boolean)
          toast.success(
            details.length > 0
              ? `${server.hostname} answered — ${details.join(" · ")}`
              : `${server.hostname} answered`,
          )
        },
      })
    },
    [test],
  )

  const columns = useMemo<ColumnDef<HostingServer>[]>(
    () => [
      {
        id: "name",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Server</span>
        ),
        accessorFn: (s) => `${s.name} ${s.hostname}`,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="flex items-center gap-2 text-[14px] font-semibold leading-tight text-foreground">
              <Server className="size-4 text-muted-foreground" />
              {row.original.name}
            </span>
            <span className="ml-6 mt-0.5 font-mono text-[11px] text-muted-foreground">
              {row.original.hostname}
              {row.original.ip_address ? ` · ${row.original.ip_address}` : ""}
            </span>
          </div>
        ),
      },
      {
        id: "module",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Module</span>
        ),
        accessorFn: (s) => s.module_key,
        cell: ({ row }) => (
          <div className="flex flex-col gap-1">
            <span className="text-[13px] font-medium">{row.original.module_key}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              :{row.original.port} {row.original.secure ? "SSL" : "plain"}
            </span>
          </div>
        ),
      },
      {
        id: "group",
        header: () => <span className="text-xs font-semibold uppercase tracking-wider">Group</span>,
        accessorFn: (s) => s.group_name || "—",
        cell: ({ row }) => (
          <span className="text-[13px]">{row.original.group_name || "Ungrouped"}</span>
        ),
      },
      {
        id: "load",
        header: () => <span className="text-xs font-semibold uppercase tracking-wider">Load</span>,
        accessorFn: (s) => s.live_accounts,
        cell: ({ row }) => <LoadBar server={row.original} />,
      },
      {
        id: "status",
        header: () => (
          <span className="text-xs font-semibold uppercase tracking-wider">Status</span>
        ),
        accessorFn: (s) => s.status,
        cell: ({ row }) => (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge status={row.original.status} />
            {row.original.disabled && (
              <Badge variant="outline" className="text-[10px]">
                Disabled
              </Badge>
            )}
            {/* An operator who turned SSL off deserves to keep seeing that they
                did — it is invisible everywhere else. */}
            {row.original.tls_insecure && (
              <span className="flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400">
                <ShieldAlert className="size-3" /> TLS not verified
              </span>
            )}
            {row.original.probe_error && (
              <span
                className="flex max-w-[220px] items-center gap-1 truncate text-[10px] text-destructive"
                title={row.original.probe_error}
              >
                <AlertTriangle className="size-3 shrink-0" />
                {row.original.probe_error}
              </span>
            )}
          </div>
        ),
      },
      actionsColumn<HostingServer>({
        ariaLabel: "Server actions",
        actions: (server) => [
          { label: "Test connection", icon: PlugZap, onAction: runTest },
          {
            label: "Edit",
            icon: Pencil,
            onAction: (s) => void navigate(HOSTING_ADMIN_ROUTES.serverEdit(s.id)),
          },
          {
            label: "Remove",
            icon: Trash2,
            destructive: true,
            onAction: () => {
              setDeleting(server)
            },
          },
        ],
      }),
    ],
    [navigate, runTest],
  )

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hosting servers"
        description="The WHM/cPanel boxes accounts are provisioned onto."
        icon={Server}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              Refresh
            </Button>
            <Button
              onClick={() => void navigate(HOSTING_ADMIN_ROUTES.serverGroups)}
              variant="outline"
            >
              Server groups
            </Button>
            <Button onClick={() => void navigate(HOSTING_ADMIN_ROUTES.serverNew)}>
              <Plus className="size-4" /> Add server
            </Button>
          </div>
        }
      />

      <DataTable
        data={servers}
        columns={columns}
        loading={isLoading}
        error={isError ? "The server fleet could not be loaded." : undefined}
        onRetry={() => void refetch()}
        searchable
        searchPlaceholder="Search by name, hostname or IP"
        empty={
          <EmptyState
            icon={Server}
            title="No hosting servers yet"
            description="Add your WHM server to start provisioning cPanel accounts from this panel."
            action={{
              label: "Add server",
              onClick: () => void navigate(HOSTING_ADMIN_ROUTES.serverNew),
            }}
          />
        }
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
        title="Remove this server?"
        description={
          <>
            <p>
              <strong>{deleting?.hostname}</strong> will be removed from the fleet. Nothing on the
              box itself is touched.
            </p>
            <p className="mt-2 text-muted-foreground">
              This is refused while any hosting account still points at it.
            </p>
          </>
        }
        confirmText={deleting?.hostname}
        confirmLabel="Remove server"
        loading={remove.isPending}
        onConfirm={() => {
          if (!deleting) return
          remove.mutate(deleting.id, {
            onSuccess: () => {
              setDeleting(null)
            },
          })
        }}
      />
    </div>
  )
}

/** Capacity at a glance. A server with no ceiling shows a count, not a bar. */
function LoadBar({ server }: Readonly<{ server: HostingServer }>) {
  if (server.usage_pct < 0) {
    return (
      <div className="flex flex-col gap-1">
        <span className="text-[13px] font-medium">{server.live_accounts}</span>
        <span className="text-[10px] text-muted-foreground">No limit set</span>
      </div>
    )
  }
  const pct = Math.min(100, Math.round(server.usage_pct))
  return (
    <div className="flex w-36 flex-col gap-1">
      <span className="text-[13px] font-medium">
        {server.live_accounts} / {server.max_accounts}
      </span>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${usageBarClass(pct)}`} style={{ width: `${pct}%` }} />
      </div>
      {!server.allocatable && (
        <span className="text-[10px] text-muted-foreground">Not taking new accounts</span>
      )}
    </div>
  )
}
