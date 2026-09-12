import { useState } from "react"

import { CheckCircle2, Lightbulb, Search, XCircle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { PageHeader, Section } from "@/components/console"

import { Badge, Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@datadack/common-ui"

import { useAnalyzeReachability } from "../vpc.hooks"
import type { ReachabilityRule, ReachabilityVerdict } from "../vpc.types"

const FIELD_LABEL_CLASS = "text-xs font-semibold tracking-wide uppercase text-muted-foreground"

/**
 * "Why can't A reach B?" — answered from the same data the firewall is compiled
 * from.
 *
 * The verdict is the least interesting part of this screen. From inside a guest
 * a blocked connection just hangs, and a missing security-group rule, an
 * unaccepted peering, a guest in no group and a rule with the wrong port all
 * produce exactly that symptom while needing four different fixes. What this
 * shows is which one it is.
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

function VerdictPanel({ verdict }: Readonly<{ verdict: ReachabilityVerdict }>) {
  const { t } = useTranslation()
  const rule = verdict.matched_rule

  return (
    <Section title={t("reachability.result.title")}>
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          {verdict.allowed ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-red-500" />
          )}
          <div className="space-y-1">
            <div className="flex items-center gap-2 font-medium">
              {verdict.allowed
                ? t("reachability.result.allowed")
                : t("reachability.result.blocked")}
              {/* Which layer decided, so a fix is aimed at the right place. */}
              <Badge variant="outline">{verdict.stage}</Badge>
            </div>
            <p className="text-sm text-muted-foreground">{verdict.reason}</p>
          </div>
        </div>

        {rule ? (
          <div className="rounded-md border p-3 text-sm">
            <div className={FIELD_LABEL_CLASS}>{t("reachability.result.decidingRule")}</div>
            <div className="mt-1 font-mono text-xs">
              {rule.group_name} · {rule.action} {rule.direction} {rule.protocol}
              {formatRulePorts(rule)} · {rule.peer}
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
      </div>
    </Section>
  )
}
