import { cn } from "@datadack/common-ui"
import { CheckCircle2 } from "lucide-react"
import { motion } from "motion/react"
import type { UseFormReturn } from "react-hook-form"

import type { FormValues } from "./wizard.types"

export function BillingStep({ form }: Readonly<{ form: UseFormReturn<FormValues> }>) {
  const billingPeriod = form.watch("billing_period")

  return (
    <div className="grid sm:grid-cols-2 gap-4 max-w-2xl">
      {(["hourly", "monthly"] as const).map((period) => {
        const active = billingPeriod === period
        return (
          <motion.button
            key={period}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => {
              form.setValue("billing_period", period, { shouldValidate: true })
            }}
            className={cn(
              "glass-1 relative px-5 py-4 text-left transition-colors rounded-lg",
              active ? "gradient-ring bg-accent/20" : "hover:bg-accent/30 border-border-glass",
            )}
          >
            {active && (
              <div className="absolute top-4 right-4">
                <CheckCircle2 className="size-5 text-primary" />
              </div>
            )}
            <span className="text-[14px] font-medium text-foreground block">
              {period === "hourly" ? "Hourly" : "Monthly"}
            </span>
            <span className="text-[12px] text-muted-foreground block mt-1">
              {period === "hourly" ? "Pay as you go" : "Flat monthly rate"}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
