import { useMemo, useState } from "react"

import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import type { Instance } from "@/modules/vms/vms.types"

import type { TargetFormValues } from "../schema"

/** Why an instance cannot be a target, or null when it can. */
type Ineligibility = "not_running" | "wrong_vpc" | "no_private_ip"

interface Candidate {
    instance: Instance
    reason: Ineligibility | null
}

/**
 * Instances offered as backends, with the ineligible ones SHOWN AND DISABLED
 * rather than filtered out.
 *
 * Hiding them is the worse failure: someone looking for their database and not
 * finding it has no way to learn that it is stopped, or sits in a subnet this
 * load balancer has no route to. The three reasons here are exactly the
 * conditions the backend rejects or silently skips.
 *
 * A selected instance also gets a port field. RegisterTargetRequest has always
 * accepted a per-target port and defaulted to the group's when omitted, so
 * blank means "inherit" — which is why it is a placeholder, not a value.
 */
export function TargetPicker({
    instances,
    isLoading,
    reachableVpcIds,
    groupPort,
    targets,
    onToggle,
    onPortChange,
}: Readonly<{
    instances: Instance[]
    isLoading: boolean
    reachableVpcIds: ReadonlySet<string>
    groupPort: number
    targets: TargetFormValues[]
    onToggle: (instanceId: string, checked: boolean) => void
    onPortChange: (instanceId: string, port: string) => void
}>) {
    const { t } = useTranslation()
    const [showIneligible, setShowIneligible] = useState(false)

    const selected = useMemo(
        () => new Map(targets.map((tgt) => [tgt.instance_id, tgt.port])),
        [targets]
    )

    const candidates: Candidate[] = useMemo(
        () =>
            instances
                .map((instance) => ({
                    instance,
                    reason: ineligibility(instance, reachableVpcIds),
                }))
                // Eligible first, then by name, so the useful rows are on top.
                .sort((a, b) => {
                    if ((a.reason === null) !== (b.reason === null))
                        return a.reason === null ? -1 : 1
                    return a.instance.name.localeCompare(b.instance.name)
                }),
        [instances, reachableVpcIds]
    )

    const eligibleCount = candidates.filter((c) => c.reason === null).length
    const visible = showIneligible ? candidates : candidates.filter((c) => c.reason === null)

    if (isLoading) {
        return (
            <p className="text-[11px] text-muted-foreground">
                {t("loadBalancers.wizard.instancesLoading")}
            </p>
        )
    }
    if (instances.length === 0) {
        return (
            <p className="text-[11px] text-muted-foreground">
                {t("loadBalancers.wizard.noInstances")}
            </p>
        )
    }

    return (
        <div className="space-y-1.5">
            <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground">
                    {t("loadBalancers.wizard.eligibleCount", {
                        eligible: eligibleCount,
                        total: candidates.length,
                    })}
                </span>
                <span className="flex-1" />
                {eligibleCount < candidates.length && (
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-auto py-0.5 text-[11px]"
                        onClick={() => {
                            setShowIneligible((v) => !v)
                        }}
                    >
                        {showIneligible
                            ? t("loadBalancers.wizard.hideIneligible")
                            : t("loadBalancers.wizard.showIneligible")}
                    </Button>
                )}
            </div>

            {eligibleCount === 0 && !showIneligible && (
                <p className="text-[11px] text-status-warning">
                    {t("loadBalancers.wizard.noEligibleInstances")}
                </p>
            )}

            <div className="space-y-1.5">
                {visible.map(({ instance, reason }) => {
                    const disabled = reason !== null
                    const isOn = selected.has(instance.id)
                    return (
                        <div
                            key={instance.id}
                            className={cn(
                                "flex items-center gap-2.5 rounded-md border border-border/60 px-2.5 py-2 text-[13px]",
                                disabled ? "opacity-50" : "hover:border-border"
                            )}
                        >
                            <label
                                className={cn(
                                    "flex min-w-0 flex-1 items-center gap-2.5",
                                    disabled ? "cursor-not-allowed" : "cursor-pointer"
                                )}
                            >
                                <Checkbox
                                    checked={isOn}
                                    disabled={disabled}
                                    aria-label={instance.name}
                                    onCheckedChange={(v) => {
                                        onToggle(instance.id, v === true)
                                    }}
                                />
                                <span className="truncate font-mono">{instance.name}</span>
                                <span className="text-[12px] text-muted-foreground">
                                    {instance.private_ip || "—"}
                                </span>
                            </label>

                            {isOn ? (
                                <Input
                                    className="h-7 w-24 font-mono text-[12px]"
                                    inputMode="numeric"
                                    aria-label={t("loadBalancers.form2.targetPortFor", {
                                        name: instance.name,
                                    })}
                                    placeholder={String(groupPort)}
                                    value={selected.get(instance.id) ?? ""}
                                    onChange={(e) => {
                                        onPortChange(instance.id, e.target.value)
                                    }}
                                />
                            ) : (
                                <span
                                    className={cn(
                                        "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                                        disabled
                                            ? "bg-status-warning-bg text-status-warning"
                                            : "bg-status-success-bg text-status-success"
                                    )}
                                >
                                    {reason === null
                                        ? t("loadBalancers.wizard.eligible")
                                        : t(`loadBalancers.wizard.ineligible.${reason}`)}
                                </span>
                            )}
                        </div>
                    )
                })}
            </div>

            <p className="text-[11px] text-muted-foreground">
                {t("loadBalancers.form2.targetPortHint", { port: groupPort })}
            </p>
        </div>
    )
}

/**
 * The backend's own rules, applied here so the reason is visible before submit
 * rather than arriving as a 400 afterwards:
 *   - no private IP → RegisterTarget rejects it outright; the LB reaches
 *     backends over the SDN vnet, so an instance outside a subnet is unreachable
 *   - outside the LB's VPCs → no NIC on that network, so the backend could only
 *     ever be unhealthy
 *   - not running → nothing is listening to health-check
 */
function ineligibility(
    instance: Instance,
    reachableVpcIds: ReadonlySet<string>
): Ineligibility | null {
    if (!instance.private_ip) return "no_private_ip"
    if (!reachableVpcIds.has(instance.vpc_id)) return "wrong_vpc"
    if (instance.status !== "running") return "not_running"
    return null
}
