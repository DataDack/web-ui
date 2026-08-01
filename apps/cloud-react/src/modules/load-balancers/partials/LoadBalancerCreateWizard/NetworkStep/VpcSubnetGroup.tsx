import { Trash2 } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { Subnet, VPCNetwork } from "@/modules/vpc/vpc.types"

import type { FormValues } from "../schema"
import { SubnetChecklist } from "./SubnetChecklist"

/**
 * A single VPC attachment: one VPC and the subnets the load balancer lands a
 * private NIC in.
 *
 * The subnets are handed in rather than fetched per group. Each group used to
 * run its own useVPCSubnets query, so a three-VPC load balancer made three
 * round trips and each picker populated at a different moment.
 */
export function VpcSubnetGroup({
  form,
  index,
  vpcs,
  subnets,
  vpcsLoading,
  takenVpcIds,
  canRemove,
  onRemove,
  onAddSubnet,
}: Readonly<{
  form: UseFormReturn<FormValues>
  index: number
  vpcs: VPCNetwork[]
  subnets: Subnet[]
  vpcsLoading: boolean
  takenVpcIds: ReadonlySet<string>
  canRemove: boolean
  onRemove: () => void
  onAddSubnet: (vpcId: string) => void
}>) {
  const { t } = useTranslation()
  const {
    setValue,
    watch,
    formState: { errors },
  } = form
  const path = `vpcs.${String(index)}` as `vpcs.${number}`
  const vpcId = watch(`${path}.vpc_id`)
  const subnetIds = watch(`${path}.subnet_ids`)

  const groupErrors = errors.vpcs?.[index]
  const vpcSubnets = subnets.filter((s) => s.network_id === vpcId)
  const selectedVpc = vpcs.find((v) => v.id === vpcId)

  const toggleSubnet = (subnetId: string, checked: boolean) => {
    const next = checked ? [...subnetIds, subnetId] : subnetIds.filter((id) => id !== subnetId)
    setValue(`${path}.subnet_ids`, next, { shouldValidate: true })
  }

  return (
    <div className="glass-1 rounded-lg border border-border/60 p-3.5">
      <div className="flex items-start gap-3">
        <div className="flex-1 space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("vms.detail.vpc")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select
              value={vpcId}
              onValueChange={(value) => {
                setValue(`${path}.vpc_id`, value, { shouldValidate: true })
                // The old subnets belong to a different VPC now.
                setValue(`${path}.subnet_ids`, [], { shouldValidate: false })
              }}
            >
              <SelectTrigger className="w-full" disabled={vpcsLoading}>
                <SelectValue
                  placeholder={
                    vpcsLoading
                      ? t("loadBalancers.wizard.vpcsLoading")
                      : t("vms.wizard.vpcPlaceholder")
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {vpcs.map((vpc) => (
                  <SelectItem
                    key={vpc.id}
                    value={vpc.id}
                    // Already attached in another group.
                    disabled={takenVpcIds.has(vpc.id)}
                  >
                    {vpc.name} ({vpc.cidr})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {groupErrors?.vpc_id && (
              <p className="text-[11px] text-destructive">{groupErrors.vpc_id.message}</p>
            )}
            {/* A VPC whose SDN vnet is not realized yet fails provisioning
                            with "the VPC has no realized SDN vnet", so say so here
                            rather than letting the create fail a minute later. */}
            {selectedVpc && selectedVpc.status !== "available" && (
              <p className="text-[11px] text-status-warning">
                {t("loadBalancers.wizard.vpcNotReady", {
                  name: selectedVpc.name,
                })}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                {t("loadBalancers.wizard.subnet")}
                <span className="text-destructive ml-0.5">*</span>
              </Label>
              <span className="flex-1" />
              {vpcId && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-auto py-0.5 text-[11px]"
                  onClick={() => {
                    onAddSubnet(vpcId)
                  }}
                >
                  {t("loadBalancers.wizard.addSubnet")}
                </Button>
              )}
            </div>
            <SubnetChecklist
              vpcId={vpcId}
              subnets={vpcSubnets}
              selectedIds={subnetIds}
              onToggle={toggleSubnet}
            />
            {groupErrors?.subnet_ids && (
              <p className="text-[11px] text-destructive">{groupErrors.subnet_ids.message}</p>
            )}
          </div>
        </div>

        {canRemove && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            className="mt-6 shrink-0"
            aria-label={t("loadBalancers.wizard.removeVpc")}
            onClick={onRemove}
          >
            <Trash2 className="size-3.5 text-destructive" />
          </Button>
        )}
      </div>
    </div>
  )
}
