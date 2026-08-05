import { useState } from "react"

import { Check, Loader2, ServerCog, TriangleAlert } from "lucide-react"

import { useHostingPlans, useOrderHosting } from "@/modules/hosting/hosting.hooks"
import type { HostingPlan } from "@/modules/hosting/hosting.types"
import {
  entryPrice,
  formatCount,
  formatLimitMB,
  formatMoney,
} from "@/modules/hosting/hosting.utils"

import { Button, cn, Input, Label } from "@datadack/common-ui"

/** A bare hostname: labels separated by dots, no scheme, no path, no trailing dot. */
const DOMAIN_PATTERN = /^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)+$/i

function domainProblem(raw: string): string | undefined {
  const value = raw.trim()
  if (value === "") return "Enter the domain this hosting is for"
  if (!DOMAIN_PATTERN.test(value)) {
    return "Enter a bare domain, like example.com — no http:// and no trailing slash"
  }
  return undefined
}

interface HostingPhaseProps {
  /** Where to send the user once the account is reserved. */
  onOrdered: (accountId: string) => void
}

/**
 * cPanel shared hosting, ordered from inside the Managed Apps create flow.
 *
 * This phase deliberately does NOT use the composer's form state. Everything in
 * `composerSchema` describes a repository — installation, repo, branch, build
 * commands — and its `superRefine` demands those fields. A hosting order shares
 * none of them: it needs a domain and a plan, and nothing else. Threading it
 * through the same object would mean either loosening the repo validation for
 * every path or carrying a second set of conditional rules through a schema
 * that currently reads as one thing.
 *
 * So the source step forks here and the two paths never merge again. The only
 * shared state is `values.source`, which exists so a reloaded draft resumes on
 * this phase instead of dropping the user back at the fork.
 *
 * The order itself is the platform's existing one — `POST /hosting/accounts/`.
 * Nothing about provisioning is reimplemented: the account is reserved, billed
 * and queued exactly as it is from the hosting pricing page, and the WHM call
 * happens in the worker.
 */
