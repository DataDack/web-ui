import { useMemo } from "react"

import {
  DataTable,
  dateColumn,
  EmptyState,
  nameColumn,
  textColumn,
  type DataTableColumnMeta,
} from "@datadack/common-ui"
import type { ColumnDef } from "@tanstack/react-table"
import { UserRoundX } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import type { TabProps, UserRow } from "./types"
import { ActiveBadge } from "../../components/ActiveBadge"
import { KycActions, KycBadge } from "../../components/KycCell"
import { useAdminPlatformOverview } from "../../superadmin.hooks"

/**
 * Users attached to no organization — signups that stopped partway through
 * onboarding, or members whose org was removed.
 *
 * The API has always exposed this as a section; nothing surfaced it, so these
 * users were invisible unless someone read the raw response. They matter because
 * they are the population most likely to be stuck: an account that never
 * finished onboarding is exactly the case an operator resolves by hand, which is
 * why the KYC override lives on this tab too.
 */
export function OrphanUsersTab({ q, page, pageSize, onPageChange }: Readonly<TabProps>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useAdminPlatformOverview(
    "orphan_users",
    q,
    page,
    pageSize,
  )

  const users = useMemo<UserRow[]>(
    () => (data?.orphan_users ?? []).map((u) => ({ ...u, orgName: null })),
    [data],
  )

  const columns = useMemo<ColumnDef<UserRow>[]>(
    () => [
      nameColumn<UserRow>({
        header: t("superAdmin.organizations.fields.name"),
        accessor: (u) => u.name,
      }),
      textColumn<UserRow>({
        id: "email",
        header: t("superAdmin.organizations.fields.email"),
        accessor: (u) => u.email,
        muted: true,
      }),
      textColumn<UserRow>({
        id: "phone",
        header: t("superAdmin.organizations.fields.mobile"),
        accessor: (u) => u.phone || "—",
        muted: true,
      }),
      // How far they got before stopping — the reason to look at this list.
      textColumn<UserRow>({
        id: "onboarding",
        header: t("superAdmin.kyc.onboardingStatus"),
        accessor: (u) => u.onboarding_status,
        mono: true,
      }),
      {
        id: "status",
        header: () => t("superAdmin.organizations.fields.userStatus"),
        enableSorting: false,
        cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
      },
      {
        id: "kyc",
        header: () => t("superAdmin.kyc.column"),
        accessorFn: (u) => `${String(u.need_actions)}-${String(u.kyc_completed)}`,
        cell: ({ row }) => <KycBadge user={row.original} />,
      },
      dateColumn<UserRow>({
        header: t("superAdmin.organizations.fields.created"),
        accessor: (u) => u.created_at,
        responsive: "lg",
      }),
      {
        id: "kycActions",
        header: () => null,
        enableSorting: false,
        enableHiding: false,
        meta: { interactive: true } satisfies DataTableColumnMeta,
        cell: ({ row }) => (
          <div className="text-right">
            <KycActions user={row.original} />
          </div>
        ),
      },
    ],
    [t],
  )

  return (
    <DataTable<UserRow>
      data={users}
      columns={columns}
      pagination={{
        page,
        pageSize: data?.pagination?.limit ?? pageSize,
        total: data?.pagination?.total ?? users.length,
        onPageChange,
      }}
      loading={isLoading}
      error={isError ? t("console.table.error") : undefined}
      onRetry={() => void refetch()}
      retryLabel={t("console.table.retry")}
      getRowId={(u) => u.id}
      onRowClick={(u) => void navigate(`/admin/users/${u.id}`)}
      empty={
        <EmptyState
          icon={UserRoundX}
          title={t("superAdmin.organizations.empty.orphanUsers")}
          description={t("superAdmin.organizations.empty.orphanUsersHint")}
        />
      }
      onRefresh={() => void refetch()}
      refreshLabel={t("console.table.refresh")}
    />
  )
}
