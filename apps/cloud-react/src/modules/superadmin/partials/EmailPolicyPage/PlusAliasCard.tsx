import { Card, cn } from "@datadack/common-ui"
import { Check, Split } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { PlusAliasMode } from "../../superadmin.types"

interface PlusAliasCardProps {
  value: PlusAliasMode
  modes: PlusAliasMode[]
  disabled: boolean
  onChange: (mode: PlusAliasMode) => void
}

/**
 * The plus-alias rule, as three mutually exclusive outcomes rather than a
 * switch.
 *
 * A toggle would have to pick which two of the three are "on" and "off", and
 * the interesting one — fold the alias back to the real mailbox — is neither.
 * Each option states what happens to a concrete address instead of naming the
 * rule, because "normalize" means nothing until you see that
 * abhishek+6773@gmail.com becomes abhishek@gmail.com.
 */
export function PlusAliasCard({ value, modes, disabled, onChange }: Readonly<PlusAliasCardProps>) {
  const { t } = useTranslation()

  return (
    <Card className="p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border/60 bg-muted/40 text-muted-foreground">
          <Split className="size-4" />
        </div>
        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
            <h3 className="text-sm font-semibold text-foreground">
              {t("superAdmin.emailPolicy.plusAlias.title")}
            </h3>
            <p className="text-[13px] text-muted-foreground">
              {t("superAdmin.emailPolicy.plusAlias.description")}
            </p>
          </div>

          <div className="grid gap-2 sm:grid-cols-3">
            {modes.map((mode) => {
              const selected = mode === value
              return (
                <button
                  key={mode}
                  type="button"
                  disabled={disabled}
                  aria-pressed={selected}
                  onClick={() => {
                    if (!selected) onChange(mode)
                  }}
                  className={cn(
                    "rounded-lg border p-3 text-left transition-colors",
                    "disabled:cursor-not-allowed disabled:opacity-60",
                    selected
                      ? "border-primary/50 bg-primary/5"
                      : "border-border/60 hover:border-border hover:bg-muted/40",
                  )}
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-medium text-foreground">
                    {selected && <Check className="size-3.5 text-primary" />}
                    {t(`superAdmin.emailPolicy.plusAlias.modes.${mode}.label`)}
                  </span>
                  <span className="mt-1 block text-[12px] text-muted-foreground">
                    {t(`superAdmin.emailPolicy.plusAlias.modes.${mode}.description`)}
                  </span>
                  {/* The example is the point of the control: the difference
					          between the three modes is only legible on a real address. */}
                  <span className="mt-1.5 block font-mono text-[11px] text-muted-foreground/80">
                    {t(`superAdmin.emailPolicy.plusAlias.modes.${mode}.example`)}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </Card>
  )
}
