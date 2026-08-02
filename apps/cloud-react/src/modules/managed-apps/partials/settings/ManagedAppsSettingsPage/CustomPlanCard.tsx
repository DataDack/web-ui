import { useTranslation } from "react-i18next"
import { Button } from "@datadack/common-ui"
import { MessagesSquare, Sparkles } from "lucide-react"

/** What a Custom tier answers, in the same four slots the priced tiers use. */
const CUSTOM_HIGHLIGHTS = [
  { label: "Projects", value: "As many as you need" },
  { label: "Bandwidth", value: "Negotiated" },
  { label: "Build minutes", value: "Negotiated" },
  { label: "Support", value: "Direct line" },
]

/**
 * The tier that is not in the catalogue.
 *
 * Every other card here can be bought by pressing it. This one cannot, and
 * pretending otherwise — a price, a checkout — would be a lie the moment anyone
 * clicked it. So it says what it is: a conversation, opened as a support ticket
 * so the answer arrives somewhere the customer can find it again.
 *
 * It is rendered by the page rather than served by the catalogue because there
 * is no such row in S3 and there should not be: a tier with no price and no
 * quotas would break every consumer that reads those fields as numbers.
 */
export function CustomPlanCard({
  disabled,
  onContact,
}: Readonly<{ disabled?: boolean; onContact: () => void }>) {
  const { t } = useTranslation()
  return (
    <div className="relative flex flex-col gap-4 rounded-xl border border-dashed border-brand-gold/40 bg-brand-gold-soft/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <span
          className="flex size-9 items-center justify-center rounded-lg border border-brand-gold/40 bg-brand-gold/10 text-brand-gold"
          aria-hidden
        >
          <Sparkles className="size-5" />
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-semibold">Custom</p>
        <p className="text-xl font-semibold tracking-tight">
          {t("managedApps.customPlanCard.letAposSTalk")}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-brand-gold/20 pt-3">
        {CUSTOM_HIGHLIGHTS.map((row) => (
          <div key={row.label} className="min-w-0">
            <dt className="truncate text-[10px] tracking-wide text-muted-foreground uppercase">
              {row.label}
            </dt>
            <dd className="truncate text-[13px] font-medium">{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-auto space-y-1.5 pt-1">
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
