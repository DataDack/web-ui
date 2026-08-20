import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  cn,
} from "@datadack/common-ui"
import { Check, Minus } from "lucide-react"

import { formatPrice } from "../../../components"
import type { Plan, PlanFeature } from "../../../managed-apps.types"

interface PlanDetailsSheetProps {
  plan: Plan | null
  features: PlanFeature[]
  current: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface FeatureGroup {
  title: string
  rows: PlanFeature[]
}

export function PlanDetailsSheet({
  plan,
  features,
  current,
  open,
  onOpenChange,
}: Readonly<PlanDetailsSheetProps>) {
  const groups: FeatureGroup[] = []
  const grouped = new Map<string, FeatureGroup>()

  for (const feature of features) {
    let group = grouped.get(feature.category)
    if (!group) {
      group = { title: feature.category, rows: [] }
      grouped.set(feature.category, group)
      groups.push(group)
    }
    group.rows.push(feature)
  }

  const price = plan ? formatPrice(plan) : ""
  const pricedMonthly = plan && !plan.is_custom_priced && plan.price_inr_monthly > 0

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full max-w-[560px] flex-col gap-0 overflow-hidden p-0">
        <SheetHeader className="shrink-0 border-b border-border/60 px-6 py-5 text-left">
          <div className="flex items-start justify-between gap-8 pr-7">
            <div>
              <SheetTitle>{plan?.name ?? "Plan details"}</SheetTitle>
              <SheetDescription className="mt-1">
                Every feature and limit included with this plan.
              </SheetDescription>
            </div>
            {plan && (
              <div className="shrink-0 text-right">
                <p className="text-xl font-semibold tracking-tight">
                  {price}
                  {pricedMonthly && <span className="text-xs font-normal text-muted-foreground">/mo</span>}
                </p>
                {current && <p className="mt-0.5 text-[11px] font-medium text-primary">Current plan</p>}
              </div>
            )}
          </div>
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">Plan details are not available right now.</p>
          ) : (
            <div className="space-y-6">
              {groups.map((group) => (
                <section key={group.title} aria-labelledby={`plan-detail-${slugify(group.title)}`}>
                  <h3
                    id={`plan-detail-${slugify(group.title)}`}
                    className="border-b border-border/50 pb-2 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                  >
                    {group.title}
                  </h3>
                  <dl className="divide-y divide-border/40">
                    {group.rows.map((feature) => (
                      <div key={feature.slug} className="grid grid-cols-[minmax(0,1fr)_auto] gap-4 py-3">
                        <dt className="min-w-0">
                          <span className="block text-[13px] font-medium">{feature.label}</span>
                          {feature.description && (
                            <span className="mt-0.5 block text-[11px] leading-4 text-muted-foreground">
                              {feature.description}
                            </span>
                          )}
                        </dt>
                        <dd className="max-w-52 text-right text-[13px] font-medium">
                          {plan && <FeatureValue feature={feature} plan={plan} />}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </section>
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function FeatureValue({ feature, plan }: Readonly<{ feature: PlanFeature; plan: Plan }>) {
  const display = feature.display[plan.code]?.trim()
  const value = plan.values[feature.slug]

  if (display) return <span>{display}</span>
  if (typeof value === "boolean") {
    return value ? (
      <span className="inline-flex items-center gap-1 text-status-success"><Check className="size-4" /> Included</span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted-foreground"><Minus className="size-4" /> Not included</span>
    )
  }
  if (value === -1) return <>Unlimited</>
  if (value === null || value === undefined) return <span className="text-muted-foreground">Not available</span>

  const suffix = feature.unit && !feature.unit.includes("enum") && !feature.unit.includes("text")
    ? ` ${feature.unit}`
    : ""
  const formatted = typeof value === "number" ? value.toLocaleString() : value
  return <span className={cn(!display && "tabular-nums")}>{formatted}{suffix}</span>
}

function slugify(value: string): string {
  return value.toLowerCase().replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/(^-|-$)/g, "")
}
