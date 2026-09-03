import { useMemo, useState } from "react"

import { Button, cn, Skeleton } from "@datadack/common-ui"
import { Info, ShieldOff } from "lucide-react"

import { ConfirmDialog } from "@/components/console"

import { IpRulesPanel } from "./IpRulesPanel"
import { RateLimitPanel } from "./RateLimitPanel"
import { isDirty, toDraft, toRequest, type RestrictionsDraft } from "./restrictions-draft"
import { SignaturesPanel } from "./SignaturesPanel"
import {
  useEnvironmentRestrictions,
  useProjectEnvironments,
  useProjectRestrictions,
  useSetEnvironmentRestrictions,
} from "../../../../managed-apps.hooks"
import type { Project } from "../../../../managed-apps.types"

/**
 * Restrictions — who may reach this app, what is filtered, how fast.
 *
 * THE BANNER IS THE MOST IMPORTANT THING ON THE PAGE. Every control here is
 * applied by the edge gateway, so a project the gateway does not front, or one
 * that has never been released, has rules that are stored and inert. A security
 * page that renders a saved ruleset as though it were protection is worse than
 * one that offers nothing, so the server answers whether the rules are actually
 * in force and this says so before anything else.
 *
 * EVERYTHING SAVES AT ONCE, and the write is a full replacement. The address
 * list is ordered and first-match-wins at the edge — an allow above a deny
 * keeps that address in, the same two lines reversed do not — so a per-row save
 * would be saving a fragment of a policy whose meaning comes from the whole
 * list. One Save, one document, one moment at which who-can-reach-this changes.
 *
 * The draft is anchored to the server's document the same way EnvSection's rows
 * are: when the stored version changes — including after a save — the anchor no
 * longer matches and the editor re-seeds. That is what shows the user that the
 * prefix they typed was masked before it was stored, rather than leaving them
 * looking at a rule that reads differently from the one in force.
 */
