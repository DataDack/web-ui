import { cn } from "@datadack/common-ui"
import { Check, Globe, ServerCog } from "lucide-react"
import { useTranslation } from "react-i18next"

import type { DomainClaimKind } from "../domains.types"

/**
 * Which kind of name is being added: another one of ours, or one of theirs.
 *
 * Two cards rather than a segmented control, because the choice is not a view
 * of the same thing — the two paths differ in what the tenant has to do next
 * (nothing, versus editing DNS at their registrar) and in how long it takes
 * (immediately, versus minutes). That difference belongs on the control, so it
 * is read before the choice rather than discovered after it.
 *
 * The whole card is the control, and selection is carried by the border, a
 * tinted surface AND a check mark, so it survives a colorblind reader — the
 * same rules PackageOptionCard follows in the function-create flow.
 */
export function DomainKindChoice({
  value,
  onChange,
  zone,
  internalDisabled = false,
}: Readonly<{
  value: DomainClaimKind
  onChange: (kind: DomainClaimKind) => void
  /** The platform zone internal names sit in, named on the card when known. */
  zone: string
  /** No platform address to add a name beside yet — deploy first. */
  internalDisabled?: boolean
}>) {
  const { t } = useTranslation()

  const options = [
    {
      kind: "internal" as const,
      icon: ServerCog,
      title: t("domains.add.kind.internal.title"),
      subtitle: zone
        ? t("domains.add.kind.internal.subtitleZoned", { zone })
        : t("domains.add.kind.internal.subtitle"),
      note: internalDisabled
        ? t("domains.add.kind.internal.unavailable")
        : t("domains.add.kind.internal.note"),
      disabled: internalDisabled,
    },
    {
      kind: "external" as const,
      icon: Globe,
      title: t("domains.add.kind.external.title"),
      subtitle: t("domains.add.kind.external.subtitle"),
      note: t("domains.add.kind.external.note"),
      disabled: false,
    },
  ]

  return (
    <div
      role="radiogroup"
      aria-label={t("domains.add.kind.label")}
      className="grid gap-2 sm:grid-cols-2"
    >
      {options.map((option) => {
        const Icon = option.icon
        const selected = option.kind === value && !option.disabled
        return (
          <button
            key={option.kind}
            type="button"
            role="radio"
            aria-checked={selected}
            disabled={option.disabled}
            onClick={() => {
              onChange(option.kind)
            }}
            className={cn(
              "group relative flex flex-col gap-2 rounded-lg border p-3 text-left transition-colors",
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
            <span className="flex items-center gap-2">
              <Icon
                className={cn(
                  "size-4 shrink-0",
                  selected ? "text-brand-gold" : "text-muted-foreground",
                )}
              />
              <span className="text-[13px] font-semibold">{option.title}</span>
            </span>
            <span className="block text-[12px] text-muted-foreground">{option.subtitle}</span>
            <span className="block text-[11px] text-muted-foreground/80">{option.note}</span>
          </button>
        )
      })}
    </div>
  )
}
