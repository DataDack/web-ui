import { useState } from "react"

import { ChevronDown } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import type { FormValues } from "../schema"

/**
 * Health-check settings, collapsed by default with the real defaults stated on
 * the summary line.
 *
 * Progressive disclosure only works if the collapsed state still tells you what
 * you are getting — a bare "Customize" would hide that a check exists at all.
 */
export function HealthCheckFields({
    form,
    index,
    isHTTP,
}: Readonly<{
    form: UseFormReturn<FormValues>
    index: number
    isHTTP: boolean
}>) {
    const { t } = useTranslation()
    const [open, setOpen] = useState(false)
    const {
        register,
        watch,
        formState: { errors },
    } = form
    // Cast pins the template literal back to `listeners.${number}`, which
    // react-hook-form's path types require; String(index) alone widens it.
    const path = `listeners.${String(index)}` as `listeners.${number}`
    const l = watch(path)
    const rowErrors = errors.listeners?.[index]

    const summary = isHTTP
        ? t("loadBalancers.wizard.healthSummaryHttp", {
              path: l.health_check_path,
              interval: l.health_check_interval_s,
              up: l.healthy_threshold,
              down: l.unhealthy_threshold,
          })
        : t("loadBalancers.wizard.healthSummaryTcp", {
              interval: l.health_check_interval_s,
              up: l.healthy_threshold,
              down: l.unhealthy_threshold,
          })

    return (
        <div className="rounded-md border border-border/60">
            <div className="flex items-center gap-2 px-2.5 py-2">
                <span className="text-[12px] text-muted-foreground">{summary}</span>
                <span className="flex-1" />
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-auto gap-1 py-0.5 text-[11px]"
                    aria-expanded={open}
                    onClick={() => {
                        setOpen((v) => !v)
                    }}
                >
                    {t("loadBalancers.wizard.customize")}
                    <ChevronDown
                        className={`size-3 transition-transform ${open ? "rotate-180" : ""}`}
                    />
                </Button>
            </div>

            {open && (
                <div className="grid gap-3 border-t border-border/60 p-2.5 sm:grid-cols-2">
                    {isHTTP && (
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                                {t("loadBalancers.wizard.healthPath")}
                            </Label>
                            <Input
                                className="font-mono"
                                {...register(`${path}.health_check_path`)}
                            />
                            {rowErrors?.health_check_path && (
                                <p className="text-[11px] text-destructive">
                                    {rowErrors.health_check_path.message}
                                </p>
                            )}
                        </div>
                    )}
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                            {t("loadBalancers.wizard.healthInterval")}
                        </Label>
                        <Input
                            type="number"
                            inputMode="numeric"
                            className="font-mono"
                            {...register(`${path}.health_check_interval_s`, {
                                valueAsNumber: true,
                            })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                                {t("loadBalancers.wizard.healthyThreshold")}
                            </Label>
                            <Input
                                type="number"
                                inputMode="numeric"
                                className="font-mono"
                                {...register(`${path}.healthy_threshold`, { valueAsNumber: true })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                                {t("loadBalancers.wizard.unhealthyThreshold")}
                            </Label>
                            <Input
                                type="number"
                                inputMode="numeric"
                                className="font-mono"
                                {...register(`${path}.unhealthy_threshold`, {
                                    valueAsNumber: true,
                                })}
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
