import { useMemo, useState } from "react"

import { Loader2, Minus, Plus } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

import { QuotaRing } from "../../components/QuotaRing"
import { useRequestQuotaIncrease } from "../../quotas.hooks"
import type { EffectiveQuota } from "../../quotas.types"

const MIN_JUSTIFICATION = 20

interface RequestIncreaseDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    quotas: EffectiveQuota[]
    /** Preselects the quota (row action / ?request=<code> deep link). */
    initialCode?: string | null
}

/**
 * Quota increase request form: pick an adjustable quota, step the new limit
 * above the current one, and justify the ask. The parent remounts the dialog
 * (via key) whenever the preselected code changes, so state seeds once.
 */
export function RequestIncreaseDialog({
    open,
    onOpenChange,
    quotas,
    initialCode = null,
}: Readonly<RequestIncreaseDialogProps>) {
    const { t } = useTranslation()
    const { mutate: requestIncrease, isPending } = useRequestQuotaIncrease()

    // Adjustable quotas only; an unlimited quota has nothing left to raise.
    const options = useMemo(() => quotas.filter((q) => q.adjustable && q.limit !== -1), [quotas])

    const [code, setCode] = useState<string | null>(initialCode)
    const [limitInput, setLimitInput] = useState("")
    const [justification, setJustification] = useState("")

    const selected = options.find((q) => q.code === code)
    const minLimit = selected ? selected.limit + 1 : 1
    const parsed = Number.parseInt(limitInput, 10)
    const newLimit = Number.isNaN(parsed) ? minLimit : parsed

    const justificationLength = justification.trim().length
    const limitValid = selected !== undefined && newLimit >= minLimit
    const canSubmit = limitValid && justificationLength >= MIN_JUSTIFICATION && !isPending

    const reset = () => {
        setCode(initialCode)
        setLimitInput("")
        setJustification("")
    }

    const submit = () => {
        if (!selected || !canSubmit) return
        requestIncrease(
            {
                quota_code: selected.code,
                requested_limit: newLimit,
                justification: justification.trim(),
            },
            {
                onSuccess: () => {
                    onOpenChange(false)
                    reset()
                },
            }
        )
    }

    return (
        <Dialog
            open={open}
            onOpenChange={(next) => {
                onOpenChange(next)
                if (!next) reset()
            }}
        >
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{t("governance.quotas.dialog.title")}</DialogTitle>
                    <DialogDescription>
                        {t("governance.quotas.dialog.description")}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4">
                    {selected && (
                        <div className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5">
                            <QuotaRing used={selected.usage} limit={selected.limit} size={40} />
                            <div className="min-w-0">
                                <div className="truncate text-sm font-medium text-foreground">
                                    {selected.name}
                                </div>
                                <div className="font-mono text-[12px] tabular-nums text-muted-foreground">
                                    {t("governance.quotas.usageOf", {
                                        used: selected.usage,
                                        limit: selected.limit,
                                    })}
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <Label>{t("governance.quotas.dialog.quota")}</Label>
                        <Select
                            value={code ?? ""}
                            onValueChange={(v) => {
                                setCode(v)
                                const next = options.find((q) => q.code === v)
                                if (next) setLimitInput(String(next.limit + 1))
                            }}
                        >
                            <SelectTrigger className="w-full">
                                <SelectValue
                                    placeholder={t("governance.quotas.dialog.quotaPlaceholder")}
                                />
                            </SelectTrigger>
                            <SelectContent>
                                {options.map((q) => (
                                    <SelectItem key={q.code} value={q.code}>
                                        <span>{q.name}</span>
                                        <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                                            {t("governance.quotas.dialog.currentLimit", {
                                                limit: q.limit,
                                            })}
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label htmlFor="quota-new-limit">
                            {t("governance.quotas.dialog.newLimit")}
                        </Label>
                        <div className="flex items-center gap-2">
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t("governance.quotas.dialog.decrease")}
                                disabled={!selected || newLimit <= minLimit}
                                onClick={() => {
                                    setLimitInput(String(Math.max(minLimit, newLimit - 1)))
                                }}
                            >
                                <Minus className="size-4" />
                            </Button>
                            <Input
                                id="quota-new-limit"
                                type="number"
                                inputMode="numeric"
                                min={minLimit}
                                step={1}
                                value={limitInput}
                                placeholder={String(minLimit)}
                                disabled={!selected}
                                onChange={(e) => {
                                    setLimitInput(e.target.value)
                                }}
                                className="text-center font-mono tabular-nums"
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                aria-label={t("governance.quotas.dialog.increase")}
                                disabled={!selected}
                                onClick={() => {
                                    setLimitInput(String(Math.max(minLimit, newLimit + 1)))
                                }}
                            >
                                <Plus className="size-4" />
                            </Button>
                        </div>
                        {selected && (
                            <p className="text-[12px] text-muted-foreground">
                                {t("governance.quotas.dialog.minHint", { limit: selected.limit })}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label htmlFor="quota-justification">
                                {t("governance.quotas.dialog.justification")}
                            </Label>
                            <span
                                className={cn(
                                    "font-mono text-[11px] tabular-nums",
                                    justificationLength >= MIN_JUSTIFICATION
                                        ? "text-status-success"
                                        : "text-muted-foreground"
                                )}
                            >
                                {t("governance.quotas.dialog.charCount", {
                                    count: justificationLength,
                                    min: MIN_JUSTIFICATION,
                                })}
                            </span>
                        </div>
                        <Textarea
                            id="quota-justification"
                            rows={4}
                            value={justification}
                            placeholder={t("governance.quotas.dialog.justificationPlaceholder")}
                            onChange={(e) => {
                                setJustification(e.target.value)
                            }}
                        />
                    </div>

                    <p className="text-[12px] text-muted-foreground">
                        {t("governance.quotas.dialog.footerNote")}
                    </p>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => {
                            onOpenChange(false)
                            reset()
                        }}
                    >
                        {t("governance.quotas.dialog.cancel")}
                    </Button>
                    <Button disabled={!canSubmit} onClick={submit} className="gap-2">
                        {isPending && <Loader2 className="size-4 animate-spin" />}
                        {t("governance.quotas.dialog.submit")}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
