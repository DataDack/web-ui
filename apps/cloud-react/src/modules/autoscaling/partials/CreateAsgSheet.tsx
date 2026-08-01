import { useMemo } from "react"

import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { z } from "zod/v4"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Switch } from "@/components/ui/switch"
import { useRegionCatalog } from "@/modules/catalog/catalog.hooks"
import { useNamingRule } from "@/modules/governance/governance.hooks"
import type { NamingRule } from "@/modules/governance/governance.types"
import { namingNameSchema } from "@/modules/governance/governance.validation"
import { MACHINE_TYPES } from "@/modules/vms/vms.constants"

import { SCALING_POLICIES } from "../autoscaling.constants"
import { useCreateASG } from "../autoscaling.hooks"
import type { ScalingPolicy } from "../autoscaling.types"

const makeSchema = (rule: NamingRule) =>
  z
    .object({
      name: namingNameSchema(rule),
      description: z.string().optional(),
      // launch_template_id is required (uuid4) by the backend create DTO; the
      // backend resolves machine type / image from the template.
      launch_template_id: z.uuid("Must be a valid launch template id"),
      // machine_type and scaling_policy are form-only UI and are NOT sent to the
      // backend (the ASG create DTO does not accept them).
      machine_type: z.string().min(1, "Required"),
      region: z.string().min(1, "Required"),
      scaling_policy: z.enum(["cpu-based", "schedule-based", "manual"]),
      min_size: z.coerce.number().min(0).max(100),
      max_size: z.coerce.number().min(1).max(100),
      desired_capacity: z.coerce.number().min(0).max(100),
      health_check_grace_period: z.coerce.number().min(0).max(3600),
      termination_policy: z.string(),
      capacity_rebalance: z.boolean().default(false),
    })
    .refine((v) => v.min_size <= v.max_size, {
      message: "Min must be ≤ max",
      path: ["min_size"],
    })
    .refine((v) => v.desired_capacity >= v.min_size && v.desired_capacity <= v.max_size, {
      message: "Desired must be between min and max",
      path: ["desired_capacity"],
    })

