import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Building2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import {
  DataTable,
  dateColumn,
  EmptyState,
  nameColumn,
  statusColumn,
  textColumn,
} from "@datadack/common-ui"
import type { TabProps } from "./types"
import { useAdminPlatformOverview } from "../../superadmin.hooks"
import type { OverviewOrg } from "../../superadmin.types"

/**
 * Organizations tab. Fetches ?section=organizations, so it pulls org rows only —
 * the nested accounts/users each org owns stay on the server; this table shows
 * their counts.
 */
export function OrganizationsTab({ q, page, pageSize, onPageChange }: Readonly<TabProps>) {
  const { t } = useTranslation()
  const { data, isLoading, isError, refetch } = useAdminPlatformOverview(
    "organizations",
    q,
    page,
    pageSize,
  )
  const organizations = useMemo<OverviewOrg[]>(() => data?.organizations ?? [], [data])

  const columns = useMemo<ColumnDef<OverviewOrg>[]>(
    () => [
      nameColumn<OverviewOrg>({
        header: t("superAdmin.organizations.fields.name"),
        accessor: (o) => o.name,
      }),
      textColumn<OverviewOrg>({
        id: "slug",
        header: t("superAdmin.organizations.fields.slug"),
        accessor: (o) => o.slug,
        mono: true,
        muted: true,
      }),
      textColumn<OverviewOrg>({
        id: "email",
        header: t("superAdmin.organizations.fields.billingEmail"),
        accessor: (o) => o.billing_email,
        muted: true,
        responsive: "lg",
      }),
      statusColumn<OverviewOrg>({
        header: t("superAdmin.organizations.fields.status"),
        accessor: (o) => o.status,
      }),
      textColumn<OverviewOrg>({
        id: "accounts",
        header: t("superAdmin.organizations.fields.accounts"),
        accessor: (o) => o.account_count,
      }),
      textColumn<OverviewOrg>({
        id: "users",
        header: t("superAdmin.organizations.fields.users"),
        accessor: (o) => o.user_count,
      }),
      dateColumn<OverviewOrg>({
        header: t("superAdmin.organizations.fields.created"),
        accessor: (o) => o.created_at,
        responsive: "lg",
      }),
    ],
    [t],
  )

  return (
    <DataTable<OverviewOrg>
      data={organizations}
      columns={columns}
      pagination={{
        page,
        pageSize: data?.pagination?.limit ?? pageSize,
        total: data?.pagination?.total ?? organizations.length,
        onPageChange,
      }}
      loading={isLoading}
      error={isError ? t("console.table.error") : undefined}
      onRetry={() => void refetch()}
      retryLabel={t("console.table.retry")}
      getRowId={(o) => o.id}
      empty={
        <EmptyState icon={Building2} title={t("superAdmin.organizations.empty.organizations")} />
      }
      onRefresh={() => void refetch()}
      refreshLabel={t("console.table.refresh")}
    />
  )
}
