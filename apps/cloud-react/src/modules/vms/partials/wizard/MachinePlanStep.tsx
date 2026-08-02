import { useTranslation } from "react-i18next"
import { useMemo, useState } from "react"

import type { UseFormReturn } from "react-hook-form"

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"
import type { VMPriceOption } from "@/modules/catalog/catalog.types"

import { formatPrice } from "./wizard.format"
import { FieldError } from "./wizard.shared"
import type { FormValues } from "./wizard.types"

/** Short CPU-architecture label for a plan: ARM for arm64, otherwise the x86
 * vendor (AMD/Intel), defaulting to AMD when the vendor isn't reported. */
function archLabel(p: VMPriceOption): string {
  if (p.architecture === "arm64") return "ARM"
  const vendor = p.cpu_vendor.toLowerCase()
  if (vendor.includes("intel")) return "Intel"
  if (vendor.includes("amd")) return "AMD"
  return "AMD"
}

/** Brand logo asset per architecture label, served from public/icons. */
function archLogo(label: string): { src: string; alt: string } {
  switch (label) {
    case "ARM":
      return { src: "/icons/arm.svg", alt: "ARM" }
    case "Intel":
      return { src: "/icons/intel.svg", alt: "Intel" }
    default:
      return { src: "/icons/amd.svg", alt: "AMD" }
  }
}

type MachinePlanStepProps = Readonly<{
  form: UseFormReturn<FormValues>
  zonePrices: readonly VMPriceOption[]
  activePrice?: VMPriceOption
}>

export function MachinePlanStep({ form, zonePrices, activePrice }: MachinePlanStepProps) {
  const { t } = useTranslation()
  const selectedMachine = form.watch("machine_type_id")

  // Group prices by family
  const families = useMemo(() => {
    return {
      standard: zonePrices.filter((p) => p.family === "standard"),
      compute: zonePrices.filter((p) => p.family === "compute"),
      memory: zonePrices.filter((p) => p.family === "memory"),
      gpu: zonePrices.filter((p) => p.family === "gpu"),
    }
  }, [zonePrices])

  const defaultTab = activePrice?.family ?? "standard"
  const [activeTab, setActiveTab] = useState<string>(
    families[defaultTab].length > 0 ? defaultTab : "standard",
  )

  return (
    <div className="space-y-4">
      {zonePrices.length === 0 ? (
        <p className="text-[12px] text-muted-foreground glass-1 px-3.5 py-3">
          {t("vms.machinePlanStep.noMachineTypesAvailableInThisZone")}
        </p>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-4 bg-background/50 border border-border-glass h-12 p-1">
            <TabsTrigger
              value="standard"
              disabled={families.standard.length === 0}
              className="text-[13px] h-full rounded-md data-[state=active]:bg-accent/50"
            >
              Standard
            </TabsTrigger>
            <TabsTrigger
              value="compute"
              disabled={families.compute.length === 0}
              className="text-[13px] h-full rounded-md data-[state=active]:bg-accent/50"
            >
              Compute
            </TabsTrigger>
            <TabsTrigger
              value="memory"
              disabled={families.memory.length === 0}
              className="text-[13px] h-full rounded-md data-[state=active]:bg-accent/50"
            >
              Memory
            </TabsTrigger>
            <TabsTrigger
              value="gpu"
              disabled={families.gpu.length === 0}
              className="text-[13px] h-full rounded-md data-[state=active]:bg-accent/50"
            >
              GPU
            </TabsTrigger>
          </TabsList>

          {Object.entries(families).map(([family, prices]) => (
            <TabsContent
              key={family}
              value={family}
              className="animate-in fade-in slide-in-from-bottom-2 duration-300"
            >
              <div className="overflow-hidden rounded-lg border border-border-glass glass-1">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border-glass bg-muted/20">
                      <th className="px-4 py-3 font-semibold text-muted-foreground w-12" />
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Plan</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Arch</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">Compute</th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground">
                        {t("vms.machinePlanStep.networkDisk")}
                      </th>
                      <th className="px-4 py-3 font-semibold text-muted-foreground text-right">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-glass">
                    {prices.map((price) => {
                      const active = selectedMachine === price.id
                      return (
                        <tr
                          key={price.id}
                          onClick={() => {
                            form.setValue("machine_type_id", price.id, {
                              shouldValidate: true,
                            })
                            // Auto-fill the boot disk size from the
                            // plan's default so storage cost reflects
                            // the selected shape.
                            if (price.default_boot_disk_gb > 0) {
                              form.setValue("disk_size_gb", price.default_boot_disk_gb, {
                                shouldValidate: true,
                              })
                            }
                          }}
                          className={cn(
                            "cursor-pointer transition-colors",
                            active ? "bg-accent/30" : "hover:bg-accent/10",
                          )}
                        >
                          <td className="px-4 py-3 text-center">
                            <div
                              className={cn(
                                "size-4 rounded-full border grid place-items-center mx-auto",
                                active
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-muted-foreground/30",
                              )}
                            >
                              {active && <div className="size-1.5 rounded-full bg-background" />}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="font-medium text-foreground">
                              {price.display_name || price.name}
                            </div>
                            <div className="font-mono text-[11px] text-muted-foreground">
                              {price.sku || price.name}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            {(() => {
                              const { src, alt } = archLogo(archLabel(price))
                              return (
                                <img
                                  src={src}
                                  alt={alt}
                                  className="h-4 w-auto max-w-[64px] object-contain object-left"
                                />
                              )
                            })()}
                            <div className="mt-1 font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                              {price.architecture}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="text-muted-foreground">
                              {price.vcpus} vCPU · {price.ram_gb} GB
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                              {price.gpu_count > 0
                                ? `${String(price.gpu_count)} ${price.gpu_type || "GPU"}`
                                : price.cpu_model || ""}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {(() => {
                              // Only render specs that are actually set; 0
                              // means "unspecified", so we omit it rather than
                              // show "0 Gbps". The data-disk count is hidden
                              // entirely for now — existing rows carry a
                              // fabricated blanket value (16) that isn't a real
                              // per-plan spec, so showing it is misleading.
                              const network = [
                                price.bandwidth_gbps > 0
                                  ? `${String(price.bandwidth_gbps)} Gbps`
                                  : null,
                                price.network_tier || null,
                              ]
                                .filter(Boolean)
                                .join(" · ")
                              const disk =
                                price.default_boot_disk_gb > 0
                                  ? `${String(price.default_boot_disk_gb)} GB`
                                  : ""
                              return (
                                <>
                                  <div>{network || "—"}</div>
                                  {disk && <div className="text-[11px]">{disk}</div>}
                                </>
                              )
                            })()}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-medium text-foreground">
                            {formatPrice(price.price_hourly, price.currency, true)}{" "}
                            <span className="text-[11px] text-muted-foreground font-sans">
                              /{price.billing_unit ?? "hr"}
                            </span>
                            {price.price_monthly > 0 ? (
                              <div className="text-[11px] text-muted-foreground font-sans">
                                {formatPrice(price.price_monthly, price.currency, true)}
                                /mo
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          ))}
        </Tabs>
      )}
      <FieldError message={form.formState.errors.machine_type_id?.message} />
    </div>
  )
}
