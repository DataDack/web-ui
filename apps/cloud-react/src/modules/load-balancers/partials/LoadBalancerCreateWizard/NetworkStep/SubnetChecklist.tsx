import { useTranslation } from "react-i18next"

import { Checkbox } from "@/components/ui/checkbox"
import type { Subnet } from "@/modules/vpc/vpc.types"

/**
 * The multi-select list of a VPC's subnets. Split out so the empty states (no
 * VPC chosen yet / VPC has no subnets) read as plain branches rather than a
 * nested ternary.
 */
export function SubnetChecklist({
    vpcId,
    subnets,
    selectedIds,
    onToggle,
}: Readonly<{
    vpcId: string
    subnets: Subnet[]
    selectedIds: string[]
    onToggle: (subnetId: string, checked: boolean) => void
}>) {
    const { t } = useTranslation()

    if (!vpcId) {
        return (
            <p className="text-[11px] text-muted-foreground">
                {t("loadBalancers.wizard.selectVpcFirst")}
            </p>
        )
    }
    if (subnets.length === 0) {
        return (
            <p className="text-[11px] text-muted-foreground">
                {t("loadBalancers.wizard.subnetPlaceholder")}
            </p>
        )
    }
    return (
        <div className="space-y-1.5">
            {subnets.map((subnet) => (
                <label
                    key={subnet.id}
                    className="flex items-center gap-2.5 rounded-md border border-border/60 px-2.5 py-2 text-[13px] hover:border-border cursor-pointer"
                >
                    <Checkbox
                        checked={selectedIds.includes(subnet.id)}
                        aria-label={subnet.name}
                        onCheckedChange={(v) => {
                            onToggle(subnet.id, v === true)
                        }}
                    />
                    <span>
                        {subnet.name} <span className="text-muted-foreground">({subnet.cidr})</span>
                    </span>
                    <span className="flex-1" />
                    {/* The load balancer takes one address per subnet, so a nearly
                        full subnet is worth seeing before it is chosen. */}
                    {subnet.available_ips !== undefined && (
                        <span className="rounded-full bg-status-neutral-bg px-1.5 py-0.5 text-[10px] text-status-neutral">
                            {t("loadBalancers.wizard.ipsFree", { count: subnet.available_ips })}
                        </span>
                    )}
                </label>
            ))}
        </div>
    )
}
