import { useMemo, useState } from "react"

import { Badge, Button, Input, Label } from "@datadack/common-ui"
import { Check, Globe, Server } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { PageHeader, Section } from "@/components/console"

import { HOSTING_ROUTES } from "../hosting.constants"
import { useHostingPlans, useOrderHosting } from "../hosting.hooks"
import type { HostingPlan } from "../hosting.types"
import { formatLimitMB, formatMoney, soldCycles } from "../hosting.utils"

/**
 * The pricing page.
 *
 * Backed by S3 through the catalogue endpoint, so it renders without a database
 * read and without a session — a visitor sees prices before they sign up.
 */
export function HostingPricingPage() {
  const navigate = useNavigate()
  const { data, isLoading, isError } = useHostingPlans()
  const order = useOrderHosting()

  const [selected, setSelected] = useState<HostingPlan | null>(null)
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

  if (isLoading) return <p className="p-6 text-sm text-muted-foreground">Loading plans…</p>
  if (isError) return <p className="p-6 text-sm text-destructive">Plans could not be loaded.</p>

  return (
    <div className="space-y-8 pb-16">
      <PageHeader
        title="Shared hosting"
        description="cPanel hosting with free SSL, daily backups and one-click installs."
        icon={Server}
      />

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
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {inSection.map((plan) => (
                <PlanCard
                  key={plan.sku}
                  plan={plan}
                  selected={selected?.sku === plan.sku}
                  onSelect={() => {
                    setSelected(plan)
                  }}
                />
              ))}
            </div>
          </Section>
        )
      })}

      {selected && (
        <Section title={`Order ${selected.name}`} variant="panel">
          <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
            <div className="space-y-1.5">
              <Label>Your domain</Label>
              <Input
                value={domain}
                onChange={(e) => {
                  setDomain(e.target.value)
                }}
                placeholder="example.com"
              />
              <p className="text-[11px] text-muted-foreground">
                Bring a domain you already own. After setup we show the nameservers to point it at.
              </p>
            </div>
            <Button
              size="lg"
              disabled={order.isPending || domain.trim() === ""}
              onClick={() => {
                order.mutate(
                  { domain: domain.trim(), plan_sku: selected.sku, cycle: "monthly" },
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
              {order.isPending
                ? "Ordering…"
                : `Buy for ${formatMoney(selected.pricing.monthly, selected.pricing.currency)}/mo`}
            </Button>
          </div>
        </Section>
      )}
    </div>
  )
}

function PlanCard({
  plan,
  selected,
  onSelect,
}: Readonly<{ plan: HostingPlan; selected: boolean; onSelect: () => void }>) {
  const cycles = soldCycles(plan)
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex flex-col rounded-xl border p-5 text-left transition ${
        selected ? "border-primary ring-2 ring-primary/20" : "border-border hover:border-primary/40"
      }`}
    >
      <span className="text-[15px] font-semibold">{plan.name}</span>
      {plan.description && (
        <span className="mt-0.5 text-[12px] text-muted-foreground">{plan.description}</span>
      )}

      <span className="mt-4 flex items-baseline gap-1">
        <span className="text-2xl font-semibold">
          {formatMoney(plan.pricing.monthly, plan.pricing.currency)}
        </span>
        <span className="text-[12px] text-muted-foreground">/month</span>
      </span>
      {plan.pricing.setup_fee > 0 && (
        <span className="text-[11px] text-muted-foreground">
          plus {formatMoney(plan.pricing.setup_fee, plan.pricing.currency)} setup
        </span>
      )}
      {/* Longer cycles are priced in the catalogue but not yet sellable — saying
          so beats showing a price that cannot be bought. */}
      {cycles.length > 1 && (
        <span className="mt-1 text-[11px] text-muted-foreground">Longer terms coming soon</span>
      )}

      <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-[12px]">
        <Spec label="Disk" value={formatLimitMB(plan.limits.disk_mb)} />
        <Spec label="Bandwidth" value={formatLimitMB(plan.limits.bandwidth_mb)} />
        <Spec label="Websites" value={String(plan.limits.addon_domains + 1)} />
        <Spec label="Email accounts" value={limitText(plan.limits.email_accounts)} />
        <Spec label="Databases" value={limitText(plan.limits.databases)} />
      </div>

      {plan.features.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[12px]">
              <Check className="mt-0.5 size-3.5 shrink-0 text-emerald-500" />
              {f}
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <Badge className="mt-4 w-fit gap-1">
          <Globe className="size-3" /> Selected
        </Badge>
      )}
    </button>
  )
}

function Spec({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function limitText(n: number): string {
  if (n === -1) return "Unlimited"
  if (n === 0) return "None"
  return String(n)
}
