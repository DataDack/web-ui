import { useMemo } from "react"

import { Label, Separator, Switch } from "@DataDack/common-ui"
import { zodResolver } from "@hookform/resolvers/zod"
import { Controller, useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { CidrInput } from "@/components/console"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@datadack/common-ui"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@datadack/common-ui"
import { useRegionCatalog } from "@/modules/catalog/catalog.hooks"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"

import { CIDR_REGEX } from "../../vpc.constants"
import { useCreateSubnet } from "../../vpc.hooks"
import type { VPCNetwork } from "../../vpc.types"

// eslint-disable-next-line sonarjs/no-hardcoded-ip -- sensible starting block
const SUBNET_CIDR_DEFAULT = "10.0.1.0/24"

const makeSchema = (rule: NamingRule) =>
  z.object({
    name: namingNameSchema(rule),
    cidr: z.string().regex(CIDR_REGEX, "Must be CIDR notation, e.g. 10.0.4.0/24"),
    zone: z.string().min(1, "Required"),
    is_public: z.boolean(),
  })

type FormValues = z.infer<ReturnType<typeof makeSchema>>

function FieldLabel({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
      {children}
    </Label>
  )
}

interface Props {
  network: VPCNetwork
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddSubnetSheet({ network, open, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateSubnet()
  const { data: regions = [] } = useRegionCatalog()
  const activeRegion = regions.find((r) => r.code === network.region)
  const zones = activeRegion ? activeRegion.availability_zones : []

  const { rule } = useNamingRule("subnet")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      cidr: SUBNET_CIDR_DEFAULT,
      zone: "", // Default to empty string so user must select
      is_public: false,
    },
  })

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = (values: FormValues) => {
    create({ ...values, network_id: network.id, region: network.region }, { onSuccess: close })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[480px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle>{t("vpc.subnetForm.title")}</SheetTitle>
          <SheetDescription>
            {t("vpc.subnetForm.subtitle", { name: network.name })}
          </SheetDescription>
        </SheetHeader>

        <Separator />

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
            <div className="space-y-1.5">
              <FieldLabel>
                {t("vpc.subnetForm.name")}
                <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <Input {...register("name")} placeholder="my-subnet" className="font-mono" />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <FieldLabel>
                {t("vpc.subnetForm.cidr")}
                <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <Controller
                control={control}
                name="cidr"
                render={({ field }) => (
                  <CidrInput
                    value={field.value}
                    onChange={field.onChange}
                    prefixOptions={[16, 20, 24, 26, 28]}
                    aria-label={t("vpc.subnetForm.cidr")}
                    aria-invalid={!!errors.cidr}
                  />
                )}
              />
              {errors.cidr && <p className="text-[11px] text-destructive">{errors.cidr.message}</p>}
              <p className="text-[11px] text-muted-foreground">
                {t("vpc.subnetForm.cidrHint", { cidr: network.cidr })}
              </p>
            </div>

            <div className="space-y-1.5">
              <FieldLabel>
                {t("vpc.subnetForm.zone")}
                <span className="text-destructive ml-0.5">*</span>
              </FieldLabel>
              <Controller
                control={control}
                name="zone"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={zones.length === 0}
                  >
                    <SelectTrigger className="w-full font-mono text-[13px]">
                      <SelectValue placeholder={t("vpc.subnetForm.zonePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      {zones.map((zone) => (
                        <SelectItem key={zone.id} value={zone.id} className="font-mono text-[13px]">
                          {zone.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.zone && <p className="text-[11px] text-destructive">{errors.zone.message}</p>}
            </div>

            <div className="flex items-center justify-between gap-3 glass-1 px-4 py-3">
              <div>
                <p className="text-sm font-medium text-foreground">
                  {t("vpc.subnetForm.isPublic")}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("vpc.subnetForm.isPublicHint")}
                </p>
              </div>
              <Controller
                control={control}
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

          <Separator />

          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
            <Button type="button" variant="ghost" onClick={close}>
              {t("console.wizard.cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={isPending}>
              {isPending ? t("vpc.subnetForm.adding") : t("vpc.subnetForm.add")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
