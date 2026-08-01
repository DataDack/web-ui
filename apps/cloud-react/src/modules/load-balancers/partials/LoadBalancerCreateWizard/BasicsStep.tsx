import { Label } from "@datadack/common-ui"
import { Layers, Network } from "lucide-react"
import type { UseFormReturn } from "react-hook-form"
import { useTranslation } from "react-i18next"

import { Input } from "@datadack/common-ui"
import { cn } from "@/lib/utils"
import { RGField } from "@/modules/resource-groups/components/RGField"

import type { FormValues } from "./schema"
import { SchemeStep } from "./SchemeStep"
import { TypeCard } from "./TypeCard"
import type { LoadBalancerType } from "../../load-balancers.types"

export function BasicsStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const { t } = useTranslation()
  const {
    register,
    setValue,
    watch,
    formState: { errors },
  } = form
  const type = watch("type")
  const cycle = watch("billing_cycle")
  const resourceGroupID = watch("resource_group_id")

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          {t("loadBalancers.form.name")}
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <Input {...register("name")} placeholder="web-prod" className="font-mono" />
        {errors.name && <p className="text-[11px] text-destructive">{errors.name.message}</p>}
      </div>

      <div className="space-y-2.5">
        <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
          {t("loadBalancers.columns.type")}
          <span className="text-destructive ml-0.5">*</span>
        </Label>
        <div className="grid gap-3 sm:grid-cols-2">
          <TypeCard
            icon={Layers}
            selected={type === "application"}
            title={t("loadBalancers.types.application")}
            description={t("loadBalancers.wizard.applicationHint")}
            onSelect={() => {
              setValue("type", "application" satisfies LoadBalancerType, {
                shouldValidate: true,
              })
            }}
          />
          <TypeCard
            icon={Network}
            selected={type === "network"}
            title={t("loadBalancers.types.network")}
            description={t("loadBalancers.wizard.networkHint")}
            onSelect={() => {
              setValue("type", "network" satisfies LoadBalancerType, {
                shouldValidate: true,
              })
            }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground">{t("loadBalancers.wizard.typeLocked")}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {t("loadBalancers.wizard.resourceGroup")}
          </Label>
          <RGField
            value={resourceGroupID}
            onChange={(v) => {
              setValue("resource_group_id", v, { shouldValidate: true })
            }}
          />
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs font-semibold tracking-wide uppercase text-muted-foreground">
            {t("loadBalancers.wizard.billing")}
          </Label>
          {/* The backend has always accepted a billing cycle; the console
                        never sent one, so everybody silently got hourly. */}
          <div className="flex overflow-hidden rounded-md border border-border/60">
            {(["hourly", "monthly"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={cycle === c}
                onClick={() => {
                  setValue("billing_cycle", c, { shouldValidate: true })
                }}
                className={cn(
                  "flex-1 px-3 py-1.5 text-[12px] transition-colors",
                  cycle === c
                    ? "bg-status-info-bg font-semibold text-status-info"
                    : "text-muted-foreground hover:bg-accent/40",
                )}
              >
                {t(`loadBalancers.wizard.billingCycle.${c}`)}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {t("loadBalancers.wizard.billingHint")}
          </p>
        </div>
      </div>

      <SchemeStep />
    </div>
  )
}
