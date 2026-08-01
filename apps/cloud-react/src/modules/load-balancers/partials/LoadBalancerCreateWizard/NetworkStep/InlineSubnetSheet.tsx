import { useMemo, useState } from "react"

import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CidrInput } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetFooter,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet"
import { useAllSubnets, useCreateSubnet, useVPC } from "@/modules/vpc/vpc.hooks"
import { nextFreeSubnetCidr, subnetCidrIssue } from "@/modules/vpc/vpc.utils"

import { SUBNET_CIDR_MESSAGES } from "./cidr-messages"

/**
 * Add a subnet to the chosen VPC without leaving the wizard.
 *
 * Portalled for the same reason as InlineVpcSheet: the wizard is a <form>, and
 * nesting another one inside it is invalid and would submit the wrong thing.
 */
export function InlineSubnetSheet({
    vpcId,
    onOpenChange,
}: Readonly<{
    vpcId: string | null
    onOpenChange: (open: boolean) => void
}>) {
    const { t } = useTranslation()
    const { data: vpc } = useVPC(vpcId ?? "")
    const { data: allSubnets = [] } = useAllSubnets()
    const { mutateAsync: createSubnet, isPending } = useCreateSubnet()

    const [name, setName] = useState("")
    // null means "not touched", so the suggestion still applies. Derived rather
    // than seeded in an effect, so the field is never briefly blank while the
    // VPC and its subnets load.
    const [cidrOverride, setCidrOverride] = useState<string | null>(null)

    const siblings = useMemo(
        () => allSubnets.filter((s) => s.network_id === vpcId).map((s) => s.cidr),
        [allSubnets, vpcId],
    )

    // The suggested block comes from the VPC's own range and the subnets already
    // carved out of it, so it is in-range and non-overlapping by construction —
    // a fixed default would collide the moment a VPC used a different range.
    const suggested = useMemo(
        () => (vpc ? (nextFreeSubnetCidr(vpc.cidr, siblings) ?? "") : ""),
        [vpc, siblings],
    )
    const cidr = cidrOverride ?? suggested
    const issue = vpc && cidr ? subnetCidrIssue(vpc.cidr, cidr, siblings) : null
    const canSubmit = name.trim() !== "" && cidr !== "" && !issue && vpcId !== null && !isPending

    const submit = () => {
        if (!vpcId) return
        void (async () => {
            try {
                await createSubnet({
                    name: name.trim(),
                    cidr,
                    zone: "",
                    network_id: vpcId,
                    // The backend requires a region on a subnet; it is always the
                    // owning VPC's.
                    region: vpc?.region ?? "",
                    is_public: false,
                })
                onOpenChange(false)
                setName("")
            } catch {
                // useCreateSubnet raises its own error toast.
            }
        })()
    }

    return (
        <Sheet open={vpcId !== null} onOpenChange={onOpenChange}>
            <SheetContent className="w-full sm:max-w-md">
                <SheetHeader>
                    <SheetTitle>{t("loadBalancers.wizard.addSubnetTitle")}</SheetTitle>
                    <SheetDescription>
                        {t("loadBalancers.wizard.addSubnetDescription", {
                            vpc: vpc?.name ?? "",
                        })}
                    </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 px-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                            {t("vpc.subnetForm.name")}
                            <span className="text-destructive ml-0.5">*</span>
                        </Label>
                        <Input
                            className="font-mono"
                            placeholder="app-b"
                            value={name}
                            onChange={(e) => {
                                setName(e.target.value)
                            }}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                            {t("vpc.subnetForm.cidr")}
                        </Label>
                        <CidrInput
                            value={cidr}
                            onChange={setCidrOverride}
                            aria-label={t("vpc.subnetForm.cidr")}
                        />
                        {issue ? (
                            <p className="text-[11px] text-destructive">
                                {SUBNET_CIDR_MESSAGES[issue]}
                            </p>
                        ) : (
                            vpc && (
                                <p className="text-[11px] text-muted-foreground">
                                    {t("loadBalancers.wizard.subnetWithinVpc", {
                                        cidr: vpc.cidr,
                                    })}
                                </p>
                            )
                        )}
                    </div>
                </div>

                <SheetFooter>
                    <Button
                        type="button"
                        variant="gold"
                        className="gap-2"
                        disabled={!canSubmit}
                        onClick={submit}
                    >
                        {isPending && <Loader2 className="size-3.5 animate-spin" />}
                        {t("loadBalancers.wizard.addSubnet")}
                    </Button>
                </SheetFooter>
            </SheetContent>
        </Sheet>
    )
}
