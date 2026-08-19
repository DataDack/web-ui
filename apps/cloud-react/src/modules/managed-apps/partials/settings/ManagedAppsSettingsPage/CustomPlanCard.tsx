import { Button } from "@datadack/common-ui"
import { MessagesSquare, Sparkles } from "lucide-react"
import { useTranslation } from "react-i18next"

/**
 * The tier that is not in the catalogue.
 *
 * Every other card here can be bought by pressing it. This one cannot, and
 * pretending otherwise — a price, a checkout — would be a lie the moment anyone
 * clicked it. So it says what it is: a conversation, opened as a support ticket
 * so the answer arrives somewhere the customer can find it again.
 *
 * It is rendered ONLY when the catalogue cannot be read. In the ordinary case
 * Enterprise is a catalogue row like any other (is_custom_priced, so its card
 * offers a conversation instead of a button) and this card would be a second
 * card for the same thing. Its three lines are therefore written here rather
 * than read from the catalogue: the one moment it appears is the moment there
 * is no catalogue to read them from.
 */
const HIGHLIGHTS = [
  { label: "Projects", value: "As many as you need" },
  { label: "Bandwidth", value: "Negotiated" },
  { label: "Build minutes", value: "Negotiated" },
  { label: "Support", value: "Direct line" },
]
export function CustomPlanCard({
  disabled,
  onContact,
}: Readonly<{ disabled?: boolean; onContact: () => void }>) {
  const { t } = useTranslation()
  return (
    <div className="relative flex min-w-0 flex-col gap-3 rounded-xl border border-dashed border-brand-gold/40 bg-brand-gold-soft/40 p-3">
      {/* The priced cards put a pill opposite their glyph; there is no pill to
          put here, so the row is just the glyph — but it keeps the same height
          so all four cards share one horizontal rhythm across the line. */}
      <div className="flex min-h-9 items-start gap-2.5">
        <span
          className="flex size-9 items-center justify-center rounded-lg border border-brand-gold/40 bg-brand-gold/10 text-brand-gold"
          aria-hidden
        >
          <Sparkles className="size-5" />
        </span>
      </div>

      <div className="min-w-0 space-y-1">
        <p className="flex min-w-0 items-baseline justify-between gap-2">
          <span className="truncate text-sm font-semibold">Custom</span>
          <span className="shrink-0 text-lg font-semibold tracking-tight">
            {t("managedApps.customPlanCard.letAposSTalk")}
          </span>
        </p>
        <p className="truncate text-[11px] text-muted-foreground">
          Everything in the paid plans, on your terms
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-2.5 gap-y-1.5 border-t border-brand-gold/20 pt-2.5">
        {HIGHLIGHTS.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="truncate text-[10px] tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="truncate text-[12px] font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto space-y-1 pt-0.5">
        <Button
          type="button"
          variant="gold"
          size="sm"
          className="w-full gap-1.5"
          disabled={disabled}
          onClick={onContact}
        >
          <MessagesSquare className="size-3.5" />
          {t("managedApps.customPlanCard.contactUs")}
        </Button>
        <p className="text-[11px] text-muted-foreground">
          {t("managedApps.customPlanCard.opensASupportTicketWeReplyInTheThread")}
        </p>
      </div>
    </div>
  )
}
