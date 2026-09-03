import { useEffect, useState } from "react"

import { CheckCircle2, Globe, Loader2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { extractError } from "@/services/api/client"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
} from "@datadack/common-ui"

import {
  useRegisterDomain,
  useRegisteredDomain,
  useVerifyRegisteredDomain,
} from "../registrar.hooks"
import type { RegisteredDomain } from "../registrar.types"
import { RecordLine } from "./RecordLine"

// Client-side sanity only — the server owns real validation (platform zones,
// public suffixes, whether somebody else already holds it). Two or more
// lowercase labels, which lets "example.com" and "sub.example.co.uk" through
// while catching the obvious typo before a round trip.
const LABEL = "[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?"
const DOMAIN_RE = new RegExp(`^(?=.{4,253}$)(${LABEL}\\.)+${LABEL}$`)

// Every RecordLine takes the same "copied" toast label.
const COPIED_KEY = "console.copy.copied"

type Step = "input" | "record" | "done"

/** No row yet → ask for a domain; verified → celebrate; otherwise → the record. */
function stepFor(domain: string | null, status: RegisteredDomain["status"] | undefined): Step {
  if (!domain) return "input"
  return status === "verified" ? "done" : "record"
}

/**
 * The whole register-a-domain flow in one dialog: domain in → the TXT record to
 * publish → live polling until ownership is proven → done.
 *
 * Closable at any step. The row already exists after the first submit, the list
 * underneath keeps polling it, and reopening from the row's "View record" action
 * lands straight back on the record step.
 */
export function RegisterDomainDialog({
  open,
  onOpenChange,
  existing,
}: Readonly<{
  open: boolean
  onOpenChange: (open: boolean) => void
  /** A registration that already exists: skip input, open on its record. */
  existing?: RegisteredDomain | null
}>) {
  const { t } = useTranslation()
  const [input, setInput] = useState("")
  // The domain whose record we are showing. Separate from `input` because the
  // server NORMALISES what was typed (a pasted URL, a "*." prefix), and every
  // subsequent read has to use the stored form or it 404s.
  const [registered, setRegistered] = useState<string | null>(null)

  const register = useRegisterDomain()
  const verify = useVerifyRegisteredDomain()
  // Pulled out because the reset effect below depends on it. react-query keeps
  // `reset` referentially stable, so naming it directly lets that effect declare
  // an honest dependency list instead of disabling the lint rule — which the
  // React Compiler treats as a reason to stop optimizing the whole component.
  const resetRegister = register.reset
  // Polls every 10s while pending — this is what makes the dialog resolve on its
  // own once the background worker sees the record, with no button press.
  const { data: live } = useRegisteredDomain(open ? registered : null)

  // `live` wins once a domain has been registered in this dialog — its detail
  // query is seeded by the mutation, so it is populated on the first render of
  // the record step. `existing` covers the dialog being opened straight onto a
  // row from the table, before that query resolves.
  const row = live ?? existing ?? null
  const step = stepFor(registered, row?.status)

  // Reset per opening. Without this, opening the dialog a second time shows the
  // previous domain's record for a frame before the query resolves, and a failed
  // registration's error is still sitting under the field.
  const existingDomain = existing?.domain ?? null
  useEffect(() => {
    if (!open) return
    setInput("")
    setRegistered(existingDomain)
    resetRegister()
  }, [open, existingDomain, resetRegister])

  const trimmed = input.trim().toLowerCase()
  const valid = DOMAIN_RE.test(trimmed)

  const submit = () => {
    if (!valid) return
    register.mutate(
      { domain: trimmed },
      {
        onSuccess: (created) => {
          setRegistered(created.domain)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="size-4" />
            {step === "done"
              ? t("domains.registrar.dialog.doneTitle")
              : t("domains.registrar.dialog.title")}
          </DialogTitle>
          <DialogDescription>
            {step === "input" && t("domains.registrar.dialog.inputHelp")}
            {step === "record" && t("domains.registrar.dialog.recordHelp")}
            {step === "done" && t("domains.registrar.dialog.doneHelp", { domain: row?.domain })}
          </DialogDescription>
        </DialogHeader>

        {step === "input" && (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="registrar-domain">{t("domains.registrar.dialog.field")}</Label>
              <Input
                id="registrar-domain"
                value={input}
                onChange={(e) => {
                  setInput(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") submit()
                }}
                placeholder="example.com"
                autoComplete="off"
                spellCheck={false}
              />
              <p className="text-xs text-muted-foreground">
                {t("domains.registrar.dialog.fieldHint")}
              </p>
            </div>
            {register.isError && (
              <p className="text-xs text-status-danger">
                {extractError(register.error, t("domains.registrar.registerFailed"))}
              </p>
            )}
          </div>
        )}

        {step === "record" && row && (
          <div className="space-y-4">
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-xs font-medium">{t("domains.registrar.dialog.publish")}</p>
              <RecordLine
                label={t("domains.registrar.dialog.recordType")}
                value={row.verification.type}
                copied={t(COPIED_KEY)}
              />
              <RecordLine
                label={t("domains.registrar.dialog.recordName")}
                value={row.verification.name}
                copied={t(COPIED_KEY)}
              />
              <RecordLine
                label={t("domains.registrar.dialog.recordValue")}
                value={row.verification.value}
                copied={t(COPIED_KEY)}
              />
            </div>

            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              {t("domains.registrar.dialog.waiting")}
            </p>
            {/* The last failure, in DNS's own words. It is the difference between
                "keep waiting" and "you pasted the wrong value". */}
            {row.last_error && <p className="text-xs text-status-warning">{row.last_error}</p>}
          </div>
        )}

        {step === "done" && row && (
          <div className="space-y-3">
            <p className="flex items-center gap-2 text-sm">
              <CheckCircle2 className="size-4 shrink-0 text-status-success" />
              {t("domains.registrar.dialog.proven", { domain: row.domain })}
            </p>
            {/* The next question, every single time. Answering it here saves a
                round trip through the docs. */}
            <div className="space-y-2 rounded-lg border border-border/60 p-3">
              <p className="text-xs font-medium">{t("domains.registrar.dialog.nextStep")}</p>
              <RecordLine
                label={t("domains.registrar.dialog.cname")}
                value={row.routing.cname_target}
                copied={t(COPIED_KEY)}
              />
              {row.routing.a_value && (
                <RecordLine
                  label={t("domains.registrar.dialog.apex")}
                  value={row.routing.a_value}
                  copied={t(COPIED_KEY)}
                />
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          {step === "input" && (
            <Button onClick={submit} disabled={!valid || register.isPending}>
              {register.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
              {t("domains.registrar.dialog.submit")}
            </Button>
          )}
          {step === "record" && row && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  onOpenChange(false)
                }}
              >
                {t("domains.registrar.dialog.close")}
              </Button>
              <Button
                onClick={() => {
                  verify.mutate(row.domain)
                }}
                disabled={verify.isPending}
              >
                {verify.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                {t("domains.registrar.dialog.checkNow")}
              </Button>
            </>
          )}
          {step === "done" && (
            <Button
              onClick={() => {
                onOpenChange(false)
              }}
            >
              {t("domains.registrar.dialog.done")}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