export function HostingPhase({ onOrdered }: Readonly<HostingPhaseProps>) {
  const plans = useHostingPlans()
  const order = useOrderHosting()

  const [domain, setDomain] = useState("")
  const [sku, setSku] = useState("")
  const [touched, setTouched] = useState(false)

  // Sorted by size so the tier glyphs form a scale that matches reading order.
  const available = (plans.data?.items ?? [])
    .filter((plan) => plan.visible && !plan.retired)
    .sort((a, b) => a.limits.disk_mb - b.limits.disk_mb)

  // A domain is the one thing we cannot derive. The cPanel username is left to
  // the backend, which allocates it from the domain and guarantees uniqueness
  // per server — asking for it here would surface a cPanel constraint (16
  // characters, per-server collisions) that the user has no way to reason about.
  const domainIssue = domainProblem(domain)
  const planIssue = sku === "" ? "Choose a plan" : undefined
  const blocked = domainIssue != null || planIssue != null

  const submit = () => {
    setTouched(true)
    if (blocked) return
    order.mutate(
      { domain: domain.trim().toLowerCase(), plan_sku: sku, cycle: "monthly" },
      {
        onSuccess: (account) => {
          onOrdered(account.id)
        },
      },
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-8">
      {/* No back control here: the composer header's own Back returns to the
          fork from this phase, and two arrows pointing the same way one line
          apart read as two different destinations. */}
      <div>
        <h2 className="text-sm font-semibold">cPanel shared hosting</h2>
        <p className="text-[12px] text-muted-foreground">
          We create the cPanel account for you. Point your domain at our nameservers when it is
          ready.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="hosting-domain">Domain</Label>
        <Input
          id="hosting-domain"
          value={domain}
          placeholder="example.com"
          autoComplete="off"
          spellCheck={false}
          onChange={(event) => {
            setDomain(event.target.value)
          }}
          aria-invalid={touched && domainIssue ? true : undefined}
        />
        {touched && domainIssue ? (
          <p className="flex items-center gap-1.5 text-[12px] text-status-danger">
            <TriangleAlert className="size-3.5" />
            {domainIssue}
          </p>
        ) : (
          <p className="text-[12px] text-muted-foreground">
            Your cPanel username and password are generated for you — you never have to pick them.
          </p>
        )}
      </div>

      <div className="space-y-2">
        <Label>Plan</Label>

        {plans.isLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 p-6 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading plans…
          </div>
        )}

        {!plans.isLoading && available.length === 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-6 text-[13px] text-muted-foreground">
            <p className="font-medium text-foreground">No hosting plans are published yet.</p>
            <p className="mt-1">
              An administrator has to add a plan and register a cPanel server before hosting can be
              ordered.
            </p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {available.map((plan, index) => (
            <PlanCard
              key={plan.sku}
              plan={plan}
              rank={index}
              total={available.length}
              selected={plan.sku === sku}
              onSelect={() => {
                setSku(plan.sku)
              }}
            />
          ))}
        </div>

        {touched && planIssue && (
          <p className="flex items-center gap-1.5 text-[12px] text-status-danger">
            <TriangleAlert className="size-3.5" />
            {planIssue}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 border-t border-border/60 pt-4">
        <p className="text-[12px] text-muted-foreground">
          Billed monthly from your account balance. Provisioning usually takes under a minute.
        </p>
        <Button type="button" onClick={submit} disabled={order.isPending || available.length === 0}>
          {order.isPending ? (
            <>
              <Loader2 className="size-4 animate-spin" /> Creating…
            </>
          ) : (
            <>
              <ServerCog className="size-4" /> Create hosting
            </>
          )}
        </Button>
      </div>
    </div>
  )
}

interface PlanCardProps {
  plan: HostingPlan
  /** 0-based position by disk size among the plans on screen. */
  rank: number
  /** How many plans are on screen, so the glyph scales to the real range. */
  total: number
  selected: boolean
  onSelect: () => void
}

function PlanCard({ plan, rank, total, selected, onSelect }: Readonly<PlanCardProps>) {
  const price = entryPrice(plan)
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border p-4 text-left",
        "transition-all duration-200 ease-out",
        "focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none",
        "motion-reduce:transform-none motion-reduce:transition-colors",
        selected
          ? "border-status-info bg-status-info/5 shadow-md shadow-status-info/10"
          : cn(
              "border-border/60",
              // A selected card is already lifted, so only unselected ones move
              // — otherwise choosing one makes the row twitch.
              "hover:-translate-y-0.5 hover:border-status-info/50 hover:bg-status-info/[0.03] hover:shadow-lg hover:shadow-status-info/5",
            ),
      )}
    >
      {selected && (
        <span className="absolute top-3 right-3 flex size-5 items-center justify-center rounded-full bg-status-info text-white">
          <Check className="size-3" />
        </span>
      )}

      <div className="flex items-center gap-3">
        <TierArt rank={rank} total={total} active={selected} />
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold">{plan.name}</span>
          {price && (
            <span className="block text-[12px] text-muted-foreground">
              <span className="font-medium text-foreground">
                {formatMoney(price.amount, plan.pricing.currency)}
              </span>{" "}
              / {price.cycle}
            </span>
          )}
        </span>
      </div>

      <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-[12px] text-muted-foreground">
        <SpecRow label="Disk" value={formatLimitMB(plan.limits.disk_mb)} />
        <SpecRow label="Bandwidth" value={formatLimitMB(plan.limits.bandwidth_mb)} />
        <SpecRow label="Databases" value={formatCount(plan.limits.databases)} />
        <SpecRow label="Mailboxes" value={formatCount(plan.limits.email_accounts)} />
      </dl>
    </button>
  )
}

function SpecRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="truncate">{label}</dt>
      <dd className="font-medium text-foreground tabular-nums">{value}</dd>
    </div>
  )
}

const TIER_BAR_HEIGHTS = [6, 11, 16]

/**
 * A three-bar glyph that reads as "more" before any number is.
 *
 * Filled bars come from the plan's POSITION by disk size, not from its SKU.
 * Hosting plans are authored in S3, so their identifiers are whatever an
 * operator typed — a lookup table keyed on them would render every unrecognised
 * plan identically, and the catalogue is the one place new keys appear without
 * this file knowing. Ranking sidesteps that entirely: any set of plans, in any
 * naming scheme, still sorts into a scale.
 */
function TierArt({
  rank,
  total,
  active,
}: Readonly<{ rank: number; total: number; active: boolean }>) {
  // Spread the ranks across three bars, so two plans read as low/high and five
  // still fill the scale rather than clustering at one end.
  const filled = total <= 1 ? 1 : Math.min(3, Math.max(1, Math.round(((rank + 1) / total) * 3)))
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg border transition-colors",
        active
          ? "border-status-info/40 bg-status-info/10 text-status-info"
          : "border-border/60 bg-muted/40 text-muted-foreground",
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" className="size-5" fill="none">
        {TIER_BAR_HEIGHTS.map((height, index) => (
          <rect
            key={height}
            x={4 + index * 6}
            y={20 - height}
            width={4}
            height={height}
            rx={1.5}
            fill="currentColor"
            opacity={index < filled ? 1 : 0.2}
          />
        ))}
      </svg>
    </span>
  )
}
