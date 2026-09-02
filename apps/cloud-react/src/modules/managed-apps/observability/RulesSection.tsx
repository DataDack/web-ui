import { useState } from "react"

import {
  ChevronRight,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  TriangleAlert,
} from "lucide-react"
import { Link } from "react-router-dom"

import { Section } from "@/components/console"

import {
  Badge,
  Button,
  cn,
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
} from "@datadack/common-ui"

import { useProjectRestrictions } from "../managed-apps.hooks"
import type {
  IpRule,
  Project,
  RateLimitRule,
  SignatureSetting,
  WafCatalogRule,
  WafMode,
} from "../managed-apps.types"
// The labels, the category order and the quota wording are the Restrictions
// editor's, imported rather than restated. Two copies of SCORE_LABELS is how a
// weight ends up reading "Critical" on one screen and "Error" on the other —
// the same drift the generated WAF catalog is carefully guarded against.
import {
  ACTION_LABELS,
  enabledCount,
  groupByCategory,
  quotaLabel,
  SCORE_LABELS,
  settingFor,
} from "../partials/project/ProjectSettingsTab/RestrictionsSection/restrictions-draft"

/** Where the one editor of this document lives. Both the section action and the
 *  sheet's footer point at it, so the path is written once. */
const EDITOR_LINK = { search: "?tab=settings&section=restrictions" }

/**
 * Rules — what is filtering this app right now.
 *
 * READ-ONLY, and that is the design rather than an unfinished state. The policy
 * is one ordered document: an allow above a deny keeps an address in and the
 * same two lines reversed do not, so it is saved whole, in one place, at one
 * moment — see RestrictionsSection. A second surface writing a fragment of it
 * would be writing a fragment of a policy whose meaning comes from the rest.
 * This answers "what is in force" and sends anyone who wants to change it to
 * the editor that owns the document.
 *
 * WHAT AN ABSENT RULE MEANS. The edge evaluates a signature only when the
 * project's policy names it: `Policy.Active()` is false for an empty document
 * and `Evaluate` returns allow without touching the request. A rule that is not
 * in the document does not run, so rendering it as "Off" is the truth rather
 * than a simplification — no core ruleset runs quietly underneath this list.
 *
 * The enforcement banner outranks everything else here for the reason it does
 * on the editor: rules are applied by the gateway, so a project the gateway
 * does not front has a policy that is stored and inert. A security page that
 * renders a saved ruleset as though it were protection is worse than one that
 * shows nothing at all.
 */
export function RulesSection({ project }: Readonly<{ project: Project }>) {
  const { data, isLoading } = useProjectRestrictions(project.id)
  const [openRule, setOpenRule] = useState<WafCatalogRule | null>(null)

  if (isLoading || !data) {
    return <Skeleton className="h-96 rounded-xl" />
  }

  const { restrictions: doc, limits, catalog } = data
  const defaultMode: WafMode = doc.default_mode ?? "log"
  const threshold = doc.block_threshold ?? data.default_threshold
  const signaturesOn = enabledCount(doc.signatures)
  const addressRules = doc.ip_rules.length
  const configured = signaturesOn > 0 || addressRules > 0

  return (
    <>
      <Section
        variant="panel"
        icon={ShieldCheck}
        tone={data.enforced ? "brand" : "neutral"}
        title="Rules"
        description="The address rules and managed signatures this app is filtered by. They are one document, edited in Settings."
        actions={
          <Button asChild size="sm" variant="outline" className="gap-1.5">
            <Link to={EDITOR_LINK}>
              <SlidersHorizontal className="size-3.5" />
              Edit in Settings
            </Link>
          </Button>
        }
      >
        <div className="space-y-4">
          {!data.enforced && (
            <p className="flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning-bg/40 px-3 py-2 text-[12px] text-foreground">
              <ShieldAlert className="mt-0.5 size-3.5 shrink-0 text-status-warning" aria-hidden />
              {/* The server's sentence, rendered as it stands. It knows which of
                  several reasons applies — never released, not fronted by the
                  gateway — and summarising it here would be guessing at the one
                  thing this banner exists to state. */}
              <span>
                {data.not_enforced_reason ??
                  "These rules are stored, but nothing is applying them to traffic yet."}
              </span>
            </p>
          )}

          <PolicySummary
            signaturesOn={signaturesOn}
            maxSignatures={limits.max_signatures}
            addressRules={addressRules}
            rateLimit={doc.rate_limit ?? null}
            threshold={threshold}
            usingDefaultThreshold={doc.block_threshold === undefined}
          />

          {configured ? (
            <>
              <WatchingOnlyNotice signatures={doc.signatures} defaultMode={defaultMode} />
              {addressRules > 0 && <AddressRules rules={doc.ip_rules} />}
              <SignatureList
                catalog={catalog}
                signatures={doc.signatures}
                defaultMode={defaultMode}
                threshold={threshold}
                onOpen={setOpenRule}
              />
            </>
          ) : (
            <div className="rounded-lg border border-dashed border-border/60 px-6 py-10 text-center">
              <h3 className="text-[14px] font-semibold text-foreground">Nothing is filtered</h3>
              <p className="mx-auto mt-1.5 max-w-md text-[12.5px] text-muted-foreground">
                No address rules and no signatures are turned on, so the edge evaluates nothing for
                this app and every request reaches it.
              </p>
            </div>
          )}
        </div>
      </Section>

      <RuleSheet
        rule={openRule}
        setting={openRule ? settingFor(doc.signatures, openRule.id) : undefined}
        defaultMode={defaultMode}
        threshold={threshold}
        onClose={() => {
          setOpenRule(null)
        }}
      />
    </>
  )
}

