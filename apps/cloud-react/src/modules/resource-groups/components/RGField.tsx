import { useEffect, useMemo, useState } from "react"

import { Check, ChevronsUpDown, FolderTree, Loader2, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import { namingNameSchema } from "@/modules/governance/governance.validation"

import { useResourceGroup } from "../resource-group.context"
import { useCreateResourceGroup, useResourceGroups } from "../resource-groups.hooks"
import type { ResourceGroup } from "../resource-groups.types"

interface RGFieldProps {
    value: string
    onChange: (id: string) => void
    /** When true, default to the globally-selected RG once one is available. */
    defaultToActive?: boolean
    "aria-invalid"?: boolean
    disabled?: boolean
}

/**
 * A required resource-group picker for create forms. It lists the account's
 * groups, defaults to the globally-selected one (the topbar RG selector), and
 * — when there are none, or the user wants a fresh one — flips to an inline
 * "New resource group" form in the same popover, auto-selecting whatever gets
 * created. A single Popover (no nested menu) keeps the trigger ref stable.
 */
export function RGField({
    value,
    onChange,
    defaultToActive = true,
    "aria-invalid": ariaInvalid,
    disabled,
}: Readonly<RGFieldProps>) {
    const { t } = useTranslation()
    const { activeRG } = useResourceGroup()
    const { data: groups = [], isLoading } = useResourceGroups()
    const [open, setOpen] = useState(false)
    const [mode, setMode] = useState<"list" | "create">("list")

    // Seed the field from the globally-active RG (or the first available one) so
    // the form starts on the same group the rest of the console is scoped to.
    useEffect(() => {
        if (value || !defaultToActive) return
        const seed = activeRG ?? groups.at(0)
        if (seed) onChange(seed.id)
    }, [value, defaultToActive, activeRG, groups, onChange])

    const selected =
        groups.find((g) => g.id === value) ?? (value === activeRG?.id ? activeRG : null)
    let label = selected?.name ?? t("resourceGroups.field.placeholder")
    if (!selected && isLoading) label = t("common.loading")

    const close = () => {
        setOpen(false)
        setMode("list")
    }

    let listBody: React.ReactNode
    if (isLoading) {
        listBody = (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">{t("common.loading")}</p>
        )
    } else if (groups.length === 0) {
        listBody = (
            <p className="px-2 py-1.5 text-xs text-muted-foreground">
                {t("resourceGroups.field.none")}
            </p>
        )
    } else {
        listBody = groups.map((rg) => {
            const isActive = rg.id === value
            return (
                <button
                    key={rg.id}
                    type="button"
                    onClick={() => {
                        onChange(rg.id)
                        close()
                    }}
                    className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left hover:bg-accent"
                >
                    <span
                        className="size-2 shrink-0 rounded-full"
                        style={{
                            background:
                                rg.status === "active"
                                    ? "var(--success-pulse)"
                                    : "var(--bsc-outline)",
                        }}
                    />
                    <span className="min-w-0 flex-1 truncate font-mono text-xs">{rg.name}</span>
                    {isActive && <Check className="size-3.5 shrink-0 text-primary" />}
                </button>
            )
        })
    }

    return (
        <Popover
            open={open}
            onOpenChange={(o) => {
                setOpen(o)
                if (!o) setMode("list")
            }}
        >
            <PopoverTrigger asChild>
                <Button
                    type="button"
                    variant="outline"
                    disabled={disabled}
                    aria-invalid={ariaInvalid}
                    className={cn(
                        "w-full justify-between font-normal",
                        !selected && "text-muted-foreground",
                        ariaInvalid && "border-destructive ring-destructive/20"
                    )}
                >
                    <span className="flex min-w-0 items-center gap-2">
                        <FolderTree className="size-3.5 shrink-0 text-muted-foreground" />
                        <span className="truncate font-mono text-[13px]">{label}</span>
                    </span>
                    <ChevronsUpDown className="size-3.5 shrink-0 text-muted-foreground" />
                </Button>
            </PopoverTrigger>

            <PopoverContent
                align="start"
                className="w-[--radix-popover-trigger-width] min-w-64 p-0"
            >
                {mode === "create" ? (
                    <CreateRGPopoverForm
                        onCancel={() => {
                            setMode("list")
                        }}
                        onCreated={(rg) => {
                            onChange(rg.id)
                            close()
                        }}
                    />
                ) : (
                    <div className="p-1">
                        <p className="px-2 py-1.5 text-xs text-muted-foreground">
                            {t("nav.rgSelector")}
                        </p>
                        <div className="my-1 h-px bg-border" />
                        <div className="max-h-56 overflow-y-auto">{listBody}</div>
                        <div className="my-1 h-px bg-border" />
                        <button
                            type="button"
                            onClick={() => {
                                setMode("create")
                            }}
                            className="flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-primary hover:bg-accent"
                        >
                            <Plus className="size-3.5" />
                            {t("resourceGroups.field.create")}
                        </button>
                    </div>
                )}
            </PopoverContent>
        </Popover>
    )
}

/* ── Inline create form (popover body) ─────────────────────────────────────
 * A compact name + description form that creates a resource group without
 * leaving the VM wizard, auto-selecting it on success. Heavier editing (tags,
 * etc.) still lives in the full RG console.
 */
function CreateRGPopoverForm({
    onCancel,
    onCreated,
}: Readonly<{
    onCancel: () => void
    onCreated: (rg: ResourceGroup) => void
}>) {
    const { t } = useTranslation()
    const { mutate: create, isPending } = useCreateResourceGroup()
    const { rule } = useNamingRule("resource-group")
    const nameSchema = useMemo(() => namingNameSchema(rule), [rule])

    const [name, setName] = useState("")
    const [description, setDescription] = useState("")
    const [error, setError] = useState<string | null>(null)

    const submit = () => {
        const result = nameSchema.safeParse(name.trim())
        if (!result.success) {
            setError(result.error.issues[0]?.message ?? "Required")
            return
        }
        setError(null)
        create(
            { name: result.data, description: description.trim() },
            {
                onSuccess: (rg) => {
                    onCreated(rg)
                },
            }
        )
    }

    return (
        <div className="space-y-3 p-4">
            <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                    {t("resourceGroups.field.create")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                    {t("resourceGroups.field.hint")}
                </p>
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    {t("resourceGroups.form.name")}
                    <span className="ml-0.5 text-destructive">*</span>
                </Label>
                <Input
                    value={name}
                    onChange={(e) => {
                        setName(e.target.value)
                        if (error) setError(null)
                    }}
                    onKeyDown={(e) => {
                        if (e.key === "Enter") {
                            e.preventDefault()
                            submit()
                        }
                    }}
                    placeholder="my-resource-group"
                    className="font-mono"
                />
                {error && <p className="text-[11px] text-destructive">{error}</p>}
            </div>

            <div className="space-y-1.5">
                <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    {t("resourceGroups.form.description")}
                </Label>
                <Textarea
                    value={description}
                    onChange={(e) => {
                        setDescription(e.target.value)
                    }}
                    placeholder={t("resourceGroups.form.descriptionPlaceholder")}
                    rows={2}
                    className="resize-none text-[13px]"
                />
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
                <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
                    {t("resourceGroups.form.cancel")}
                </Button>
                <Button
                    type="button"
                    variant="gold"
                    size="sm"
                    className="gap-1.5"
                    disabled={isPending}
                    onClick={submit}
                >
                    {isPending && <Loader2 className="size-3.5 animate-spin" />}
                    {t("resourceGroups.form.create")}
                </Button>
            </div>
        </div>
    )
}
