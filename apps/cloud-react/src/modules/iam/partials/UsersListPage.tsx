import { useMemo, useState } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { Mail, Plus, RefreshCw, Send, Trash2, Users, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useSearchParams } from "react-router-dom"

import {
  actionsColumn,
  ConfirmDialog,
  dateColumn,
  EmptyState,
  PageHeader,
  ResourceTable,
  StatGrid,
  statusColumn,
  textColumn,
} from "@/components/console"
import { Button } from "@datadack/common-ui"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useScreen } from "@/services/api/screen"

import { IAM_ROUTES } from "../iam.constants"
import {
  useCurrentAccountMembers,
  useDeleteIAMUser,
  useIAMUsers,
  useInvitations,
  useResendInvitation,
  useRevokeInvitation,
} from "../iam.hooks"
import type { IAMUser, Invitation } from "../iam.types"
import { InviteMemberDialog } from "./InviteMemberDialog"
import { InviteUserSheet } from "./InviteUserSheet"

const INVITATION_STATUS_CLASS: Record<string, string> = {
  pending: "text-amber-500 border-amber-500/30 bg-amber-500/10",
  accepted: "text-emerald-500 border-emerald-500/30 bg-emerald-500/10",
  revoked: "text-muted-foreground border-border-glass bg-muted/50",
  expired: "text-muted-foreground border-border-glass bg-muted/50",
}