export function RestrictionsSection({ project }: Readonly<{ project: Project }>) {
  // TWO READS, and they answer different questions. The project-scoped call
  // carries the rule CATALOG, the plan's ceilings and the platform default
  // threshold — none of which vary per environment, and all of which the editor
  // needs before it can render a single stored rule. The environment-scoped one
  // carries the DOCUMENT being edited.
  const { data, isLoading } = useProjectRestrictions(project.id)
  const { data: environments = [] } = useProjectEnvironments(project.id)
  const [selected, setSelected] = useState("")
  const active = selected !== "" ? selected : (environments[0]?.name ?? "")
  const { data: scoped, isLoading: loadingScoped } = useEnvironmentRestrictions(project.id, active)
  const update = useSetEnvironmentRestrictions(project.id)
  const [confirmOpen, setConfirmOpen] = useState(false)

  // The environment's own document, falling back to the project's while the
  // scoped read is in flight — production's are the same document, so the fall
  // back shows the right rules rather than an empty editor that invites a save.
  const stored = scoped?.restrictions ?? data?.restrictions
  const seeded = useMemo(() => (stored ? toDraft(stored) : null), [stored])
  // The draft carries the version it was made against. When the server's
  // document changes — including after a save — the anchor stops matching and
  // the editor re-seeds, which is what shows the user the NORMALIZED rules
  // rather than the ones they typed.
  const [draft, setDraft] = useState<{
    base: RestrictionsDraft | null
    value: RestrictionsDraft
  } | null>(null)
  const value = (draft?.base ?? null) === seeded ? (draft?.value ?? seeded) : seeded

  const edit = (next: Partial<RestrictionsDraft>) => {
    if (!seeded || !value) return
    setDraft({ base: seeded, value: { ...value, ...next } })
  }

  if (isLoading || loadingScoped || !data || !value || !stored) {
    return <Skeleton className="h-96 rounded-xl" />
  }

  const activeEnvironment = environments.find((environment) => environment.name === active)
  // Whether THIS environment's rules reach live traffic. A project serves one
  // deployment and it is production's, so a staging document is stored and
  // inert — which is the same class of fact the not-enforced banner already
  // exists to state, and it must not be left for somebody to discover by
  // watching an allowlist not apply.
  const scopedEnforced = scoped?.enforced ?? true

  const dirty = isDirty(value, stored)
  const payload = toRequest(value)

  /**
   * Whether saving would leave nobody able to reach the app.
   *
   * The confirm exists for exactly one mistake, and it is the mistake this
   * feature makes easiest: a deny rule in Block mode that covers everything.
   * It is checked on the PAYLOAD rather than on the draft so a blank row or a
   * log-mode rule — neither of which locks anyone out — does not raise it.
   */
  const locksEveryoneOut = payload.ip_rules.some(
    (rule) =>
      rule.action === "deny" &&
      rule.mode === "block" &&
      (rule.cidr === "0.0.0.0/0" || rule.cidr === "::/0"),
  )

  const save = () => {
    update.mutate(
      { name: active, restrictions: payload },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          // Dropped so the editor re-seeds from the server's normalized answer
          // rather than from what was typed.
          setDraft(null)
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      {/* Which environment's rules are being edited. Above the banners, because
          "are these in force" is a question about the selected environment and
          reading the answer before the question is confusing. */}
      {environments.length > 1 && (
        <div
          role="tablist"
          aria-label="Environment"
          className="flex w-fit flex-wrap items-center gap-0.5 rounded-lg border border-border-glass p-0.5"
        >
          {environments.map((environment) => (
            <button
              key={environment.name}
              type="button"
              role="tab"
              aria-selected={environment.name === active}
              onClick={() => {
                setSelected(environment.name)
                // The draft belongs to the environment being left; carrying it
                // across would offer to write one environment's rules into
                // another's document.
                setDraft(null)
              }}
              className={cn(
                "rounded-md px-3 py-1.5 font-mono text-[12px] transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                environment.name === active
                  ? "glass-1-bg-raised text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {environment.name}
            </button>
          ))}
        </div>
      )}

      {!scopedEnforced && activeEnvironment && (
        <p className="flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning-bg/40 px-3 py-2.5 text-[12px] leading-relaxed">
          <ShieldOff className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden />
          <span>
            <span className="font-medium">
              {activeEnvironment.name}&apos;s rules are stored, not enforced.{" "}
            </span>
            This project serves one deployment and it is production&apos;s, so only
            production&apos;s rules reach live traffic. These are kept and applied the day this
            environment can run.
          </span>
        </p>
      )}

      {scopedEnforced && data.not_enforced_reason && (
        <p className="flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning-bg/40 px-3 py-2.5 text-[12px] leading-relaxed">
          <ShieldOff className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden />
          <span>
            <span className="font-medium">These rules are not in force. </span>
            {data.not_enforced_reason}
          </span>
        </p>
      )}
      {scopedEnforced && data.enforced && (
        <p className="flex items-start gap-2 rounded-lg border border-status-success/30 bg-status-success-bg/40 px-3 py-2.5 text-[12px] leading-relaxed">
          <Info className="mt-0.5 size-4 shrink-0 text-status-success" aria-hidden />
          <span>
            The edge is applying these rules to {project.subdomain}. Blocked and watched requests
            appear in this project&apos;s request log with the rule that fired.
          </span>
        </p>
      )}

      <IpRulesPanel
        rules={value.ipRules}
        max={data.limits.max_ip_rules}
        disabled={update.isPending}
        onChange={(ipRules) => {
          edit({ ipRules })
        }}
      />

      <SignaturesPanel
        catalog={data.catalog}
        settings={value.signatures}
        defaultMode={value.defaultMode}
        blockThreshold={value.blockThreshold}
        defaultThreshold={data.default_threshold}
        max={data.limits.max_signatures}
        disabled={update.isPending}
        onChange={(signatures) => {
          edit({ signatures })
        }}
        onDefaultModeChange={(defaultMode) => {
          edit({ defaultMode })
        }}
        onBlockThresholdChange={(blockThreshold) => {
          edit({ blockThreshold })
        }}
      />

      <RateLimitPanel
        enabled={value.rateLimitEnabled}
        rps={value.rps}
        burst={value.burst}
        max={data.limits.max_rate_limits}
        disabled={update.isPending}
        onEnabledChange={(rateLimitEnabled) => {
          edit({ rateLimitEnabled })
        }}
        onRpsChange={(rps) => {
          edit({ rps })
        }}
        onBurstChange={(burst) => {
          edit({ burst })
        }}
      />

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          disabled={!dirty || update.isPending}
          loading={update.isPending}
          onClick={() => {
            if (locksEveryoneOut) setConfirmOpen(true)
            else save()
          }}
        >
          Save restrictions
        </Button>
        {dirty && (
          <Button
            size="sm"
            variant="ghost"
            disabled={update.isPending}
            onClick={() => {
              setDraft(null)
            }}
          >
            Discard changes
          </Button>
        )}
        <span className="text-[11px] text-muted-foreground">
          {dirty
            ? "Unsaved. Saving replaces the whole rule set and takes effect within seconds."
            : "Everything here is saved."}
        </span>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="This blocks every visitor"
        confirmLabel="Save and block everyone"
        loading={update.isPending}
        onConfirm={save}
        description={
          <span className="block space-y-2">
            <span className="block">
              A deny rule covering every address is set to Block, so the edge will refuse every
              request for {project.subdomain} — including yours.
            </span>
            <span className="block">
              If you meant to build an allowlist, move the addresses you want to keep ABOVE the
              deny-all: the first matching rule wins.
            </span>
          </span>
        }
      />
    </div>
  )
}
