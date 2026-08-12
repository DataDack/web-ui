import { useEffect, useMemo, useState } from "react"

import {
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Separator,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Switch,
} from "@datadack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { CidrInput } from "@/components/console"
import { useRegionCatalog } from "@/modules/catalog/catalog.hooks"
import { QuotaNotice, useQuotaBlocked } from "@/modules/governance/components/QuotaNotice"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { validatePattern } from "@/modules/governance/naming-convention"
import { RGField } from "@/modules/resource-groups/components/RGField"

import { useCreateVPC } from "../vpc.hooks"
import type { VPCNetwork } from "../vpc.types"
import {
  autoSubnetName,
  autoVpcName,
  formatIpCount,
  nextFreeSubnetCidr,
  subnetCidrIssue,
  SUBNET_PREFIX_OPTIONS,
  VPC_PREFIX_OPTIONS,
  vpcCidrIssue,
  type VpcCidrIssue,
} from "../vpc.utils"

// eslint-disable-next-line sonarjs/no-hardcoded-ip -- sensible starting block
const VPC_CIDR_DEFAULT = "10.0.0.0/16"

const VPC_CIDR_MESSAGE_KEYS: Record<VpcCidrIssue, string> = {
  format: "vpc.quickCreate.cidrIssue.format",
  private: "vpc.quickCreate.cidrIssue.private",
  prefix: "vpc.quickCreate.cidrIssue.prefix",
}

/** Optional name: blank auto-generates one, otherwise the org convention applies. */
const optionalName = (rule: NamingRule) =>
  z.string().superRefine((value, ctx) => {
    if (value.trim() === "") return
    const err = validatePattern(rule.pattern, value)
    if (err) ctx.addIssue({ code: "custom", message: err })
  })

const makeSchema = (vpcRule: NamingRule, subnetRule: NamingRule) =>
  z
    .object({
      name: optionalName(vpcRule),
      cidr: z.string().superRefine((value, ctx) => {
        const issue = vpcCidrIssue(value)
        if (issue) ctx.addIssue({ code: "custom", message: VPC_CIDR_MESSAGE_KEYS[issue] })
      }),
      resource_group_id: z.string().min(1, "resourceGroups.field.placeholder"),
      subnet_name: optionalName(subnetRule),
      subnet_cidr: z.string(),
      zone: z.string().min(1, "vpc.quickCreate.zoneRequired"),
      is_public: z.boolean(),
    })
    // The subnet block is only meaningful against its parent range, so it is
    // checked at the object level once both CIDRs are known.
    .superRefine((values, ctx) => {
      const issue = subnetCidrIssue(values.cidr, values.subnet_cidr, [])
      if (issue) {
        ctx.addIssue({
          code: "custom",
          path: ["subnet_cidr"],
          message: `vpc.wizard.subnetIssue.${issue}`,
        })
      }
    })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Region the VPC is created in — fixed to the caller's (the VM's) region. */
  region: string
  /** Availability-zone uuid the first subnet is placed in. */
  defaultZone?: string
  onCreated: (network: VPCNetwork) => void
}

/**
 * Inline "create a VPC" surface for pickers that would otherwise dead-end when
 * the account has no network — same idea as the resource-group field's inline
 * create. It provisions a VPC *and* its first subnet in one request (the
 * backend does both atomically), because a picker that hands back an empty VPC
 * would still leave the caller unable to choose a subnet. Region is inherited
 * from the caller and not editable: a VM can only attach to a network in its
 * own region. Multi-AZ layouts still belong in the full VPC wizard.
 */
