import { useMemo, useState } from "react"

import {
  actionsColumn,
  Button,
  DataTable,
  dateColumn,
  EmptyState,
  nameColumn,
  textColumn,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { Plus, RefreshCw, Trash2, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, PageHeader } from "@/components/console"
import { useScreen } from "@/services/api/screen"

import { IAM_ROUTES } from "../iam.constants"
import { useDeleteIAMGroup, useIAMGroups } from "../iam.hooks"
import type { IAMGroup } from "../iam.types"

export function GroupsListPage() {
  useScreen("iam.groups-list")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: groups = [], isLoading, isError, refetch, isFetching } = useIAMGroups()
  const { mutate: deleteGroup, isPending: isDeleting } = useDeleteIAMGroup()

  const [toDelete, setToDelete] = useState<IAMGroup | null>(null)

  const columns = useMemo<ColumnDef<IAMGroup>[]>(
    () => [
      nameColumn<IAMGroup>({ header: t("iam.columns.name"), accessor: (g) => g.name }),
      textColumn<IAMGroup>({
        id: "description",
        header: t("iam.columns.description"),
        accessor: (g) => g.description,
        muted: true,
        responsive: "md",
      }),
      textColumn<IAMGroup>({
        id: "path",
        header: t("iam.columns.path"),
        accessor: (g) => g.path,
        responsive: "lg",
      }),
      dateColumn<IAMGroup>({
        header: t("common.created"),
        accessor: (g) => g.created_at,
        responsive: "lg",
      }),
      actionsColumn<IAMGroup>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("iam.actions.deleteGroup"),
            icon: Trash2,
            destructive: true,
            onAction: (g: IAMGroup) => {
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
      <PageHeader
        icon={Users}
        breadcrumbs={[{ label: t("console.nav.groups.iam") }, { label: t("iam.groups.title") }]}
        title={t("iam.groups.title")}
        description={t("iam.groups.subtitle")}
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
            <Button className="gap-2" onClick={() => void navigate(IAM_ROUTES.GROUP_NEW)}>
              <Plus className="w-4 h-4" />
              {t("iam.groups.create")}
            </Button>
          </>
        }
      />

      <DataTable<IAMGroup>
        data={groups}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(group) => group.id}
        onRowClick={(group) => void navigate(IAM_ROUTES.groupDetail(group.id))}
        empty={
          <EmptyState
            icon={Users}
            title={t("iam.groups.empty")}
            description={t("iam.groups.emptySubtitle")}
            action={{
              label: t("iam.groups.create"),
              onClick: () => void navigate(IAM_ROUTES.GROUP_NEW),
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
        title={t("iam.groups.deleteConfirm.title")}
        description={t("iam.groups.deleteConfirm.description", {
          name: toDelete?.name ?? "",
        })}
        confirmLabel={t("iam.actions.deleteGroup")}
        loading={isDeleting}
        onConfirm={() => {
          if (!toDelete) return
          deleteGroup(toDelete.id, {
            onSuccess: () => {
              setToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}
