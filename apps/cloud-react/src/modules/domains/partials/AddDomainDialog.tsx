import { useEffect, useState } from "react"

import { CheckCircle2, Globe, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { TONE_CLASSES } from "@/components/console/status-config"
import { quotaGatePayload } from "@/modules/governance/quota-gate"
import { extractError } from "@/services/api/client"

import {
  Badge,
  Button,
  CopyButton,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@datadack/common-ui"

import { useAddDomain, useDomain, useVerifyDomain } from "../domains.hooks"
import type { Domain } from "../domains.types"

// Client-side sanity check only — the server owns real validation (platform
// zones, ownership, quota). Lowercase labels of letters/digits/hyphens, at
// least one dot, so "app.example.com" and the apex "example.com" both pass
// while obvious typos fail before a round trip.
const HOSTNAME_LABEL = "[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
const HOSTNAME_RE = new RegExp(`^(?=.{4,253}$)(${HOSTNAME_LABEL}\\.)+${HOSTNAME_LABEL}$`)

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

type Step = "input" | "records" | "done"

/** No hostname yet → ask for one; active → celebrate; anything else → records. */
function stepFor(activeHostname: string | null, status: Domain["status"] | undefined): Step {
  if (!activeHostname) return "input"
  return status === "active" ? "done" : "records"
}

interface DnsRecordRow {
  type: "TXT" | "CNAME" | "A"
  name: string
  value: string
  /** The routing record for the OTHER shape of domain (apex vs subdomain).
   * is_apex is a backend approximation, so both are always shown — the
   * unlikely one dimmed with a hint — and a wrong guess only reorders them. */
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
}

/**
 * The whole add-a-custom-domain flow in one dialog: hostname in → the DNS
 * records to create → live polling until the ownership check passes → done.
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
}: Readonly<AddDomainDialogProps>) {
  // Hooks first, always — every conditional render happens below them.
  const { t } = useTranslation()
  const [hostname, setHostname] = useState("")
  const [invalid, setInvalid] = useState(false)
  // Set once the create lands; from then on the detail poll owns the truth.
  const [created, setCreated] = useState<string | null>(null)
  const [now, setNow] = useState(() => Date.now())

  const {
    mutate: createDomain,
    reset: resetCreate,
    isPending: creating,
    error: createError,
  } = useAddDomain()
  const { mutate: verifyDomain, isPending: verifying } = useVerifyDomain()

  const activeHostname = created ?? existing?.hostname ?? null
  const domainQuery = useDomain(open ? activeHostname : null)
  // The poll's row wins; the list row that opened the dialog fills the first
  // render while the detail fetch is in flight.
  const row = domainQuery.data ?? existing ?? undefined

  const step = stepFor(activeHostname, row?.status)

  // Everything resets on close so the next open starts clean — the idiom the
  // superadmin AddDomainsDialog set. `resetCreate` is referentially stable.
  useEffect(() => {
    if (!open) {
      setHostname("")
      setInvalid(false)
      setCreated(null)
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

  const submit = () => {
    if (creating) return
    const value = hostname.trim().toLowerCase()
    if (!HOSTNAME_RE.test(value)) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    createDomain(
      { hostname: value, resource_type: resourceType, resource_id: resourceId },
      {
        onSuccess: (domain) => {
          setCreated(domain.hostname)
        },
      },
    )
  }

  const instructions = row?.dns_instructions
  // Both routing records always render: is_apex is an approximation (label
  // count), and an apex like example.co.uk would otherwise be shown ONLY the
  // CNAME most registrars refuse at an apex. The likely record leads; the
  // other follows dimmed, with a hint saying when it is the right one.
  const records: DnsRecordRow[] = instructions
    ? (
        [
          { type: "TXT", name: instructions.txt_name, value: instructions.txt_value },
          { type: "A", name: instructions.a_name, value: instructions.a_value, alternative: !instructions.is_apex },
          { type: "CNAME", name: instructions.cname_name, value: instructions.cname_target, alternative: instructions.is_apex },
        ] satisfies DnsRecordRow[]
      ).sort((a, b) => Number(a.alternative ?? false) - Number(b.alternative ?? false))
    : []

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg glass-3">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4" />
            {step === "done" ? t("domains.add.doneTitle") : t("domains.add.title")}
          </DialogTitle>
          <DialogDescription>
            {step === "input" ? t("domains.add.description") : (activeHostname ?? "")}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <>
            <div className="space-y-1.5">
              <Label htmlFor="custom-domain-hostname">{t("domains.add.hostnameLabel")}</Label>
              <Input
                id="custom-domain-hostname"
                value={hostname}
                placeholder={t("domains.add.hostnamePlaceholder")}
                spellCheck={false}
                autoComplete="off"
                className="font-mono"
                onChange={(event) => {
                  setHostname(event.target.value)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") submit()
                }}
              />
              {invalid ? (
                <p className="text-[12px] text-destructive">{t("domains.add.hostnameInvalid")}</p>
              ) : (
                <p className="text-[11px] text-muted-foreground">{t("domains.add.hostnameHint")}</p>
              )}
              {serverError && <p className="text-[12px] text-destructive">{serverError}</p>}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                disabled={creating}
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                {t("console.confirm.cancel")}
              </Button>
              <Button
                type="button"
                variant="gold"
                disabled={creating || hostname.trim() === ""}
                loading={creating}
                onClick={submit}
              >
                {t("domains.add.submit")}
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
                    <div className="grid grid-cols-[44px_minmax(0,1fr)] items-center gap-x-3 gap-y-1">
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t("domains.add.recordName")}
                      </span>
                      <CopyButton value={record.name} copiedLabel={t("console.copy.copied")} />
                      <span className="text-[10px] uppercase tracking-wide text-muted-foreground">
                        {t("domains.add.recordValue")}
                      </span>
                      <CopyButton value={record.value} copiedLabel={t("console.copy.copied")} />
                    </div>
                  </div>
                ))}
              </div>
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
              {[
                t("domains.add.doneOwnership"),
                t("domains.add.doneRouting"),
                t("domains.add.doneCertificate"),
              ].map((line) => (
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
