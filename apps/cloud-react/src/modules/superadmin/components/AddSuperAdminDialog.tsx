import { useEffect, useMemo, useState } from "react"

import { ArrowLeft, ChevronRight, Loader2, Mail, Search, Shield } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"

import { useAdminUsers, useSetSuperAdmin } from "../superadmin.hooks"
import type { AdminUser } from "../superadmin.types"

interface AddSuperAdminDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
}

// Two-step dialog for promoting a platform user to super admin:
//   1. Search (server-side, by name/email) and pick a candidate who is not yet
//      a super admin.
//   2. Review that user's details and explicitly confirm the grant.
// Picking is deliberately separated from confirming so the destructive grant is
// never a single mis-click on a cramped inline button.
export function AddSuperAdminDialog({ open, onOpenChange }: Readonly<AddSuperAdminDialogProps>) {
    const { t } = useTranslation()
    const [query, setQuery] = useState("")
    const [debounced, setDebounced] = useState("")
    const [selected, setSelected] = useState<AdminUser | null>(null)
    const [pending, setPending] = useState(false)

    // Debounce the search so each keystroke doesn't fire a request.
    useEffect(() => {
        const id = setTimeout(() => {
            setDebounced(query.trim())
        }, 250)
        return () => {
            clearTimeout(id)
        }
    }, [query])

    const { data: users = [], isFetching } = useAdminUsers(debounced || undefined)
    const { mutate: setSuperAdmin } = useSetSuperAdmin()

    const candidates = useMemo<AdminUser[]>(() => users.filter((u) => !u.is_super_admin), [users])

    // Reset local state on close so the dialog opens fresh next time.
    const handleOpenChange = (next: boolean) => {
        if (!next) {
            setQuery("")
            setDebounced("")
            setSelected(null)
            setPending(false)
        }
        onOpenChange(next)
    }

    const confirmGrant = () => {
        if (!selected) return
        setPending(true)
        setSuperAdmin(
            { id: selected.id, isSuperAdmin: true },
            {
                onSuccess: () => {
                    handleOpenChange(false)
                },
                onSettled: () => {
                    setPending(false)
                },
            }
        )
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-md glass-3">
                {selected ? renderConfirm(selected) : renderSearch()}
            </DialogContent>
        </Dialog>
    )

    function renderSearch() {
        return (
            <>
                <DialogHeader>
                    <DialogTitle>{t("superAdmin.users.addDialog.title")}</DialogTitle>
                    <DialogDescription>
                        {t("superAdmin.users.addDialog.description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="relative">
                    <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        value={query}
                        onChange={(e) => {
                            setQuery(e.target.value)
                        }}
                        placeholder={t("superAdmin.users.addDialog.searchPlaceholder")}
                        className="h-9 pl-8"
                        // eslint-disable-next-line jsx-a11y/no-autofocus -- dialog focus management: the search field is the dialog's single purpose and receives focus on open
                        autoFocus
                        // Defeat the browser's email/contact autofill overlay, which
                        // otherwise covers the results dropdown.
                        type="text"
                        name="dd-superadmin-search"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck={false}
                        data-1p-ignore
                        data-lpignore="true"
                        aria-autocomplete="list"
                    />
                </div>

                <div className="max-h-72 min-h-24 overflow-y-auto rounded-md border">
                    {renderResults()}
                </div>
            </>
        )
    }

    function renderResults() {
        if (!debounced) {
            return (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {t("superAdmin.users.addDialog.prompt")}
                </p>
            )
        }
        if (isFetching && candidates.length === 0) {
            return (
                <div className="flex items-center justify-center px-3 py-6 text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                </div>
            )
        }
        if (candidates.length === 0) {
            const hasUsers = users.length > 0
            return (
                <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                    {hasUsers
                        ? t("superAdmin.users.addDialog.noCandidates")
                        : t("superAdmin.users.addDialog.empty")}
                </p>
            )
        }
        return (
            <ul className="divide-y">
                {candidates.map((u) => (
                    <li key={u.id}>
                        <button
                            type="button"
                            onClick={() => {
                                setSelected(u)
                            }}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                        >
                            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold uppercase text-muted-foreground">
                                {initials(u.name, u.email)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-medium">{u.name}</span>
                                <span className="block truncate text-xs text-muted-foreground">
                                    {u.email}
                                </span>
                            </span>
                            <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
                        </button>
                    </li>
                ))}
            </ul>
        )
    }

    function renderConfirm(u: AdminUser) {
        return (
            <>
                <DialogHeader>
                    <DialogTitle>{t("superAdmin.users.addDialog.confirmTitle")}</DialogTitle>
                    <DialogDescription>
                        {t("superAdmin.users.addDialog.confirmDescription")}
                    </DialogDescription>
                </DialogHeader>

                <div className="rounded-lg border bg-muted/30 p-4">
                    <div className="flex items-center gap-3">
                        <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold uppercase text-muted-foreground">
                            {initials(u.name, u.email)}
                        </span>
                        <div className="min-w-0">
                            <p className="truncate text-sm font-semibold">{u.name}</p>
                            <p className="flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                                <Mail className="size-3 shrink-0" />
                                {u.email}
                            </p>
                        </div>
                    </div>

                    <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-4 text-sm">
                        <DetailRow label={t("superAdmin.users.fields.role")} value={u.role} />
                        <DetailRow
                            label={t("superAdmin.users.fields.status")}
                            value={
                                <span
                                    className={
                                        u.is_active ? "text-emerald-500" : "text-muted-foreground"
                                    }
                                >
                                    {u.is_active ? "Active" : "Inactive"}
                                </span>
                            }
                        />
                        <DetailRow
                            label={t("superAdmin.users.fields.created")}
                            value={formatDate(u.created_at)}
                        />
                    </dl>
                </div>

                <div className="mt-2 flex items-center justify-between gap-2">
                    <Button
                        variant="ghost"
                        onClick={() => {
                            setSelected(null)
                        }}
                        disabled={pending}
                    >
                        <ArrowLeft className="size-4" />
                        {t("superAdmin.users.addDialog.back")}
                    </Button>
                    <Button variant="gold" onClick={confirmGrant} disabled={pending}>
                        {pending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <Shield className="size-4" />
                        )}
                        {t("superAdmin.users.addDialog.grant")}
                    </Button>
                </div>
            </>
        )
    }
}

function DetailRow({ label, value }: Readonly<{ label: string; value: React.ReactNode }>) {
    return (
        <div className="min-w-0">
            <dt className="text-xs text-muted-foreground">{label}</dt>
            <dd className="mt-0.5 truncate font-medium">{value}</dd>
        </div>
    )
}

// initials derives a 1–2 char avatar label from the user's name, falling back to
// the email's first character.
function initials(name: string, email: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean)
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
    if (parts.length === 1 && parts[0]) return parts[0].slice(0, 2).toUpperCase()
    // charAt returns "" past the end, so an empty email still yields the
    // placeholder — indexing would type the char as always-present.
    return (email.charAt(0) || "?").toUpperCase()
}

function formatDate(iso: string): string {
    const d = new Date(iso)
    if (Number.isNaN(d.getTime())) return "—"
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
}
