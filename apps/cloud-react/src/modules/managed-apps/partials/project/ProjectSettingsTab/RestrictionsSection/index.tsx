import { useMemo, useState } from "react"

import { Button, Skeleton } from "@datadack/common-ui"
import { Info, ShieldOff } from "lucide-react"

import { ConfirmDialog } from "@/components/console"

import { IpRulesPanel } from "./IpRulesPanel"
import { RateLimitPanel } from "./RateLimitPanel"
import { isDirty, toDraft, toRequest, type RestrictionsDraft } from "./restrictions-draft"
import { SignaturesPanel } from "./SignaturesPanel"
import {
  useProjectRestrictions,
  useUpdateProjectRestrictions,
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
  const { data, isLoading } = useProjectRestrictions(project.id)
  const update = useUpdateProjectRestrictions(project.id)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const stored = data?.restrictions
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

  if (isLoading || !data || !value || !stored) {
    return <Skeleton className="h-96 rounded-xl" />
  }

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
    update.mutate(payload, {
      onSuccess: () => {
        setConfirmOpen(false)
        // Dropped so the editor re-seeds from the server's normalized answer
        // rather than from what was typed.
        setDraft(null)
      },
    })
  }

  return (
    <div className="space-y-4">
      {data.not_enforced_reason && (
        <p className="flex items-start gap-2 rounded-lg border border-status-warning/30 bg-status-warning-bg/40 px-3 py-2.5 text-[12px] leading-relaxed">
          <ShieldOff className="mt-0.5 size-4 shrink-0 text-status-warning" aria-hidden />
          <span>
            <span className="font-medium">These rules are not in force. </span>
            {data.not_enforced_reason}
          </span>
        </p>
      )}
      {data.enforced && (
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
