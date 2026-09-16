import { useState } from "react"

import { CheckCircle2, HelpCircle, Lightbulb, Search, XCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader, Section } from "@/components/console"

import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@datadack/common-ui"

import { useAnalyzeReachability } from "../vpc.hooks"
import type {
  ReachabilityCheck,
  ReachabilityCheckStatus,
  ReachabilityOutcome,
  ReachabilityRule,
  ReachabilityVerdict,
} from "../vpc.types"

const FIELD_LABEL_CLASS = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"

/**
 * "Why can't A reach B?" — answered from the same data the firewall and the
 * guests are built from.
 *
 * The verdict is the least interesting part of this screen. From inside a guest
 * a blocked connection just hangs, and a missing security-group rule, an
 * unaccepted peering, a guest routing out the wrong interface and a peering
 * whose routes never reached the router all produce exactly that symptom while
 * needing different fixes. What this shows is which one it is, and every layer
 * the flow crossed on the way.
 */
export function ReachabilityPage() {
  const { t } = useTranslation()
  const { mutate: analyze, data: verdict, isPending } = useAnalyzeReachability()

  const [source, setSource] = useState("")
  const [dest, setDest] = useState("")
  const [protocol, setProtocol] = useState("tcp")
  const [port, setPort] = useState("443")

  const submit = () => {
    analyze({
      source_address: source.trim(),
      dest_address: dest.trim(),
      protocol,
      // ICMP carries no ports; sending one would be meaningless rather than wrong.
      port: protocol === "icmp" ? 0 : Number.parseInt(port, 10) || 0,
    })
  }

  const ready = source.trim() !== "" && dest.trim() !== ""

  return (
    <div className="space-y-6">
      <PageHeader title={t("reachability.title")} description={t("reachability.description")} />

      <Section title={t("reachability.form.title")}>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>{t("reachability.fields.source")}</Label>
            <Input
              value={source}
              placeholder={t("reachability.fields.sourceExample")}
              onChange={(e) => {
                setSource(e.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>{t("reachability.fields.destination")}</Label>
            <Input
              value={dest}
              placeholder={t("reachability.fields.destExample")}
              onChange={(e) => {
                setDest(e.target.value)
              }}
            />
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>{t("reachability.fields.protocol")}</Label>
            <Select value={protocol} onValueChange={setProtocol}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["tcp", "udp", "icmp"].map((p) => (
                  <SelectItem key={p} value={p}>
                    {p.toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className={FIELD_LABEL_CLASS}>{t("reachability.fields.port")}</Label>
            <Input
              value={port}
              disabled={protocol === "icmp"}
              onChange={(e) => {
                setPort(e.target.value)
              }}
            />
          </div>
        </div>

        <div className="mt-4">
          <Button onClick={submit} disabled={!ready} loading={isPending}>
            <Search className="mr-2 h-4 w-4" />
            {t("reachability.form.submit")}
          </Button>
        </div>
      </Section>

      {verdict ? <VerdictPanel verdict={verdict} /> : null}
    </div>
  )
}

/**
 * The rule's port range, or nothing at all. A rule with no ports covers every
 * port, so showing "0" would read as a port rather than as "any".
 */
function formatRulePorts(rule: ReachabilityRule): string {
  if (rule.port_from <= 0) return ""
  if (rule.port_to > rule.port_from) {
    return ` ${String(rule.port_from)}-${String(rule.port_to)}`
  }
  return ` ${String(rule.port_from)}`
}

/** Older backends send no outcome; allowed is the whole answer there. */
function outcomeOf(verdict: ReachabilityVerdict): ReachabilityOutcome {
  return verdict.outcome ?? (verdict.allowed ? "reachable" : "blocked")
}

function StatusIcon({
  status,
  className,
}: Readonly<{ status: ReachabilityCheckStatus; className: string }>) {
  const { t } = useTranslation()
  const label = t(`reachability.checkStatus.${status}`)
  if (status === "pass") {
    return <CheckCircle2 aria-label={label} className={`${className} text-emerald-500`} />
  }
  if (status === "fail") {
    return <XCircle aria-label={label} className={`${className} text-red-500`} />
  }
  return <HelpCircle aria-label={label} className={`${className} text-amber-500`} />
}

function RuleLine({ rule }: Readonly<{ rule: ReachabilityRule }>) {
  return (
    <div className="font-mono text-xs">
      {rule.group_name} · {rule.action} {rule.direction} {rule.protocol}
      {formatRulePorts(rule)} · {rule.peer}
    </div>
  )
}

function VerdictPanel({ verdict }: Readonly<{ verdict: ReachabilityVerdict }>) {
  const { t } = useTranslation()
  const rule = verdict.matched_rule
  const outcome = outcomeOf(verdict)
  const checks = verdict.checks ?? []
  const headline = {
    reachable: t("reachability.result.allowed"),
    blocked: t("reachability.result.blocked"),
    unknown: t("reachability.result.unknown"),
  }[outcome]
  const headlineStatus: ReachabilityCheckStatus = {
    reachable: "pass" as const,
    blocked: "fail" as const,
    unknown: "unknown" as const,
  }[outcome]

  return (
    <Section title={t("reachability.result.title")}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <StatusIcon status={headlineStatus} className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              {headline}
              {/* Which layer decided, so a fix is aimed at the right place. */}
              <Badge variant="outline">
                {t(`reachability.stages.${verdict.stage}`, { defaultValue: verdict.stage })}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{verdict.reason}</p>
          </div>
        </div>

        {rule ? (
          <div className="rounded-md border p-3 text-sm">
            <div className={FIELD_LABEL_CLASS}>{t("reachability.result.decidingRule")}</div>
            <div className="mt-1">
              <RuleLine rule={rule} />
            </div>
          </div>
        ) : null}

        {verdict.hints && verdict.hints.length > 0 ? (
          <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              {t("reachability.result.howToFix")}
            </div>
            <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
              {verdict.hints.map((h) => (
                <li key={h}>• {h}</li>
              ))}
            </ul>
          </div>
        ) : null}

        {checks.length > 0 ? <PathList checks={checks} /> : null}
      </div>
    </Section>
  )
}

/**
 * Every layer the flow crossed, in path order. The backend stops at the first
 * failure, so for a blocked flow the last row is the one that blocked it.
 */
function PathList({ checks }: Readonly<{ checks: ReachabilityCheck[] }>) {
  const { t } = useTranslation()
  return (
    <div className="rounded-md border p-3">
      <div className={FIELD_LABEL_CLASS}>{t("reachability.result.path")}</div>
      <ol className="mt-2 space-y-2">
        {checks.map((check, i) => (
          <li key={`${check.stage}-${String(i)}`} className="flex items-start gap-2 text-sm">
            <StatusIcon status={check.status} className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="min-w-0 space-y-0.5">
              <div>
                <span className="font-medium">
                  {t(`reachability.stages.${check.stage}`, { defaultValue: check.stage })}
                </span>
                <span className="text-muted-foreground"> — {check.summary}</span>
              </div>
              {check.matched_rule ? (
                <div className="text-muted-foreground">
                  <RuleLine rule={check.matched_rule} />
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
