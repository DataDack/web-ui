import { useEffect, useState } from "react"
import { useScreen } from "@/services/api/screen"

import { zodResolver } from "@hookform/resolvers/zod"
import { Ban, Check, PlayCircle, Save, Star, Wallet } from "lucide-react"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { useNavigate, useParams } from "react-router-dom"
import { z } from "zod/v4"

import {
    ConfirmDialog,
    KeyValueGrid,
    PageHeader,
    Section,
    StatusBadge,
} from "@/components/console"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { useAuth } from "@/modules/auth/auth.context"

import { ACCOUNT_MANAGER_ROLES, ACCOUNT_ROUTES } from "../accounts.constants"
import {
    useAccountMembers,
    useActiveAccount,
    useMyAccounts,
    useSetDefaultAccount,
    useSwitchAccount,
    useUpdateAccount,
} from "../accounts.hooks"

const schema = z.object({
    name: z.string().min(2, "Minimum 2 characters").max(100, "Maximum 100 characters"),
})
type FormValues = z.infer<typeof schema>

function initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).slice(0, 2)
    return parts.map((p) => p.charAt(0).toUpperCase()).join("") || "U"
}

export function AccountDetailPage() {
    useScreen("accounts.account-detail")
    const { t } = useTranslation()
    const { id } = useParams<{ id: string }>()
    const navigate = useNavigate()
    const { user } = useAuth()
    const { isLoading } = useMyAccounts()
    const { accounts, activeAccount } = useActiveAccount()
    const account = accounts.find((a) => a.id === id)
    const switchAccount = useSwitchAccount()

    const { mutate: update, isPending: saving } = useUpdateAccount()
    const { mutate: setDefault, isPending: settingDefault } = useSetDefaultAccount()
    const [closeOpen, setCloseOpen] = useState(false)

    // Account authority comes from the caller's membership role in THIS account
    // (owner/admin), not an organization. The platform super admin may always manage.
    const canManage =
        user?.is_super_admin === true ||
        ACCOUNT_MANAGER_ROLES.includes(account?.member_role ?? "")

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isDirty },
    } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: "" } })

    useEffect(() => {
        if (account) reset({ name: account.name })
    }, [account, reset])

    if (isLoading) return <Skeleton className="h-96 rounded-xl" />

    if (!account) {
        return (
            <div className="space-y-6">
                <PageHeader
                    icon={Wallet}
                    breadcrumbs={[
                        { label: t("accounts.title"), to: ACCOUNT_ROUTES.ROOT },
                        { label: t("common.error") },
                    ]}
                    title={t("accounts.notFound")}
                />
                <Button variant="outline" onClick={() => void navigate(ACCOUNT_ROUTES.ROOT)}>
                    {t("accounts.backToList")}
                </Button>
            </div>
        )
    }

    const isActiveScope = activeAccount?.id === account.id
    const onRename = (values: FormValues) => { update({ id: account.id, payload: { name: values.name } }); }
    const changeStatus = (status: "active" | "suspended" | "closed") =>
        { update({ id: account.id, payload: { status } }); }

    return (
        <div className="space-y-6">
            <PageHeader
                icon={Wallet}
                breadcrumbs={[
                    { label: t("console.nav.groups.governance") },
                    { label: t("accounts.title"), to: ACCOUNT_ROUTES.ROOT },
                    { label: account.name },
                ]}
                title={account.name}
                description={account.account_number}
                meta={
                    <>
                        <StatusBadge status={account.status} />
                        {account.is_owner && (
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                                {t("common.default")}
                            </span>
                        )}
                    </>
                }
                actions={
                    !isActiveScope &&
                    account.status !== "closed" && (
                        <Button variant="outline" className="gap-1.5" onClick={() => { switchAccount(account); }}>
                            <Check className="size-3.5" />
                            {t("accounts.switchTo")}
                        </Button>
                    )
                }
            />

            {/* Details / rename */}
            <Section variant="panel" title={t("accounts.detail.details")}>
                <form
                    onSubmit={(e) => void handleSubmit(onRename)(e)}
                    className="max-w-xl space-y-5"
                >
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                            {t("accounts.form.name")}
                            <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Input {...register("name")} disabled={!canManage} />
                        {errors.name && (
                            <p className="text-[11px] text-destructive">{errors.name.message}</p>
                        )}
                    </div>
                    {canManage && (
                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                variant="gold"
                                className="gap-1.5"
                                disabled={saving || !isDirty}
                            >
                                <Save className="size-3.5" />
                                {saving ? t("accounts.form.saving") : t("accounts.form.save")}
                            </Button>
                        </div>
                    )}
                </form>
            </Section>

            {/* Lifecycle */}
            {canManage && (
                <Section
                    variant="panel"
                    title={t("accounts.lifecycle.title")}
                    description={t("accounts.lifecycle.description")}
                >
                    <div className="flex flex-wrap gap-3">
                        {!account.is_owner && account.status === "active" && (
                            <Button
                                variant="outline"
                                className="gap-1.5"
                                disabled={settingDefault}
                                onClick={() => { setDefault(account.id); }}
                            >
                                <Star className="size-3.5" />
                                {t("accounts.lifecycle.setDefault")}
                            </Button>
                        )}
                        {account.status === "active" && (
                            <Button
                                variant="outline"
                                className="gap-1.5"
                                disabled={saving}
                                onClick={() => { changeStatus("suspended"); }}
                            >
                                <Ban className="size-3.5" />
                                {t("accounts.lifecycle.suspend")}
                            </Button>
                        )}
                        {account.status === "suspended" && (
                            <Button
                                variant="outline"
                                className="gap-1.5"
                                disabled={saving}
                                onClick={() => { changeStatus("active"); }}
                            >
                                <PlayCircle className="size-3.5" />
                                {t("accounts.lifecycle.reactivate")}
                            </Button>
                        )}
                        {account.status !== "closed" && !account.is_owner && (
                            <Button
                                variant="destructive"
                                className="gap-1.5"
                                onClick={() => { setCloseOpen(true); }}
                            >
                                <Ban className="size-3.5" />
                                {t("accounts.lifecycle.close")}
                            </Button>
                        )}
                    </div>
                    {account.is_owner && (
                        <p className="mt-3 text-[12px] text-muted-foreground">
                            {t("accounts.lifecycle.defaultHint")}
                        </p>
                    )}
                </Section>
            )}

            <MembersSection accountId={account.id} />

            <Section variant="panel" title={t("accounts.detail.meta")}>
                <KeyValueGrid
                    columns={2}
                    items={[
                        { label: t("accounts.detail.accountNumber"), value: account.account_number, mono: true, copyable: true },
                        { label: t("accounts.detail.accountId"), value: account.id, mono: true, copyable: true },
                        { label: t("org.settings.status"), value: <StatusBadge status={account.status} /> },
                    ]}
                />
            </Section>

            <ConfirmDialog
                open={closeOpen}
                onOpenChange={setCloseOpen}
                title={t("accounts.closeConfirm.title")}
                description={t("accounts.closeConfirm.description", { name: account.name })}
                confirmText={account.name}
                confirmLabel={t("accounts.lifecycle.close")}
                loading={saving}
                onConfirm={() =>
                    { update(
                        { id: account.id, payload: { status: "closed" } },
                        { onSuccess: () => { setCloseOpen(false); } }
                    ); }
                }
            />
        </div>
    )
}

