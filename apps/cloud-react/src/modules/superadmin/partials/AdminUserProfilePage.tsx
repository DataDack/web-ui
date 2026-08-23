import { useMemo } from "react"

import type { ColumnDef } from "@tanstack/react-table"
import { ArrowLeft, Boxes, Crown, LifeBuoy, ShieldCheck, Star, UserRound } from "lucide-react"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"

import { KeyValueGrid, PageHeader, Section, type KeyValueItem } from "@/components/console"
import { useAuth } from "@/modules/auth/auth.context"
import { useAllSupportTickets } from "@/modules/support-tickets/support-tickets.hooks"
import type { SupportTicket } from "@/modules/support-tickets/support-tickets.types"
import { useScreen } from "@/services/api/screen"

import {
  Badge,
  Button,
  DataTable,
  EmptyState,
  Skeleton,
  StatusBadge,
  dateColumn,
  textColumn,
} from "@datadack/common-ui"

import { ActiveBadge } from "../components/ActiveBadge"
import { KycActions, KycBadge } from "../components/KycCell"
import {
  useAdminPaymentLedger,
  useAdminPlatformOverview,
  useSetSuperAdmin,
} from "../superadmin.hooks"
import type { OverviewAccount, OverviewUser } from "../superadmin.types"
import { PaymentLedgerTable } from "../components/PaymentLedgerTable"

// The old /admin/organizations now redirects here.
const TENANCY_PATH = "/admin/tenancy"

// Everything this user has asked the platform for is a support ticket — quota
// increases included, since they are filed as tickets in the `quota` category —
// so the activity panel is one list rather than a tab per queue.

// "8 Jul 2026" — matches the admin tables' dateColumn format.
function fmtDate(raw?: string | null): string {
  if (!raw) return "—"
  const d = new Date(raw)
  return Number.isNaN(d.getTime())
    ? "—"
    : d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}

// "8 Jul 2026, 14:32" — for last-login, which carries a time.
function fmtDateTime(raw?: string | null): string {
  if (!raw) return "Never"
  const d = new Date(raw)
  return Number.isNaN(d.getTime())
    ? "Never"
    : d.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
}

