import { useMemo } from "react"

import { ArrowLeft, Boxes, Crown, ShieldCheck, Star, UserRound } from "lucide-react"
import { useNavigate, useParams } from "react-router-dom"

import { EmptyState, KeyValueGrid, PageHeader, Section, type KeyValueItem } from "@/components/console"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useScreen } from "@/services/api/screen"

import { ActiveBadge } from "../components/ActiveBadge"
import { useAdminPlatformOverview } from "../superadmin.hooks"
import type { OverviewAccount, OverviewUser } from "../superadmin.types"

const ORGS_PATH = "/admin/organizations"

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

// The external KYC service's user-level flags, folded into one display label.
function kycLabel(u: OverviewUser): string {
    if (u.kyc_completed) return u.need_actions ? "Re-verification required" : "Completed"
    return u.need_actions ? "Action required" : "Not started"
}

// The account rows this user belongs to, tagged with their role + whether they
// own it. Derived from the cached overview graph (no dedicated user endpoint).
interface MembershipRow {
    account: OverviewAccount
    memberRole: string
    isOwner: boolean
}

export function AdminUserProfilePage() {
    useScreen("superadmin.userProfile")
    const navigate = useNavigate()
    const { userId } = useParams<{ userId: string }>()

    const { data: overview, isLoading } = useAdminPlatformOverview()

    // Every user is either attached to an org (org.users) or an orphan — flatten
    // both so the lookup covers everyone, tagging each with its org name.
    const user = useMemo<(OverviewUser & { orgName: string | null }) | undefined>(() => {
        const fromOrgs = (overview?.organizations ?? []).flatMap((o) =>
            o.users.map((u) => ({ ...u, orgName: o.name }))
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
            if (m) rows.push({ account, memberRole: m.member_role, isOwner: m.member_role === "owner" })
        }
        // Owned accounts first.
        return rows.sort((a, b) => Number(b.isOwner) - Number(a.isOwner))
    }, [overview, userId])

    if (!isLoading && !user) {
        return (
            <div className="space-y-5">
                <PageHeader
                    icon={UserRound}
                    breadcrumbs={[
                        { label: "Super Admin" },
                        { label: "Organizations", to: ORGS_PATH },
                        { label: "User" },
                    ]}
                    title="User not found"
                    actions={
                        <Button variant="outline" size="sm" onClick={() => void navigate(ORGS_PATH)}>
                            <ArrowLeft className="size-4" />
                            Back
                        </Button>
                    }
                />
                <EmptyState
                    icon={UserRound}
                    title="User not found"
                    description="This user isn't part of the current platform overview."
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
                        Super Admin
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
              { label: "Onboarding", value: user.onboarding_status ? titleCase(user.onboarding_status) : "—" },
              {
                  label: "KYC",
                  value: (
                      <Badge variant="outline" className="font-normal">
                          {kycLabel(user)}
                      </Badge>
                  ),
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
                    { label: "Organizations", to: ORGS_PATH },
                    { label: title },
                ]}
                title={title}
                description={user?.email}
                actions={
                    <Button variant="outline" size="sm" onClick={() => void navigate(ORGS_PATH)}>
                        <ArrowLeft className="size-4" />
                        Back
                    </Button>
                }
            />

            <Section variant="panel" title="Profile">
                <KeyValueGrid items={profileItems} columns={3} />
            </Section>

            <Section
                variant="panel"
                title="Accounts"
                description={`Accounts this user belongs to (${String(memberships.length)}).`}
            >
                {memberships.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        This user isn't a member of any account.
                    </p>
                ) : (
                    <div className="space-y-2">
                        {memberships.map(({ account, memberRole, isOwner }) => (
                            <button
                                key={account.id}
                                type="button"
                                onClick={() =>
                                    void navigate(
                                        `/admin/accounts/${String(account.id)}/resources`
                                    )
                                }
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
        </div>
    )
}
