import { useMemo, useState, type ReactNode } from "react"

import { Check, ChevronRight, Eye, EyeOff, Loader2, ServerCog, TriangleAlert } from "lucide-react"

import { UNLIMITED } from "@/modules/hosting/hosting.constants"
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

interface SpecRow {
  key: string
  label: string
  value: (plan: HostingPlan) => string
}

/**
 * Everything a plan could be compared on, minus disk — disk is the headline on
 * the card, not a row in the list.
 *
 * Websites counts the main domain plus the addon allowance, because that is
 * what the customer is buying: "addon domains" is a cPanel term for the ones
 * after the first, and quoting it raw makes a plan look one site smaller than
 * it is.
 */
const SPEC_ROWS: SpecRow[] = [
  {
    key: "websites",
    label: "Websites",
    value: (p) =>
      p.limits.addon_domains === UNLIMITED ? "Unlimited" : String(p.limits.addon_domains + 1),
  },
  { key: "bandwidth", label: "Bandwidth", value: (p) => formatLimitMB(p.limits.bandwidth_mb) },
  { key: "databases", label: "Databases", value: (p) => formatCount(p.limits.databases) },
  { key: "subdomains", label: "Subdomains", value: (p) => formatCount(p.limits.subdomains) },
  { key: "mailboxes", label: "Mailboxes", value: (p) => formatCount(p.limits.email_accounts) },
]

/**
 * Splits the spec rows into the ones that vary across the catalogue and the
 * ones every plan shares, and folds the shared ones together with the features
 * common to all plans into a single "every plan includes" list.
 *
 * Both halves are derived from the catalogue rather than hard-coded: an
 * operator who gives one tier more bandwidth turns bandwidth back into a
 * comparison column without anyone editing this file.
 */
function compareSpecs(plans: HostingPlan[]): { differing: SpecRow[]; included: string[] } {
  if (plans.length === 0) return { differing: [], included: [] }

  const differing: SpecRow[] = []
  const sharedSpecs: string[] = []
  for (const row of SPEC_ROWS) {
    const first = row.value(plans[0])
    if (plans.every((p) => row.value(p) === first)) {
      sharedSpecs.push(`${first} ${row.label.toLowerCase()}`)
    } else {
      differing.push(row)
    }
  }

  // A feature listed by every plan is a property of the product, not of a tier.
  const sharedFeatures = plans[0].features.filter((f) => plans.every((p) => p.features.includes(f)))

  return { differing, included: [...sharedSpecs, ...sharedFeatures] }
}

/** Only meaningful when the customer said they have a domain. */
function domainProblem(raw: string): string | undefined {
  const value = raw.trim()
  if (value === "") return "Enter the domain, or choose one later"
  if (!DOMAIN_PATTERN.test(value)) {
    return "Enter a bare domain, like example.com — no http:// and no trailing slash"
  }
  return undefined
}

/**
 * Mirrors validateSetupPassword in the accounts service.
 *
 * Duplicated deliberately rather than round-tripped: the server is the
 * authority and re-checks it, but finding out after submit that the password
 * was too weak means the order failed for a reason the field could have said
 * while it was being typed.
 */
function passwordProblem(raw: string): string | undefined {
  if (raw === "") return undefined // blank means "generate one"
  // Code points, not graphemes or UTF-16 units: the server counts
  // len([]rune(p)), and a client that disagreed would either accept a password
  // the server rejects or nag about one the server would have taken.
  // Array.from uses the string iterator, so surrogate pairs count once.
  if (Array.from(raw).length < 12) return "At least 12 characters"
  const classes = [/[a-z]/, /[A-Z]/, /\d/, /[^a-zA-Z0-9]/].filter((re) => re.test(raw)).length
  if (classes < 3) return "Mix at least three of: lowercase, uppercase, digits, symbols"
  return undefined
}

