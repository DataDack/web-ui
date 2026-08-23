import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Building2, UserRoundX } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  DataTable,
  dateColumn,
  EmptyState,
  nameColumn,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  textColumn,
  type DataTableColumnMeta,
} from "@datadack/common-ui"

import { AccessChips } from "./AccessChips"
import type { TabProps, UserRow } from "./types"
import { ActiveBadge } from "../../components/ActiveBadge"
import { KycActions, KycBadge } from "../../components/KycCell"
import { useAdminPlatformOverview } from "../../superadmin.hooks"

/**
 * Users tab. Fetches ?section=users — the FLAT user list rather than
 * organizations[].users + orphan_users: under a search the organizations list is
 * narrowed, which would drop matching users whose org didn't match.
 */
type UsersTabProps = TabProps & {
  withoutOrganization: boolean
  onWithoutOrganizationChange: (withoutOrganization: boolean) => void
}

export function UsersTab({
  q,
  page,
  pageSize,
  onPageChange,
  withoutOrganization,
  onWithoutOrganizationChange,
}: Readonly<UsersTabProps>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const section = withoutOrganization ? "orphan_users" : "users"
  const { data, isLoading, isError, refetch } = useAdminPlatformOverview(section, q, page, pageSize)

  const users = useMemo<UserRow[]>(() => {
    const rows = withoutOrganization ? (data?.orphan_users ?? []) : (data?.users ?? [])
    return rows.map((u) => ({ ...u, orgName: u.org_name || null }))
  }, [data, withoutOrganization])

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
      ...(withoutOrganization
        ? [
            textColumn<UserRow>({
              id: "onboarding",
              header: t("superAdmin.kyc.onboardingStatus"),
              accessor: (u) => u.onboarding_status,
              mono: true,
            }),
          ]
        : [
            textColumn<UserRow>({
              id: "org",
              header: t("superAdmin.organizations.fields.organization"),
              accessor: (u) => u.orgName ?? "—",
              muted: true,
            }),
            textColumn<UserRow>({
              id: "role",
              header: t("superAdmin.organizations.fields.role"),
              accessor: (u) => u.role,
            }),
          ]),
      {
        id: "access",
        header: () => t("superAdmin.organizations.fields.access"),
        enableSorting: false,
        cell: ({ row }) => <AccessChips user={row.original} />,
      },
      {
        id: "status",
        header: () => t("superAdmin.organizations.fields.userStatus"),
        enableSorting: false,
        cell: ({ row }) => <ActiveBadge active={row.original.is_active} />,
      },
      {
        id: "kyc",
        header: () => t("superAdmin.kyc.column"),
        // Sorted by the flag pair so unverified and re-verifying users group
        // together — the ones an operator is looking for.
        accessorFn: (u) => `${String(u.need_actions)}-${String(u.kyc_completed)}`,
        cell: ({ row }) => <KycBadge user={row.original} />,
      },
      {
        id: "kycActions",
        header: () => null,
        enableSorting: false,
        enableHiding: false,
        // Holds the override menu, so a click here must not open the profile.
        meta: { interactive: true } satisfies DataTableColumnMeta,
        cell: ({ row }) => (
          <div className="text-right">
            <KycActions user={row.original} />
          </div>
        ),
      },
      dateColumn<UserRow>({
        header: t("superAdmin.organizations.fields.created"),
        accessor: (u) => u.created_at,
        responsive: "lg",
      }),
    ],
    [t, withoutOrganization],
  )

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Select
          value={withoutOrganization ? "without" : "all"}
          onValueChange={(value) => {
            onWithoutOrganizationChange(value === "without")
          }}
        >
          <SelectTrigger
            size="sm"
            className="w-56"
            aria-label={t("superAdmin.organizations.filters.organization")}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("superAdmin.organizations.filters.allUsers")}</SelectItem>
            <SelectItem value="without">
              {t("superAdmin.organizations.tabs.orphan_users")}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

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
        // Every user row opens that user's admin profile — the same page the
        // Accounts tab's owner link goes to.
        onRowClick={(u) => void navigate(`/admin/users/${u.id}`)}
        empty={
          withoutOrganization ? (
            <EmptyState
              icon={UserRoundX}
              title={t("superAdmin.organizations.empty.orphanUsers")}
              description={t("superAdmin.organizations.empty.orphanUsersHint")}
            />
          ) : (
            <EmptyState icon={Building2} title={t("superAdmin.organizations.empty.users")} />
          )
        }
        onRefresh={() => void refetch()}
        refreshLabel={t("console.table.refresh")}
      />
    </div>
  )
}
