import { useMemo, useState } from "react"

import { Button, Input, Label, Separator } from "@datadack/common-ui"
import { Check, Globe, Sparkles } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { Section } from "@/components/console"

import { HOSTING_ROUTES } from "../hosting.constants"
import { useHostingPlans, useOrderHosting } from "../hosting.hooks"
import type { HostingPlan } from "../hosting.types"
import {
  formatCount,
  formatLimitMB,
  formatMoney,
  formatWebsites,
  soldCycles,
} from "../hosting.utils"

/** How the customer wants to be addressed on day one. */
type DomainMode = "assigned" | "own"

/**
 * The plan catalogue and the buy step, with no page chrome of its own.
 *
 * Headerless on purpose: this renders both as the body of the pricing page AND
 * inline on the cPanel Hosting view when the account has never provisioned
 * anything. Buying hosting IS the empty state of that list — an EmptyState card
 * whose only action was "See plans" made picking a plan a second page, and the
 * plans were the only thing that page had to say.
 *
 * Backed by S3 through the catalogue endpoint, so it renders without a database
 * read and without a session — a visitor sees prices before they sign up.
 */
export function HostingPlanPicker() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useHostingPlans()
  const order = useOrderHosting()

  const [selected, setSelected] = useState<HostingPlan | null>(null)
  const [domainMode, setDomainMode] = useState<DomainMode>("assigned")
  const [domain, setDomain] = useState("")

  // Memoised because `sections` depends on them: a fresh [] literal each render
  // would recompute the whole section split on every keystroke in the domain box.
  const plans = useMemo(() => data?.items ?? [], [data])
  const groups = useMemo(() => data?.groups ?? [], [data])

  // Plans whose section was deleted still have to appear — losing a section
  // must never lose a product — so anything unmatched falls into "Other".
  const sections = useMemo(() => {
    const known = groups.map((g) => ({ key: g.key, name: g.name, description: g.description }))
    const orphans = plans.filter((p) => !groups.some((g) => g.key === p.group))
    return orphans.length > 0
      ? [...known, { key: "", name: "Other plans", description: "" }]
      : known
  }, [groups, plans])

  // Bullets every plan carries say nothing about which to pick, and repeating
  // six of them per card is most of why the cards were tall enough to push the
  // order step off screen. Stated once below the grid instead.
  const sharedFeatures = useMemo(() => {
    if (plans.length === 0) return []
    const [first, ...rest] = plans
    return first.features.filter((f) => rest.every((p) => p.features.includes(f)))
  }, [plans])

  const ordering = order.isPending
  const domainReady = domainMode === "assigned" || domain.trim() !== ""

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading plans…</p>
  if (isError) return <p className="p-6 text-sm text-destructive">Plans could not be loaded.</p>

  return (
    // Bottom padding clears the sticky bar so the last card is never trapped
    // underneath it.
    <div className="space-y-6 pb-40">
      {sections.map((section) => {
        const inSection = plans.filter((p) =>
          section.key === "" ? !groups.some((g) => g.key === p.group) : p.group === section.key,
        )
        if (inSection.length === 0) return null
        return (
          <Section
            key={section.key || "other"}
            title={section.name}
            description={section.description}
          >
            {/* Four across on a wide screen so the whole range is comparable
                without scrolling, which is the only way a price table works. */}
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {inSection.map((plan) => (
                <PlanCard
                  key={plan.sku}
                  plan={plan}
                  selected={selected?.sku === plan.sku}
                  sharedFeatures={sharedFeatures}
                  onSelect={() => {
                    setSelected(plan)
                  }}
                />
              ))}
            </div>
          </Section>
        )
      })}

      {sharedFeatures.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border glass-1-bg px-4 py-3">
          <span className="text-[12px] font-medium">In every plan</span>
          {sharedFeatures.map((f) => (
            <span key={f} className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
              <Check className="size-3.5 shrink-0 text-emerald-500" />
              {f}
            </span>
          ))}
        </div>
      )}

      {/* Pinned rather than placed at the end of the page. A checkout step below
          four full-height cards is a step most people never scroll to — the bar
          keeps it in view from the moment a plan is picked. */}
      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border glass-3-bg">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 p-4 lg:flex-row lg:items-end">
            <div className="min-w-0 lg:w-56">
              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Your plan</p>
              <p className="truncate text-sm font-semibold">{selected.name}</p>
              <p className="text-[12px] text-muted-foreground">
                {formatMoney(selected.pricing.monthly, selected.pricing.currency)}/month
                {selected.pricing.setup_fee > 0 &&
                  ` + ${formatMoney(selected.pricing.setup_fee, selected.pricing.currency)} setup`}
              </p>
            </div>

            <Separator orientation="vertical" className="hidden h-12 lg:block" />

            <div className="min-w-0 flex-1 space-y-2">
              <Label className="text-[12px]">Your address</Label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <DomainChoice
                  active={domainMode === "assigned"}
                  icon={Sparkles}
                  title="Give me an address"
                  hint="Ready right away — connect a domain later"
                  onClick={() => {
                    setDomainMode("assigned")
                  }}
                />
                <DomainChoice
                  active={domainMode === "own"}
                  icon={Globe}
                  title="I have a domain"
                  hint="Point it at us after setup"
                  onClick={() => {
                    setDomainMode("own")
                  }}
                />
              </div>
              {domainMode === "own" && (
                <Input
                  value={domain}
                  onChange={(e) => {
                    setDomain(e.target.value)
                  }}
                  placeholder="example.com"
                  className="h-9"
                />
              )}
            </div>

            <Button
              size="lg"
              className="lg:w-48"
              disabled={ordering || !domainReady}
              onClick={() => {
                order.mutate(
                  {
                    // Omitted, not blanked: the panel only assigns an address of
                    // its own when the field is absent from the request.
                    ...(domainMode === "own" ? { domain: domain.trim() } : {}),
                    plan_sku: selected.sku,
                    cycle: "monthly",
                  },
                  {
                    onSuccess: (account) => {
                      setDomain("")
                      setSelected(null)
                      void navigate(HOSTING_ROUTES.account(account.id))
                    },
                  },
                )
              }}
            >
              {ordering
                ? "Setting up…"
                : `Buy for ${formatMoney(selected.pricing.monthly, selected.pricing.currency)}/mo`}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function DomainChoice({
  active,
  icon: Icon,
  title,
  hint,
  onClick,
}: Readonly<{
  active: boolean
  icon: typeof Globe
  title: string
  hint: string
  onClick: () => void
}>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-start gap-2 rounded-lg border px-3 py-2 text-left transition ${
        active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <Icon
        className={`mt-0.5 size-4 shrink-0 ${active ? "text-primary" : "text-muted-foreground"}`}
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-medium leading-tight">{title}</span>
        <span className="block text-[11px] leading-tight text-muted-foreground">{hint}</span>
      </span>
    </button>
  )
}

