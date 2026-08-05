import { useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  DataTable,
  dateColumn,
  EmptyState,
  Input,
  nameColumn,
  statusColumn,
  textColumn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Cable, RefreshCw, Search, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, PageHeader, StatGrid } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { useDeleteVPNConnection, useVPNConnections } from "../vpc.hooks"
import type { VPNConnection } from "../vpc.types"

/* ── Page ──────────────────────────────────────────────────────────────── */

export function VpnPage() {
  useScreen("vpc.vpn")
  const { t } = useTranslation()
  const { data: connections = [], isLoading, isError, refetch, isFetching } = useVPNConnections()
  const { mutate: deleteConnection, isPending: isDeleting } = useDeleteVPNConnection()

  const [query, setQuery] = useState("")
  const [toDelete, setToDelete] = useState<VPNConnection | null>(null)

  const filtered = useMemo(() => {
    if (!query.trim()) return connections
    const q = query.toLowerCase()
    return connections.filter((c) => c.name.toLowerCase().includes(q))
  }, [connections, query])

  const stats = useMemo(
    () => [
      { label: t("vpn.stats.total"), value: connections.length, loading: isLoading },
      {
        label: t("vpn.stats.connected"),
        value: connections.filter((c) => c.status === "connected" || c.status === "available")
          .length,
        color: "info" as const,
        loading: isLoading,
      },
    ],
    [t, connections, isLoading],
  )

  const columns = useMemo<ColumnDef<VPNConnection>[]>(
    () => [
      nameColumn<VPNConnection>({ header: t("vpn.columns.name"), accessor: (c) => c.name }),
      statusColumn<VPNConnection>({
        header: t("vpn.columns.status"),
        accessor: (c) => c.status,
        pulse: (c) => c.status === "pending",
      }),
      textColumn<VPNConnection>({
        id: "routing_type",
        header: t("vpn.columns.type"),
        accessor: (c) => c.routing_type.toUpperCase(),
        mono: true,
        responsive: "md",
      }),
      // The customer gateway's public IP isn't available from the connection
      // list response (only its id is), so the peer column identifies the
      // gateway by id rather than address — the backend doesn't expose the
      // join needed to resolve it here.
      textColumn<VPNConnection>({
        id: "peer",
        header: t("vpn.columns.peer"),
        accessor: (c) => c.customer_gateway_id,
        mono: true,
        muted: true,
        responsive: "lg",
      }),
      dateColumn<VPNConnection>({
        header: t("common.created"),
        accessor: (c) => c.created_at,
        responsive: "lg",
      }),
      actionsColumn<VPNConnection>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("vpn.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (row) => {
              setToDelete(row)
            },
          },
        ],
      }),
    ],
    [t],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Cable}
        breadcrumbs={[{ label: t("console.nav.groups.networking") }, { label: t("vpn.title") }]}
        title={t("vpn.title")}
        description={t("vpn.subtitle")}
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

      <StatGrid stats={stats} className="grid-cols-2" />

      <DataTable<VPNConnection>
        data={filtered}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(c) => c.id}
        columnToolbar
        toolbar={
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
              }}
              placeholder={t("vpn.searchPlaceholder")}
              className="pl-8 h-8 text-[13px]"
            />
          </div>
        }
        empty={
          <EmptyState icon={Cable} title={t("vpn.empty")} description={t("vpn.emptySubtitle")} />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <ConfirmDialog
        open={toDelete !== null}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("vpn.deleteConfirm.title")}
        description={t("vpn.deleteConfirm.description", { name: toDelete?.name ?? "" })}
        confirmLabel={t("vpn.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (toDelete) {
            deleteConnection(toDelete.id, {
              onSuccess: () => {
                setToDelete(null)
              },
            })
          }
        }}
      />
    </div>
  )
}