/** cPanel's own rules: lowercase alphanumeric, letter first, 16 max. */
function usernameProblem(raw: string): string | undefined {
  if (raw === "") return undefined // blank means "derive one"
  if (raw.length > 16) return "At most 16 characters"
  if (!/^[a-z][a-z0-9]*$/.test(raw)) return "Lowercase letters and digits, starting with a letter"
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

  const [hasDomain, setHasDomain] = useState(true)
  const [domain, setDomain] = useState("")
  const [sku, setSku] = useState("")
  const [touched, setTouched] = useState(false)
  // Advanced: both blank is the good path, so the section starts collapsed.
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)

  // Sorted by size so the tier glyphs form a scale that matches reading order.
  const available = (plans.data?.items ?? [])
    .filter((plan) => plan.visible && !plan.retired)
    .sort((a, b) => a.limits.disk_mb - b.limits.disk_mb)

  // Which specs actually separate these plans, and which every plan shares.
  //
  // A column repeating the same value down all four rows is not a comparison —
  // it is four chances to think bandwidth differs when it does not. The shared
  // ones move to a single line under the grid, which both tells the truth and
  // gives the differentiators room to be read.
  const { differing, included } = useMemo(() => compareSpecs(available), [available])

  // A domain is the one thing we cannot derive. The cPanel username is left to
  // the backend, which allocates it from the domain and guarantees uniqueness
  // per server — asking for it here would surface a cPanel constraint (16
  // characters, per-server collisions) that the user has no way to reason about.
  const domainIssue = hasDomain ? domainProblem(domain) : undefined
  const usernameIssue = usernameProblem(username)
  const passwordIssue = passwordProblem(password)
  const planIssue = sku === "" ? "Choose a plan" : undefined
  const blocked =
    domainIssue != null || usernameIssue != null || passwordIssue != null || planIssue != null

  const submit = () => {
    setTouched(true)
    if (blocked) return
    order.mutate(
      {
        // Empty means "assign a temporary hostname" to the backend, which is
        // exactly what the second radio promises.
        domain: hasDomain ? domain.trim().toLowerCase() : "",
        plan_sku: sku,
        cycle: "monthly",
        username: username.trim(),
        password,
      },
      {
        onSuccess: (account) => {
          onOrdered(account.id)
        },
      },
    )
  }

  return (
    // pb-[10vh]: the submit row sat flush against the bottom of the viewport,
    // which reads as a cut-off page and leaves no room for the error a failed
    // order puts there. Viewport-relative so it scales with the screen.
    <div className="mx-auto w-full max-w-6xl space-y-8 pb-[10vh]">
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

      <div className="space-y-3">
        <Label>Domain</Label>

        <div role="radiogroup" aria-label="Domain" className="space-y-2">
          <ChoiceRow
            selected={hasDomain}
            onSelect={() => {
              setHasDomain(true)
            }}
            title="Use a domain you own"
          >
            <Input
              id="hosting-domain"
              value={domain}
              placeholder="example.com"
              autoComplete="off"
              spellCheck={false}
              // Typing in the field is the same statement as picking the radio,
              // so it selects rather than being ignored until they also click.
              onFocus={() => {
                setHasDomain(true)
              }}
              onChange={(event) => {
                setDomain(event.target.value)
              }}
              aria-invalid={touched && hasDomain && domainIssue ? true : undefined}
            />
            {touched && domainIssue && <FieldError>{domainIssue}</FieldError>}
          </ChoiceRow>

          <ChoiceRow
            selected={!hasDomain}
            onSelect={() => {
              setHasDomain(false)
            }}
            title="Choose a domain later"
            note="We assign a temporary address so you can start building straight away, and you can point a real domain at it whenever you have one."
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Plan</Label>

        {plans.isLoading && (
          <div className="flex items-center gap-2 rounded-lg border border-border/60 p-6 text-[13px] text-muted-foreground">
            <Loader2 className="size-4 animate-spin" />
            Loading plans…
          </div>
        )}

        {/* A failed fetch is NOT an empty catalogue. Rendering "no plans
            published" for both told the user the shop was empty when the real
            answer was that we never reached it — and sent them to an
            administrator who has nothing to fix. */}
        {plans.isError && (
          <div className="flex items-start gap-2.5 rounded-lg border border-status-danger/40 bg-status-danger/5 p-6 text-[13px]">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-status-danger" />
            <div className="space-y-1">
              <p className="font-medium text-foreground">Could not load the hosting plans.</p>
              <p className="text-muted-foreground">
                This is a problem reaching the catalogue, not an empty one.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={() => void plans.refetch()}
                disabled={plans.isFetching}
              >
                {plans.isFetching ? <Loader2 className="size-3.5 animate-spin" /> : null}
                Try again
              </Button>
            </div>
          </div>
        )}

        {!plans.isLoading && !plans.isError && available.length === 0 && (
          <div className="rounded-lg border border-border/60 bg-muted/30 p-6 text-[13px] text-muted-foreground">
            <p className="font-medium text-foreground">No hosting plans are published yet.</p>
            <p className="mt-1">
              An administrator has to add a plan and register a cPanel server before hosting can be
              ordered.
            </p>
          </div>
        )}

        {available.length > 0 && (
          <>
            <div
              role="radiogroup"
              aria-label="Hosting plan"
              className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
            >
              {available.map((plan, index) => (
                <PlanCard
                  key={plan.sku}
                  plan={plan}
                  rank={index}
                  total={available.length}
                  rows={differing}
                  selected={plan.sku === sku}
                  onSelect={() => {
                    setSku(plan.sku)
                  }}
                />
              ))}
            </div>

            {included.length > 0 && (
              <p className="pt-1 text-[12px] text-muted-foreground">
                <span className="text-foreground">Every plan includes</span> {included.join(" · ")}
              </p>
            )}
          </>
        )}

        {touched && planIssue && (
          <p className="flex items-center gap-1.5 text-[12px] text-status-danger">
            <TriangleAlert className="size-3.5" />
            {planIssue}
          </p>
        )}
      </div>

      {/* Credentials are optional and the good path is to leave them alone, so
          they are folded away rather than presented as two more things to
          decide. cPanel's own form asks for both up front and adds a strength
          meter; we generate a password that always passes instead. */}
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => {
            setShowAdvanced((v) => !v)
          }}
          aria-expanded={showAdvanced}
          className="flex items-center gap-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronRight
            className={cn(
              "size-3.5 transition-transform duration-200",
              showAdvanced && "rotate-90",
              "motion-reduce:transition-none",
            )}
            aria-hidden
          />
          Set the cPanel username and password myself
        </button>

        {showAdvanced && (
          <div className="grid gap-4 rounded-lg border border-border/60 bg-muted/20 p-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="hosting-username">Username</Label>
              <Input
                id="hosting-username"
                value={username}
                placeholder="Generated from your domain"
                autoComplete="off"
                spellCheck={false}
                maxLength={16}
                onChange={(event) => {
                  setUsername(event.target.value.toLowerCase())
                }}
                aria-invalid={usernameIssue ? true : undefined}
              />
              {usernameIssue ? (
                <FieldError>{usernameIssue}</FieldError>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  Lowercase, up to 16 characters. Leave blank and we pick one.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hosting-password">Password</Label>
              <div className="flex gap-1.5">
                <Input
                  id="hosting-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  placeholder="Generated for you"
                  autoComplete="new-password"
                  onChange={(event) => {
                    setPassword(event.target.value)
                  }}
                  aria-invalid={passwordIssue ? true : undefined}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => {
                    setShowPassword((v) => !v)
                  }}
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </Button>
              </div>
              {passwordIssue ? (
                <FieldError>{passwordIssue}</FieldError>
              ) : (
                <p className="text-[11px] text-muted-foreground">
                  12+ characters, three character types. Leave blank and we generate one.
                </p>
              )}
            </div>
          </div>
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

function FieldError({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <p className="flex items-center gap-1.5 text-[12px] text-status-danger">
      <TriangleAlert className="size-3.5 shrink-0" />
      {children}
    </p>
  )
}

interface ChoiceRowProps {
  selected: boolean
  onSelect: () => void
  title: string
  note?: string
  children?: ReactNode
}

/**
 * One option in a radio group that can carry its own controls.
 *
 * The radio is a real button with role="radio"; the row around it is a label
 * rather than a second button, because nesting an <input> inside a <button> is
 * invalid and swallows the input's own clicks.
 */
function ChoiceRow({ selected, onSelect, title, note, children }: Readonly<ChoiceRowProps>) {
  return (
    <div
      className={cn(
        "rounded-lg border p-3 transition-colors",
        selected ? "border-status-info/60 bg-status-info/[0.04]" : "border-border/60",
      )}
    >
      <button
        type="button"
        role="radio"
        aria-checked={selected}
        onClick={onSelect}
        className="flex w-full items-start gap-2.5 text-left focus-visible:outline-none"
      >
        <span
          className={cn(
            "mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
            selected ? "border-status-info" : "border-border",
          )}
          aria-hidden
        >
          {selected && <span className="size-1.5 rounded-full bg-status-info" />}
        </span>
        <span className="min-w-0">
          <span className="block text-[13px] font-medium">{title}</span>
          {note && <span className="mt-0.5 block text-[12px] text-muted-foreground">{note}</span>}
        </span>
      </button>
      {children && <div className="mt-2.5 space-y-1.5 pl-6.5">{children}</div>}
    </div>
  )
}

interface PlanCardProps {
  plan: HostingPlan
  /** 0-based position by disk size among the plans on screen. */
  rank: number
  /** How many plans are on screen, so the glyph scales to the real range. */
  total: number
  /** Only the specs that actually differ across the catalogue. */
  rows: SpecRow[]
  selected: boolean
  onSelect: () => void
}

/**
 * Splits "Origin (Starter)" into a name and the tier it sits at.
 *
 * The parenthetical is a convention in the catalogue, not a guarantee, so a
 * name without one simply has no tier line rather than being mangled to fit.
 */
function splitName(full: string): { name: string; tier?: string } {
  // Sliced rather than matched with a lazy group: `(.*?)\s*\(...` backtracks
  // super-linearly on a name full of spaces and parentheses, and this runs for
  // every card on every render.
  const open = full.indexOf("(")
  const close = full.endsWith(")") ? full.length - 1 : -1
  if (open === -1 || close <= open + 1) return { name: full.trim() }
  return { name: full.slice(0, open).trim(), tier: full.slice(open + 1, close).trim() }
}

function PlanCard({ plan, rank, total, rows, selected, onSelect }: Readonly<PlanCardProps>) {
  const price = entryPrice(plan)
  const { name, tier } = splitName(plan.name)

  return (
    <button
      type="button"
      role="radio"
      aria-checked={selected}
      onClick={onSelect}
      className={cn(
        "group relative flex flex-col gap-4 rounded-xl border p-5 text-left",
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
      {/* Identity. The tick sits in the flow rather than absolutely, so a long
          plan name wraps beside it instead of running underneath it. */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{name}</div>
          {tier && (
            <div className="text-[11px] tracking-wide text-muted-foreground uppercase">{tier}</div>
          )}
        </div>
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border transition-colors",
            selected
              ? "border-status-info bg-status-info text-white"
              : "border-border/70 text-transparent group-hover:border-status-info/50",
          )}
          aria-hidden
        >
          <Check className="size-3" />
        </span>
      </div>

      {/* Price, given the weight of the thing actually being decided. */}
      {price && (
        <div className="flex items-baseline gap-1">
          <span className="text-2xl leading-none font-semibold tracking-tight tabular-nums">
            {formatMoney(price.amount, plan.pricing.currency)}
          </span>
          <span className="text-[12px] text-muted-foreground">/ {price.cycle}</span>
        </div>
      )}

      {/* Disk is the headline: it is what separates these tiers, and burying it
          as one row among five made four near-identical cards. */}
      <div className="flex items-center gap-2.5 rounded-lg border border-border/50 bg-muted/30 px-3 py-2.5">
        <TierArt rank={rank} total={total} active={selected} />
        <div className="min-w-0">
          <div className="text-base leading-tight font-semibold tabular-nums">
            {formatLimitMB(plan.limits.disk_mb)}
          </div>
          <div className="text-[11px] text-muted-foreground">NVMe storage</div>
        </div>
      </div>

      {rows.length > 0 && (
        <dl className="flex flex-col gap-1.5 text-[12px]">
          {rows.map((row) => (
            <div key={row.key} className="flex items-baseline justify-between gap-3">
              {/* The label shrinks, the value never does: "Unlimited" beside a
                  fixed-width label was what truncated both to "Databas…". */}
              <dt className="min-w-0 truncate text-muted-foreground">{row.label}</dt>
              <dd className="shrink-0 font-medium tabular-nums">{row.value(plan)}</dd>
            </div>
          ))}
        </dl>
      )}
    </button>
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