/* ── summary ──────────────────────────────────────────────────────────── */

/**
 * The four facts that decide whether this app is protected, above the list.
 *
 * The rate limit is the one that cannot be a number alone: absent means the
 * platform's own ceiling applies, present-with-zero means the app serves
 * nothing. Those are opposite outcomes and the wire tells them apart by
 * presence, so this does too.
 */
function PolicySummary({
  signaturesOn,
  maxSignatures,
  addressRules,
  rateLimit,
  threshold,
  usingDefaultThreshold,
}: Readonly<{
  signaturesOn: number
  maxSignatures: number
  addressRules: number
  rateLimit: RateLimitRule | null
  threshold: number
  usingDefaultThreshold: boolean
}>) {
  const facts = [
    {
      label: "Signatures on",
      value: String(signaturesOn),
      hint: quotaLabel(signaturesOn, maxSignatures),
    },
    {
      label: "Address rules",
      value: String(addressRules),
      hint: addressRules > 0 ? "First match wins, in order" : "Every address may reach it",
    },
    rateLimitFact(rateLimit),
    {
      label: "Block threshold",
      value: String(threshold),
      hint: usingDefaultThreshold ? "Platform default" : "Set for this app",
    },
  ]

  return (
    <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {facts.map((fact) => (
        <div key={fact.label} className="rounded-lg border border-border/70 px-3 py-2.5">
          <dt className="text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
            {fact.label}
          </dt>
          <dd className="mt-1 text-[15px] font-medium text-foreground">{fact.value}</dd>
          <dd className="mt-0.5 text-[11px] text-muted-foreground">{fact.hint}</dd>
        </div>
      ))}
    </dl>
  )
}

function rateLimitFact(rateLimit: RateLimitRule | null) {
  if (!rateLimit) {
    return {
      label: "Rate limit",
      value: "Platform default",
      hint: "No ceiling of this app's own",
    }
  }
  if (rateLimit.rps === 0) {
    return {
      label: "Rate limit",
      value: "Serving nothing",
      hint: "Set to 0 rps — every request is refused",
    }
  }
  return {
    label: "Rate limit",
    value: `${String(rateLimit.rps)} rps`,
    hint: rateLimit.burst ? `Burst ${String(rateLimit.burst)}` : "No burst allowance",
  }
}

/**
 * The state worth naming: rules are on, and none of them may refuse anything.
 *
 * The same question the editor asks, so it is asked the same way — a second
 * definition of "blocking" would eventually disagree with the first.
 */
