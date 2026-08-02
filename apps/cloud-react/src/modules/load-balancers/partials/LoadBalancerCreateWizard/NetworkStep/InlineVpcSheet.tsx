import { useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"
import { useTranslation } from "react-i18next"

import { CidrInput } from "@/components/console"
import { RGField } from "@/modules/resource-groups/components/RGField"
import { useCreateVPC, useRegions, useVPCs } from "@/modules/vpc/vpc.hooks"
import { nextFreeSubnetCidr, subnetCidrIssue, vpcCidrIssue } from "@/modules/vpc/vpc.utils"

import { SUBNET_CIDR_MESSAGES, VPC_CIDR_MESSAGES } from "./cidr-messages"

/**
 * The VPC's own fields. Both CIDRs are nullable *overrides* rather than values:
 * null means "the suggestion still applies", which is what keeps the suggested
 * blocks live while the existing-VPC list loads. A defaultValue would be fixed
 * at mount, when there is nothing yet to suggest from.
 */
const vpcSchema = z.object({
  name: z.string().trim().min(1, "A name is required"),
  region: z.string().min(1, "A region is required"),
  resourceGroupID: z.string(),
  cidrOverride: z.string().nullable(),
  subnetOverride: z.string().nullable(),
})

type VpcDraft = z.infer<typeof vpcSchema>

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

  const form = useForm<VpcDraft>({
    resolver: zodResolver(vpcSchema),
    defaultValues: {
      name: "",
      region: "",
      resourceGroupID: "",
      cidrOverride: null,
      subnetOverride: null,
    },
    mode: "onChange",
  })
  const { cidrOverride, subnetOverride, region, resourceGroupID } = form.watch()

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

  // The CIDR checks stay outside the schema: whether a block is usable depends
  // on the other VPCs on the account, which is server state, not form state.
  const canSubmit = cidr !== "" && subnetCidr !== "" && !cidrIssue && !subnetIssue

  const submit = form.handleSubmit((draft) => {
    if (!canSubmit) return
    void (async () => {
      try {
        const vpc = await createVPC({
          name: draft.name.trim(),
          cidr,
          region: draft.region,
          resource_group_id: draft.resourceGroupID,
          tags: "",
          subnets: [
            {
              name: `${draft.name.trim()}-subnet-1`,
              cidr: subnetCidr,
              zone: "",
              is_public: false,
            },
          ],
        })
        onCreated(vpc.id)
        onOpenChange(false)
        form.reset()
      } catch {
        // useCreateVPC raises its own error toast.
      }
    })()
  })

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
              aria-invalid={!!form.formState.errors.name}
              {...form.register("name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("vpc.form.region")}
              <span className="text-destructive ml-0.5">*</span>
            </Label>
            <Select
              value={region}
              onValueChange={(value) => {
                form.setValue("region", value, { shouldValidate: true })
              }}
            >
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
            <CidrInput
              value={cidr}
              onChange={(value) => {
                form.setValue("cidrOverride", value, { shouldValidate: true })
              }}
              aria-label={t("vpc.form.cidr")}
            />
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
              onChange={(value) => {
                form.setValue("subnetOverride", value, { shouldValidate: true })
              }}
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
            <RGField
              value={resourceGroupID}
              onChange={(value) => {
                form.setValue("resourceGroupID", value, { shouldValidate: true })
              }}
            />
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
            loading={isPending}
            onClick={() => void submit()}
          >
            {t("loadBalancers.wizard.createVpc")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
