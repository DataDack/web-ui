import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Plus, RefreshCw, Trash2, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { ConfirmDialog, PageHeader } from "@/components/console"
import { useActiveScope } from "@/services/api/active-scope"
import { useScreen } from "@/services/api/screen"

import {
  actionsColumn,
  Button,
  DataTable,
  dateColumn,
  EmptyState,
  nameColumn,
  textColumn,
} from "@datadack/common-ui"

import { IAM_ROUTES } from "../iam.constants"
import { useDeleteIAMRole, useIAMRoles } from "../iam.hooks"
import type { IAMRole } from "../iam.types"
import { CreateRoleSheet } from "./CreateRoleSheet"

export function RolesListPage() {
  useScreen("iam.roles-list")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { accountId } = useActiveScope()
  const [createOpen, setCreateOpen] = useState(false)
  const { data: roles = [], isLoading, isError, refetch, isFetching } = useIAMRoles()
  const { mutate: deleteRole, isPending: isDeleting } = useDeleteIAMRole()

  const [toDelete, setToDelete] = useState<IAMRole | null>(null)

  const columns = useMemo<ColumnDef<IAMRole>[]>(
    () => [
      nameColumn<IAMRole>({ header: t("iam.columns.name"), accessor: (g) => g.name }),
      textColumn<IAMRole>({
        id: "description",
        header: t("iam.columns.description"),
        accessor: (g) => g.description,
        muted: true,
        responsive: "md",
      }),
      dateColumn<IAMRole>({
        header: t("common.created"),
        accessor: (g) => g.created_at,
        responsive: "lg",
      }),
      actionsColumn<IAMRole>({
        ariaLabel: t("console.table.actions"),
        actions: (role) =>
          role.is_system || role.account_id !== accountId
            ? []
            : [
                {
                  label: t("iam.actions.deleteRole"),
                  icon: Trash2,
                  destructive: true,
                  onAction: (g: IAMRole) => {
                    setToDelete(g)
                  },
                },
              ],
      }),
    ],
    [t, accountId],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={ShieldCheck}
        breadcrumbs={[{ label: t("console.nav.groups.iam") }, { label: t("iam.roles.title") }]}
        title={t("iam.roles.title")}
        description={t("iam.roles.subtitle")}
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
            <Button
              className="gap-2"
              onClick={() => {
                setCreateOpen(true)
              }}
            >
              <Plus className="w-4 h-4" />
              {t("iam.roles.create")}
            </Button>
          </>
        }
      />

      <DataTable<IAMRole>
        data={roles}
        columns={columns}
        loading={isLoading}
        error={isError ? t("console.table.error") : undefined}
        onRetry={() => void refetch()}
        retryLabel={t("console.table.retry")}
        getRowId={(role) => role.id}
        onRowClick={(role) => void navigate(IAM_ROUTES.roleDetail(role.id))}
        empty={
          <EmptyState
            icon={ShieldCheck}
            title={t("iam.roles.empty")}
            description={t("iam.roles.emptySubtitle")}
            action={{
              label: t("iam.roles.create"),
              onClick: () => {
                setCreateOpen(true)
              },
            }}
          />
        }
      />

      <CreateRoleSheet open={createOpen} onOpenChange={setCreateOpen} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("iam.roles.deleteConfirm.title")}
        description={t("iam.roles.deleteConfirm.description", {
          name: toDelete?.name ?? "",
        })}
        confirmLabel={t("iam.actions.deleteRole")}
        loading={isDeleting}
        onConfirm={() => {
          if (!toDelete) return
          deleteRole(toDelete.id, {
            onSuccess: () => {
              setToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}
