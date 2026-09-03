import { useState } from "react"

import {
  Badge,
  cn,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@datadack/common-ui"
import { ChevronRight, ShieldCheck, TriangleAlert } from "lucide-react"

import { Section } from "@/components/console"

import {
  canAdd,
  enabledCount,
  groupByCategory,
  MODE_LABELS,
  quotaLabel,
  SCORE_LABELS,
  settingFor,
} from "./restrictions-draft"
import type { SignatureSetting, WafCatalogRule, WafMode } from "../../../../managed-apps.types"

interface SignaturesPanelProps {
  catalog: readonly WafCatalogRule[]
  settings: Record<string, SignatureSetting>
  onChange: (settings: Record<string, SignatureSetting>) => void
  defaultMode: WafMode
  onDefaultModeChange: (mode: WafMode) => void
  blockThreshold: string
  onBlockThresholdChange: (value: string) => void
  defaultThreshold: number
  max: number
  disabled?: boolean
}

/**
 * The managed signature rules.
 *
 * SCORING, NOT FIRST-MATCH-WINS, and the panel has to teach that in passing or
 * none of the controls make sense. Each rule carries a WEIGHT; a request is
 * refused when the weights of the rules PERMITTED TO REFUSE it add up past the
 * threshold. So a single Critical rule acts alone at the default threshold of
 * 5, a Notice rule never does, and raising the threshold is the right lever for
 * an app that legitimately trips a couple of weak rules on every request —
 * disabling those rules is the blunt alternative and loses the signal.
 *
 * EVERY RULE STARTS IN LOG MODE and the panel does not hide it. A rule in log
 * mode records what it would have refused and refuses nothing, which is the
 * only honest way to find out whether a signature is safe on THIS application
 * before it is pointed at real visitors. The false-positive note is the field
 * that decides that, so it is one click away on every rule rather than absent.
 */
export function SignaturesPanel({
  catalog,
  settings,
  onChange,
  defaultMode,
  onDefaultModeChange,
  blockThreshold,
  onBlockThresholdChange,
  defaultThreshold,
  max,
  disabled,
}: Readonly<SignaturesPanelProps>) {
  const [expanded, setExpanded] = useState<string | null>(null)
  const used = enabledCount(settings)
  const groups = groupByCategory(catalog)

  /** Turning a rule off REMOVES its entry rather than storing enabled:false.
   *  The edge asks one question — does this hostname run rule X — and a rule
   *  that is present and off answers it twice. */
  const set = (id: string, next: SignatureSetting | null) => {
    const entries = Object.entries(settings).filter(([key]) => key !== id)
    if (next !== null) entries.push([id, next])
    onChange(Object.fromEntries(entries))
  }

  const threshold = Number.parseInt(blockThreshold, 10)
  const effectiveThreshold =
    Number.isFinite(threshold) && threshold > 0 ? threshold : defaultThreshold

  // The number that answers "will anything actually be refused". A ruleset
  // where every rule is in log mode has a blocking score of zero however much
  // arrives, which is a state worth naming rather than leaving somebody to
  // infer from a page of switches.
  const blockingWeight = Object.entries(settings).reduce((total, [id, setting]) => {
    if (!setting.enabled) return total
    const mode: WafMode = setting.mode ?? defaultMode
    if (mode !== "block") return total
    const rule = catalog.find((item) => item.id === id)
    return total + (setting.score ?? rule?.score ?? 0)
  }, 0)
  const watchingOnly = used > 0 && blockingWeight === 0

  return (
    <Section
      variant="panel"
      icon={ShieldCheck}
      tone="brand"
      title="Firewall rules"
      description="Managed signatures for the attack classes a public edge sees. Each match adds its weight to the request's score; the request is refused when the rules allowed to refuse it add up past the threshold."
      badge={
        <Badge variant="secondary" className="font-normal">
          {quotaLabel(used, max)}
        </Badge>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border/70 p-3">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              Default action
            </Label>
            <Select
              value={defaultMode}
              disabled={disabled}
              onValueChange={(value) => {
                onDefaultModeChange(value as WafMode)
              }}
            >
              <SelectTrigger
                className="h-9 w-[136px]"
                aria-label="Default action for enabled rules"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(MODE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-muted-foreground">
              Applies to any enabled rule with no action of its own.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label
              className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase"
              htmlFor="waf-threshold"
            >
              Block threshold
            </Label>
            <Input
              id="waf-threshold"
              value={blockThreshold}
              inputMode="numeric"
              placeholder={String(defaultThreshold)}
              disabled={disabled}
              className="h-9 w-[104px] font-mono tabular-nums"
              onChange={(event) => {
                onBlockThresholdChange(event.target.value.replace(/\D/g, ""))
              }}
            />
            <p className="text-[11px] text-muted-foreground">
              Blank uses the platform default ({defaultThreshold}). Raise it for an app that
              legitimately trips weak rules.
            </p>
          </div>
        </div>

        {watchingOnly && (
          <p className="flex items-start gap-2 rounded-lg border border-status-info/30 bg-status-info-bg/40 px-3 py-2 text-[12px] text-foreground">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0 text-status-info" aria-hidden />
            <span>
              Every enabled rule is watching only, so nothing will be refused. Matches are recorded
              in the request log — promote a rule to Block once its record looks like attacks and
              not like your own traffic.
            </span>
          </p>
        )}

        {groups.map((group) => (
          <div key={group.category} className="space-y-1.5">
            <h3 className="text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
              {group.label}
            </h3>
            <div className="divide-y divide-border/60 rounded-lg border border-border/70">
              {group.rules.map((rule) => {
                const setting = settingFor(settings, rule.id)
                const enabled = setting?.enabled ?? false
                const mode = setting?.mode ?? defaultMode
                const open = expanded === rule.id
                const weight = setting?.score ?? rule.score
                const actsAlone = mode === "block" && weight >= effectiveThreshold
                return (
                  <div key={rule.id} className="px-3 py-2.5">
                    <div className="flex items-start gap-3">
                      <Switch
                        checked={enabled}
                        // A rule can always be turned OFF, even over the
                        // ceiling: an account that downgrades must be able to
                        // get back under its quota, and a switch that refuses
                        // to release is a trap rather than a limit.
                        disabled={Boolean(disabled) || (!enabled && !canAdd(used, max))}
                        aria-label={rule.title}
                        className="mt-0.5"
                        onCheckedChange={(checked) => {
                          set(rule.id, checked ? { ...setting, enabled: true } : null)
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[13px] font-medium">{rule.title}</span>
                          <Badge
                            variant="outline"
                            className={cn(
                              "font-normal",
                              rule.score >= 5 && "border-status-danger/40 text-status-danger",
                            )}
                          >
                            {SCORE_LABELS[rule.score] ?? "Weight"} · {rule.score}
                          </Badge>
                          {actsAlone && (
                            <Badge variant="outline" className="font-normal">
                              Refuses on its own
                            </Badge>
                          )}
                        </div>
                        <button
                          type="button"
                          className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            setExpanded(open ? null : rule.id)
                          }}
                        >
                          <ChevronRight
                            className={cn("size-3 transition-transform", open && "rotate-90")}
                            aria-hidden
                          />
                          {open ? "Hide details" : "What this catches, and what trips it"}
                        </button>
                        {open && (
                          <div className="mt-2 space-y-2 rounded-md bg-muted/40 p-2.5 text-[12px] leading-relaxed">
                            <p className="text-muted-foreground">{rule.description}</p>
                            <p>
                              <span className="font-medium">
                                Legitimate traffic that trips it:{" "}
                              </span>
                              <span className="text-muted-foreground">{rule.false_positives}</span>
                            </p>
                            <p className="font-mono text-[11px] text-muted-foreground">{rule.id}</p>
                          </div>
                        )}
                      </div>

                      {enabled && (
                        <div className="flex shrink-0 items-center gap-1.5">
                          <Select
                            value={setting?.mode ?? ""}
                            disabled={disabled}
                            onValueChange={(value) => {
                              set(rule.id, {
                                ...setting,
                                enabled: true,
                                mode: value === "inherit" ? undefined : (value as WafMode),
                              })
                            }}
                          >
                            <SelectTrigger
                              className="h-8 w-[128px] text-[12px]"
                              aria-label={`${rule.title} action`}
                            >
                              <SelectValue placeholder={`Default (${MODE_LABELS[defaultMode]})`} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="inherit">
                                Default ({MODE_LABELS[defaultMode]})
                              </SelectItem>
                              {Object.entries(MODE_LABELS).map(([value, label]) => (
                                <SelectItem key={value} value={value}>
                                  {label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Input
                            value={setting?.score ? String(setting.score) : ""}
                            inputMode="numeric"
                            placeholder={String(rule.score)}
                            disabled={disabled}
                            aria-label={`${rule.title} weight`}
                            title="Weight for this app. Blank keeps the platform's."
                            className="h-8 w-[56px] text-center font-mono text-[12px] tabular-nums"
                            onChange={(event) => {
                              const digits = event.target.value.replace(/\D/g, "")
                              set(rule.id, {
                                ...setting,
                                enabled: true,
                                score: digits === "" ? undefined : Number(digits),
                              })
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        {max === 0 && used === 0 && (
          <p className="text-[11px] text-muted-foreground">
            This plan includes no firewall rules. Upgrading raises the ceiling; the rules themselves
            are the same on every tier.
          </p>
        )}
      </div>
    </Section>
  )
}
