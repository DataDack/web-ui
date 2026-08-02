import { useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  copyColumn,
  DataTable,
  dateColumn,
  EmptyState,
  nameColumn,
  statusColumn,
  textColumn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Layers, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, PageHeader, StatGrid } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { isLbTransitional, LB_ROUTES } from "../load-balancers.constants"
import { useDeleteLoadBalancer, useLoadBalancers } from "../load-balancers.hooks"
import type { LoadBalancer } from "../load-balancers.types"

export function LoadBalancersListPage() {
  useScreen("load-balancers.load-balancers-list")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: lbs = [], isLoading, isError, refetch, isFetching } = useLoadBalancers()
  const { mutate: deleteLB, isPending: isDeleting } = useDeleteLoadBalancer()

  const [toDelete, setToDelete] = useState<LoadBalancer | null>(null)

  const stats = useMemo(
    () => [
      { label: t("loadBalancers.stats.total"), value: lbs.length, loading: isLoading },
      {
        label: t("status.active"),
        value: lbs.filter((lb) => lb.status === "active").length,
        color: "success" as const,
        loading: isLoading,
      },
      {
        // Provisioning is real work now (clone a container, boot it, push
        // config), so it is worth its own tile — a user who just hit
        // create wants to see it move.
        label: t("status.provisioning"),
        value: lbs.filter((lb) => isLbTransitional(lb.status)).length,
        color: "info" as const,
        loading: isLoading,
      },
      {
        // The backend writes "failed" (not "error") with the reason.
        label: t("status.failed"),
        value: lbs.filter((lb) => lb.status === "failed").length,
        color: "danger" as const,
        loading: isLoading,
      },
    ],
    [lbs, isLoading, t],
  )

  const columns = useMemo<ColumnDef<LoadBalancer>[]>(
    () => [
      copyColumn<LoadBalancer>({
        id: "id",
        header: "ID",
        accessor: (l) => `LB-${String(l.tenant_serial)}`,
        responsive: "lg",
      }),
      nameColumn<LoadBalancer>({
        header: t("loadBalancers.columns.name"),
        accessor: (lb) => lb.name,
      }),
      statusColumn<LoadBalancer>({
        header: t("loadBalancers.columns.status"),
        accessor: (lb) => lb.status,
        pulse: (lb) => lb.status === "active",
      }),
      textColumn<LoadBalancer>({
        id: "type",
        header: t("loadBalancers.columns.type"),
        accessor: (lb) => t(`loadBalancers.types.${lb.type}`),
        responsive: "md",
      }),
      // The DNS name is the thing a user actually points their app at, and
      // the console never showed it.
      copyColumn<LoadBalancer>({
        id: "dns",
        header: t("loadBalancers.columns.dnsName"),
        accessor: (lb) => lb.dns_name || "—",
        responsive: "xl",
      }),
      dateColumn<LoadBalancer>({
        header: t("common.created"),
        accessor: (lb) => lb.created_at,
        responsive: "xl",
      }),
      actionsColumn<LoadBalancer>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("loadBalancers.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (lb: LoadBalancer) => {
              setToDelete(lb)
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
        icon={Layers}
        breadcrumbs={[
          { label: t("console.nav.groups.compute") },
          { label: t("loadBalancers.title") },
        ]}
        title={t("loadBalancers.title")}
        description={t("loadBalancers.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void refetch()}
              disabled={isFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </Button>
            <Button className="gap-2" onClick={() => void navigate(LB_ROUTES.CREATE)}>
              <Plus className="w-4 h-4" />
              {t("loadBalancers.create")}
            </Button>
          </>
        }
      />

      <StatGrid stats={stats} />

      <DataTable<LoadBalancer>
        data={lbs}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(lb) => lb.id}
        onRowClick={(lb) => void navigate(LB_ROUTES.detail(lb.id))}
        empty={
          <EmptyState
            icon={Layers}
            title={t("loadBalancers.empty")}
            description={t("loadBalancers.emptySubtitle")}
            action={{
              label: t("loadBalancers.create"),
              onClick: () => void navigate(LB_ROUTES.CREATE),
            }}
          />
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
        refreshing={isFetching}
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("loadBalancers.deleteConfirm.title")}
        description={t("loadBalancers.deleteConfirm.description", {
          name: toDelete?.name ?? "",
        })}
        confirmLabel={t("loadBalancers.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (!toDelete) return
          deleteLB(toDelete.id, {
            onSuccess: () => {
              setToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}
