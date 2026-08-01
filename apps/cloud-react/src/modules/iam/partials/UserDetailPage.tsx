import { useState } from "react"
import { useScreen } from "@/services/api/screen"

import { FileText, Info, Loader2, Plus, ShieldCheck, Trash2, User, Users, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
    ConfirmDialog,
    DetailPage,
    EmptyState,
    KeyValueGrid,
    Section,
    staggerDelay,
    StatusBadge,
} from "@/components/console"
import { Button } from "@/components/ui/button"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

import { IAM_ROUTES } from "../iam.constants"
import {
    useAssignRole,
    useAttachUserPolicy,
    useDeleteIAMUser,
    useDetachUserPolicy,
    useIAMPolicies,
    useIAMRoles,
    useIAMUser,
    useRevokeRole,
    useUserGroups,
    useUserPolicies,
    useUserRoles,
} from "../iam.hooks"
import type { IAMUser } from "../iam.types"

export function UserDetailPage() {
    useScreen("iam.user-detail")
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { id = "" } = useParams()
    const { data: user, isLoading } = useIAMUser(id)
    const { mutate: deleteUser, isPending: isDeleting } = useDeleteIAMUser()
    const [deleteOpen, setDeleteOpen] = useState(false)

    if (isLoading || !user) {
        return (
            <div className="space-y-5">
                <Skeleton className="h-8 w-32" />
                <Skeleton className="h-12 w-80" />
                <Skeleton className="h-72 rounded-xl" />
            </div>
        )
    }

    return (
        <>
            <DetailPage
                backTo={IAM_ROUTES.USERS}
                backLabel={t("iam.users.title")}
                icon={User}
                title={user.name}
                status={user.is_active ? "active" : "inactive"}
                id={user.id}
                actions={
                    <Button
                        size="sm"
                        variant="destructive"
                        className="gap-1.5"
                        onClick={() => {
                            setDeleteOpen(true)
                        }}
                    >
                        <Trash2 className="size-3.5" />
                        {t("iam.actions.deleteUser")}
                    </Button>
                }
                tabs={[
                    {
                        value: "overview",
                        label: t("vms.tabs.overview"),
                        icon: Info,
                        content: <OverviewTab user={user} />,
                    },
                    {
                        value: "roles",
                        label: t("iam.roles.title"),
                        icon: ShieldCheck,
                        content: <RolesTab userId={user.id} />,
                    },
                    {
                        value: "groups",
                        label: t("iam.groups.title"),
                        icon: Users,
                        content: <GroupsTab userId={user.id} />,
                    },
                    {
                        value: "policies",
                        label: t("iam.policies.title"),
                        icon: FileText,
                        content: <PoliciesTab userId={user.id} />,
                    },
                ]}
            />

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t("iam.users.deleteConfirm.title")}
                description={t("iam.users.deleteConfirm.description", { name: user.name })}
                confirmLabel={t("iam.actions.deleteUser")}
                confirmText={user.name}
                loading={isDeleting}
                onConfirm={() => {
                    deleteUser(user.id, {
                        onSuccess: () => void navigate(IAM_ROUTES.USERS),
                    })
                }}
            />
        </>
    )
}

function OverviewTab({ user }: Readonly<{ user: IAMUser }>) {
    const { t } = useTranslation()

    return (
        <Section variant="panel" title={t("iam.detail.profile")}>
            <KeyValueGrid
                columns={2}
                items={[
                    { label: t("iam.columns.email"), value: user.email, copyable: true },
                    { label: t("iam.columns.primaryRole"), value: user.role, mono: true },
                    {
                        label: t("iam.columns.status"),
                        value: <StatusBadge status={user.is_active ? "active" : "inactive"} />,
                    },
                    {
                        label: t("common.created"),
                        value: new Date(user.created_at).toLocaleString(),
                    },
                ]}
            />
        </Section>
    )
}