function MembersSection({ accountId }: Readonly<{ accountId: string }>) {
    const { t } = useTranslation()
    const { data: members = [], isLoading } = useAccountMembers(accountId)

    let body
    if (isLoading) {
        body = <Skeleton className="h-16 rounded-lg" />
    } else if (members.length === 0) {
        body = <p className="text-sm text-muted-foreground">{t("accounts.members.empty")}</p>
    } else {
        body = (
            <ul className="divide-y divide-border rounded-lg border">
                {members.map((m) => {
                    const displayName = m.name || t("accounts.members.unknownUser")
                    return (
                        <li
                            key={m.id}
                            className="flex items-center justify-between gap-3 px-3 py-2.5"
                        >
                            <span className="inline-flex items-center gap-3 min-w-0">
                                <Avatar className="size-8 shrink-0">
                                    <AvatarFallback className="bg-brand-gold-soft text-[11px] font-semibold text-brand-gold">
                                        {initialsOf(displayName)}
                                    </AvatarFallback>
                                </Avatar>
                                <span className="flex min-w-0 flex-col leading-tight">
                                    <span className="text-sm font-medium text-foreground truncate">
                                        {displayName}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground truncate">
                                        {m.email || `${t("accounts.detail.accountId")} ${m.user_id}`}
                                    </span>
                                </span>
                            </span>
                            <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-foreground">
                                {t(`accounts.roles.${m.member_role}`)}
                            </span>
                        </li>
                    )
                })}
            </ul>
        )
    }

    return (
        <Section
            variant="panel"
            title={t("accounts.members.title")}
            description={t("accounts.members.description")}
        >
            {body}
        </Section>
    )
}
