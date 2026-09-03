import { useEffect, useState } from "react"

import {
  Badge,
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@datadack/common-ui"
import type { TFunction } from "i18next"
import { CheckCircle2, Globe, Info, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { TONE_CLASSES } from "@/components/console/status-config"
import { quotaGatePayload } from "@/modules/governance/quota-gate"
import { extractError } from "@/services/api/client"

import { useAddDomain, useDomain, useVerifyDomain } from "../domains.hooks"
import type { Domain, DomainClaimKind, DomainDnsInstructions } from "../domains.types"
import { AddDomainBatchResults, type BatchResult } from "./AddDomainBatchResults"
import { AddDomainInputStep } from "./AddDomainInputStep"
import { parseHostnames, parseLabels } from "./hostname-input"
import { RecordLine } from "./RecordLine"

/** Compact "12s" / "3m" / "2h" for the "checked … ago" line. */
function shortAgo(iso: string, now: number): string | null {
  const deltaMs = now - new Date(iso).getTime()
  if (Number.isNaN(deltaMs)) return null
  const seconds = Math.max(0, Math.floor(deltaMs / 1000))
  if (seconds < 60) return `${String(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${String(minutes)}m`
  return `${String(Math.floor(minutes / 60))}h`
}

type Step = "input" | "batch" | "records" | "done"

/** No hostname yet → ask for one; active → celebrate; anything else → records. */
function stepFor(activeHostname: string | null, status: Domain["status"] | undefined): Step {
  if (!activeHostname) return "input"
  return status === "active" ? "done" : "records"
}

/**
 * The DNS records to publish, in the order they should be read.
 *
 * A managed app's hostname is pointed with the CNAME and nothing else — the
 * platform will not hand out a literal edge address it may later have to move —
 * so the A record arrives empty and is dropped here. Other resource types are
 * addressed by their own IP and still get one.
 */
function recordsFor(
  instructions: DomainDnsInstructions | undefined,
  ownershipProven: boolean,
): DnsRecordRow[] {
  if (!instructions) return []
  const hasARecord = instructions.a_value !== ""
  const rows: DnsRecordRow[] = []
  if (!ownershipProven) {
    rows.push({ type: "TXT", name: instructions.txt_name, value: instructions.txt_value })
  }
  rows.push({
    type: "CNAME",
    name: instructions.cname_name,
    value: instructions.cname_target,
    // Only ever the alternative when there is something else to be an
    // alternative TO. Keyed off the A record's presence rather than off
    // is_apex: with one routing record on offer, dimming it told the tenant
    // the only instruction they had was the wrong one.
    alternative: hasARecord && instructions.is_apex,
  })
  rows.push({
    type: "A",
    name: instructions.a_name,
    value: instructions.a_value,
    alternative: !instructions.is_apex,
  })
  // A record card with an empty VALUE is worse than no card: it reads as broken
  // (and did, in the first screenshot of this dialog). This is also what drops
  // the A card entirely once the server stops sending one.
  return rows
    .filter((r) => r.value !== "")
    .sort((a, b) => Number(a.alternative ?? false) - Number(b.alternative ?? false))
}

/**
 * The dialog's own heading and subheading, which differ per step — and, on the
 * two steps that report an outcome, per KIND: an internal name is live when it
 * is added, so "Domain verified" over a list of names nothing had to verify
 * would describe a step that never ran.
 */
function headerFor(
  step: Step,
  hostname: string,
  internal: boolean,
  t: TFunction,
): { title: string; sub: string } {
  switch (step) {
    case "done":
      return {
        title: internal ? t("domains.add.doneInternalTitle") : t("domains.add.doneTitle"),
        sub: hostname,
      }
    case "batch":
      return {
        title: t("domains.add.batchTitle"),
        sub: internal
          ? t("domains.add.batchInternalDescription")
          : t("domains.add.batchDescription"),
      }
    case "records":
      return { title: t("domains.add.title"), sub: hostname }
    default:
      return { title: t("domains.add.title"), sub: t("domains.add.description") }
  }
}

/**
 * The three things that are true once a name is live, per kind.
 *
 * An internal name proved nothing and published nothing, so "Ownership
 * verified" over it would credit a step that never ran; an external one earned
 * all three and the list is the receipt for the work the tenant just did.
 */
function doneLines(internal: boolean, t: TFunction): string[] {
  if (internal) {
    return [
      t("domains.add.doneInternalLive"),
      t("domains.add.doneInternalCertificate"),
      t("domains.add.doneInternalNoDns"),
    ]
  }
  return [
    t("domains.add.doneOwnership"),
    t("domains.add.doneRouting"),
    t("domains.add.doneCertificate"),
  ]
}

/**
 * What the dialog is currently talking about: a name of ours or one of theirs,
 * and whether the field is taking bare labels.
 *
 * The two answers differ, and that is the point. What the dialog REPORTS is a
 * property of the row once one exists — a table row reopened on its DNS
 * records is a customer domain no matter which card is lit — while what the
 * FIELD accepts is whatever the chooser says. A zone is required for the label
 * field to mean anything, so an internal choice with no zone still types
 * hostnames.
 */
function kindStateOf(
  kind: DomainClaimKind,
  zone: string,
  row: Domain | undefined,
): { internal: boolean; labelMode: boolean } {
  const chose = kind === "internal" && zone !== ""
  return { internal: row ? row.managed : chose, labelMode: chose }
}

interface DnsRecordRow {
  type: "TXT" | "CNAME" | "A"
  name: string
  value: string
  /**
   * A routing record the server offered as a SECOND way to point the hostname.
   * Managed apps have one routing record — the CNAME — so nothing is marked
   * alternative there; a resource addressed by its own IP still sends an A
   * record, and only then does the distinction exist.
   */
  alternative?: boolean
}

interface AddDomainDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Registry attachment target — e.g. "mgd_app_project" + the project id. */
  resourceType: string
  resourceId: string
  /** A custom row that already exists: skip input, open on its DNS records. */
  existing?: Domain | null
  /**
   * The platform zone this resource's own address sits in, e.g.
   * "apps.datadack.cloud". Read off the resource's primary row by the caller —
   * this dialog is generic and the zone is the owning product's fact.
   *
   * Empty means the resource has no platform address yet, which is exactly the
   * case the server refuses with a 422, so the internal option is offered as
   * unavailable rather than as a claim that cannot succeed.
   */
  zone?: string
}

/**
 * The whole add-a-domain flow in one dialog, for both kinds of name.
 *
 * INTERNAL is another hostname in the platform's own zone: the zone's wildcard
 * DNS and wildcard certificate already cover it, so there is nothing to publish
 * and nothing to prove — the claim comes back active and the dialog goes
 * straight to its outcome. EXTERNAL is a domain the tenant owns: hostname in →
 * the DNS records to create → live polling until the ownership check passes →
 * done.
 *
 * One dialog rather than two, because it is one question ("what else should
 * reach this?") with two answers, and a console that hides the free instant one
 * behind a different button is a console where nobody finds it.
 *
 * Closable at any step — the row already exists after the first submit, the
 * table underneath keeps polling it, and reopening via "View records" lands
 * straight back on the records step (the `existing` prop).
 */
export function AddDomainDialog({
  open,
  onOpenChange,
  resourceType,
  resourceId,
  existing = null,
  zone = "",
}: Readonly<AddDomainDialogProps>) {
  // Hooks first, always — every conditional render happens below them.
  const { t } = useTranslation()
  // Null until the tenant picks, rather than a state seeded from the zone.
  //
  // The zone arrives with the resource's rows and can still be empty on the
  // render that opens this dialog, so a seeded default would be decided by
  // whether a fetch had landed — and an effect that corrected it afterwards
  // would also overwrite a choice the tenant had already made. Deriving the
  // default instead means it follows the zone until there IS a choice, and
  // never after.
  const [kind, setKind] = useState<DomainClaimKind | null>(null)
  const [hostname, setHostname] = useState("")
  // The entries that failed the client-side check, named. A bare "invalid"
  // boolean could not say WHICH line of a pasted column was the bad one.
  const [rejected, setRejected] = useState<string[]>([])
  // Set once the create lands; from then on the detail poll owns the truth.
  const [created, setCreated] = useState<string | null>(null)
  // Non-null once a MULTI-hostname submit has finished: one row per hostname.
  const [batch, setBatch] = useState<BatchResult[] | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(() => Date.now())

  const {
    mutateAsync: createDomainAsync,
    reset: resetCreate,
    isPending: creatingOne,
    error: createError,
  } = useAddDomain()
  // The batch drives its own pending flag: the mutation's own isPending drops
  // between the calls in the loop, and a button that flickers off mid-batch
  // invites a second click that would submit the whole list again.
  const creating = creatingOne || submitting
  const { mutate: verifyDomain, isPending: verifying } = useVerifyDomain()

  const activeHostname = created ?? existing?.hostname ?? null
  const domainQuery = useDomain(open ? activeHostname : null)
  // The poll's row wins; the list row that opened the dialog fills the first
  // render while the detail fetch is in flight.
  const row = domainQuery.data ?? existing ?? undefined

  // A finished batch outranks everything: it is the report on work already done,
  // and dropping the reader onto one hostname's records would silently discard
  // the outcome of the other four.
  const step: Step = batch !== null ? "batch" : stepFor(activeHostname, row?.status)

  // Everything resets on close so the next open starts clean — the idiom the
  // superadmin AddDomainsDialog set. `resetCreate` is referentially stable.
  useEffect(() => {
    if (!open) {
      setHostname("")
      setRejected([])
      setCreated(null)
      setBatch(null)
      setSubmitting(false)
      setKind(null)
      resetCreate()
    }
  }, [open, resetCreate])

  // A 1s tick keeps "checked Xs ago" honest between 5s polls.
  useEffect(() => {
    if (!open || step !== "records") return
    const id = window.setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [open, step])

  // Internal by default whenever there is a platform address to add a name
  // beside: it is the answer that needs no registrar, no waiting and no DNS,
  // and the card next to it says plainly what the other one is for.
  const chosenKind = kind ?? (zone ? "internal" : "external")
  const { internal, labelMode } = kindStateOf(chosenKind, zone, row)

  // An internal claim sends the LABEL and the server puts it under the
  // resource's own zone; an external one sends the whole hostname. Same field,
  // same parser shape, different rules — a label has no dots and a hostname
  // must have one.
  const parsed = labelMode ? parseLabels(hostname, zone) : parseHostnames(hostname)

  const claim = (value: string) =>
    createDomainAsync({
      hostname: value,
      resource_type: resourceType,
      resource_id: resourceId,
      kind: labelMode ? "internal" : "external",
    })

  /**
   * Claim ONE hostname and land on its DNS records.
   *
   * The overwhelmingly common add, kept on its own path: it should not have to
   * read a one-row report to reach the records it came for. A refusal needs no
   * handling here — `serverError` renders it under the field, and the quota gate
   * takes the 403.
   */
  const submitOne = async (value: string) => {
    try {
      const domain = await claim(value)
      setCreated(domain.hostname)
    } catch {
      /* rendered inline; see above */
    }
  }

  /**
   * Claim every hostname in the field, and report on each.
   *
   * SEQUENTIAL, not in parallel. Each claim consumes a domain quota and takes a
   * lock on the hostname; firing ten at once makes the quota refusals race, so
   * which names survive depends on scheduling rather than on the order the
   * tenant typed them. In series, a list that overruns the quota fails from the
   * bottom, which is both predictable and what the reader expects.
   *
   * A failure never stops the run. The names after it are independent claims,
   * and abandoning them would mean the tenant fixes one typo and resubmits a
   * list of which half is now "already claimed".
   */
  const submitMany = async (values: string[]) => {
    setSubmitting(true)
    const results: BatchResult[] = []
    for (const value of values) {
      // Reported under the name it will ANSWER on, not the label that was
      // typed: a report listing "checkout" beside a failure for
      // "pay.apps.datadack.cloud" would read as two different things.
      const name = labelMode ? `${value}.${zone}` : value
      try {
        await claim(value)
        results.push({ hostname: name, ok: true })
      } catch (e) {
        results.push({
          hostname: name,
          ok: false,
          error: extractError(e, t("domains.add.createFailed")),
        })
      }
    }
    setSubmitting(false)
    setBatch(results)
  }

  const submit = async () => {
    if (creating) return
    setRejected(parsed.invalid)
    if (parsed.valid.length === 0) return
    if (parsed.valid.length === 1) {
      await submitOne(parsed.valid[0] ?? "")
      return
    }
    await submitMany(parsed.valid)
  }

  const instructions = row?.dns_instructions
  // The account already proved this domain in the registrar, so the server
  // checks routing ONLY for this hostname (see the backend's verify()). Showing
  // the TXT record anyway would advertise a step nothing looks for — the tenant
  // would publish it, watch the check pass without it, and learn to distrust the
  // instructions.
  const ownershipProven = instructions?.ownership_proven ?? false
  const records = recordsFor(instructions, ownershipProven)
  // An apex cannot carry a plain CNAME, and saying nothing about it leaves the
  // tenant to discover that from their registrar's error message. Only worth
  // saying when the CNAME is the only record on offer — otherwise the A record
  // below it already IS the apex answer.
  const needsApexAlias = (instructions?.is_apex ?? false) && (instructions?.a_value ?? "") === ""

  const verification = row?.verification
  // suspended/released can be reached from outside this dialog (Remove in the
  // table, an operator action); polling stops there, so the UI must say so.
  const isTerminal = row != null && row.status !== "pending" && row.status !== "active"
  const checkedAgo = verification?.last_checked_at
    ? shortAgo(verification.last_checked_at, now)
    : null
  // A quota 403 is already surfaced by the quota gate (useAddDomain's
  // onError); rendering the same message inline under the field would say it
  // twice. Everything else still shows inline where the tenant is looking.
  const serverError =
    createError && !quotaGatePayload(createError)
      ? extractError(createError, t("domains.add.createFailed"))
      : null

  const header = headerFor(step, activeHostname ?? "", internal, t)

  // Internal names have no records to show: they are already answering. An
  // absent callback drops the batch report's per-row button rather than
  // offering a way to an empty step.
  const viewRecords = internal
    ? undefined
    : (name: string) => {
        setBatch(null)
        setCreated(name)
      }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl glass-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4" />
            {header.title}
          </DialogTitle>
          <DialogDescription>{header.sub}</DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <AddDomainInputStep
            kind={chosenKind}
            onKindChange={(next) => {
              setKind(next)
              // The field means something different under each kind — a label
              // is not a hostname — so a draft typed for one is cleared rather
              // than re-read under the other's rules and named as invalid.
              setHostname("")
              setRejected([])
            }}
            zone={zone}
            labelMode={labelMode}
            value={hostname}
            onValueChange={(next) => {
              setHostname(next)
              if (rejected.length > 0) setRejected([])
            }}
            parsed={parsed}
            rejected={rejected}
            serverError={serverError}
            creating={creating}
            onSubmit={() => void submit()}
            onCancel={() => {
              onOpenChange(false)
            }}
          />
        )}

        {step === "batch" && batch !== null && (
          <>
            <p className="text-[13px] text-muted-foreground">
              {t("domains.add.batchSummary", {
                added: batch.filter((r) => r.ok).length,
                total: batch.length,
              })}
            </p>

            <AddDomainBatchResults results={batch} onViewRecords={viewRecords} />

            <DialogFooter>
              <Button
                type="button"
                variant="gold"
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                {t("domains.add.close")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "records" && (
          <>
            <p className="text-[13px] text-muted-foreground">{t("domains.add.recordsIntro")}</p>

            {records.length > 0 && (
              <div className="divide-y divide-border/60 rounded-md border border-border/60">
                {records.map((record) => (
                  <div
                    key={record.type}
                    className={`space-y-1.5 p-3 ${record.alternative ? "opacity-60" : ""}`}
                  >
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`font-mono text-[10px] ${record.alternative ? TONE_CLASSES.neutral : TONE_CLASSES.info}`}
                      >
                        {record.type}
                      </Badge>
                      {record.alternative && (
                        <span className="text-[11px] text-muted-foreground">
                          {record.type === "A"
                            ? t("domains.add.apexAlternative")
                            : t("domains.add.subdomainAlternative")}
                        </span>
                      )}
                    </div>
                    <RecordLine
                      label={t("domains.add.recordName")}
                      value={record.name}
                      copied={t("console.copy.copied")}
                    />
                    <RecordLine
                      label={t("domains.add.recordValue")}
                      value={record.value}
                      copied={t("console.copy.copied")}
                    />
                  </div>
                ))}
              </div>
            )}

            {needsApexAlias && (
              <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-status-info" />
                <span>{t("domains.add.apexAlias")}</span>
              </p>
            )}

            {ownershipProven && (
              // Not a footnote: without it the tenant sees one record where the
              // docs and every previous domain showed two, and the natural
              // reading is that something failed to load.
              <p className="flex items-start gap-2 text-[13px] text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-status-success" />
                {t("domains.add.ownershipProven")}
              </p>
            )}

            {isTerminal ? (
              // A row that left pending without becoming active — released
              // from another tab, or suspended by the platform. The polling
              // has stopped, so a spinner here would be a lie.
              <p className="text-[13px] text-status-warning">
                {t(`domains.add.terminal.${row.status}`, {
                  defaultValue: t("domains.add.terminal.released"),
                })}
              </p>
            ) : (
              <div className="flex items-start gap-2 text-[13px] text-muted-foreground">
                <Loader2 className="mt-0.5 size-3.5 shrink-0 animate-spin" />
                <div className="min-w-0">
                  <p>
                    {t("domains.add.waiting")}
                    {" · "}
                    {checkedAgo
                      ? t("domains.add.checkedAgo", { ago: checkedAgo })
                      : t("domains.add.notCheckedYet")}
                  </p>
                  {verification?.last_error && (
                    <p className="mt-1 break-words text-[12px] text-status-warning">
                      {verification.last_error}
                    </p>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                {t("domains.add.close")}
              </Button>
              <Button
                type="button"
                variant="gold"
                disabled={verifying || !activeHostname}
                loading={verifying}
                onClick={() => {
                  if (activeHostname) verifyDomain(activeHostname)
                }}
              >
                {t("domains.actions.verifyNow")}
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "done" && (
          <>
            <div className="space-y-2.5">
              {doneLines(internal, t).map((line) => (
                <div key={line} className="flex items-center gap-2 text-[13px] text-foreground">
                  <CheckCircle2 className="size-4 shrink-0 text-status-success" />
                  <span>{line}</span>
                </div>
              ))}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="gold"
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                {t("domains.add.done")}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