function WatchingOnlyNotice({
  signatures,
  defaultMode,
}: Readonly<{ signatures: Record<string, SignatureSetting>; defaultMode: WafMode }>) {
  const enabled = Object.values(signatures).filter((setting) => setting.enabled)
  if (enabled.length === 0) return null
  if (enabled.some((setting) => (setting.mode ?? defaultMode) === "block")) return null

  return (
    <p className="flex items-start gap-2 rounded-lg border border-status-info/30 bg-status-info-bg/40 px-3 py-2 text-[12px] text-foreground">
      <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-status-info" aria-hidden />
      <span>
        Every rule below is watching only, so nothing is being refused. Matches are recorded; none
        of them stop a request.
      </span>
    </p>
  )
}

/* ── address rules ────────────────────────────────────────────────────── */

/**
 * The ordered address list.
 *
 * NUMBERED, because the number is the rule's meaning here rather than
 * decoration: the edge takes the first match, so rule 1 above rule 2 is a
 * different policy from the same two reversed.
 */
function AddressRules({ rules }: Readonly<{ rules: readonly IpRule[] }>) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
        Address rules · first match wins
      </h3>
      <ol className="divide-y divide-border/60 rounded-lg border border-border/70">
        {rules.map((rule, index) => (
          <li key={`${rule.cidr}-${String(index)}`} className="flex items-center gap-3 px-3 py-2">
            <span className="w-4 shrink-0 text-right font-mono text-[11px] text-muted-foreground tabular-nums">
              {index + 1}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "shrink-0 font-normal",
                rule.action === "deny" && "border-status-danger/40 text-status-danger",
              )}
            >
              {ACTION_LABELS[rule.action]}
            </Badge>
            <span className="font-mono text-[12.5px]">{rule.cidr}</span>
            {/* Mode is read for a DENY only — "would have allowed" is what
                already happens, so an allow rule has no log mode to report. */}
            {rule.action === "deny" && rule.mode === "log" && (
              <Badge variant="secondary" className="shrink-0 font-normal">
                Log only
              </Badge>
            )}
            {rule.note && (
              <span className="min-w-0 truncate text-[11.5px] text-muted-foreground">
                {rule.note}
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  )
}

/* ── signatures ───────────────────────────────────────────────────────── */

function SignatureList({
  catalog,
  signatures,
  defaultMode,
  threshold,
  onOpen,
}: Readonly<{
  catalog: readonly WafCatalogRule[]
  signatures: Record<string, SignatureSetting>
  defaultMode: WafMode
  threshold: number
  onOpen: (rule: WafCatalogRule) => void
}>) {
  return (
    <div className="space-y-4">
      {groupByCategory(catalog).map((group) => (
        <div key={group.category} className="space-y-1.5">
          <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {group.label}
          </h3>
          <div className="divide-y divide-border/60 rounded-lg border border-border/70">
            {group.rules.map((rule) => {
              const setting = settingFor(signatures, rule.id)
              const enabled = setting?.enabled ?? false
              const mode: WafMode = setting?.mode ?? defaultMode
              const weight = setting?.score ?? rule.score
              return (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => {
                    onOpen(rule)
                  }}
                  className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors outline-none hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/50"
                >
                  <RuleState enabled={enabled} mode={mode} />
                  <span className="min-w-0 flex-1">
                    <span
                      className={cn(
                        "block truncate text-[13px] font-medium",
                        !enabled && "text-muted-foreground",
                      )}
                    >
                      {rule.title}
                    </span>
                    <span className="mt-0.5 block font-mono text-[11px] text-muted-foreground">
                      {rule.id}
                    </span>
                  </span>
                  {enabled && mode === "block" && weight >= threshold && (
                    <Badge variant="outline" className="hidden shrink-0 font-normal sm:inline-flex">
                      Refuses on its own
                    </Badge>
                  )}
                  <Badge
                    variant="outline"
                    className={cn(
                      "shrink-0 font-normal",
                      !enabled && "opacity-60",
                      enabled && weight >= 5 && "border-status-danger/40 text-status-danger",
                    )}
                  >
                    {SCORE_LABELS[weight] ?? "Weight"} · {weight}
                  </Badge>
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Off · Log only · Blocking, as a pill. Three states and never two: a rule
 *  that is on but only watching stops nothing, and folding it into "on" is the
 *  misreading this page exists to prevent. */
function RuleState({ enabled, mode }: Readonly<{ enabled: boolean; mode: WafMode }>) {
  if (!enabled) {
    return (
      <Badge
        variant="secondary"
        className="w-[68px] shrink-0 justify-center font-normal opacity-70"
      >
        Off
      </Badge>
    )
  }
  if (mode === "block") {
    return (
      <Badge className="w-[68px] shrink-0 justify-center border-status-danger/40 bg-status-danger-bg font-normal text-status-danger">
        Blocking
      </Badge>
    )
  }
  return (
    <Badge variant="outline" className="w-[68px] shrink-0 justify-center font-normal">
      Log only
    </Badge>
  )
}

/* ── the sheet ────────────────────────────────────────────────────────── */

/**
 * What a match of this rule actually does to a request, in a sentence.
 *
 * SCORING, NOT FIRST-MATCH-WINS — a reader who does not know that cannot tell
 * whether a rule matters, and the weight and the threshold together are what
 * answer it. Kept as a function so the three outcomes read as three cases
 * rather than as a nested ternary in the middle of the markup.
 */
function effectSentence(enabled: boolean, mode: WafMode, weight: number, threshold: number) {
  if (!enabled) {
    return "This rule is not part of the app's policy, so the edge never evaluates it."
  }
  if (mode !== "block") {
    return "A match is recorded and adds nothing that can refuse a request: the rule is watching only."
  }
  if (weight >= threshold) {
    return `A match refuses the request on its own — its weight of ${String(weight)} reaches the block threshold of ${String(threshold)}.`
  }
  return `A match adds ${String(weight)} to the request's score. It refuses only alongside other rules, once the total passes ${String(threshold)}.`
}

/**
 * One rule, in full.
 *
 * The false-positive note is why this is a panel rather than a tooltip. It is
 * the field that decides whether a rule is safe to promote out of log mode on
 * THIS application, and a page that shows a rule's state without it has
 * withheld the evidence for the decision it is describing.
 */
function RuleSheet({
  rule,
  setting,
  defaultMode,
  threshold,
  onClose,
}: Readonly<{
  rule: WafCatalogRule | null
  setting: SignatureSetting | undefined
  defaultMode: WafMode
  threshold: number
  onClose: () => void
}>) {
  const enabled = setting?.enabled ?? false
  const mode: WafMode = setting?.mode ?? defaultMode
  const weight = setting?.score ?? rule?.score ?? 0
  const overridden = rule !== null && setting?.score !== undefined && setting.score !== rule.score

  return (
    <Sheet
      open={rule !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
    >
      <SheetContent side="right" className="flex w-full max-w-[460px] flex-col gap-0 p-0">
        {rule && (
          <>
            <SheetHeader className="shrink-0 px-6 py-5">
              <SheetTitle className="pr-6 text-[16px] leading-snug">{rule.title}</SheetTitle>
              <SheetDescription className="font-mono text-[11.5px]">{rule.id}</SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-6 text-[13px] leading-relaxed">
              <div className="flex flex-wrap items-center gap-2">
                <RuleState enabled={enabled} mode={mode} />
                <Badge variant="outline" className="font-normal">
                  {SCORE_LABELS[weight] ?? "Weight"} · {weight}
                </Badge>
                {overridden && (
                  <Badge variant="secondary" className="font-normal">
                    Weight set for this app · catalog {rule.score}
                  </Badge>
                )}
              </div>

              <p className="text-muted-foreground">{rule.description}</p>

              <div>
                <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  Legitimate traffic that trips it
                </h4>
                <p className="mt-1 text-muted-foreground">{rule.false_positives}</p>
              </div>

              <div>
                <h4 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
                  What a match does here
                </h4>
                <p className="mt-1 text-muted-foreground">
                  {effectSentence(enabled, mode, weight, threshold)}
                </p>
              </div>

              <Button asChild variant="outline" size="sm" className="w-full gap-1.5">
                <Link to={EDITOR_LINK}>
                  <SlidersHorizontal className="size-3.5" />
                  Change in Settings
                </Link>
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
