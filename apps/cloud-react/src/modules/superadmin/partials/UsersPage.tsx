import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Plus, RefreshCw, Search, ShieldCheck, ShieldOff, Users } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  actionsColumn,
  ConfirmDialog,
  dateColumn,
  EmptyState,
  nameColumn,
  PageHeader,
  ResourceTable,
  textColumn,
  type RowAction,
} from "@/components/console"
import { Button, Input } from "@datadack/common-ui"
import { cn } from "@/lib/utils"
import { useAuth } from "@/modules/auth/auth.context"
import { useScreen } from "@/services/api/screen"

import { ActiveBadge } from "../components/ActiveBadge"
import { AddSuperAdminDialog } from "../components/AddSuperAdminDialog"
import { useAdminUsers, useSetSuperAdmin } from "../superadmin.hooks"
import type { AdminUser } from "../superadmin.types"

// Compact pill marking platform super admins in the table.
function SuperAdminBadge({ value }: Readonly<{ value: boolean }>) {
  const { t } = useTranslation()
  if (!value) return <span className="text-[12px] text-muted-foreground">—</span>
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/10 px-2 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
      <ShieldCheck className="size-3" />
      {t("superAdmin.users.badge")}
    </span>
  )
}

interface ActionHelpers {
  t: (key: string) => string
  selfId: string
  onToggle: (user: AdminUser) => void
}

// Row action: revoke super admin (hidden for the caller's own row, since a super
// admin may never revoke their own access — the backend rejects it too). The
// table only lists super admins, so grant happens via the Add dialog instead.
function buildUserActions(user: AdminUser, h: ActionHelpers): RowAction<AdminUser>[] {
  if (user.id === h.selfId) return []
  return [
    {
      label: h.t("superAdmin.users.actions.revoke"),
      icon: ShieldOff,
      destructive: true,
      onAction: h.onToggle,
    },
  ]
}

export function UsersPage() {
  useScreen("superadmin.users")
  const { t } = useTranslation()
  const { user: self } = useAuth()
  const { data: users = [], isLoading, isError, refetch, isFetching } = useAdminUsers()
  const { mutate: setSuperAdmin, isPending } = useSetSuperAdmin()

  const [search, setSearch] = useState("")
  const [target, setTarget] = useState<AdminUser | null>(null)
  const [addOpen, setAddOpen] = useState(false)

  // Only super admins are listed; the page manages control-plane access, not
  // the full user directory. A local search narrows the visible admins.
  const filtered = useMemo(() => {
    const admins = users.filter((u) => u.is_super_admin)
    const q = search.trim().toLowerCase()
    if (!q) return admins
    return admins.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [users, search])

  const columns = useMemo<ColumnDef<AdminUser>[]>(() => {
    const helpers: ActionHelpers = {
      t,
      selfId: self?.id ?? "",
      onToggle: (u) => {
        setTarget(u)
      },
    }
    return [
      nameColumn<AdminUser>({
        header: t("superAdmin.users.fields.name"),
        accessor: (u) => u.name,
      }),
      textColumn<AdminUser>({
        id: "email",
        header: t("superAdmin.users.fields.email"),
        accessor: (u) => u.email,
        muted: true,
      }),
      textColumn<AdminUser>({
        id: "phone",
        header: t("superAdmin.users.fields.mobile"),
        accessor: (u) => u.phone || "—",
        muted: true,
      }),
      {
        id: "super_admin",
        header: () => t("superAdmin.users.fields.superAdmin"),
        enableSorting: false,
        cell: ({ row }) => <SuperAdminBadge value={row.original.is_super_admin} />,
      },
      {
        id: "active",
        header: () => t("superAdmin.users.fields.status"),
        enableSorting: false,
        cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
      },
      dateColumn<AdminUser>({
        header: t("superAdmin.users.fields.created"),
        accessor: (u) => u.created_at,
        responsive: "lg",
      }),
      actionsColumn<AdminUser>({
        ariaLabel: t("console.table.actions"),
        actions: (u) => buildUserActions(u, helpers),
      }),
    ]
  }, [t, self?.id])

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        breadcrumbs={[{ label: t("superAdmin.title") }, { label: t("superAdmin.users.title") }]}
        title={t("superAdmin.users.title")}
        description={t("superAdmin.users.subtitle")}
        actions={
          <>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                }}
                placeholder={t("superAdmin.users.searchPlaceholder")}
                className={cn("h-9 w-48 pl-8 sm:w-64")}
              />
            </div>
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
              variant="gold"
              onClick={() => {
                setAddOpen(true)
              }}
            >
              <Plus className="size-4" />
              {t("superAdmin.users.add")}
            </Button>
          </>
        }
      />

      <ResourceTable<AdminUser>
        data={filtered}
        columns={columns}
        isLoading={isLoading}
        isError={isError}
        onRetry={() => void refetch()}
        getRowId={(u) => u.id}
        emptyState={
          <EmptyState
            icon={Users}
            title={t("superAdmin.users.empty")}
            description={t("superAdmin.users.emptySubtitle")}
          />
        }
      />

      <ConfirmDialog
        open={!!target}
        onOpenChange={(open) => {
          if (!open) setTarget(null)
        }}
        title={t("superAdmin.users.revokeTitle")}
        description={t("superAdmin.users.revokeConfirm", {
          name: target?.name ?? "",
        })}
        confirmLabel={t("superAdmin.users.actions.revoke")}
        destructive
        loading={isPending}
        onConfirm={() => {
          if (!target) return
          setSuperAdmin(
            { id: target.id, isSuperAdmin: false },
            {
              onSuccess: () => {
                setTarget(null)
              },
            },
          )
        }}
      />

      <AddSuperAdminDialog open={addOpen} onOpenChange={setAddOpen} />
    </div>
  )
}