function RolesTab({ userId }: Readonly<{ userId: string }>) {
    const { t } = useTranslation()
    const { data: bindings = [], isLoading } = useUserRoles(userId)
    const { data: roles = [] } = useIAMRoles()
    const { mutate: assignRole, isPending: isAssigning } = useAssignRole()
    const { mutate: revokeRole } = useRevokeRole()
    const [selectedRole, setSelectedRole] = useState("")

    const assignedRoleIds = new Set(bindings.map((b) => b.role_id))
    const assignable = roles.filter((role) => !assignedRoleIds.has(role.id))

    if (isLoading) {
        return <Skeleton className="h-48 rounded-xl" />
    }

    return (
        <Section
            variant="panel"
            title={t("iam.detail.assignedRoles")}
            description={t("iam.detail.assignedRolesDescription")}
            actions={
                <div className="flex items-center gap-2">
                    <Select value={selectedRole} onValueChange={setSelectedRole}>
                        <SelectTrigger className="w-44 h-8 font-mono text-[13px]">
                            <SelectValue placeholder={t("iam.detail.selectRole")} />
                        </SelectTrigger>
                        <SelectContent>
                            {assignable.map((role) => (
                                <SelectItem
                                    key={role.id}
                                    value={role.id}
                                    className="font-mono text-[13px]"
                                >
                                    {role.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={!selectedRole || isAssigning}
                        onClick={() => {
                            assignRole(
                                { userId, roleId: selectedRole },
                                {
                                    onSuccess: () => {
                                        setSelectedRole("")
                                    },
                                }
                            )
                        }}
                    >
                        {isAssigning ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Plus className="size-3.5" />
                        )}
                        {t("iam.actions.assignRole")}
                    </Button>
                </div>
            }
        >
            {bindings.length === 0 ? (
                <EmptyState icon={ShieldCheck} title={t("iam.detail.noRoles")} />
            ) : (
                <ul className="space-y-2">
                    {bindings.map((binding, index) => {
                        const role = roles.find((r) => r.id === binding.role_id)
                        return (
                            <li
                                key={binding.id}
                                className="glass-1 flex items-center justify-between gap-3 px-3.5 py-2.5 animate-content-enter"
                                style={staggerDelay(index)}
                            >
                                <div className="min-w-0">
                                    <Link
                                        to={IAM_ROUTES.roleDetail(binding.role_id)}
                                        className="font-mono text-[13px] font-medium text-status-info hover:underline"
                                    >
                                        {role?.name ?? binding.role_id}
                                    </Link>
                                    {role?.description && (
                                        <p className="text-[12px] text-muted-foreground truncate">
                                            {role.description}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 gap-1.5 text-muted-foreground hover:text-destructive shrink-0"
                                    onClick={() => {
                                        revokeRole({
                                            userId,
                                            roleId: binding.role_id,
                                        })
                                    }}
                                >
                                    <X className="size-3" />
                                    {t("iam.actions.revokeRole")}
                                </Button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </Section>
    )
}

function GroupsTab({ userId }: Readonly<{ userId: string }>) {
    const { t } = useTranslation()
    const { data: groups = [], isLoading } = useUserGroups(userId)

    if (isLoading) {
        return <Skeleton className="h-48 rounded-xl" />
    }
    return (
        <Section
            variant="panel"
            title={t("iam.detail.groups")}
            description={t("iam.detail.groupsDescription")}
        >
            {groups.length === 0 ? (
                <EmptyState icon={Users} title={t("iam.detail.noGroups")} />
            ) : (
                <ul className="space-y-2">
                    {groups.map((group, index) => (
                        <li
                            key={group.id}
                            className="glass-1 px-3.5 py-2.5 animate-content-enter"
                            style={staggerDelay(index)}
                        >
                            <Link
                                to={IAM_ROUTES.groupDetail(group.id)}
                                className="text-sm font-medium text-status-info hover:underline"
                            >
                                {group.name}
                            </Link>
                            {group.description && (
                                <p className="text-[12px] text-muted-foreground truncate">
                                    {group.description}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Section>
    )
}

function PoliciesTab({ userId }: Readonly<{ userId: string }>) {
    const { t } = useTranslation()
    const { data: bindings = [], isLoading } = useUserPolicies(userId)
    const { data: policies = [] } = useIAMPolicies()
    const { mutate: attachPolicy, isPending: isAttaching } = useAttachUserPolicy()
    const { mutate: detachPolicy } = useDetachUserPolicy()
    const [selectedPolicy, setSelectedPolicy] = useState("")

    const attachedIds = new Set(bindings.map((b) => b.policy_id))
    const attachable = policies.filter((policy) => !attachedIds.has(policy.id))

    if (isLoading) {
        return <Skeleton className="h-48 rounded-xl" />
    }
    return (
        <Section
            variant="panel"
            title={t("iam.detail.attachedPolicies")}
            description={t("iam.detail.directPoliciesDescription")}
            actions={
                <div className="flex items-center gap-2">
                    <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
                        <SelectTrigger className="w-44 h-8 font-mono text-[13px]">
                            <SelectValue placeholder={t("iam.detail.selectPolicy")} />
                        </SelectTrigger>
                        <SelectContent>
                            {attachable.map((policy) => (
                                <SelectItem
                                    key={policy.id}
                                    value={policy.id}
                                    className="font-mono text-[13px]"
                                >
                                    {policy.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button
                        size="sm"
                        className="h-8 gap-1.5"
                        disabled={!selectedPolicy || isAttaching}
                        onClick={() => {
                            attachPolicy(
                                { userId, policyId: selectedPolicy },
                                {
                                    onSuccess: () => {
                                        setSelectedPolicy("")
                                    },
                                }
                            )
                        }}
                    >
                        {isAttaching ? (
                            <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                            <Plus className="size-3.5" />
                        )}
                        {t("iam.actions.attachPolicy")}
                    </Button>
                </div>
            }
        >
            {bindings.length === 0 ? (
                <EmptyState icon={FileText} title={t("iam.detail.noPolicies")} />
            ) : (
                <ul className="space-y-2">
                    {bindings.map((binding, index) => {
                        const policy = policies.find((p) => p.id === binding.policy_id)
                        return (
                            <li
                                key={binding.id}
                                className="glass-1 flex items-center justify-between gap-3 px-3.5 py-2.5 animate-content-enter"
                                style={staggerDelay(index)}
                            >
                                <Link
                                    to={IAM_ROUTES.policyDetail(binding.policy_id)}
                                    className="font-mono text-[13px] font-medium text-status-info hover:underline min-w-0 truncate"
                                >
                                    {policy?.name ?? binding.policy_id}
                                </Link>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 gap-1.5 text-muted-foreground hover:text-destructive shrink-0"
                                    onClick={() => {
                                        detachPolicy({ userId, policyId: binding.policy_id })
                                    }}
                                >
                                    <X className="size-3" />
                                    {t("iam.actions.detachPolicy")}
                                </Button>
                            </li>
                        )
                    })}
                </ul>
            )}
        </Section>
    )
}