type Schema = ReturnType<typeof makeSchema>
type FormInput = z.input<Schema>
type FormValues = z.output<Schema>

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateAsgSheet({ open, onOpenChange }: Readonly<Props>) {
  const { t } = useTranslation()
  const { mutate: create, isPending } = useCreateASG()
  const { data: regions = [] } = useRegionCatalog()
  const { rule } = useNamingRule("autoscaling")
  const schema = useMemo(() => makeSchema(rule), [rule])

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      launch_template_id: "",
      machine_type: "c3-standard-4",
      region: "",
      scaling_policy: "cpu-based",
      min_size: 1,
      max_size: 4,
      desired_capacity: 2,
      health_check_grace_period: 300,
      termination_policy: "OldestInstance",
      capacity_rebalance: false,
    },
  })

  const close = () => {
    reset()
    onOpenChange(false)
  }

  const onSubmit = (values: FormValues) => {
    // Only fields accepted by dto.CreateASGRequest are sent; machine_type and
    // scaling_policy are form-only UI hints the backend does not accept.
    create(
      {
        name: values.name,
        description: values.description,
        launch_template_id: values.launch_template_id,
        region: values.region,
        min_size: values.min_size,
        max_size: values.max_size,
        desired_capacity: values.desired_capacity,
        health_check_grace_period: values.health_check_grace_period,
        termination_policy: values.termination_policy,
        capacity_rebalance: values.capacity_rebalance,
      },
      { onSuccess: close },
    )
  }

  const fieldLabel = (text: string) => (
    <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
      {text}
      <span className="text-destructive ml-0.5">*</span>
    </Label>
  )

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-[480px] p-0 flex flex-col gap-0">
        <SheetHeader className="px-6 py-5 shrink-0">
          <SheetTitle>{t("autoscaling.form.title")}</SheetTitle>
          <SheetDescription>{t("autoscaling.form.subtitle")}</SheetDescription>
        </SheetHeader>

        <Separator />

        <form
          onSubmit={(e) => void handleSubmit(onSubmit)(e)}
          className="flex flex-col flex-1 overflow-hidden"
        >
          <div className="flex-1 px-6 py-5 space-y-5 overflow-y-auto">
            <div className="space-y-1.5">
              {fieldLabel(t("autoscaling.columns.name"))}
              <Input {...register("name")} placeholder="my-asg" className="font-mono" />
              {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                Description
              </Label>
              <Input {...register("description")} placeholder="Optional description..." />
            </div>

            <div className="space-y-1.5">
              {fieldLabel(t("vms.detail.configuration"))}
              <Input
                {...register("launch_template_id")}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="font-mono"
              />
              {errors.launch_template_id && (
                <p className="text-[11px] text-destructive">{errors.launch_template_id.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                {fieldLabel(t("vms.columns.machineType"))}
                <Select
                  value={watch("machine_type")}
                  onValueChange={(value) => {
                    setValue("machine_type", value, { shouldValidate: true })
                  }}
                >
                  <SelectTrigger className="w-full font-mono text-[13px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MACHINE_TYPES.map((machine) => (
                      <SelectItem
                        key={machine.name}
                        value={machine.name}
                        className="font-mono text-[13px]"
                      >
                        {machine.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                {fieldLabel(t("vms.wizard.region"))}
                <Select
                  value={watch("region")}
                  disabled={regions.length === 0}
                  onValueChange={(value) => {
                    setValue("region", value, { shouldValidate: true })
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("autoscaling.form.regionPlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    {regions.map((r) => (
                      <SelectItem key={r.code} value={r.code}>
                        {r.code} — {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              {fieldLabel(t("autoscaling.columns.policy"))}
              <Select
                value={watch("scaling_policy")}
                onValueChange={(value) => {
                  setValue("scaling_policy", value as ScalingPolicy, {
                    shouldValidate: true,
                  })
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCALING_POLICIES.map((policy) => (
                    <SelectItem key={policy} value={policy}>
                      {t(`autoscaling.policies.${policy}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-3 gap-4">
              {(
                [
                  ["min_size", t("autoscaling.form.min")],
                  ["desired_capacity", t("autoscaling.form.desired")],
                  ["max_size", t("autoscaling.form.max")],
                ] as const
              ).map(([field, label]) => (
                <div key={field} className="space-y-1.5">
                  {fieldLabel(label)}
                  <Input
                    type="number"
                    {...register(field, { valueAsNumber: true })}
                    className="font-mono"
                  />
                  {errors[field] && (
                    <p className="text-[11px] text-destructive">{errors[field].message}</p>
                  )}
                </div>
              ))}
            </div>

            <Separator className="my-2" />

            <div className="space-y-4">
              <h4 className="text-sm font-semibold">Advanced Scaling Policies</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    Health Check Grace (s)
                  </Label>
                  <Input
                    type="number"
                    {...register("health_check_grace_period", {
                      valueAsNumber: true,
                    })}
                    className="font-mono"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
                    Termination Policy
                  </Label>
                  <Select
                    value={watch("termination_policy")}
                    onValueChange={(value) => {
                      setValue("termination_policy", value, {
                        shouldValidate: true,
                      })
                    }}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OldestInstance">Oldest Instance</SelectItem>
                      <SelectItem value="NewestInstance">Newest Instance</SelectItem>
                      <SelectItem value="ClosestToNextInstanceHour">Closest To Hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center justify-between mt-2">
                <div className="space-y-0.5">
                  <Label>Capacity Rebalance</Label>
                  <p className="text-xs text-muted-foreground">
                    Automatically redistribute instances across availability zones.
                  </p>
                </div>
                <Switch
                  checked={watch("capacity_rebalance")}
                  onCheckedChange={(checked) => {
                    setValue("capacity_rebalance", checked)
                  }}
                />
              </div>
            </div>
          </div>

          <Separator />

          <div className="flex items-center justify-end gap-3 px-6 py-4 shrink-0">
            <Button type="button" variant="ghost" onClick={close}>
              {t("console.wizard.cancel")}
            </Button>
            <Button type="submit" variant="gold" disabled={isPending}>
              {isPending ? t("autoscaling.form.creating") : t("autoscaling.form.create")}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  )
}