function titleCase(s: string): string {
  return s
    .split(/[_\s]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}

// The account rows this user belongs to, tagged with their role + whether they
// own it. Derived from the cached overview graph (no dedicated user endpoint).
interface MembershipRow {
  account: OverviewAccount
  memberRole: string
  isOwner: boolean
}

export function AdminUserProfilePage() {
  const { t } = useTranslation()
  useScreen("superadmin.userProfile")
  const navigate = useNavigate()
  const { userId } = useParams<{ userId: string }>()
  const { user: operator } = useAuth()

  const { data: overview, isLoading } = useAdminPlatformOverview()
  const { mutate: setSuperAdmin, isPending: isTogglingSuperAdmin } = useSetSuperAdmin()
  const paymentLedger = useAdminPaymentLedger({ userId })

  // What this person has already asked for. The endpoint is platform-wide and
  // does not filter by user, so it is narrowed here — the operator wants the
  // history in front of them, not a search they have to run.
  const tickets = useAllSupportTickets()

  // Every user is either attached to an org (org.users) or an orphan — flatten
  // both so the lookup covers everyone, tagging each with its org name.
  const user = useMemo<(OverviewUser & { orgName: string | null }) | undefined>(() => {
    const fromOrgs = (overview?.organizations ?? []).flatMap((o) =>
      o.users.map((u) => ({ ...u, orgName: o.name })),
    )
    const orphans = (overview?.orphan_users ?? []).map((u) => ({ ...u, orgName: null }))
    return [...fromOrgs, ...orphans].find((u) => u.id === userId)
  }, [overview, userId])

  // Accounts this user is a member of, with their per-account role/ownership.
  const memberships = useMemo<MembershipRow[]>(() => {
    const rows: MembershipRow[] = []
    for (const account of overview?.accounts ?? []) {
      const m = account.members.find((x) => x.user_id === userId)
      // Ownership is member_role, not is_owner (that flag marks the user's
      // own home account and is false on accounts they provisioned later).
      if (m)
        rows.push({
          account,
          memberRole: m.member_role,
          isOwner: m.member_role === "owner",
        })
    }
    // Owned accounts first.
    return rows.sort((a, b) => Number(b.isOwner) - Number(a.isOwner))
  }, [overview, userId])

  // Narrowed here rather than server-side: the endpoint does not filter by user.
  const theirTickets = useMemo(
    () => (tickets.data ?? []).filter((ticket) => ticket.createdBy === userId),
    [tickets.data, userId],
  )

  const ticketColumns = useMemo<ColumnDef<SupportTicket>[]>(
    () => [
      textColumn<SupportTicket>({
        id: "subject",
        header: "Subject",
        accessor: (ticket) => ticket.subject,
      }),
      textColumn<SupportTicket>({
        id: "category",
        header: "Category",
        accessor: (ticket) => titleCase(ticket.category),
        muted: true,
        responsive: "md",
      }),
      {
        id: "status",
        header: () => "Status",
        accessorFn: (ticket) => ticket.status,
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      dateColumn<SupportTicket>({
        id: "opened",
        header: "Opened",
        accessor: (ticket) => ticket.createdAt,
        responsive: "md",
      }),
    ],
    [],
  )

  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-20 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className="space-y-5">
        <PageHeader
          icon={UserRound}
          breadcrumbs={[
            { label: "Super Admin" },
            { label: "Tenancy", to: TENANCY_PATH },
            { label: "User" },
          ]}
          title={t("superAdmin.adminUserProfilePage.userNotFound")}
          actions={
            <Button variant="outline" size="sm" onClick={() => void navigate(TENANCY_PATH)}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
          }
        />
        <EmptyState
          icon={UserRound}
          title={t("superAdmin.adminUserProfilePage.userNotFound2")}
          description={t(
            "superAdmin.adminUserProfilePage.thisUserIsnTPartOfTheCurrentPlatformOverview",
          )}
        />
      </div>
    )
  }

  const title = user?.name || "User"

  const access =
    user?.is_root || user?.is_super_admin ? (
      <div className="flex flex-wrap items-center gap-1.5">
        {user.is_root && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
            <Crown className="size-3" />
            Root
          </span>
        )}
        {user.is_super_admin && (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/10 px-1.5 py-0.5 text-[11px] font-medium text-violet-600 dark:text-violet-400">
            <ShieldCheck className="size-3" />
            {t("superAdmin.adminUserProfilePage.superAdmin")}
          </span>
        )}
      </div>
    ) : (
      <span className="text-muted-foreground">—</span>
    )

  const profileItems: KeyValueItem[] = user
    ? [
        { label: "Email", value: user.email, copyable: true },
        { label: "Mobile", value: user.phone || "—", copyable: !!user.phone },
        { label: "User ID", value: user.id, mono: true, copyable: true },
        { label: "Role", value: user.role ? titleCase(user.role) : "—" },
        { label: "User Type", value: user.user_type ? titleCase(user.user_type) : "—" },
        { label: "Status", value: <ActiveBadge active={user.is_active} /> },
        { label: "Access", value: access },
        { label: "Organization", value: user.orgName ?? "—" },
        {
          label: "Onboarding",
          value: user.onboarding_status ? titleCase(user.onboarding_status) : "—",
        },
        { label: "KYC", value: <KycBadge user={user} /> },
        {
          // The distinction that matters when someone says "I am locked out":
          // whether the platform is waiting on them, not whether they ever
          // verified.
          label: "Blocked by verification",
          value: user.need_actions ? "Yes — must verify" : "No",
        },
        { label: "Created", value: fmtDate(user.created_at) },
        { label: "Last Login", value: fmtDateTime(user.last_login_at) },
      ]
    : []

  return (
    <div className="space-y-5">
      <PageHeader
        icon={UserRound}
        breadcrumbs={[
          { label: "Super Admin" },
          { label: "Tenancy", to: TENANCY_PATH },
          { label: title },
        ]}
        title={title}
        description={user?.email}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void navigate(TENANCY_PATH)}>
              <ArrowLeft className="size-4" />
              Back
            </Button>
            {/* Overriding verification is a decision about a person, so it lives
                on the page that shows the whole person. */}
            <KycActions user={user} />
          </div>
        }
      />

      <Section
        variant="panel"
        title="Profile"
        actions={
          <Button
            size="sm"
            variant={user.is_super_admin ? "outline" : "default"}
            loading={isTogglingSuperAdmin}
            // The backend refuses a self-revoke so the platform can never be
            // left with no operator; say so rather than failing on click.
            disabled={operator?.id === user.id && user.is_super_admin}
            title={
              operator?.id === user.id && user.is_super_admin
                ? "You cannot revoke your own super-admin access"
                : undefined
            }
            onClick={() => {
              setSuperAdmin({ id: user.id, isSuperAdmin: !user.is_super_admin })
            }}
          >
            <ShieldCheck className="size-3.5" />
            {user.is_super_admin ? "Revoke super admin" : "Grant super admin"}
          </Button>
        }
      >
        <KeyValueGrid items={profileItems} columns={3} />
      </Section>

      <Section
        variant="panel"
        title="Accounts"
        description={`Accounts this user belongs to (${String(memberships.length)}).`}
      >
        {memberships.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t("superAdmin.adminUserProfilePage.thisUserIsnAposTAMemberOfAnyAccount")}
          </p>
        ) : (
          <div className="space-y-2">
            {memberships.map(({ account, memberRole, isOwner }) => (
              <button
                key={account.id}
                type="button"
                onClick={() => void navigate(`/admin/accounts/${account.id}/resources`)}
                className="flex w-full items-center gap-3 rounded-lg border border-border-glass bg-muted/20 px-3 py-2.5 text-left transition-colors hover:border-brand-gold/40 hover:bg-muted/40"
              >
                <Boxes className="size-4 shrink-0 text-muted-foreground" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-foreground">
                    {account.name}
                  </span>
                  <span className="block font-mono text-[11px] text-muted-foreground">
                    {account.account_number}
                  </span>
                </span>
                {isOwner && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-brand-gold/15 px-2 py-0.5 text-[11px] font-medium text-brand-gold">
                    <Star className="size-3" />
                    Owner
                  </span>
                )}
                <Badge variant="outline" className="font-normal">
                  {titleCase(memberRole)}
                </Badge>
              </button>
            ))}
          </div>
        )}
      </Section>

      <Section
        variant="panel"
        title={t("superAdmin.adminUserProfilePage.activity")}
        description={t("superAdmin.adminUserProfilePage.everythingThisUserHasRaisedNewestFirst")}
      >
        <DataTable<SupportTicket>
          data={theirTickets}
          columns={ticketColumns}
          loading={tickets.isLoading}
          error={
            tickets.isError ? t("superAdmin.adminUserProfilePage.ticketsUnreadable") : undefined
          }
          onRetry={() => void tickets.refetch()}
          getRowId={(ticket) => ticket.id}
          onRowClick={(ticket) => void navigate(`/admin/support/${ticket.id}`)}
          defaultSorting={[{ id: "opened", desc: true }]}
          empty={
            <EmptyState
              icon={LifeBuoy}
              title={t("superAdmin.adminUserProfilePage.noTicketsFromThisUser")}
              description={t(
                "superAdmin.adminUserProfilePage.theyHaveNotAskedSupportForAnythingYet",
              )}
            />
          }
          onRefresh={() => void tickets.refetch()}
          refreshing={tickets.isFetching}
        />
      </Section>

      <Section
        variant="panel"
        title="Payments"
        description="Checkout and settlement records initiated by this user."
      >
        <PaymentLedgerTable
          payments={paymentLedger.data ?? []}
          loading={paymentLedger.isLoading}
          error={paymentLedger.isError ? "Failed to load payments" : undefined}
          refreshing={paymentLedger.isFetching}
          onRefresh={() => void paymentLedger.refetch()}
        />
      </Section>
    </div>
  )
}
