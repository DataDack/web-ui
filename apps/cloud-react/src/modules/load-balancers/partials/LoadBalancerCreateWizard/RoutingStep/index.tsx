import { useMemo } from "react"

import { Ear, Plus } from "lucide-react"
import { useFieldArray, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { EmptyState } from "@/components/console"
import { Button } from "@/components/ui/button"
import { useTargetGroups } from "@/modules/target-groups/target-groups.hooks"
import { useInstances } from "@/modules/vms/vms.hooks"

import { RouteCard } from "./RouteCard"
import { PROTOCOLS_BY_LB_TYPE } from "../../../load-balancers.types"
import { emptyListener, type FormValues } from "../schema"

/**
 * Where traffic arrives and where it goes — one card per route.
 *
 * This was two steps, Listeners then Targets, which split a single decision in
 * half: the same port appeared on both screens, a listener with no destination
 * looked complete until submit, and two destinations referenced by name were
 * indistinguishable. Adding a port and saying where it goes is one thought, so
 * it is one card.
 *
 * Several routes may still share a target group — point each at the same
 * existing group. That is the rare case and does not need to shape the form.
 */
export function RoutingStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
    const { t } = useTranslation()
    const { control, watch } = form
    const { fields, append, remove } = useFieldArray({ control, name: "listeners" })
    const lbType = watch("type")
    const vpcs = watch("vpcs")

    const { data: instances = [], isLoading: instancesLoading } = useInstances()
    const { data: allGroups = [] } = useTargetGroups()

    // A group outside the VPCs this load balancer has a NIC in holds targets it
    // could never route to, so those are not offered.
    const reachableVpcIds = useMemo(
        () => new Set(vpcs.map((v) => v.vpc_id).filter(Boolean)),
        [vpcs],
    )
    const existingGroups = useMemo(
        () => allGroups.filter((g) => reachableVpcIds.has(g.vpc_id)),
        [allGroups, reachableVpcIds],
    )

    // Each LB type permits exactly one listener protocol; the backend rejects
    // the other, so the form never offers it.
    const protocol = PROTOCOLS_BY_LB_TYPE[lbType][0]
    const defaultPort = protocol === "HTTP" ? 80 : 8080

    return (
        <div className="space-y-4">
            {fields.length === 0 ? (
                <EmptyState
                    icon={Ear}
                    title={t("loadBalancers.wizard.noListenersTitle")}
                    description={t("loadBalancers.wizard.noListenersDescription")}
                />
            ) : (
                <div className="space-y-3">
                    {fields.map((field, index) => (
                        <RouteCard
                            key={field.id}
                            form={form}
                            index={index}
                            instances={instances}
                            instancesLoading={instancesLoading}
                            reachableVpcIds={reachableVpcIds}
                            existingGroups={existingGroups}
                            canRemove={fields.length > 1}
                            onRemove={() => {
                                remove(index)
                            }}
                        />
                    ))}
                </div>
            )}

            <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => {
                    append(emptyListener(protocol, defaultPort, 8080))
                }}
            >
                <Plus className="size-3.5" />
                {t("loadBalancers.wizard.addRoute")}
            </Button>

            <p className="text-[11px] text-muted-foreground">
                {t("loadBalancers.wizard.routingHint")}
            </p>
        </div>
    )
}
