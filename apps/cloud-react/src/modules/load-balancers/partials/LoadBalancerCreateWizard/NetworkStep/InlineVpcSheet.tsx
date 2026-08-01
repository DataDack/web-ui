import { useMemo, useState } from "react"

import { Label } from "@DataDack/common-ui"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CidrInput } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { RGField } from "@/modules/resource-groups/components/RGField"
import { useCreateVPC, useRegions, useVPCs } from "@/modules/vpc/vpc.hooks"
import { nextFreeSubnetCidr, subnetCidrIssue, vpcCidrIssue } from "@/modules/vpc/vpc.utils"

import { SUBNET_CIDR_MESSAGES, VPC_CIDR_MESSAGES } from "./cidr-messages"

/**
 * The private space VPC blocks are carved from. Only the search space — the
 * block actually offered is the first /16 in here that no existing VPC uses.
 */
// eslint-disable-next-line sonarjs/no-hardcoded-ip -- RFC1918 constant, not config
const PRIVATE_SUPERNET = "10.0.0.0/8"
const VPC_PREFIX = 16

/**
 * Create a VPC without leaving the wizard.
 *
 * A Sheet rather than an inline block: the wizard is itself a <form>, and a
 * nested one is invalid HTML — the inner submit would bubble and advance the
 * wizard. Radix portals this out of the tree, so it has its own form.
 *
 * The VPC is created with one subnet. A bare VPC would leave the user right back
 * where they started, needing a second inline create before they can continue.
 */
export function InlineVpcSheet({
  open,
  onOpenChange,
  onCreated,
}: Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (vpcId: string) => void
}>) {
  const { t } = useTranslation()
  const { data: regions = [] } = useRegions()
  const { data: existingVpcs = [] } = useVPCs()
  const { mutateAsync: createVPC, isPending } = useCreateVPC()

  const [name, setName] = useState("")
  const [region, setRegion] = useState("")
  const [resourceGroupID, setResourceGroupID] = useState("")
  // null means "not touched", so the suggestion below still applies. Storing
  // the override rather than seeding state in an effect keeps the suggestion
  // live as the VPC list loads, with no intermediate render showing a blank
  // or stale block.
  const [cidrOverride, setCidrOverride] = useState<string | null>(null)
  const [subnetOverride, setSubnetOverride] = useState<string | null>(null)

  // Offer a block no existing VPC already uses. A fixed 10.0.0.0/16 collides
  // with the first VPC most accounts create, and the overlap only surfaces as
  // a rejected create after the form is filled in.
  const suggestedVpcCidr = useMemo(
    () =>
      nextFreeSubnetCidr(
        PRIVATE_SUPERNET,
        existingVpcs.map((v) => v.cidr),
        VPC_PREFIX,
      ) ?? "",
    [existingVpcs],
  )
  const cidr = cidrOverride ?? suggestedVpcCidr

  // The first subnet is then carved from whatever VPC block ended up chosen.
  const suggestedSubnetCidr = useMemo(
    () => (cidr ? (nextFreeSubnetCidr(cidr, []) ?? "") : ""),
    [cidr],
  )
  const subnetCidr = subnetOverride ?? suggestedSubnetCidr

  const cidrIssue = cidr ? vpcCidrIssue(cidr) : null
  const subnetIssue = cidr && subnetCidr ? subnetCidrIssue(cidr, subnetCidr, []) : null

  const canSubmit =
    name.trim() !== "" &&
    region !== "" &&
    cidr !== "" &&
    subnetCidr !== "" &&
    !cidrIssue &&
    !subnetIssue &&
    !isPending

  const submit = () => {
    void (async () => {
      try {
        const vpc = await createVPC({
          name: name.trim(),
          cidr,
          region,
          resource_group_id: resourceGroupID,
          tags: "",
          subnets: [
            {
              name: `${name.trim()}-subnet-1`,
              cidr: subnetCidr,
              zone: "",
              is_public: false,
            },
          ],
        })
        onCreated(vpc.id)
        onOpenChange(false)
        setName("")
      } catch {
        // useCreateVPC raises its own error toast.
      }
    })()
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle>{t("loadBalancers.wizard.createVpcTitle")}</SheetTitle>
          <SheetDescription>{t("loadBalancers.wizard.createVpcDescription")}</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("vpc.form.name")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Input
              className="font-mono"
              placeholder="vpc-prod"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
              }}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("vpc.form.region")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select value={region} onValueChange={setRegion}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("vpc.form.regionPlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {regions.map((r) => (
                  <SelectItem key={r.id} value={r.code}>
                    {r.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("vpc.form.cidr")}
            </Label>
            <CidrInput value={cidr} onChange={setCidrOverride} aria-label={t("vpc.form.cidr")} />
            {cidrIssue ? (
              <p className="text-[11px] text-destructive">{VPC_CIDR_MESSAGES[cidrIssue]}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {t("loadBalancers.wizard.cidrSuggested")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("loadBalancers.wizard.firstSubnetCidr")}
            </Label>
            <CidrInput
              value={subnetCidr}
              onChange={setSubnetOverride}
              aria-label={t("loadBalancers.wizard.firstSubnetCidr")}
            />
            {subnetIssue ? (
              <p className="text-[11px] text-destructive">{SUBNET_CIDR_MESSAGES[subnetIssue]}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">
                {t("loadBalancers.wizard.firstSubnetHint")}
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("loadBalancers.wizard.resourceGroup")}
            </Label>
            <RGField value={resourceGroupID} onChange={setResourceGroupID} />
          </div>

          {/* Provisioning a VPC carves an SDN vnet, which takes a moment.
                        The load balancer cannot attach until that lands, so say so
                        rather than letting the create fail a minute later. */}
          <p className="text-[11px] text-status-warning">
            {t("loadBalancers.wizard.vpcRealizationNote")}
          </p>
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
            {t("loadBalancers.wizard.createVpc")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