export function UsersListPage() {
  useScreen("iam.users-list")
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const tab = searchParams.get("tab") === "invitations" ? "invitations" : "users"
  const setTab = (value: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value === "invitations") next.set("tab", "invitations")
        else next.delete("tab")
        return next
      },
      { replace: true },
    )
  }

  // Users
  const { data: users = [], isLoading, isError, refetch, isFetching } = useIAMUsers()
  const { data: members = [] } = useCurrentAccountMembers()
  const { mutate: deleteUser, isPending: isDeleting } = useDeleteIAMUser()

  // Invitations
  const {
    data: invitations = [],
    isLoading: invLoading,
    isError: invError,
    refetch: refetchInvitations,
    isFetching: invFetching,
  } = useInvitations()
  const { mutate: resend } = useResendInvitation()
  const { mutate: revoke } = useRevokeInvitation()

  // user id -> their role in the current account/organization (account_members).
  const accountRole = useMemo(
    () => new Map(members.map((m) => [String(m.user_id), m.member_role])),
    [members],
  )

  const [inviteOpen, setInviteOpen] = useState(false)
  // Seeded from ?invite=1 so links to the old /iam/invitations/new page (now a
  // redirect here) land with the invite dialog already open.
  const [inviteMemberOpen, setInviteMemberOpen] = useState(() => searchParams.get("invite") === "1")
  const closeInviteMember = (open: boolean) => {
    setInviteMemberOpen(open)
    if (!open && searchParams.get("invite")) {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          next.delete("invite")
          return next
        },
        { replace: true },
      )
    }
  }
  const [toDelete, setToDelete] = useState<IAMUser | null>(null)

  const pendingInvites = useMemo(
    () => invitations.filter((i) => i.status === "pending").length,
    [invitations],
  )

  // Refresh / loading state follows the active tab's resource.
  const activeFetching = tab === "invitations" ? invFetching : isFetching

  const stats = useMemo(
    () => [
      { label: t("iam.stats.users"), value: users.length, loading: isLoading },
      {
        label: t("status.active"),
        value: users.filter((u) => u.is_active).length,
        color: "success" as const,
        loading: isLoading,
      },
      {
        label: t("iam.stats.admins"),
        value: users.filter((u) => u.role === "admin" || u.is_super_admin).length,
        color: "info" as const,
        loading: isLoading,
      },
      {
        label: t("iam.invitations.title"),
        value: pendingInvites,
        color: "warning" as const,
        loading: invLoading,
      },
    ],
    [users, isLoading, invLoading, pendingInvites, t],
  )

  const userColumns = useMemo<ColumnDef<IAMUser>[]>(
    () => [
      {
        id: "name",
        accessorFn: (u: IAMUser) => u.name,
        header: () => t("iam.columns.name"),
        cell: ({ row }) => (
          <div>
            <p className="text-sm font-medium text-foreground">{row.original.name}</p>
            <p className="font-mono text-[11px] text-muted-foreground">{row.original.email}</p>
          </div>
        ),
      },
      statusColumn<IAMUser>({
        header: t("iam.columns.status"),
        accessor: (u) => (u.is_active ? "active" : "inactive"),
        pulse: (u) => u.is_active,
      }),
      textColumn<IAMUser>({
        id: "role",
        header: t("iam.columns.accountRole"),
        // Root users (org/account owners) show as "Root" regardless of
        // their account member_role.
        accessor: (u) => (u.is_root ? t("iam.badges.root") : (accountRole.get(u.id) ?? "—")),
        mono: true,
        responsive: "md",
      }),
      dateColumn<IAMUser>({
        header: t("common.created"),
        accessor: (u) => u.created_at,
        responsive: "lg",
      }),
      actionsColumn<IAMUser>({
        ariaLabel: t("console.table.actions"),
        actions: () => [
          {
            label: t("iam.actions.deleteUser"),
            icon: Trash2,
            destructive: true,
            onAction: (user: IAMUser) => {
              setToDelete(user)
            },
          },
        ],
      }),
    ],
    [t, accountRole],
  )

  const invitationColumns = useMemo<ColumnDef<Invitation>[]>(
    () => [
      textColumn<Invitation>({
        id: "email",
        header: t("iam.columns.email"),
        accessor: (i) => i.email,
      }),
      {
        id: "status",
        header: () => t("iam.columns.status"),
        enableSorting: false,
        cell: ({ row }) => {
          const s = row.original.status
          return (
            <span
              className={`font-mono text-[11px] px-1.5 py-0.5 rounded border ${INVITATION_STATUS_CLASS[s] ?? INVITATION_STATUS_CLASS.revoked}`}
            >
              {t(`iam.invitations.status.${s}`)}
            </span>
          )
        },
      },
      textColumn<Invitation>({
        id: "member_role",
        header: t("iam.invitations.form.memberRole"),
        accessor: (i) => i.member_role,
        muted: true,
        responsive: "md",
      }),
      dateColumn<Invitation>({
        header: t("iam.invitations.columns.expires"),
        accessor: (i) => i.expires_at,
        responsive: "lg",
      }),
      actionsColumn<Invitation>({
        ariaLabel: t("console.table.actions"),
        actions: (inv) =>
          inv.status === "pending"
            ? [
                {
                  label: t("iam.invitations.actions.resend"),
                  icon: Send,
                  onAction: (i: Invitation) => {
                    resend(i.id)
                  },
                },
                {
                  label: t("iam.invitations.actions.revoke"),
                  icon: X,
                  destructive: true,
                  onAction: (i: Invitation) => {
                    revoke(i.id)
                  },
                },
              ]
            : [],
      }),
    ],
    [t, resend, revoke],
  )

  return (
    <div className="space-y-5">
      <PageHeader
        icon={Users}
        breadcrumbs={[{ label: t("console.nav.groups.iam") }, { label: t("iam.users.title") }]}
        title={t("iam.users.title")}
        description={t("iam.users.subtitle")}
        actions={
          <>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => void (tab === "invitations" ? refetchInvitations() : refetch())}
              disabled={activeFetching}
              aria-label={t("common.refresh")}
            >
              <RefreshCw className={`w-4 h-4 ${activeFetching ? "animate-spin" : ""}`} />
            </Button>
            {tab === "invitations" ? (
              <Button
                className="gap-2"
                onClick={() => {
                  setInviteMemberOpen(true)
                }}
              >
                <Plus className="w-4 h-4" />
                {t("iam.invitations.invite")}
              </Button>
            ) : (
              <Button
                className="gap-2"
                onClick={() => {
                  setInviteOpen(true)
                }}
              >
                <Plus className="w-4 h-4" />
                {t("iam.users.invite")}
              </Button>
            )}
          </>
        }
      />

      <StatGrid stats={stats} />

      <Tabs value={tab} onValueChange={setTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="size-3" />
            {t("iam.users.title")}
            <span className="ml-1 text-[11px] text-muted-foreground">{users.length}</span>
          </TabsTrigger>
          <TabsTrigger value="invitations" className="gap-1.5">
            <Mail className="size-3" />
            {t("iam.invitations.title")}
            {pendingInvites > 0 && (
              <span className="ml-1 text-[11px] text-muted-foreground">{pendingInvites}</span>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users">
          <ResourceTable<IAMUser>
            data={users}
            columns={userColumns}
            isLoading={isLoading}
            isError={isError}
            onRetry={() => void refetch()}
            getRowId={(user) => user.id}
            onRowClick={(user) => void navigate(IAM_ROUTES.userDetail(user.id))}
            emptyState={
              <EmptyState
                icon={Users}
                title={t("iam.users.empty")}
                description={t("iam.users.emptySubtitle")}
                action={{
                  label: t("iam.users.invite"),
                  onClick: () => {
                    setInviteOpen(true)
                  },
                }}
              />
            }
          />
        </TabsContent>

        <TabsContent value="invitations">
          <ResourceTable<Invitation>
            data={invitations}
            columns={invitationColumns}
            isLoading={invLoading}
            isError={invError}
            onRetry={() => void refetchInvitations()}
            getRowId={(inv) => inv.id}
            emptyState={
              <EmptyState
                icon={Mail}
                title={t("iam.invitations.empty")}
                description={t("iam.invitations.emptySubtitle")}
                action={{
                  label: t("iam.invitations.invite"),
                  onClick: () => {
                    setInviteMemberOpen(true)
                  },
                }}
              />
            }
          />
        </TabsContent>
      </Tabs>

      <InviteUserSheet open={inviteOpen} onOpenChange={setInviteOpen} />
      <InviteMemberDialog open={inviteMemberOpen} onOpenChange={closeInviteMember} />

      <ConfirmDialog
        open={!!toDelete}
        onOpenChange={(open) => {
          if (!open) setToDelete(null)
        }}
        title={t("iam.users.deleteConfirm.title")}
        description={t("iam.users.deleteConfirm.description", {
          name: toDelete?.name ?? "",
        })}
        confirmLabel={t("iam.actions.deleteUser")}
        loading={isDeleting}
        onConfirm={() => {
          if (!toDelete) return
          deleteUser(toDelete.id, {
            onSuccess: () => {
              setToDelete(null)
            },
          })
        }}
      />
    </div>
  )
}
