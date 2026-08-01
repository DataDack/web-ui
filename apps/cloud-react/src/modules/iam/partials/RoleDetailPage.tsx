import { useState } from "react"

import { FileText, Info, Loader2, Plus, ShieldCheck, Trash2, Users, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate, useParams } from "react-router-dom"

import {
    ConfirmDialog,
    DetailPage,
    EmptyState,
    KeyValueGrid,
    Section,
    staggerDelay,
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
import { useScreen } from "@/services/api/screen"

import { IAM_ROUTES } from "../iam.constants"
import {
    useAttachPolicy,
    useDeleteIAMRole,
    useDetachPolicy,
    useIAMPolicies,
    useIAMRole,
    useIAMUsers,
    useRoleMembers,
    useRolePolicies,
} from "../iam.hooks"
import type { IAMRole } from "../iam.types"

export function RoleDetailPage() {
    useScreen("iam.role-detail")
    const { t } = useTranslation()
    const navigate = useNavigate()
    const { id = "" } = useParams()
    const { data: role, isLoading } = useIAMRole(id)
    const { mutate: deleteRole, isPending: isDeleting } = useDeleteIAMRole()
    const [deleteOpen, setDeleteOpen] = useState(false)

    if (isLoading || !role) {
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
                backTo={IAM_ROUTES.ROLES}
                backLabel={t("iam.roles.title")}
                icon={ShieldCheck}
                title={role.name}
                status={role.is_system ? "active" : undefined}
                id={role.id}
                actions={
                    !role.is_system && (
                        <Button
                            size="sm"
                            variant="destructive"
                            className="gap-1.5"
                            onClick={() => {
                                setDeleteOpen(true)
                            }}
                        >
                            <Trash2 className="size-3.5" />
                            {t("iam.actions.deleteRole")}
                        </Button>
                    )
                }
                tabs={[
                    {
                        value: "overview",
                        label: t("vms.tabs.overview"),
                        icon: Info,
                        content: <OverviewTab role={role} />,
                    },
                    {
                        value: "policies",
                        label: t("iam.policies.title"),
                        icon: FileText,
                        content: <PoliciesTab roleId={role.id} />,
                    },
                    {
                        value: "members",
                        label: t("iam.detail.members"),
                        icon: Users,
                        content: <MembersTab roleId={role.id} />,
                    },
                ]}
            />

            <ConfirmDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={t("iam.roles.deleteConfirm.title")}
                description={t("iam.roles.deleteConfirm.description", { name: role.name })}
                confirmLabel={t("iam.actions.deleteRole")}
                confirmText={role.name}
                loading={isDeleting}
                onConfirm={() => {
                    deleteRole(role.id, {
                        onSuccess: () => void navigate(IAM_ROUTES.ROLES),
                    })
                }}
            />
        </>
    )
}

function OverviewTab({ role }: Readonly<{ role: IAMRole }>) {
    const { t } = useTranslation()

    return (
        <Section variant="panel" title={t("vms.detail.configuration")}>
            <KeyValueGrid
                columns={2}
                items={[
                    { label: t("iam.columns.description"), value: role.description },
                    {
                        label: t("iam.columns.type"),
                        value: role.is_system ? t("iam.badges.system") : t("iam.badges.custom"),
                    },
                    {
                        label: t("common.created"),
                        value: new Date(role.created_at).toLocaleString(),
                    },
                    {
                        label: t("common.updated"),
                        value: new Date(role.updated_at).toLocaleString(),
                    },
                ]}
            />
        </Section>
    )
}

function PoliciesTab({ roleId }: Readonly<{ roleId: string }>) {
    const { t } = useTranslation()
    const { data: bindings = [], isLoading } = useRolePolicies(roleId)
    const { data: policies = [] } = useIAMPolicies()
    const { mutate: attachPolicy, isPending: isAttaching } = useAttachPolicy()
    const { mutate: detachPolicy } = useDetachPolicy()
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
            description={t("iam.detail.attachedPoliciesDescription")}
            actions={
                <div className="flex items-center gap-2">
                    <Select value={selectedPolicy} onValueChange={setSelectedPolicy}>
                        <SelectTrigger className="w-52 h-8 font-mono text-[13px]">
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
                                { roleId, policyId: selectedPolicy },
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
                                <div className="min-w-0">
                                    <Link
                                        to={IAM_ROUTES.policyDetail(binding.policy_id)}
                                        className="font-mono text-[13px] font-medium text-status-info hover:underline"
                                    >
                                        {policy?.name ?? binding.policy_id}
                                    </Link>
                                    {policy?.description && (
                                        <p className="text-[12px] text-muted-foreground truncate">
                                            {policy.description}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 gap-1.5 text-muted-foreground hover:text-destructive shrink-0"
                                    onClick={() => {
                                        detachPolicy({ roleId, policyId: binding.policy_id })
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

function MembersTab({ roleId }: Readonly<{ roleId: string }>) {
    const { t } = useTranslation()
    const { data: bindings = [], isLoading } = useRoleMembers(roleId)
    const { data: users = [] } = useIAMUsers()

    if (isLoading) {
        return <Skeleton className="h-48 rounded-xl" />
    }

    if (bindings.length === 0) {
        return <EmptyState icon={Users} title={t("iam.detail.noMembers")} />
    }

    return (
        <Section variant="panel" title={t("iam.detail.members")}>
            <ul className="space-y-2">
                {bindings.map((binding, index) => {
                    const user = users.find((u) => u.id === binding.user_id)
                    return (
                        <li
                            key={binding.id}
                            className="glass-1 px-3.5 py-2.5 animate-content-enter"
                            style={staggerDelay(index)}
                        >
                            <Link
                                to={IAM_ROUTES.userDetail(binding.user_id)}
                                className="text-sm font-medium text-status-info hover:underline"
                            >
                                {user?.name ?? binding.user_id}
                            </Link>
                            {user && (
                                <p className="font-mono text-[11px] text-muted-foreground">
                                    {user.email}
                                </p>
                            )}
                        </li>
                    )
                })}
            </ul>
        </Section>
    )
}
