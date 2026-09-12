import { type ReactNode, useState } from "react"

import { AlertTriangle, ShieldCheck } from "lucide-react"
import { useTranslation } from "react-i18next"

import { ConfirmDialog, Section } from "@/components/console"

import { Badge, Switch } from "@datadack/common-ui"

import { useSetSGScoping, useSGScoping } from "../../vpc.hooks"
import type { SGScopingState } from "../../vpc.types"

/**
 * Member-scoped security groups, with the impact of enabling them shown before
 * the switch can be flipped.
 *
 * The report is the point of this card, not decoration. Unscoped, every group's
 * rules reach every guest in the VPC, so a database with no inbound rules of its
 * own is still reachable on whatever port the web tier opened. Enabling closes
 * that — correct, and an outage for anything quietly relying on it. Listing the
 * addresses that would lose access is the only place that is visible before it
 * happens.
 */
export function SGScopingCard({ vpcId }: Readonly<{ vpcId: string }>) {
  const { t } = useTranslation()
  const { data: state, isLoading } = useSGScoping(vpcId)
  const { mutate: setScoping, isPending } = useSetSGScoping(vpcId)
  const [confirming, setConfirming] = useState(false)

  if (isLoading || !state) return null

  const impacted = state.impact.length

  const onToggle = (next: boolean) => {
    // Disabling only ever widens access back, so it needs no acknowledgement.
    // Enabling with outstanding impact does — that is the whole gate.
    if (next && impacted > 0) {
      setConfirming(true)
      return
    }
    setScoping({ enabled: next, acknowledge: false })
  }

  // Three distinct states, named rather than chained into a nested ternary:
  // already scoped, safe to scope, or scoping would close something.
  let body: ReactNode
  if (state.enabled) {
    body = <p className="text-sm text-muted-foreground">{t("sgScoping.enabledHelp")}</p>
  } else if (impacted === 0) {
    body = <p className="text-sm text-muted-foreground">{t("sgScoping.noImpact")}</p>
  } else {
    body = <ImpactReport state={state} impacted={impacted} />
  }

  return (
    <Section
      title={t("sgScoping.title")}
      description={t("sgScoping.description")}
      actions={
        <div className="flex items-center gap-3">
          {state.enabled ? (
            <Badge variant="secondary">
              <ShieldCheck className="mr-1 h-3 w-3" />
              {t("sgScoping.badge.enabled")}
            </Badge>
          ) : null}
          <Switch checked={state.enabled} disabled={isPending} onCheckedChange={onToggle} />
        </div>
      }
    >
      {body}

      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title={t("sgScoping.confirm.title")}
        description={t("sgScoping.confirm.description", {
          count: impacted,
          orphans: state.orphans,
        })}
        confirmLabel={t("sgScoping.confirm.action")}
        destructive
        onConfirm={() => {
          setScoping({ enabled: true, acknowledge: true })
          setConfirming(false)
        }}
      />
    </Section>
  )
}

/**
 * What enabling would close. Split out so the card body stays a plain
 * three-way choice.
 */
function ImpactReport({ state, impacted }: Readonly<{ state: SGScopingState; impacted: number }>) {
  const { t } = useTranslation()
  return (
    <div className="space-y-3">
      <div className="flex items-start gap-2 text-sm">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
        <span>{t("sgScoping.impactSummary", { count: impacted })}</span>
      </div>

      {/* Orphans get their own callout: they are in no group at all, so they do
          not lose one port, they lose everything. */}
      {state.orphans > 0 ? (
        <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
          {t("sgScoping.orphanWarning", { count: state.orphans })}
        </div>
      ) : null}

      <ul className="space-y-2 text-sm">
        {state.impact.slice(0, 10).map((row) => (
          <li key={row.address} className="rounded-md border p-2">
            <div className="flex items-center gap-2 font-medium">
              {row.address}
              {row.orphaned ? <Badge variant="outline">{t("sgScoping.orphanBadge")}</Badge> : null}
            </div>
            <div className="mt-1 text-muted-foreground">
              {row.loses_rules
                .slice(0, 4)
                .map(
                  (r) =>
                    `${r.group_name}: ${r.direction} ${r.protocol}` +
                    (r.port_from > 0 ? ` ${String(r.port_from)}` : "") +
                    ` from ${r.peer}`,
                )
                .join(" · ")}
              {row.loses_rules.length > 4 ? ` … +${String(row.loses_rules.length - 4)}` : ""}
            </div>
          </li>
        ))}
      </ul>

      {impacted > 10 ? (
        <p className="text-xs text-muted-foreground">
          {t("sgScoping.more", { count: impacted - 10 })}
        </p>
      ) : null}
    </div>
  )
}