function PlanCard({
  plan,
  selected,
  sharedFeatures,
  onSelect,
}: Readonly<{
  plan: HostingPlan
  selected: boolean
  sharedFeatures: string[]
  onSelect: () => void
}>) {
  const cycles = soldCycles(plan)
  // Only what makes THIS plan different from its neighbours. The rest is stated
  // once for the whole range.
  const distinct = plan.features.filter((f) => !sharedFeatures.includes(f))
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex flex-col rounded-xl border p-4 text-left transition ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
      }`}
    >
      <span className="text-[14px] font-semibold">{plan.name}</span>
      {plan.description && (
        <span className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
          {plan.description}
        </span>
      )}

      <span className="mt-3 flex items-baseline gap-1">
        <span className="text-xl font-semibold">
          {formatMoney(plan.pricing.monthly, plan.pricing.currency)}
        </span>
        <span className="text-[11px] text-muted-foreground">/month</span>
      </span>
      {plan.pricing.setup_fee > 0 && (
        <span className="text-[11px] text-muted-foreground">
          plus {formatMoney(plan.pricing.setup_fee, plan.pricing.currency)} setup
        </span>
      )}
      {/* Longer cycles are priced in the catalogue but not yet sellable — saying
          so beats showing a price that cannot be bought. */}
      {cycles.length > 1 && (
        <span className="mt-0.5 text-[11px] text-muted-foreground">Longer terms coming soon</span>
      )}

      <div className="mt-3 space-y-1 border-t border-border pt-3 text-[12px]">
        <Spec label="Disk" value={formatLimitMB(plan.limits.disk_mb)} />
        <Spec label="Bandwidth" value={formatLimitMB(plan.limits.bandwidth_mb)} />
        <Spec label="Websites" value={formatWebsites(plan.limits.addon_domains)} />
        <Spec label="Email accounts" value={formatCount(plan.limits.email_accounts)} />
        <Spec label="Databases" value={formatCount(plan.limits.databases)} />
      </div>

      {distinct.length > 0 && (
        <ul className="mt-3 space-y-1">
          {distinct.map((f) => (
            <li key={f} className="flex items-start gap-1.5 text-[11px]">
              <Check className="mt-0.5 size-3 shrink-0 text-emerald-500" />
              {f}
            </li>
          ))}
        </ul>
      )}
    </button>
  )
}

function Spec({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}
