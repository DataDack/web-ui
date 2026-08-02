import { useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod/v4"

import {
  Button,
  Input,
  Label,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@datadack/common-ui"
import { Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { CidrInput } from "@/components/console"
import { useAllSubnets, useCreateSubnet, useVPC } from "@/modules/vpc/vpc.hooks"
import { nextFreeSubnetCidr, subnetCidrIssue } from "@/modules/vpc/vpc.utils"

import { SUBNET_CIDR_MESSAGES } from "./cidr-messages"

/**
 * The subnet's own fields. The CIDR is held as a nullable *override* rather than
 * a value: null means "the suggestion still applies", which keeps the suggested
 * block live as the VPC and its sibling subnets load.
 */
const subnetSchema = z.object({
  name: z.string().trim().min(1, "A name is required"),
  cidrOverride: z.string().nullable(),
})

type SubnetDraft = z.infer<typeof subnetSchema>

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

  // The form owns the name and the CIDR *override*, not the CIDR itself. Keeping
  // the override nullable is what lets the suggestion below stay live while the
  // VPC and its subnets load — a defaultValue would be fixed at mount, when
  // there is nothing to suggest from yet, and seeding it later from an effect
  // would clobber whatever the user had already typed.
  const form = useForm<SubnetDraft>({
    resolver: zodResolver(subnetSchema),
    defaultValues: { name: "", cidrOverride: null },
    mode: "onChange",
  })
  const cidrOverride = form.watch("cidrOverride")

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
  // The CIDR is validated here rather than in the schema: whether a block is
  // usable depends on the VPC and its existing subnets, which are server state,
  // not form state.
  const issue = vpc && cidr ? subnetCidrIssue(vpc.cidr, cidr, siblings) : null
  const canSubmit = cidr !== "" && !issue && vpcId !== null

  const submit = form.handleSubmit((draft) => {
    if (!vpcId || !canSubmit) return
    void (async () => {
      try {
        await createSubnet({
          name: draft.name.trim(),
          cidr,
          zone: "",
          network_id: vpcId,
          // The backend requires a region on a subnet; it is always the
          // owning VPC's.
          region: vpc?.region ?? "",
          is_public: false,
        })
        onOpenChange(false)
        form.reset()
      } catch {
        // useCreateSubnet raises its own error toast.
      }
    })()
  })

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
              aria-invalid={!!form.formState.errors.name}
              {...form.register("name")}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
              {t("vpc.subnetForm.cidr")}
            </Label>
            <CidrInput
              value={cidr}
              onChange={(value) => {
                form.setValue("cidrOverride", value, { shouldValidate: true })
              }}
              aria-label={t("vpc.subnetForm.cidr")}
            />
            {issue ? (
              <p className="text-[11px] text-destructive">{SUBNET_CIDR_MESSAGES[issue]}</p>
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
            onClick={() => void submit()}
          >
            {isPending && <Loader2 className="size-3.5 animate-spin" />}
            {t("loadBalancers.wizard.addSubnet")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
