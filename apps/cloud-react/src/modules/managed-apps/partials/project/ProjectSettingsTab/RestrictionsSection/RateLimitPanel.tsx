import { Input, Label, Switch } from "@datadack/common-ui"
import { Gauge, TriangleAlert } from "lucide-react"

import { Section } from "@/components/console"

interface RateLimitPanelProps {
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  rps: string
  onRpsChange: (value: string) => void
  burst: string
  onBurstChange: (value: string) => void
  /** 0 means the tier sells no rate rule; -1 means unlimited. */
  max: number
  disabled?: boolean
}

/**
 * The project's own request ceiling.
 *
 * A SWITCH AND NOT A NUMBER THAT DEFAULTS TO ZERO, because off and zero are
 * opposite instructions at the edge: no limit at all means the platform's own
 * default applies, while a limit of zero requests per second serves nothing —
 * which is a real and occasionally wanted setting (an app taken off the air
 * without being deleted) and would be a catastrophic accident to arrive at by
 * leaving a box empty. The switch is what keeps those two apart, and the
 * warning is what makes the second one deliberate.
 *
 * BURST IS SEPARATE FROM THE RATE because one page load of a React application
 * IS a burst — the document and then every hashed asset — so a burst equal to
 * the sustained rate breaks the page for a single ordinary visitor. Left blank
 * it follows the rate, which is the smallest value that does not.
 */
export function RateLimitPanel({
  enabled,
  onEnabledChange,
  rps,
  onRpsChange,
  burst,
  onBurstChange,
  max,
  disabled,
}: Readonly<RateLimitPanelProps>) {
  const sellsNone = max === 0
  const rate = Number.parseInt(rps, 10)
  const servesNothing = enabled && (!Number.isFinite(rate) || rate <= 0)

  return (
    <Section
      variant="panel"
      icon={Gauge}
      tone="info"
      title="Rate limit"
      description="A ceiling on how fast this hostname may be served, applied at the edge before the app is reached."
      actions={
        <Switch
          checked={enabled}
          disabled={Boolean(disabled) || (sellsNone && !enabled)}
          aria-label="Limit requests to this app"
          onCheckedChange={onEnabledChange}
        />
      }
    >
      {enabled ? (
        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label
                className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                htmlFor="rate-limit-rps"
              >
                Requests per second
              </Label>
              <Input
                id="rate-limit-rps"
                value={rps}
                inputMode="numeric"
                placeholder="100"
                disabled={disabled}
                className="h-9 w-[120px] font-mono tabular-nums"
                onChange={(event) => {
                  onRpsChange(event.target.value.replace(/\D/g, ""))
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label
                className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
                htmlFor="rate-limit-burst"
              >
                Burst
              </Label>
              <Input
                id="rate-limit-burst"
                value={burst}
                inputMode="numeric"
                placeholder={rps === "" ? "same as rate" : rps}
                disabled={disabled}
                className="h-9 w-[120px] font-mono tabular-nums"
                onChange={(event) => {
                  onBurstChange(event.target.value.replace(/\D/g, ""))
                }}
              />
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Burst is how many requests may arrive at once. One page load asks for the document and
            then every hashed asset, so a burst equal to the rate is the smallest value a single
            visitor will not trip. Blank follows the rate.
          </p>
          {servesNothing && (
            <p className="flex items-start gap-2 rounded-lg border border-status-danger/30 bg-status-danger-bg/40 px-3 py-2 text-[12px]">
              <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-status-danger" aria-hidden />
              <span>
                A limit of zero serves nothing. Every visitor gets a 429 until this is raised or the
                limit is switched off.
              </span>
            </p>
          )}
        </div>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          {sellsNone
            ? "This plan does not include a per-app rate limit. The platform default applies."
            : "The platform default applies. Set a ceiling when this app should shed load rather than pass a flood to its origin."}
        </p>
      )}
    </Section>
  )
}
