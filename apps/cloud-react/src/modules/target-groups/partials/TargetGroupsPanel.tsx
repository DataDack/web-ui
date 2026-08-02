import { useMemo, useState } from "react"

import { Button } from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Crosshair, Plus, RefreshCw, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  actionsColumn,
  ConfirmDialog,
  copyColumn,
  dateColumn,
  EmptyState,
  nameColumn,
  ResourceTable,
  StatGrid,
  textColumn,
} from "@/components/console"

import { TG_ROUTES } from "../target-groups.constants"
import { useDeleteTargetGroup, useTargetGroups } from "../target-groups.hooks"
import type { TargetGroup } from "../target-groups.types"

/**
 * Target-group list body: stats, a create/refresh toolbar, the table and its
 * delete dialog — everything except a page title. It is rendered both by the
 * standalone TargetGroupsListPage and as the "Target Groups" tab on the load
 * balancer detail page, so the two stay in lockstep.
 */
export function TargetGroupsPanel() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: groups = [], isLoading, isError, refetch, isFetching } = useTargetGroups()
  const { mutate: remove, isPending: isDeleting } = useDeleteTargetGroup()

  const [toDelete, setToDelete] = useState<TargetGroup | null>(null)

  const stats = useMemo(
    () => [
      { label: t("targetGroups.stats.total"), value: groups.length, loading: isLoading },
      {
        label: t("targetGroups.stats.http"),
        value: groups.filter((g) => g.protocol === "HTTP").length,
        loading: isLoading,
      },
      {
        label: t("targetGroups.stats.tcp"),
        value: groups.filter((g) => g.protocol !== "HTTP").length,
        loading: isLoading,
      },
    ],
    [groups, isLoading, t],
  )

  const columns = useMemo<ColumnDef<TargetGroup>[]>(
    () => [
      copyColumn<TargetGroup>({
        id: "id",
        header: "ID",
        accessor: (g) => `TG-${String(g.tenant_serial)}`,
        responsive: "lg",
      }),
      nameColumn<TargetGroup>({
        header: t("targetGroups.columns.name"),
        accessor: (g) => g.name,
      }),
      textColumn<TargetGroup>({
        id: "protocol",
        header: t("targetGroups.columns.protocol"),
        accessor: (g) => `${g.protocol}:${String(g.port)}`,
      }),
      textColumn<TargetGroup>({
        id: "algorithm",
        header: t("targetGroups.columns.algorithm"),
        accessor: (g) => t(`targetGroups.algorithms.${g.algorithm}`),
        responsive: "md",
      }),
      textColumn<TargetGroup>({
        id: "healthCheck",
        header: t("targetGroups.columns.healthCheck"),
        accessor: (g) =>
          g.protocol === "HTTP"
            ? `${g.health_check_path} · ${String(g.health_check_interval_s)}s`
            : `TCP · ${String(g.health_check_interval_s)}s`,
        responsive: "xl",
      }),
      dateColumn<TargetGroup>({
        header: t("common.created"),
        accessor: (g) => g.created_at,
        responsive: "xl",
      }),
      actionsColumn<TargetGroup>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("targetGroups.actions.delete"),
            icon: Trash2,
            destructive: true,
            onAction: (g: TargetGroup) => {
              setToDelete(g)
            },
          },
        ],
      }),
    ],
    [t],
  )

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-end gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => void refetch()}
          disabled={isFetching}
          aria-label={t("common.refresh")}
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
        </Button>
        <Button className="gap-2" onClick={() => void navigate(TG_ROUTES.CREATE)}>
          <Plus className="w-4 h-4" />
          {t("targetGroups.actions.create")}
        </Button>
      </div>

      <StatGrid stats={stats} />

      <ResourceTable<TargetGroup>
        data={groups}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(g) => g.id}
        onRowClick={(g) => void navigate(TG_ROUTES.detail(g.id))}
        emptyState={
          <EmptyState
            icon={Crosshair}
            title={t("targetGroups.empty")}
            description={t("targetGroups.emptySubtitle")}
            action={{
              label: t("targetGroups.actions.create"),
              onClick: () => void navigate(TG_ROUTES.CREATE),
            }}
          />
        }
      />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("targetGroups.deleteConfirm.title")}
        // A group a listener still points at cannot be deleted — the
        // backend returns 409, because removing it would leave that
        // listener routing to nothing.
        description={t("targetGroups.deleteConfirm.description", {
          name: toDelete?.name ?? "",
        })}
        confirmLabel={t("targetGroups.actions.delete")}
        loading={isDeleting}
        onConfirm={() => {
          if (!toDelete) return
          remove(toDelete.id, {
            onSuccess: () => {
              setToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}
