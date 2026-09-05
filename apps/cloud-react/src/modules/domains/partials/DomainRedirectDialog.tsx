import { useEffect, useState } from "react"

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Select,
  SelectTrigger,
  SelectValue,
} from "@datadack/common-ui"
import type { TFunction } from "i18next"
import { GitFork } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useClearDomainRedirect, useSetDomainRedirect } from "../domains.hooks"
import { REDIRECT_STATUSES, type Domain } from "../domains.types"
import { DomainBehaviorChoice, type DomainBehavior } from "./DomainBehaviorChoice"
import { isValidHostname, normalizeHostname } from "./hostname-input"
import { RedirectSettingsFields } from "./RedirectSettingsFields"

/** The field's error, or "" for none. Self-redirect wins: it is the specific
 *  diagnosis, where "enter a domain name" would send somebody hunting a typo. */
function selfRedirectError(isSelf: boolean, isInvalid: boolean, t: TFunction): string {
  if (isSelf) return t("domains.redirect.selfRedirect")
  if (isInvalid) return t("domains.redirect.invalidTo")
  return ""
}

interface DomainRedirectDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** The row being pointed somewhere else. Null closes the dialog. */
  domain: Domain | null
}

/**
 * Choose what an active hostname does: serve Production or redirect.
 *
 * The destination is a HOSTNAME, and the field says so rather than accepting a
 * URL and stripping it: the edge builds `https://<host><path>` itself, which is
 * what keeps a stored redirect from ever becoming an open one. A pasted URL is
 * normalised rather than rejected — that is what people have in their clipboard
 * — but what is stored and shown back is the host.
 *
 * “Connect to an environment” currently names Production because it is the only
 * environment that deploys. Showing preview/custom environments here would be a
 * convincing control for a route the backend cannot make.
 */
export function DomainRedirectDialog({
  open,
  onOpenChange,
  domain,
}: Readonly<DomainRedirectDialogProps>) {
  const { t } = useTranslation()
  const existing = domain?.policy?.redirect
  const hasExisting = existing != null
  const [behavior, setBehavior] = useState<DomainBehavior>("connect")
  const [to, setTo] = useState("")
  const [status, setStatus] = useState<number>(REDIRECT_STATUSES[0].value)
  const [dropPath, setDropPath] = useState(false)
  const [invalid, setInvalid] = useState(false)

  const save = useSetDomainRedirect()
  const clear = useClearDomainRedirect()

  // Seeded per hostname, not once: opening the dialog on a second row must show
  // that row's redirect, not the one left over from the first.
  useEffect(() => {
    if (!open) return
    setBehavior(hasExisting ? "redirect" : "connect")
    setTo(existing?.to ?? "")
    setStatus(existing?.status ?? REDIRECT_STATUSES[0].value)
    setDropPath(existing?.drop_path ?? false)
    setInvalid(false)
  }, [open, domain?.hostname, hasExisting, existing?.to, existing?.status, existing?.drop_path])

  if (!domain) return null

  const destination = normalizeHostname(to)
  // Caught here as well as at the server, because it is the mistake people
  // actually make and the browser's answer to it — ERR_TOO_MANY_REDIRECTS — is
  // not one anybody connects back to this field.
  const selfRedirect = destination !== "" && destination === normalizeHostname(domain.hostname)
  const busy = save.isPending || clear.isPending

  // The one line under the field, decided once. Self-redirect leads because it
  // is the specific diagnosis; "enter a domain name" would be true of it too and
  // would send somebody looking for a typo that is not there.
  const fieldError = selfRedirectError(selfRedirect, invalid, t)

  const submit = () => {
    if (busy) return
    if (behavior === "connect") {
      if (!existing) {
        onOpenChange(false)
        return
      }
      clear.mutate(domain.hostname, {
        onSuccess: () => {
          onOpenChange(false)
        },
      })
      return
    }
    if (!isValidHostname(destination) || selfRedirect) {
      setInvalid(true)
      return
    }
    save.mutate(
      { hostname: domain.hostname, to: destination, status, drop_path: dropPath },
      {
        onSuccess: () => {
          onOpenChange(false)
        },
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-3 sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitFork className="size-4" />
            {t("domains.behavior.title")}
          </DialogTitle>
          <DialogDescription>
            <span className="font-mono text-[12px] text-foreground">{domain.hostname}</span>
            <span className="mt-1 block">{t("domains.behavior.description")}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <DomainBehaviorChoice
            value={behavior}
            onChange={(next) => {
              setBehavior(next)
              setInvalid(false)
            }}
          />

          {behavior === "connect" ? (
            <div className="space-y-1.5 rounded-lg border border-border/60 glass-1-bg-raised p-3">
              <Label htmlFor="domain-environment">{t("domains.behavior.environmentLabel")}</Label>
              <Select value="production" disabled>
                <SelectTrigger id="domain-environment" className="w-full">
                  <SelectValue>{t("domains.behavior.connect.environment")}</SelectValue>
                </SelectTrigger>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                {t("domains.behavior.environmentHint")}
              </p>
            </div>
          ) : (
            <RedirectSettingsFields
              idPrefix="domain-configure"
              to={to}
              onToChange={(value) => {
                setTo(value)
                if (invalid) setInvalid(false)
              }}
              status={status}
              onStatusChange={setStatus}
              dropPath={dropPath}
              onDropPathChange={setDropPath}
              fieldError={fieldError}
              onSubmit={submit}
            />
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={() => {
              onOpenChange(false)
            }}
          >
            {t("console.confirm.cancel")}
          </Button>
          <Button
            type="button"
            variant="gold"
            disabled={busy || (behavior === "redirect" && destination === "")}
            loading={busy}
            onClick={submit}
          >
            {t("domains.behavior.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
