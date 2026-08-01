import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Building2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import {
  dateColumn,
  EmptyState,
  ResourceTable,
  statusColumn,
  textColumn,
} from "@/components/console"

import { BalanceCell } from "./BalanceCell"
import { DiscountCell } from "./DiscountCell"
import type { AccountRow, TabProps } from "./types"
import { useAdminPlatformOverview } from "../../superadmin.hooks"

/**
 * Accounts tab. Fetches ?section=accounts — the FLAT account list, not
 * organizations[].accounts: an account is the tenancy root and may have no
 * organization, so reading them through orgs would drop every unlinked account.
 */
export function AccountsTab({
  q,
  page,
  pageSize,
  onPageChange,
  onAdjustBalance,
}: Readonly<TabProps & { onAdjustBalance: (account: AccountRow) => void }>) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading, isError, refetch } = useAdminPlatformOverview(
    "accounts",
    q,
    page,
    pageSize,
  )

  const accounts = useMemo<AccountRow[]>(
    // org_name is denormalized by the server: it can't be joined client-side
    // once a search narrows the organizations list — and this tab no longer
    // fetches that list at all.
    () => (data?.accounts ?? []).map((a) => ({ ...a, orgName: a.org_name || "—" })),
    [data],
  )

  const columns = useMemo<ColumnDef<AccountRow>[]>(
    () => [
      textColumn<AccountRow>({
        id: "number",
        header: t("superAdmin.organizations.fields.accountNumber"),
        accessor: (a) => a.account_number,
        mono: true,
      }),
      textColumn<AccountRow>({
        id: "name",
        header: t("superAdmin.organizations.fields.accountName"),
        accessor: (a) => a.name,
      }),
      textColumn<AccountRow>({
        id: "org",
        header: t("superAdmin.organizations.fields.organization"),
        accessor: (a) => a.orgName,
        muted: true,
      }),
      {
        id: "owner",
        header: () => t("superAdmin.organizations.fields.owner", { defaultValue: "Owner" }),
        enableSorting: false,
        cell: ({ row }) => {
          // Ownership is member_role. is_owner is the member's own "home
          // account" flag — false on every account they provisioned
          // beyond their first, which left those rows showing no owner.
          const owner = row.original.members.find((m) => m.member_role === "owner")
          if (!owner) return <span className="text-[12px] text-muted-foreground">—</span>
          return (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                void navigate(`/admin/users/${owner.user_id}`)
              }}
              className="group flex min-w-0 flex-col text-left"
            >
              <span className="truncate text-[13px] font-medium text-foreground group-hover:text-brand-gold group-hover:underline">
                {owner.name || owner.email}
              </span>
              <span className="truncate text-[11px] text-muted-foreground">{owner.email}</span>
            </button>
          )
        },
      },
      statusColumn<AccountRow>({
        header: t("superAdmin.organizations.fields.status"),
        accessor: (a) => a.status,
      }),
      {
        id: "balance",
        header: () => t("superAdmin.organizations.fields.balance"),
        enableSorting: false,
        cell: ({ row }) => <BalanceCell account={row.original} onAdjust={onAdjustBalance} />,
      },
      {
        id: "discount",
        header: () => t("superAdmin.organizations.fields.discount"),
        enableSorting: false,
        cell: ({ row }) => <DiscountCell account={row.original} />,
      },
      textColumn<AccountRow>({
        id: "members",
        header: t("superAdmin.organizations.fields.members"),
        accessor: (a) => a.members.length,
      }),
      dateColumn<AccountRow>({
        header: t("superAdmin.organizations.fields.created"),
        accessor: (a) => a.created_at,
        responsive: "lg",
      }),
    ],
    [t, navigate, onAdjustBalance],
  )

  return (
    <ResourceTable<AccountRow>
      data={accounts}
      columns={columns}
      pagination={{
        page,
        pageSize: data?.pagination?.limit ?? pageSize,
        total: data?.pagination?.total ?? accounts.length,
        onPageChange,
      }}
      isLoading={isLoading}
      isError={isError}
      onRetry={() => void refetch()}
      getRowId={(a) => a.id}
      onRowClick={(a) => void navigate(`/admin/accounts/${a.id}/resources`)}
      emptyState={
        <EmptyState icon={Building2} title={t("superAdmin.organizations.empty.accounts")} />
      }
    />
  )
}
