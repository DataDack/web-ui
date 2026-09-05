import { cn } from "@datadack/common-ui"
import { Check, CornerUpRight, ServerCog } from "lucide-react"
import { useTranslation } from "react-i18next"

export type DomainBehavior = "connect" | "redirect"

/**
 * What an active hostname does when traffic reaches the edge.
 *
 * This is deliberately separate from DomainKindChoice. “Internal or external”
 * describes who owns the name; “Production or redirect” describes where a
 * request goes. Putting both facts on one overloaded control is how a DNS
 * choice ends up looking like a routing choice.
 */
export function DomainBehaviorChoice({
  value,
  onChange,
  redirectDisabled = false,
  redirectDisabledReason,
}: Readonly<{
  value: DomainBehavior
  onChange: (behavior: DomainBehavior) => void
  redirectDisabled?: boolean
  redirectDisabledReason?: string
}>) {
  const { t } = useTranslation()

  const options = [
    {
      behavior: "connect" as const,
      icon: ServerCog,
      title: t("domains.behavior.connect.title"),
      subtitle: t("domains.behavior.connect.subtitle"),
      route: t("domains.behavior.connect.environment"),
      disabled: false,
    },
    {
      behavior: "redirect" as const,
      icon: CornerUpRight,
      title: t("domains.behavior.redirect.title"),
      subtitle: t("domains.behavior.redirect.subtitle"),
      route: redirectDisabledReason ?? t("domains.behavior.redirect.route"),
      disabled: redirectDisabled,
    },
  ]

  return (
    <div className="space-y-1.5">
      <p className="text-[13px] font-medium text-foreground">{t("domains.behavior.label")}</p>
      <div
        role="radiogroup"
        aria-label={t("domains.behavior.label")}
        className="grid gap-2 sm:grid-cols-2"
      >
        {options.map((option) => {
          const Icon = option.icon
          const selected = option.behavior === value && !option.disabled
          return (
            <button
              key={option.behavior}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={option.disabled}
              onClick={() => {
                onChange(option.behavior)
              }}
              className={cn(
                "group relative flex min-h-28 flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
                "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-60",
                selected
                  ? "border-brand-gold/60 bg-brand-gold-soft"
                  : "border-border/60 glass-1-bg-raised hover:border-brand-gold/40",
              )}
            >
              {selected && (
                <span
                  aria-hidden
                  className="absolute top-2.5 right-2.5 flex size-4 items-center justify-center rounded-full bg-brand-gold text-brand-gold-foreground"
                >
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
              )}
              <span className="flex items-center gap-2 pr-5">
                <Icon
                  className={cn(
                    "size-4 shrink-0",
                    selected ? "text-brand-gold" : "text-muted-foreground",
                  )}
                />
                <span className="text-[13px] font-semibold">{option.title}</span>
              </span>
              <span className="block text-[12px] leading-snug text-muted-foreground">
                {option.subtitle}
              </span>
              <span className="mt-auto block font-mono text-[11px] text-muted-foreground/80">
                {option.route}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
