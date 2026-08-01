import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Building2 } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { dateColumn, EmptyState, nameColumn, ResourceTable, textColumn } from "@/components/console"

import { AccessChips } from "./AccessChips"
import type { TabProps, UserRow } from "./types"
import { ActiveBadge } from "../../components/ActiveBadge"
import { useAdminPlatformOverview } from "../../superadmin.hooks"

/**
 * Users tab. Fetches ?section=users — the FLAT user list rather than
 * organizations[].users + orphan_users: under a search the organizations list is
 * narrowed, which would drop matching users whose org didn't match.
 */
export function UsersTab({ q, page, pageSize, onPageChange }: Readonly<TabProps>) {
	const { t } = useTranslation()
	const navigate = useNavigate()
	const { data, isLoading, isError, refetch } = useAdminPlatformOverview("users", q, page, pageSize)

	const users = useMemo<UserRow[]>(
		() => (data?.users ?? []).map((u) => ({ ...u, orgName: u.org_name || null })),
		[data]
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
			dateColumn<UserRow>({
				header: t("superAdmin.organizations.fields.created"),
				accessor: (u) => u.created_at,
				responsive: "lg",
			}),
		],
		[t]
	)

	return (
		<ResourceTable<UserRow>
			data={users}
			columns={columns}
			pagination={{
				page,
				pageSize: data?.pagination?.limit ?? pageSize,
				total: data?.pagination?.total ?? users.length,
				onPageChange,
			}}
			isLoading={isLoading}
			isError={isError}
			onRetry={() => void refetch()}
			getRowId={(u) => u.id}
			// Every user row opens that user's admin profile — the same page the
			// Accounts tab's owner link goes to.
			onRowClick={(u) => void navigate(`/admin/users/${u.id}`)}
			emptyState={<EmptyState icon={Building2} title={t("superAdmin.organizations.empty.users")} />}
		/>
	)
}
