import { Skeleton } from "@datadack/common-ui"
import { AlertCircle } from "lucide-react"

import { Section } from "@/components/console"

import { PlanComparisonTable } from "./PlanComparisonTable"
import { useAccountPlan, usePlanCatalog } from "../../../managed-apps.hooks"

/**
 * Every tier against every feature, on a section of its own.
 *
 * It sat under the plan cards before, where it was the tallest thing on the
 * page and the least often wanted: you compare tiers once, then change plan
 * many times. Its own section keeps both readable.
 */
export function ComparePlansSection() {
  const { data: catalog, isLoading, isError } = usePlanCatalog()
  const { data: account } = useAccountPlan()

  const plans = catalog?.plans ?? []
  const features = catalog?.features ?? []
  // The tier in force is highlighted in its column; falling back to the
  // catalogue's cheapest row matches what the plan section shows for an
  // account whose own plan cannot be read.
  const currentCode = account?.plan.code ?? plans.at(0)?.code

  return (
    <Section
      title="Compare plans"
      description="Every quota and capability, side by side. Most of what Managed Apps does is on every plan — the numbers are where the tiers differ."
    >
      {isLoading && <Skeleton className="h-80 rounded-xl" />}

      {!isLoading && (isError || plans.length === 0 || features.length === 0) && (
        <div className="flex items-start gap-2.5 rounded-lg border border-border/60 glass-1-bg px-3 py-2.5">
          <AlertCircle className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-[12px] text-muted-foreground">
            The plan catalogue could not be loaded, so there is nothing to compare right now. Your
            account stays on the plan it is on.
          </p>
        </div>
      )}

      {!isLoading && plans.length > 0 && features.length > 0 && (
        <PlanComparisonTable plans={plans} features={features} currentCode={currentCode} />
      )}
    </Section>
  )
}
