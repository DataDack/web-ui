import type { ReactNode } from "react"

import { cn, Skeleton } from "@datadack/common-ui"
import { Loader2, type LucideIcon } from "lucide-react"

import type { CoverageSource } from "./feature-coverage"

interface MeteredStatProps {
  label: string
  icon?: LucideIcon
  /** How this figure is known — see FEATURE_COVERAGE. */
  source: CoverageSource
  /** The measurement. Only read when `source` is "measured". */
  value?: string
  /** What the plan grants. Shown under the value, and alone for entitlements. */
  entitlement?: string
  /**
   * The customer-facing detail, on hover. Never an internal note: this string
   * reaches the customer's screen, so it says what the effect is for them and
   * names no service, environment variable or component of ours.
   */
  detail?: string
  loading?: boolean
  footer?: ReactNode
  className?: string
}

/**
 * One number on a dashboard, in whichever of three states it is honestly in.
 *
 * The states exist because a metered platform has three genuinely different
 * things to say, and collapsing them is how dashboards start lying:
 *
 *   measured     A real figure the platform recorded. The only state that ever
 *                shows a number.
 *   calculating  Sold, and the meter is not landed yet. Shows what the plan
 *                GRANTS — which is true — and says the usage figure is still
 *                being worked out. Never a plausible-looking number: a made-up
 *                usage figure next to a real quota is a bill computed from
 *                fiction, and it is the sort of thing that is discovered after
 *                the sale rather than before it.
 *   entitlement  Nothing to meter. "SAML SSO: included", "timeout: 60s" — a
 *                capability or a ceiling, complete as it stands.
 *
 * The calculating tile is deliberately not a greyed-out placeholder. It carries
 * the entitlement at full weight, because that half IS known and is the half a
 * customer is choosing a plan on; only the usage half is withheld.
 */
export function MeteredStat({
  label,
  icon: Icon,
  source,
  value,
  entitlement,
  detail,
  loading = false,
  footer,
  className,
}: Readonly<MeteredStatProps>) {
  return (
    <div className={cn("rounded-xl border border-border/60 glass-1-bg p-4", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] tracking-wide text-muted-foreground uppercase">{label}</span>
        {Icon && <Icon className="size-3.5 shrink-0 text-muted-foreground/70" />}
      </div>

      {loading ? (
        <Skeleton className="mt-2 h-8 w-24" />
      ) : (
        <StatValue source={source} value={value} entitlement={entitlement} detail={detail} />
      )}

      {footer && <div className="mt-2">{footer}</div>}
    </div>
  )
}

function StatValue({
  source,
  value,
  entitlement,
  detail,
}: Readonly<Pick<MeteredStatProps, "source" | "value" | "entitlement" | "detail">>) {
  if (source === "measured") {
    return (
      <>
        <p className="mt-1.5 font-mono text-2xl font-semibold text-foreground">{value ?? "—"}</p>
        {entitlement && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">of {entitlement}</p>
        )}
      </>
    )
  }

  if (source === "entitlement") {
    // The plan's answer IS the value here — there is no second, truer number
    // being withheld, so it is set at full weight with nothing hedging it.
    return (
      <p className="mt-1.5 font-mono text-2xl font-semibold text-foreground">
        {entitlement ?? "—"}
      </p>
    )
  }

  // Calculating. The entitlement leads, because it is the part that is known.
  return (
    <>
      <p className="mt-1.5 font-mono text-2xl font-semibold text-foreground">
        {entitlement ?? "—"}
      </p>
      <p
        className="mt-0.5 flex items-center gap-1.5 text-[11px] text-muted-foreground"
        // The truth, one hover away. The visible word is "calculating" because
        // that is what a reader needs to know to stop waiting for a number;
        // this is what they need if they ask why.
        title={detail ?? "Usage metering for this feature is not live yet."}
      >
        <Loader2 className="size-3 animate-spin opacity-60" />
        Calculating usage…
      </p>
    </>
  )
}
