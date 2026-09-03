import { useEffect, useState } from "react"

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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Switch,
} from "@datadack/common-ui"
import type { TFunction } from "i18next"
import { CornerUpRight } from "lucide-react"
import { useTranslation } from "react-i18next"

import { useClearDomainRedirect, useSetDomainRedirect } from "../domains.hooks"
import { REDIRECT_STATUSES, type Domain } from "../domains.types"
import { isValidHostname, normalizeHostname } from "./hostname-input"

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
 * Send a hostname somewhere else instead of serving it.
 *
 * The destination is a HOSTNAME, and the field says so rather than accepting a
 * URL and stripping it: the edge builds `https://<host><path>` itself, which is
 * what keeps a stored redirect from ever becoming an open one. A pasted URL is
 * normalised rather than rejected — that is what people have in their clipboard
 * — but what is stored and shown back is the host.
 *
 * Removing the redirect is in here, beside the thing it undoes, rather than as a
 * separate row action: somebody who opens this to check where a hostname points
 * is the same person who wants to stop it.
 */
export function DomainRedirectDialog({
  open,
  onOpenChange,
  domain,
}: Readonly<DomainRedirectDialogProps>) {
  const { t } = useTranslation()
  const existing = domain?.policy?.redirect
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
    setTo(existing?.to ?? "")
    setStatus(existing?.status ?? REDIRECT_STATUSES[0].value)
    setDropPath(existing?.drop_path ?? false)
    setInvalid(false)
  }, [open, domain?.hostname, existing?.to, existing?.status, existing?.drop_path])

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
      <DialogContent className="glass-3 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CornerUpRight className="size-4" />
            {t("domains.redirect.title")}
          </DialogTitle>
          <DialogDescription className="font-mono text-[12px]">{domain.hostname}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="redirect-to">{t("domains.redirect.toLabel")}</Label>
            <Input
              id="redirect-to"
              value={to}
              placeholder="example.com"
              spellCheck={false}
              autoComplete="off"
              className="font-mono"
              onChange={(event) => {
                setTo(event.target.value)
                if (invalid) setInvalid(false)
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submit()
              }}
            />
            {fieldError === "" ? (
              <p className="text-[11px] text-muted-foreground">{t("domains.redirect.toHint")}</p>
            ) : (
              <p className="text-[12px] text-destructive">{fieldError}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="redirect-status">{t("domains.redirect.statusLabel")}</Label>
            <Select
              value={String(status)}
              onValueChange={(value) => {
                setStatus(Number(value))
              }}
            >
              <SelectTrigger id="redirect-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {REDIRECT_STATUSES.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* The hint is the difference that actually bites: 301 and 302 let a
                browser turn a POST into a GET and drop the body. */}
            <p className="text-[11px] text-muted-foreground">
              {REDIRECT_STATUSES.find((option) => option.value === status)?.hint}
            </p>
          </div>

          <div className="flex items-start justify-between gap-4 rounded-md border border-border/60 p-3">
            <div className="min-w-0">
              <p className="text-[13px] text-foreground">{t("domains.redirect.dropPathLabel")}</p>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                {dropPath
                  ? t("domains.redirect.dropPathOn")
                  : t("domains.redirect.dropPathOff", {
                      host: destination === "" ? "example.com" : destination,
                    })}
              </p>
            </div>
            <Switch
              checked={dropPath}
              onCheckedChange={setDropPath}
              aria-label={t("domains.redirect.dropPathLabel")}
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          {/* Only offered when there is something to undo. A destructive-looking
              button on a hostname that has never redirected is a control whose
              honest description is "does nothing". */}
          {existing ? (
            <Button
              type="button"
              variant="ghost"
              className="text-destructive hover:text-destructive"
              disabled={busy}
              loading={clear.isPending}
              onClick={() => {
                clear.mutate(domain.hostname, {
                  onSuccess: () => {
                    onOpenChange(false)
                  },
                })
              }}
            >
              {t("domains.redirect.remove")}
            </Button>
          ) : (
            <span />
          )}
          <div className="flex items-center gap-2">
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
              disabled={busy || destination === ""}
              loading={save.isPending}
              onClick={submit}
            >
              {t("domains.redirect.save")}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
