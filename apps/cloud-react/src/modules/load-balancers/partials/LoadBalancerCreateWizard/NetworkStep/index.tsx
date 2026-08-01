import { useState } from "react"

import { Plus } from "lucide-react"
import { useFieldArray, type UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { useAllSubnets, useVPCs } from "@/modules/vpc/vpc.hooks"

import type { FormValues } from "../schema"
import { InlineSubnetSheet } from "./InlineSubnetSheet"
import { InlineVpcSheet } from "./InlineVpcSheet"
import { VpcSubnetGroup } from "./VpcSubnetGroup"

/**
 * Where the load balancer lives.
 *
 * A load balancer can span several VPCs, and within each VPC several subnets —
 * one private NIC (and IP) per subnet so HAProxy can reach targets in each. A
 * VPC may be added once, and each subnet picked at most once.
 *
 * Both lists are fetched once here and filtered client-side. Each VPC group used
 * to run its own subnet query, which meant N round trips and pickers that
 * populated at different moments.
 */
export function NetworkStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
    const { t } = useTranslation()
    const {
        control,
        watch,
        formState: { errors },
    } = form
    const { fields, append, remove } = useFieldArray({ control, name: "vpcs" })

    const { data: vpcs = [], isLoading: vpcsLoading, isError: vpcsError } = useVPCs()
    const { data: subnets = [] } = useAllSubnets()

    const [vpcSheetOpen, setVpcSheetOpen] = useState(false)
    const [subnetSheetFor, setSubnetSheetFor] = useState<string | null>(null)

    // VPCs already chosen in other groups, so each VPC is offered only once.
    const selected = watch("vpcs")
    // Array-level errors (min(1) / duplicate refine) land on the array root.
    const arrayError = errors.vpcs?.root?.message ?? errors.vpcs?.message

    // Surface the list's real state instead of a silent empty dropdown: the list
    // API can fail, still be loading, or legitimately return nothing (no VPC in
    // this region). Any of those otherwise looks identical — an empty picker.
    const noVpcs = !vpcsLoading && !vpcsError && vpcs.length === 0

    return (
        <div className="space-y-5">
            {vpcsError && (
                <div className="glass-1 rounded-lg border border-destructive/40 p-3 text-[12px] text-destructive">
                    {t("loadBalancers.wizard.vpcsError")}
                </div>
            )}
            {noVpcs && (
                <div className="glass-1 flex flex-wrap items-center gap-3 rounded-lg border border-status-warning/40 p-3 text-[12px] text-status-warning">
                    <span>{t("loadBalancers.wizard.vpcsEmpty")}</span>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setVpcSheetOpen(true)
                        }}
                    >
                        {t("loadBalancers.wizard.createVpc")}
                    </Button>
                </div>
            )}

            <div className="space-y-3">
                {fields.map((field, index) => (
                    <VpcSubnetGroup
                        key={field.id}
                        form={form}
                        index={index}
                        vpcs={vpcs}
                        subnets={subnets}
                        vpcsLoading={vpcsLoading}
                        takenVpcIds={
                            new Set(
                                selected
                                    .map((g, i) => (i === index ? "" : g.vpc_id))
                                    .filter(Boolean)
                            )
                        }
                        canRemove={fields.length > 1}
                        onRemove={() => {
                            remove(index)
                        }}
                        onAddSubnet={setSubnetSheetFor}
                    />
                ))}
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                        append({ vpc_id: "", subnet_ids: [] })
                    }}
                >
                    <Plus className="size-3.5" />
                    {t("loadBalancers.wizard.addVpc")}
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                        setVpcSheetOpen(true)
                    }}
                >
                    <Plus className="size-3.5" />
                    {t("loadBalancers.wizard.createVpc")}
                </Button>
            </div>

            {typeof arrayError === "string" && (
                <p className="text-[11px] text-destructive">{arrayError}</p>
            )}

            <p className="text-[11px] text-muted-foreground">
                {t("loadBalancers.wizard.vpcsHint")}
            </p>

            <InlineVpcSheet
                open={vpcSheetOpen}
                onOpenChange={setVpcSheetOpen}
                onCreated={(vpcId) => {
                    // Drop the new VPC into the first empty group, or add one.
                    const emptyIndex = selected.findIndex((g) => !g.vpc_id)
                    if (emptyIndex >= 0) {
                        form.setValue(
                            `vpcs.${String(emptyIndex)}.vpc_id` as `vpcs.${number}.vpc_id`,
                            vpcId,
                            {
                                shouldValidate: true,
                            }
                        )
                    } else {
                        append({ vpc_id: vpcId, subnet_ids: [] })
                    }
                }}
            />
            <InlineSubnetSheet
                vpcId={subnetSheetFor}
                onOpenChange={(open) => {
                    if (!open) setSubnetSheetFor(null)
                }}
            />
        </div>
    )
}