export function CreateVpcSheet({
  open,
  onOpenChange,
  region,
  defaultZone,
  onCreated,
}: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateVPC()
  const { data: catalog = [] } = useRegionCatalog()
  const quotaBlocked = useQuotaBlocked("vpc.networks")

  const zones = useMemo(
    () => catalog.find((r) => r.code === region)?.availability_zones ?? [],
    [catalog, region],
  )

  const { rule: vpcRule } = useNamingRule("vpc")
  const { rule: subnetRule } = useNamingRule("subnet")
  const schema = useMemo(() => makeSchema(vpcRule, subnetRule), [vpcRule, subnetRule])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onTouched",
    defaultValues: {
      name: "",
      cidr: VPC_CIDR_DEFAULT,
      resource_group_id: "",
      subnet_name: "",
      subnet_cidr: nextFreeSubnetCidr(VPC_CIDR_DEFAULT, []) ?? "",
      zone: defaultZone ?? "",
      is_public: true,
    },
  })

  // The subnet block tracks the VPC range until the user takes it over, so
  // widening or renumbering the VPC doesn't strand the subnet outside it.
  const [subnetCidrTouched, setSubnetCidrTouched] = useState(false)
  const cidr = form.watch("cidr")

  useEffect(() => {
    if (subnetCidrTouched) return
    const next = nextFreeSubnetCidr(cidr, [])
    if (next) form.setValue("subnet_cidr", next)
  }, [cidr, subnetCidrTouched, form])

  // Each opening starts from a clean form seeded with the caller's AZ — the
  // sheet outlives a single use (create one, come back, create another).
  useEffect(() => {
    if (!open) return
    setSubnetCidrTouched(false)
    form.reset({
      name: "",
      cidr: VPC_CIDR_DEFAULT,
      resource_group_id: "",
      subnet_name: "",
      subnet_cidr: nextFreeSubnetCidr(VPC_CIDR_DEFAULT, []) ?? "",
      zone: defaultZone ?? "",
      is_public: true,
    })
  }, [open, defaultZone, form])

  const onSubmit = (values: FormValues) => {
    // Names are optional in the UI; the backend requires them, so fall back to
    // generated ones exactly like the full wizard does.
    const vpcName = values.name.trim() || autoVpcName()
    create(
      {
        name: vpcName,
        cidr: values.cidr,
        region,
        resource_group_id: values.resource_group_id,
        tags: "{}",
        subnets: [
          {
            name: values.subnet_name.trim() || autoSubnetName(vpcName, values.is_public, 0),
            cidr: values.subnet_cidr,
            zone: values.zone,
            is_public: values.is_public,
          },
        ],
      },
      {
        onSuccess: (network) => {
          onCreated(network)
          onOpenChange(false)
        },
      },
    )
  }

  const errors = form.formState.errors

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[520px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle>{t("vpc.quickCreate.title")}</SheetTitle>
          <SheetDescription>{t("vpc.quickCreate.subtitle")}</SheetDescription>
        </SheetHeader>

        <Separator />

        <form
          onSubmit={(e) => {
            // The sheet is portalled out of the DOM but still bubbles React
            // events to its owner — which may itself be a <form> (the VM create
            // wizard). Without this, creating a VPC would also submit that form
            // and advance the wizard a step.
            e.stopPropagation()
            void form.handleSubmit(onSubmit)(e)
          }}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
            <div className="empty:hidden">
              <QuotaNotice code="vpc.networks" />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>{t("vpc.columns.name")}</FieldLabel>
              <Input {...form.register("name")} placeholder="my-vpc" className="font-mono" />
              <p className="text-[11px] text-muted-foreground">
                {t("vpc.wizard.nameOptionalHint")}
              </p>
              <FieldError message={errors.name?.message} />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>{t("resourceGroups.field.label")} *</FieldLabel>
              <Controller
                control={form.control}
                name="resource_group_id"
                render={({ field }) => (
                  <RGField
                    value={field.value}
                    onChange={(id) => {
                      form.setValue("resource_group_id", id, { shouldValidate: true })
                    }}
                    aria-invalid={!!errors.resource_group_id}
                  />
                )}
              />
              <FieldError message={errors.resource_group_id?.message} />
            </div>

            <div className="space-y-1.5">
              <FieldLabel>{t("vpc.columns.ipv4Cidr")} *</FieldLabel>
              <div className="flex items-center gap-3">
                <Controller
                  control={form.control}
                  name="cidr"
                  render={({ field }) => (
                    <CidrInput
                      value={field.value}
                      onChange={field.onChange}
                      prefixOptions={VPC_PREFIX_OPTIONS}
                      aria-label={t("vpc.columns.cidr")}
                      aria-invalid={!!errors.cidr}
                    />
                  )}
                />
                <span className="font-mono text-[12px] text-muted-foreground whitespace-nowrap tabular-nums">
                  {t("vpc.wizard.ipCount", { ips: formatIpCount(cidr) })}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {t("vpc.quickCreate.regionHint", { region })}
              </p>
              <FieldError message={errors.cidr?.message} />
            </div>

            <Separator />

            <div className="space-y-4">
              <div className="space-y-0.5">
                <p className="text-sm font-medium text-foreground">
                  {t("vpc.quickCreate.subnetSection")}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {t("vpc.quickCreate.subnetHint")}
                </p>
              </div>

              <div className="space-y-1.5">
                <FieldLabel>{t("vpc.subnetForm.name")}</FieldLabel>
                <Input
                  {...form.register("subnet_name")}
                  placeholder={t("vpc.subnetForm.namePlaceholder")}
                  className="font-mono"
                />
                <FieldError message={errors.subnet_name?.message} />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>{t("vpc.subnetForm.cidr")} *</FieldLabel>
                <Controller
                  control={form.control}
                  name="subnet_cidr"
                  render={({ field }) => (
                    <CidrInput
                      value={field.value}
                      onChange={(value) => {
                        setSubnetCidrTouched(true)
                        field.onChange(value)
                      }}
                      prefixOptions={SUBNET_PREFIX_OPTIONS}
                      aria-label={t("vpc.subnetForm.cidr")}
                      aria-invalid={!!errors.subnet_cidr}
                    />
                  )}
                />
                <FieldError message={errors.subnet_cidr?.message} />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>{t("vpc.subnetForm.zone")} *</FieldLabel>
                <Controller
                  control={form.control}
                  name="zone"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={zones.length === 0}
                    >
                      <SelectTrigger className="w-full font-mono text-[13px]">
                        <SelectValue
                          placeholder={
                            zones.length === 0
                              ? t("vpc.quickCreate.noZones")
                              : t("vpc.subnetForm.zonePlaceholder")
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map((zone) => (
                          <SelectItem
                            key={zone.id}
                            value={zone.id}
                            className="font-mono text-[13px]"
                          >
                            {zone.code}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.zone?.message} />
              </div>

              <div className="flex items-center justify-between gap-3 glass-1 px-4 py-3 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {t("vpc.subnetForm.isPublic")}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {t("vpc.subnetForm.isPublicHint")}
                  </p>
                </div>
                <Controller
                  control={form.control}
                  name="is_public"
                  render={({ field }) => (
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      aria-label={t("vpc.subnetForm.isPublic")}
                    />
                  )}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                onOpenChange(false)
              }}
            >
              {t("console.wizard.cancel")}
            </Button>
            <Button
              type="submit"
              variant="gold"
              disabled={isPending || quotaBlocked}
              loading={isPending}
            >
              {isPending ? t("vpc.quickCreate.creating") : t("vpc.quickCreate.create")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}

/* ── Field chrome ──────────────────────────────────────────────────────── */

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
      {children}
    </Label>
  )
}

/**
 * Zod messages here are i18n keys, resolved at render so the schema stays free
 * of the `t` closure. Naming-rule violations arrive as plain sentences instead;
 * i18next echoes an unknown key back unchanged, so those pass straight through.
 */
function FieldError({ message }: Readonly<{ message?: string }>) {
  const { t } = useTranslation()
  if (!message) return null
  return <p className="text-[11px] text-destructive">{t(message)}</p>
}
